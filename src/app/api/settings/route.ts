/* =========================================================================
   /api/settings — تنظیمات برنامه (سمت سرور)
   -------------------------------------------------------------------------
   GET  → SettingsResponse: params + lastImport + headers فایل آخرین Import
   PUT  → به‌روزرسانی params (merge با مقادیر فعلی) + بازسازی رکوردها
          از rawJson با نگاشت جدید (rebuild=true) طبق قرارداد بخش ۸ worklog
   ========================================================================= */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  SETTINGS_KEY,
  getSettings,
  normalizeFilmList,
  saveSettings,
  validateSettings,
  type EvaSettingsParams,
} from '@/lib/eva/settings';
import { buildFieldMapping, toLatinDigits } from '@/lib/eva/column-map';
import { normalizeRow } from '@/lib/eva/normalize';
import { parseManualEdit, manualNum, manualStr } from '@/lib/eva/manual-edit';
import { getLastImportBatch, parseJsonArray, serverError, toLastImportMeta } from '@/lib/eva/api-helpers';
import {
  FIELD_LABELS,
  type ApiError,
  type SettingsResponse,
  type UpdateSettingsInput,
  type UpdateSettingsResponse,
} from '@/types/eva';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** اندازهٔ هر چانک در بازسازی گروهی رکوردها */
const REBUILD_CHUNK = 500;

/* ------------------------------------------------------------------ */
/* GET — خواندن تنظیمات + متادیتای آخرین Import + هدرهای فایل           */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const params = await getSettings();
    const last = await getLastImportBatch();
    const res: SettingsResponse = {
      params,
      lastImport: toLastImportMeta(last),
      headers: last ? parseJsonArray(last.headers) : [],
    };
    return NextResponse.json(res);
  } catch (e) {
    return serverError(e);
  }
}

/* ------------------------------------------------------------------ */
/* PUT — به‌روزرسانی تنظیمات (+ بازسازی Dataset با نگاشت جدید)           */
/* ------------------------------------------------------------------ */
export async function PUT(request: Request) {
  try {
    // ۱) خواندن بدنهٔ JSON
    let body: UpdateSettingsInput | undefined;
    try {
      body = (await request.json()) as UpdateSettingsInput;
    } catch {
      return NextResponse.json<ApiError>({ ok: false, message: 'بدنهٔ درخواست JSON معتبر نیست.' }, { status: 400 });
    }
    const input = coerceInput(body?.params);
    const rebuild = body?.rebuild === true;

    // ۲) اعتبارسنجی مقادیر ارسالی (پیام‌ها با ؛ جدا می‌شوند)
    const v1 = validateSettings(input);
    if (!v1.ok) {
      return NextResponse.json<ApiError>({ ok: false, message: v1.errors.join('؛ ') }, { status: 400 });
    }

    // ۳) merge با مقادیر فعلی — لیست‌های فیلم نرمال، نگاشت ستون جایگزین کامل
    const current = await getSettings();
    const merged: EvaSettingsParams = {
      rawFilmTypes: input.rawFilmTypes ?? current.rawFilmTypes,
      rawMinWidth: input.rawMinWidth ?? current.rawMinWidth,
      rawMaxWidth: input.rawMaxWidth ?? current.rawMaxWidth,
      rawThickness: input.rawThickness ?? current.rawThickness,
      evaFilmTypes: input.evaFilmTypes ?? current.evaFilmTypes,
      evaCapacityPerShift: input.evaCapacityPerShift ?? current.evaCapacityPerShift,
      shiftsPerDay: input.shiftsPerDay ?? current.shiftsPerDay,
      hoursPerDay: input.hoursPerDay ?? current.hoursPerDay,
      columnMapping: input.columnMapping ?? current.columnMapping,
    };

    // ۴) اعتبارسنجی نتیجهٔ merge (مثلاً min > max بعد از تغییر فقط یک طرف)
    const v2 = validateSettings(merged);
    if (!v2.ok) {
      return NextResponse.json<ApiError>({ ok: false, message: v2.errors.join('؛ ') }, { status: 400 });
    }

    // ۵) بازسازی رکوردها از rawJson با نگاشت جدید — فقط وقتی داده موجود است
    let rebuilt = false;
    let affectedRows = 0;
    if (rebuild) {
      const last = await getLastImportBatch();
      const rollCount = await db.roll.count();
      if (last && rollCount > 0) {
        const headers = parseJsonArray(last.headers);
        const { map, missing } = buildFieldMapping(headers, merged.columnMapping);
        // اگر نگاشت جدید فیلد الزامی را از دست داد → ۴۰۰ و هیچ تغییری ذخیره نمی‌شود
        if (missing.length > 0) {
          const labels = missing.map((f) => FIELD_LABELS[f]);
          return NextResponse.json<ApiError>(
            {
              ok: false,
              message: `ستون‌های الزامی در نگاشت جدید یافت نشدند: ${labels.join('، ')} — هیچ تغییری ذخیره نشد.`,
            },
            { status: 400 },
          );
        }

        // بازسازی اتمیک: همهٔ آپدیت‌ها + ذخیرهٔ تنظیمات در یک تراکنش
        const settingsJson = JSON.stringify(merged);
        await db.$transaction(
          async (tx) => {
            const rolls = await tx.roll.findMany();
            // چانک‌های ۵۰۰تایی + Promise.all برای کارایی
            for (let i = 0; i < rolls.length; i += REBUILD_CHUNK) {
              const chunk = rolls.slice(i, i + REBUILD_CHUNK);
              await Promise.all(
                chunk.map((roll) => {
                  const row = JSON.parse(roll.rawJson) as Record<string, unknown>;
                  const rec = normalizeRow(row, map, roll.rowIndex);
                  // بند ۴ (نسخهٔ ۱٫۲): ویرایش دستی فیلدها (manualEdit) بر خروجی
                  // نرمال‌سازی اولویت دارد تا در بازسازی نگاشت از دست نرود
                  const manual = parseManualEdit(roll.manualEdit);
                  return tx.roll.update({
                    where: { id: roll.id },
                    data: {
                      rollNumber: manualStr(manual, 'rollNumber') ?? rec.rollNumber,
                      filmType: manualStr(manual, 'filmType') ?? rec.filmType,
                      width: manualNum(manual, 'width') !== undefined ? manualNum(manual, 'width') : rec.width,
                      initialWidth:
                        manualNum(manual, 'initialWidth') !== undefined
                          ? manualNum(manual, 'initialWidth')
                          : rec.initialWidth,
                      length: manualNum(manual, 'length') !== undefined ? manualNum(manual, 'length') : rec.length,
                      thickness:
                        manualNum(manual, 'thickness') !== undefined ? manualNum(manual, 'thickness') : rec.thickness,
                      netWeight:
                        manualNum(manual, 'netWeight') !== undefined ? manualNum(manual, 'netWeight') : rec.netWeight,
                      grade: manualStr(manual, 'grade') !== undefined ? manualStr(manual, 'grade') : rec.grade,
                      palletNumber:
                        manualStr(manual, 'palletNumber') !== undefined
                          ? manualStr(manual, 'palletNumber')
                          : rec.palletNumber,
                      setupNumber:
                        manualNum(manual, 'setupNumber') !== undefined
                          ? manualNum(manual, 'setupNumber')
                          : rec.setupNumber,
                      productionDate:
                        manualStr(manual, 'productionDate') !== undefined
                          ? manualStr(manual, 'productionDate')
                          : rec.productionDate,
                      position: manualStr(manual, 'position') !== undefined ? manualStr(manual, 'position') : rec.position,
                      externalId:
                        manualStr(manual, 'externalId') !== undefined ? manualStr(manual, 'externalId') : rec.externalId,
                    },
                  });
                }),
              );
            }
            affectedRows = rolls.length;
            await tx.setting.upsert({
              where: { key: SETTINGS_KEY },
              update: { value: settingsJson },
              create: { key: SETTINGS_KEY, value: settingsJson },
            });
          },
          { timeout: 120_000, maxWait: 10_000 },
        );
        rebuilt = true;
      }
    }

    // ۶) ذخیرهٔ تنظیمات (اگر rebuild انجام نشد یا داده‌ای نبود)
    if (!rebuilt) {
      await saveSettings(merged);
    }

    const res: UpdateSettingsResponse = { ok: true, params: merged, rebuilt, affectedRows };
    return NextResponse.json(res);
  } catch (e) {
    return serverError(e);
  }
}

/* ------------------------------------------------------------------ */
/* ابزارهای داخلی                                                       */
/* ------------------------------------------------------------------ */

const NUMERIC_KEYS = [
  'rawMinWidth',
  'rawMaxWidth',
  'rawThickness',
  'evaCapacityPerShift',
  'shiftsPerDay',
  'hoursPerDay',
] as const;

const FILM_LIST_KEYS = ['rawFilmTypes', 'evaFilmTypes'] as const;

/**
 * هم‌نوع‌سازی ورودی فرم‌ها (دفاعی — ورودی کلاینت را unknown در نظر می‌گیریم):
 * - null / رشتهٔ خالی → حذف (یعنی «ارسال نشده»)
 * - اعداد رشته‌ای («۱۲۳» یا «1,234») → عدد
 * - لیست فیلم به‌صورت رشته با جداکننده یا آرایه → آرایهٔ نرمال
 * - نگاشت ستون: فقط مقادیر رشته‌ای معتبر (ارسال → جایگزین کامل)
 * - مقادیر نامعتبر عمداً دست‌نخورده می‌مانند تا validateSettings خطای فارسی بدهد
 */
function coerceInput(raw: unknown): Partial<EvaSettingsParams> {
  const src: Record<string, unknown> =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};

  /** null یا undefined یا رشتهٔ فقط-فاصله → ارسال‌نشده */
  const isBlank = (v: unknown): boolean =>
    v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

  // اعداد رشته‌ای → عدد (ارقام فارسی/جداکنندهٔ هزارگان هم پشتیبانی می‌شود)
  for (const key of NUMERIC_KEYS) {
    const v = src[key];
    if (isBlank(v)) continue;
    if (typeof v === 'number') {
      out[key] = v;
    } else if (typeof v === 'string') {
      const n = Number(toLatinDigits(v).replace(/[,٬\s]/g, ''));
      out[key] = Number.isFinite(n) ? n : v; // نامعتبر → به validate سپرده می‌شود
    } else {
      out[key] = v; // نامعتبر → به validate سپرده می‌شود
    }
  }

  // لیست انواع فیلم: رشته با جداکننده یا آرایه → آرایهٔ نرمال‌شده
  for (const key of FILM_LIST_KEYS) {
    const v = src[key];
    if (isBlank(v)) continue;
    if (typeof v === 'string') {
      out[key] = normalizeFilmList(v.split(/[,،;؛\s]+/));
    } else if (Array.isArray(v)) {
      out[key] = normalizeFilmList(v);
    } else {
      out[key] = v; // نامعتبر → به validate سپرده می‌شود
    }
  }

  // نگاشت ستون: اگر ارسال شد جایگزین کامل — فقط کلیدهای معتبر با مقدار رشته‌ای
  const cm = src.columnMapping;
  if (!isBlank(cm)) {
    const clean: Record<string, string> = {};
    if (cm && typeof cm === 'object' && !Array.isArray(cm)) {
      for (const [k, val] of Object.entries(cm as Record<string, unknown>)) {
        if (typeof val === 'string') clean[k] = val;
      }
    }
    out.columnMapping = clean;
  }

  return out as unknown as Partial<EvaSettingsParams>;
}
