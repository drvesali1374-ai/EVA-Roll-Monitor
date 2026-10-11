/* =========================================================================
   lib/eva/column-map.ts — نقشهٔ ستون‌های اکسل → مدل داخلی
   -------------------------------------------------------------------------
   نگاشت پیش‌فرض با نام‌های جایگزین (fallback) برای مقاوم‌سازی در برابر
   تغییرات جزئی هدرهای اکسل. انتخاب کاربر (columnMapping در تنظیمات)
   اولویت دارد؛ سپس primary و fallbacks به‌ترتیب بررسی می‌شوند.
   ========================================================================= */

import type { MappableField } from '@/types/eva';

export interface ColumnSpec {
  /** نام اصلی ستون */
  primary: string;
  /** نام‌های جایگزین */
  fallbacks: string[];
  /** آیا ستون الزامی است؟ (در نبودش Import خطا می‌دهد) */
  required?: boolean;
}

/** نقشهٔ پیش‌فرض فایل «رول های موجود» */
export const COLUMN_SPECS: Record<MappableField, ColumnSpec> = {
  rollNumber: { primary: 'شماره رول', fallbacks: ['شمارهرول', 'Roll Number'], required: true },
  filmType: { primary: 'نوع فیلم', fallbacks: ['نوعفیلم'], required: true },
  setupNumber: { primary: 'شماره ستاپ', fallbacks: ['شمارهستاپ'], required: true },
  width: { primary: 'عرض', fallbacks: ['عرض رول', 'عرضرول'], required: true },
  initialWidth: { primary: 'عرض رول اولیه', fallbacks: ['عرضرولاولیه', 'عرض اولیه'] },
  thickness: { primary: 'ضخامت', fallbacks: ['ضخامتفیلم', 'ضخامت فیلم'], required: true },
  length: { primary: 'متراژ', fallbacks: ['متراز', 'Length'] },
  netWeight: { primary: 'وزن خالص', fallbacks: ['وزنخالص'], required: true },
  grade: { primary: 'گرید', fallbacks: ['Grade'] },
  palletNumber: { primary: 'شماره پالت', fallbacks: ['شمارهپالت'] },
  productionDate: { primary: 'تاریخ تولید', fallbacks: ['تاریختولید'] },
  position: { primary: 'موقعیت فعلی', fallbacks: ['موقعیتفعلی', 'وضعیت', 'وضعیت فعلی'] },
  externalId: { primary: 'شناسه رول', fallbacks: ['شناسهرول'] },
};

/** نگاشت پیش‌فرض فیلد → نام ستون (همان primary ها) */
export const DEFAULT_COLUMN_MAP: Partial<Record<MappableField, string>> = Object.fromEntries(
  Object.entries(COLUMN_SPECS).map(([field, spec]) => [field, spec.primary]),
) as Partial<Record<MappableField, string>>;

/** نرمال‌سازی هدر برای مقایسه: حذف فاصله/ZWNJ + یکسان‌سازی ارقام */
export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .replace(/[\s\u200c\u200f\u200e_-]+/g, '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .toLowerCase();
}

/**
 * ساخت نگاشت «فیلد → نام ستون واقعی فایل».
 * اولویت: انتخاب کاربر → primary → fallbacks.
 * خروجی:
 *   map            فیلد → نام واقعی ستون (یا null)
 *   missing        فیلدهای الزامی یافت‌نشده
 *   usedOverrides  فیلدهایی که از انتخاب کاربر آمده‌اند
 */
export function buildFieldMapping(
  headers: string[],
  overrides: Partial<Record<MappableField, string>> | null | undefined,
): {
  map: Partial<Record<MappableField, string | null>>;
  missing: MappableField[];
  usedOverrides: MappableField[];
  invalidOverrides: MappableField[];
} {
  const normalizedHeaders = new Map(headers.map((h) => [normalizeHeader(h), h]));

  const map: Partial<Record<MappableField, string | null>> = {};
  const missing: MappableField[] = [];
  const usedOverrides: MappableField[] = [];
  const invalidOverrides: MappableField[] = [];

  for (const [field, spec] of Object.entries(COLUMN_SPECS) as [MappableField, ColumnSpec][]) {
    const override = overrides?.[field];
    if (typeof override === 'string' && override.trim() !== '') {
      const real = normalizedHeaders.get(normalizeHeader(override));
      if (real !== undefined) {
        map[field] = real;
        usedOverrides.push(field);
        continue;
      }
      map[field] = null;
      invalidOverrides.push(field);
      if (spec.required) missing.push(field);
      continue;
    }

    let found: string | undefined;
    for (const candidate of [spec.primary, ...spec.fallbacks]) {
      found = normalizedHeaders.get(normalizeHeader(candidate));
      if (found !== undefined) break;
    }
    if (found === undefined) {
      map[field] = null;
      if (spec.required) missing.push(field);
    } else {
      map[field] = found;
    }
  }

  return { map, missing, usedOverrides, invalidOverrides };
}

/** تبدیل ارقام فارسی/عربی به لاتین برای پارس اعداد */
export function toLatinDigits(s: string): string {
  return String(s ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** پارس عدد از مقدار سلول اکسل (عدد یا رشته با ارقام فارسی) — خروجی null در صورت نامعتبر */
export function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = toLatinDigits(String(v)).replace(/[,٬\s]/g, '');
  if (s === '') return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** پارس عدد صحیح — خروجی null در صورت نامعتبر */
export function parseIntSafe(v: unknown): number | null {
  const n = parseNumber(v);
  if (n === null) return null;
  const i = Math.trunc(n);
  return Math.abs(n - i) < 1e-9 ? i : i;
}

/** متن امن — trim شده؛ خالی → null */
export function parseText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
