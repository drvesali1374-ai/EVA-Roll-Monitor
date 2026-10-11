/* =========================================================================
   lib/eva/manual-edit.ts — ویرایش دستی رول (بند ۴ نسخهٔ ۱٫۲ و ۱٫۳)
   -------------------------------------------------------------------------
   پارس/اعمال manualEdit (JSON {field: value}) — فیلدهای ویرایش‌شدهٔ دستی رول
   که در بازسازی نگاشت ستون‌ها و فایل پشتیبان حفظ می‌شوند.
   قابل استفاده در سرور (API) و کلاینت (برچسب‌های فیلدهای ویرایش‌شده).
   ========================================================================= */

import type { ManualEditMap, MappableField } from '@/types/eva';

/** فیلدهای عددی قابل ویرایش دستی رول */
export const MANUAL_NUM_FIELDS = [
  'width',
  'initialWidth',
  'thickness',
  'length',
  'netWeight',
  'setupNumber',
] as const satisfies readonly MappableField[];

/** فیلدهای رشته‌ای قابل ویرایش دستی رول */
export const MANUAL_STR_FIELDS = [
  'rollNumber',
  'filmType',
  'grade',
  'palletNumber',
  'productionDate',
  'position',
  'externalId',
] as const satisfies readonly MappableField[];

/** همهٔ فیلدهای قابل ویرایش دستی */
export const MANUAL_ALL_FIELDS: readonly MappableField[] = [
  ...MANUAL_NUM_FIELDS,
  ...MANUAL_STR_FIELDS,
];

const MANUAL_KEYS = new Set<string>(MANUAL_ALL_FIELDS);

/**
 * پارس manualEdit (JSON {field: value}) — خروجی فقط فیلدهای معتبر شناخته‌شده را
 * دارد؛ مقادیر عددی به number|null و رشته‌ای به string|null نگاشت می‌شوند.
 */
export function parseManualEdit(s: string | null | undefined): ManualEditMap {
  if (!s) return {};
  try {
    const obj: unknown = JSON.parse(s);
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return {};
    const src = obj as Record<string, unknown>;
    const out: ManualEditMap = {};
    for (const f of MANUAL_NUM_FIELDS) {
      if (f in src) {
        const v = src[f];
        out[f] =
          v === null || v === undefined
            ? null
            : typeof v === 'number' && Number.isFinite(v)
              ? v
              : null;
      }
    }
    for (const f of MANUAL_STR_FIELDS) {
      if (f in src) {
        const v = src[f];
        out[f] = v === null || v === undefined ? null : String(v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** سریال‌سازی manualEdit برای ذخیره در دیتابیس (فیلدهای ناشناخته حذف می‌شوند) */
export function serializeManualEdit(map: ManualEditMap): string | null {
  const clean: Record<string, unknown> = {};
  let has = false;
  for (const key of Object.keys(map)) {
    if (!MANUAL_KEYS.has(key)) continue;
    const v = map[key as MappableField];
    clean[key] = v === undefined ? null : v;
    has = true;
  }
  return has ? JSON.stringify(clean) : null;
}

/** مقدار رشته‌ای ویرایش‌شده — undefined یعنی ویرایش نشده؛ null یعنی پاک‌شده */
export function manualStr(
  map: ManualEditMap,
  field: (typeof MANUAL_STR_FIELDS)[number],
): string | null | undefined {
  const v = map[field];
  return v === undefined ? undefined : (v as string | null);
}

/** مقدار عددی ویرایش‌شده — undefined یعنی ویرایش نشده؛ null یعنی پاک‌شده */
export function manualNum(
  map: ManualEditMap,
  field: (typeof MANUAL_NUM_FIELDS)[number],
): number | null | undefined {
  const v = map[field];
  return v === undefined ? undefined : (v as number | null);
}
