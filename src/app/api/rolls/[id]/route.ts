/* =========================================================================
   /api/rolls/[id] — ویرایش دستی یک رول (بند ۴ نسخهٔ ۱٫۲ و ۱٫۳)
   -------------------------------------------------------------------------
   PATCH /api/rolls/[id]
   اعتبارسنجی فارسی (شماره رول/نوع فیلم غیرخالی، اعداد ≥ ۰، ستاپ صحیح ≥ ۰،
   typeOverride فقط raw|eva|cut|null) + آپدیت رکورد + ادغام فیلدهای ویرایش‌شده
   در manualEdit (JSON) برای ماندگاری در بازسازی نگاشت.
   خروجی: { ok, roll: RollDto }
   ========================================================================= */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/eva/settings';
import { originalValuesOf as originalValuesShared, serverError, toRollDto } from '@/lib/eva/api-helpers';
import { MANUAL_ALL_FIELDS, parseManualEdit, serializeManualEdit } from '@/lib/eva/manual-edit';
import type { MappableField } from '@/types/eva';
import type { ApiError, UpdateRollInput, UpdateRollResponse } from '@/types/eva';
import type { Roll } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** فیلدهای عددی قابل ویرایش (بدون ستاپ — ستاپ صحیح جدا اعتبارسنجی می‌شود) */
const NUM_FIELDS = ['width', 'initialWidth', 'thickness', 'length', 'netWeight'] as const;

/** فیلدهای رشته‌ای اختیاری */
const OPT_STR_FIELDS = ['grade', 'palletNumber', 'productionDate', 'position', 'externalId'] as const;

const TYPE_OVERRIDES = ['raw', 'eva', 'cut'] as const;

/**
 * مقادیر اولیهٔ یک رول از rawJson با نگاشت فعلی — برای diff حداقلی manualEdit
 * (بند ۴ نسخهٔ ۱٫۳: فقط فیلدهایی که با مقدار اولیهٔ فایل اکسل فرق دارند در
 * manualEdit می‌مانند تا «فیلدهای ویرایش‌شده» معنای دقیقی داشته باشد).
 * بند ۲ نسخهٔ ۱٫۶: پیاده‌سازی به originalValuesOf مشترک در api-helpers منتقل شد.
 */
function originalValuesOf(
  roll: Roll,
  headers: string[],
  columnMapping: Record<string, string>,
) {
  return originalValuesShared(roll.rawJson, roll.rowIndex, headers, columnMapping);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // ۱) شناسهٔ رول
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json<ApiError>({ ok: false, message: 'شناسهٔ رول نامعتبر است.' }, { status: 400 });
    }

    // ۲) بدنهٔ JSON
    let input: UpdateRollInput | undefined;
    try {
      input = (await request.json()) as UpdateRollInput;
    } catch {
      return NextResponse.json<ApiError>({ ok: false, message: 'بدنهٔ درخواست معتبر نیست.' }, { status: 400 });
    }
    if (typeof input !== 'object' || input === null) {
      return NextResponse.json<ApiError>({ ok: false, message: 'بدنهٔ درخواست معتبر نیست.' }, { status: 400 });
    }

    // ۳) اعتبارسنجی فیلدها — خطاها به فارسی
    const errors: string[] = [];
    const data: Record<string, unknown> = {};

    if (input.rollNumber !== undefined) {
      const rn = String(input.rollNumber).trim();
      if (rn === '') errors.push('شمارهٔ رول نمی‌تواند خالی باشد.');
      else data.rollNumber = rn;
    }
    if (input.filmType !== undefined) {
      const ft = String(input.filmType).trim().toUpperCase();
      if (ft === '') errors.push('نوع فیلم نمی‌تواند خالی باشد.');
      else data.filmType = ft;
    }
    for (const f of NUM_FIELDS) {
      const v = (input as Record<string, unknown>)[f];
      if (v === undefined) continue;
      if (v === null) data[f] = null;
      else if (typeof v === 'number' && Number.isFinite(v)) {
        if (v < 0) errors.push('مقادیر عددی نمی‌توانند منفی باشند.');
        else data[f] = v;
      } else if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
        const n = Number(v);
        if (n < 0) errors.push('مقادیر عددی نمی‌توانند منفی باشند.');
        else data[f] = n;
      } else {
        errors.push('مقدار عددی فیلد معتبر نیست.');
      }
    }
    if (input.setupNumber !== undefined) {
      const sv: unknown = input.setupNumber;
      if (sv === null) data.setupNumber = null;
      else if (typeof sv === 'number' && Number.isInteger(sv) && sv >= 0) data.setupNumber = sv;
      else if (typeof sv === 'string' && sv.trim() !== '' && Number.isInteger(Number(sv)) && Number(sv) >= 0)
        data.setupNumber = Number(sv);
      else errors.push('شمارهٔ ستاپ باید عدد صحیح مثبت باشد.');
    }
    for (const f of OPT_STR_FIELDS) {
      const v = (input as Record<string, unknown>)[f];
      if (v === undefined) continue;
      data[f] = v === null || String(v).trim() === '' ? null : String(v).trim();
    }
    if (input.typeOverride !== undefined) {
      const tv: unknown = input.typeOverride;
      if (tv === null || (typeof tv === 'string' && tv.trim() === '')) data.typeOverride = null;
      else if (typeof tv === 'string' && (TYPE_OVERRIDES as readonly string[]).includes(tv)) data.typeOverride = tv;
      else errors.push('وضعیت دستی رول معتبر نیست (مقادیر مجاز: خام، EVA، برش‌خورده).');
    }

    if (errors.length > 0) {
      return NextResponse.json<ApiError>({ ok: false, message: errors.join(' ') }, { status: 400 });
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json<ApiError>(
        { ok: false, message: 'هیچ فیلدی برای ویرایش ارسال نشده است.' },
        { status: 400 },
      );
    }

    // ۴) رول موجود است؟ (با rawJson برای diff حداقلی)
    const existing = await db.roll.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json<ApiError>({ ok: false, message: 'رول موردنظر یافت نشد.' }, { status: 404 });
    }

    // ۵) ادغام ویرایش دستی در manualEdit — ماندگاری در بازسازی نگاشت (rebuild).
    //    فقط فیلدهایی که با مقدار اولیهٔ فایل اکسل فرق دارند در manualEdit می‌مانند.
    const settings = await getSettings();
    const last = await db.importBatch.findFirst({ orderBy: { id: 'desc' } });
    const headers = last ? safeParseHeaders(last.headers) : [];
    const original = originalValuesOf(existing, headers, settings.columnMapping);

    const manual = parseManualEdit(existing.manualEdit);
    const originalRec = original as Record<string, number | string | null | undefined> | null;
    for (const key of Object.keys(data)) {
      if (!MANUAL_ALL_FIELDS.includes(key as (typeof MANUAL_ALL_FIELDS)[number])) continue;
      const equalsOriginal =
        originalRec &&
        key in originalRec &&
        (originalRec[key] ?? null) === ((data[key] as number | string | null) ?? null);
      if (equalsOriginal) delete manual[key as keyof typeof manual];
      else manual[key as keyof typeof manual] = data[key] as number | string | null;
    }
    data.manualEdit = serializeManualEdit(manual);

    // ۶) آپدیت + خروجی DTO با تنظیمات فعلی + مقادیر اولیهٔ فیلدهای ویرایش‌شده (بند ۲ نسخهٔ ۱٫۶)
    const updated = await db.roll.update({ where: { id }, data });
    const dto = toRollDto(updated, settings);
    {
      const keys = Object.keys(dto.manualEdit) as MappableField[];
      dto.original =
        keys.length > 0
          ? (originalValuesShared(updated.rawJson, updated.rowIndex, headers, settings.columnMapping, keys) ?? {})
          : {};
    }
    const res: UpdateRollResponse = { ok: true, roll: dto };
    return NextResponse.json(res);
  } catch (e) {
    return serverError(e);
  }
}

/** پارس امن هدرهای ImportBatch */
function safeParseHeaders(s: string | null): string[] {
  if (!s) return [];
  try {
    const arr: unknown = JSON.parse(s);
    return Array.isArray(arr) ? arr.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}
