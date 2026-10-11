/* =========================================================================
   lib/eva/settings.ts — تنظیمات برنامه (خواندن/ذخیره در جدول Setting)
   ========================================================================= */

import { db } from '@/lib/db';
import type { ColumnMapping, MappableField } from '@/types/eva';
import { DEFAULT_COLUMN_MAP } from './column-map';

export interface EvaSettingsParams {
  rawFilmTypes: string[];
  rawMinWidth: number;
  rawMaxWidth: number;
  rawThickness: number;
  evaFilmTypes: string[];
  evaCapacityPerShift: number;
  shiftsPerDay: number;
  hoursPerDay: number;
  columnMapping: ColumnMapping;
}

export const SETTINGS_KEY = 'evaSettings';

/** مقادیر پیش‌فرض تنظیمات (طبق سند کاربر) */
export function defaultSettings(): EvaSettingsParams {
  return {
    rawFilmTypes: ['FSN02', 'FTN02'],
    rawMinWidth: 1960,
    rawMaxWidth: 1980,
    rawThickness: 12,
    evaFilmTypes: ['FST32', 'FTT32'],
    evaCapacityPerShift: 5000,
    shiftsPerDay: 3,
    hoursPerDay: 24,
    columnMapping: { ...DEFAULT_COLUMN_MAP },
  };
}

/** خواندن تنظیمات — همیشه مقادیر کامل (merge با پیش‌فرض‌ها) */
export async function getSettings(): Promise<EvaSettingsParams> {
  const row = await db.setting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return defaultSettings();
  try {
    const saved = JSON.parse(row.value) as Partial<EvaSettingsParams>;
    const base = defaultSettings();
    return {
      rawFilmTypes: Array.isArray(saved.rawFilmTypes) && saved.rawFilmTypes.length
        ? saved.rawFilmTypes.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
        : base.rawFilmTypes,
      rawMinWidth: num(saved.rawMinWidth, base.rawMinWidth),
      rawMaxWidth: num(saved.rawMaxWidth, base.rawMaxWidth),
      rawThickness: num(saved.rawThickness, base.rawThickness),
      evaFilmTypes: Array.isArray(saved.evaFilmTypes) && saved.evaFilmTypes.length
        ? saved.evaFilmTypes.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
        : base.evaFilmTypes,
      evaCapacityPerShift: posNum(saved.evaCapacityPerShift, base.evaCapacityPerShift),
      shiftsPerDay: posNum(saved.shiftsPerDay, base.shiftsPerDay),
      hoursPerDay: posNum(saved.hoursPerDay, base.hoursPerDay),
      columnMapping:
        saved.columnMapping && typeof saved.columnMapping === 'object'
          ? (saved.columnMapping as ColumnMapping)
          : base.columnMapping,
    };
  } catch {
    return defaultSettings();
  }
}

/** ذخیرهٔ تنظیمات (کامل — merge با مقادیر فعلی توسط فراخوان) */
export async function saveSettings(params: EvaSettingsParams): Promise<void> {
  const value = JSON.stringify(params);
  await db.setting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value },
    create: { key: SETTINGS_KEY, value },
  });
}

/** اعتبارسنجی و نرمال‌سازی پارامترها — خروجی خطاها به فارسی */
export function validateSettings(input: Partial<EvaSettingsParams>): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (input.rawFilmTypes !== undefined) {
    const list = normalizeFilmList(input.rawFilmTypes);
    if (!list.length) errors.push('حداقل یک نوع فیلم برای رول خام لازم است.');
  }
  if (input.evaFilmTypes !== undefined) {
    const list = normalizeFilmList(input.evaFilmTypes);
    if (!list.length) errors.push('حداقل یک نوع فیلم برای رول EVA لازم است.');
  }
  if (input.rawMinWidth !== undefined && (!Number.isFinite(input.rawMinWidth) || input.rawMinWidth <= 0)) {
    errors.push('حداقل عرض رول خام باید عددی مثبت باشد.');
  }
  if (input.rawMaxWidth !== undefined && (!Number.isFinite(input.rawMaxWidth) || input.rawMaxWidth <= 0)) {
    errors.push('حداکثر عرض رول خام باید عددی مثبت باشد.');
  }
  if (
    input.rawMinWidth !== undefined &&
    input.rawMaxWidth !== undefined &&
    Number.isFinite(input.rawMinWidth) &&
    Number.isFinite(input.rawMaxWidth) &&
    input.rawMinWidth > input.rawMaxWidth
  ) {
    errors.push('حداقل عرض رول خام نمی‌تواند بیشتر از حداکثر عرض باشد.');
  }
  if (input.rawThickness !== undefined && (!Number.isFinite(input.rawThickness) || input.rawThickness <= 0)) {
    errors.push('ضخامت رول خام باید عددی مثبت باشد.');
  }
  if (input.evaCapacityPerShift !== undefined && (!Number.isFinite(input.evaCapacityPerShift) || input.evaCapacityPerShift <= 0)) {
    errors.push('ظرفیت هر شیفت دستگاه EVA باید عددی مثبت باشد.');
  }
  if (input.shiftsPerDay !== undefined && (!Number.isFinite(input.shiftsPerDay) || input.shiftsPerDay <= 0)) {
    errors.push('تعداد شیفت در روز باید عددی مثبت باشد.');
  }
  if (input.hoursPerDay !== undefined && (!Number.isFinite(input.hoursPerDay) || input.hoursPerDay <= 0 || input.hoursPerDay > 24)) {
    errors.push('ساعت تولید در شبانه‌روز باید عددی بین ۱ تا ۲۴ باشد.');
  }

  return { ok: errors.length === 0, errors };
}

/** نرمال‌سازی لیست انواع فیلم (آپرکِیس + حذف خالی/تکراری) */
export function normalizeFilmList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const set = new Set(
    list
      .map((s) => String(s ?? '').trim().toUpperCase())
      .filter((s) => s.length > 0),
  );
  return [...set];
}

/* ---------------- ابزار ---------------- */

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function posNum(v: unknown, fallback: number): number {
  const n = num(v, fallback);
  return n > 0 ? n : fallback;
}

/** مرتب‌سازی فیلدهای نگاشت برای نمایش پایدار */
export const MAPPABLE_FIELD_ORDER: MappableField[] = [
  'rollNumber',
  'filmType',
  'setupNumber',
  'width',
  'initialWidth',
  'thickness',
  'length',
  'netWeight',
  'grade',
  'palletNumber',
  'productionDate',
  'position',
  'externalId',
];
