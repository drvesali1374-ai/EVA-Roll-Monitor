/* =========================================================================
   /api/rolls — فهرست رول‌های یک دسته (سمت سرور)
   -------------------------------------------------------------------------
   GET /api/rolls?category=raw|eva|cut|error_e_film|error_no_e|
                       raw_out_of_range|other|all   (پیش‌فرض: raw)
   دسته‌بندی زنده با تنظیمات فعلی (شامل وضعیت دستی — بند ۴)؛ مرتب‌سازی:
   setupNumber صعودی سپس rollNumber. category=all → همهٔ رول‌های فایل واردشده
   (بند ۴ نسخهٔ ۱٫۲ — جدول «رول‌های فایل واردشده»).
   ========================================================================= */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/eva/settings';
import {
  ROLL_SELECT,
  attachOriginalValues,
  getLastImportBatch,
  parseJsonArray,
  roundTo,
  serverError,
  toRollDto,
} from '@/lib/eva/api-helpers';
import type { ApiError, RollCategory, RollsResponse } from '@/types/eva';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** مقادیر مجاز پارامتر category (all = همهٔ رول‌ها) */
const VALID_CATEGORIES: (RollCategory | 'all')[] = [
  'raw',
  'eva',
  'cut',
  'error_e_film',
  'error_no_e',
  'raw_out_of_range',
  'other',
  'all',
];

export async function GET(request: Request) {
  try {
    // ۱) پارامتر category (پیش‌فرض raw — مقدار نامعتبر → ۴۰۰)
    const url = new URL(request.url);
    const raw = url.searchParams.get('category');
    const category = (raw && raw.trim() !== '' ? raw.trim() : 'raw') as RollCategory | 'all';
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          message: `دستهٔ نامعتبر «${raw}» — مقادیر مجاز: ${VALID_CATEGORIES.join('، ')}`,
        },
        { status: 400 },
      );
    }

    // ۲) همهٔ رول‌ها + دسته‌بندی زنده با تنظیمات فعلی (شامل وضعیت دستی)
    const settings = await getSettings();
    const rows = await db.roll.findMany({ select: ROLL_SELECT });
    const rolls = rows
      .map((r) => toRollDto(r, settings))
      .filter((d) => category === 'all' || d.category === category)
      .sort(
        (a, b) =>
          (a.setupNumber ?? Number.MAX_SAFE_INTEGER) - (b.setupNumber ?? Number.MAX_SAFE_INTEGER) ||
          a.rollNumber.localeCompare(b.rollNumber),
      );

    // ۳) مقادیر اولیهٔ فایل اکسل برای رول‌های ویرایش‌شده (بند ۲ نسخهٔ ۱٫۶) —
    //    فقط در category=all که مبنای جدول «رول‌های ویرایش‌شده» و دیالوگ ویرایش است.
    if (category === 'all') {
      const editedIds = rolls.filter((d) => Object.keys(d.manualEdit).length > 0).map((d) => d.id);
      if (editedIds.length > 0) {
        const fullRows = await db.roll.findMany({
          where: { id: { in: editedIds } },
          select: { id: true, rawJson: true, rowIndex: true },
        });
        const last = await getLastImportBatch();
        const headers = parseJsonArray(last?.headers);
        attachOriginalValues(rolls, fullRows, headers, settings.columnMapping);
      }
    }

    // ۴) آمار: تعداد + مجموع وزن خالص (null-safe)
    const weight = rolls.reduce((sum, d) => sum + (d.netWeight ?? 0), 0);
    const res: RollsResponse = {
      rolls,
      total: rolls.length,
      stats: { count: rolls.length, weight: roundTo(weight, 3) },
    };
    return NextResponse.json(res);
  } catch (e) {
    return serverError(e);
  }
}
