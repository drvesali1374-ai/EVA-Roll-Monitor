/* =========================================================================
   /api/import — بارگذاری فایل اکسل «رول های موجود» (سمت سرور)
   -------------------------------------------------------------------------
   POST   → پارس فایل .xls/.xlsx (شییت اول) + نرمال‌سازی + جایگزینی کامل
            Dataset قبلی در یک تراکنش + خلاصهٔ Import با شمارش دسته‌ها
   DELETE → پاک‌کردن کل داده‌ها (Roll + ImportBatch)
   ========================================================================= */

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/eva/settings';
import { buildFieldMapping } from '@/lib/eva/column-map';
import { normalizeRows, type NormalizedRoll } from '@/lib/eva/normalize';
import { classifyRoll } from '@/lib/eva/classify';
import { roundTo, serverError } from '@/lib/eva/api-helpers';
import {
  FIELD_LABELS,
  type ApiError,
  type ColumnMapping,
  type ImportResponse,
  type ImportSummary,
  type MappableField,
  type RollCategory,
} from '@/types/eva';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** تعداد رکورد در هر createMany (پرهیز از محدودیت پارامترهای SQLite) */
const CHUNK_SIZE = 500;

/* ------------------------------------------------------------------ */
/* POST — بارگذاری و جایگزینی کامل داده‌ها                               */
/* ------------------------------------------------------------------ */
export async function POST(request: Request) {
  try {
    // ۱) خواندن فایل از فرم multipart
    let file: File;
    try {
      const form = await request.formData();
      const f = form.get('file');
      if (!(f instanceof File)) {
        return NextResponse.json<ApiError>({ ok: false, message: 'فایلی ارسال نشده است.' }, { status: 400 });
      }
      file = f;
    } catch {
      return NextResponse.json<ApiError>({ ok: false, message: 'فرم ارسال‌شده معتبر نیست.' }, { status: 400 });
    }

    // ۲) بررسی نوع فایل — بند ۴ نسخهٔ ۱٫۷: محدودیت حجم ۵۰ مگابایت حذف شد؛
    //    فایل‌های سنگین‌تر نیز قابل بارگذاری‌اند (بدون سقف حجمی)
    if (!/\.(xls|xlsx)$/i.test(file.name)) {
      return NextResponse.json<ApiError>(
        { ok: false, message: 'فقط فایل‌های اکسل (.xls یا .xlsx) پذیرفته می‌شوند.' },
        { status: 400 },
      );
    }

    // ۳) پارس فایل اکسل (شییت اول)
    const buffer = Buffer.from(await file.arrayBuffer());
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (err) {
      console.error('[api/import] خطای پارس فایل:', err);
      return NextResponse.json<ApiError>(
        { ok: false, message: 'فایل اکسل قابل خوانده شدن نیست. از فایل xls/xlsx سالم استفاده کنید.' },
        { status: 400 },
      );
    }
    const sheetName = workbook.SheetNames[0] ?? '';
    const ws = sheetName ? workbook.Sheets[sheetName] : undefined;
    // raw:true تا مقادیر عددی واقعی باشند (نه رشته) — هدرها فارسی هستند
    const rows = ws
      ? (XLSX.utils.sheet_to_json(ws, { defval: null, raw: true }) as Record<string, unknown>[])
      : [];
    if (rows.length === 0) {
      return NextResponse.json<ApiError>({ ok: false, message: 'فایل خالی است.' }, { status: 400 });
    }
    const headers = Object.keys(rows[0]);

    // ۴) نگاشت ستون‌ها با تنظیمات فعلی (اولویت: انتخاب کاربر → primary → fallback)
    const settings = await getSettings();
    const { map, missing } = buildFieldMapping(headers, settings.columnMapping);
    if (missing.length > 0) {
      const labels = missing.map((f) => FIELD_LABELS[f]);
      return NextResponse.json<ApiError>(
        {
          ok: false,
          message: `ستون‌های الزامی یافت نشدند: ${labels.join('، ')}`,
          missing: labels,
          headers,
        },
        { status: 400 },
      );
    }

    // ۵) نرمال‌سازی سطرها (هر سطر rawJson خود را برای بازسازی نگه می‌دارد)
    const { records } = normalizeRows(rows, map);

    // ۶) شمارش دسته‌ها با تنظیمات فعلی + وزن کل رول‌های خام
    const counts: Record<RollCategory, number> = {
      raw: 0,
      eva: 0,
      cut: 0,
      error_e_film: 0,
      error_no_e: 0,
      raw_out_of_range: 0,
      other: 0,
    };
    let totalRawWeight = 0;
    for (const rec of records) {
      const cls = classifyRoll(rec.rollNumber, rec.filmType, rec.width, rec.thickness, settings);
      counts[cls.category] += 1;
      if (cls.category === 'raw' && rec.netWeight !== null) totalRawWeight += rec.netWeight;
    }
    totalRawWeight = roundTo(totalRawWeight, 3);

    // ۷) جایگزینی کامل Dataset در یک تراکنش (مانند پروژهٔ متالایز)
    const now = new Date();
    await db.$transaction(
      async (tx) => {
        await tx.roll.deleteMany({});
        await tx.importBatch.deleteMany({});
        const batch = await tx.importBatch.create({
          data: {
            fileName: file.name,
            sheetName,
            importedAt: now,
            totalRows: records.length,
            headers: JSON.stringify(headers),
            counts: JSON.stringify(counts),
          },
        });
        const toDb = (r: NormalizedRoll) => ({
          rollNumber: r.rollNumber,
          filmType: r.filmType,
          width: r.width,
          initialWidth: r.initialWidth,
          length: r.length,
          thickness: r.thickness,
          netWeight: r.netWeight,
          grade: r.grade,
          palletNumber: r.palletNumber,
          setupNumber: r.setupNumber,
          productionDate: r.productionDate,
          position: r.position,
          externalId: r.externalId,
          rawJson: r.rawJson,
          batchId: batch.id,
          rowIndex: r.rowIndex,
        });
        // درج چانکی برای پرهیز از محدودیت تعداد پارامتر SQLite
        for (let i = 0; i < records.length; i += CHUNK_SIZE) {
          await tx.roll.createMany({ data: records.slice(i, i + CHUNK_SIZE).map(toDb) });
        }
      },
      { timeout: 120_000, maxWait: 10_000 },
    );

    // ۸) خروجی — نگاشت بدون مقادیر null (فقط ستون‌های واقعاً نگاشت‌شده)
    const mapping: ColumnMapping = {};
    for (const [field, col] of Object.entries(map)) {
      if (typeof col === 'string' && col !== '') mapping[field as MappableField] = col;
    }
    const summary: ImportSummary = {
      fileName: file.name,
      sheetName,
      totalRows: records.length,
      headers,
      mapping,
      counts,
      totalRawWeight,
      importedAt: now.toISOString(),
    };
    const res: ImportResponse = { ok: true, summary };
    return NextResponse.json(res);
  } catch (e) {
    return serverError(e);
  }
}

/* ------------------------------------------------------------------ */
/* DELETE — پاک‌کردن کل داده‌ها                                          */
/* ------------------------------------------------------------------ */
export async function DELETE() {
  try {
    await db.$transaction(async (tx) => {
      await tx.roll.deleteMany({});
      await tx.importBatch.deleteMany({});
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
