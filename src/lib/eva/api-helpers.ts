/* =========================================================================
   lib/eva/api-helpers.ts — ابزارهای مشترک Route Handler ها (فقط سمت سرور)
   -------------------------------------------------------------------------
   ساخت RollDto از رکورد دیتابیس + دسته‌بندی زندهٔ تنظیمات فعلی،
   متادیتای آخرین Import، و ابزارهای عددی.
   توجه: این فایل db را import می‌کند → هرگز در کامپوننت‌های کلاینت استفاده نشود.
   ========================================================================= */

import { NextResponse } from 'next/server';
import type { ImportBatch, Roll } from '@prisma/client';
import { db } from '@/lib/db';
import { classifyRoll, parseRollIdentity } from './classify';
import { MANUAL_ALL_FIELDS, parseManualEdit } from './manual-edit';
import { buildFieldMapping } from './column-map';
import { normalizeRow } from './normalize';
import type { EvaSettingsParams } from './settings';
import type {
  ApiError,
  LastImportMeta,
  ManualEditMap,
  MappableField,
  RollDto,
  TypeOverride,
} from '@/types/eva';

/** select مشترک: همهٔ فیلدهای Roll به‌جز rawJson (حجم زیاد) */
export const ROLL_SELECT = {
  id: true,
  rollNumber: true,
  filmType: true,
  width: true,
  initialWidth: true,
  length: true,
  thickness: true,
  netWeight: true,
  grade: true,
  palletNumber: true,
  setupNumber: true,
  productionDate: true,
  position: true,
  externalId: true,
  typeOverride: true,
  manualEdit: true,
  batchId: true,
  rowIndex: true,
} as const;

/** رکورد Roll سبک — شامل فیلدهای ویرایش دستی */
export type RollRow = Omit<Roll, 'rawJson'>;

/** اعتبارسنجی وضعیت دستی رکورد — فقط raw|eva|cut */
export function parseTypeOverride(v: unknown): TypeOverride | null {
  return v === 'raw' || v === 'eva' || v === 'cut' ? v : null;
}

/**
 * ساخت DTO کامل رول — دادهٔ DB + دسته‌بندی زنده با تنظیمات فعلی
 * + هویت شمارهٔ رول (سالن/رقم سال/سال) + بازوها و پسوند از خروجی classify.
 * وضعیت دستی (typeOverride — بند ۴ نسخهٔ ۱٫۲) بر دستهٔ خودکار اولویت دارد؛
 * فیلدهای ویرایش‌شده (manualEdit — بند ۴ نسخهٔ ۱٫۳) + پرچم ویرایش برگردانده می‌شوند.
 */
export function toRollDto(roll: RollRow, params: EvaSettingsParams): RollDto {
  const cls = classifyRoll(roll.rollNumber, roll.filmType, roll.width, roll.thickness, params);
  const identity = parseRollIdentity(roll.rollNumber);
  const typeOverride = parseTypeOverride(roll.typeOverride);
  const manualEdit = parseManualEdit(roll.manualEdit);
  return {
    id: roll.id,
    rollNumber: roll.rollNumber,
    filmType: roll.filmType,
    width: roll.width,
    initialWidth: roll.initialWidth,
    thickness: roll.thickness,
    length: roll.length,
    netWeight: roll.netWeight,
    grade: roll.grade,
    palletNumber: roll.palletNumber,
    setupNumber: roll.setupNumber,
    productionDate: roll.productionDate,
    position: roll.position,
    externalId: roll.externalId,
    hall: identity.hall,
    yearDigit: identity.yearDigit,
    year: identity.year,
    category: typeOverride ?? cls.category,
    autoCategory: cls.category,
    typeOverride,
    manualEdit,
    original: {},
    edited: typeOverride !== null || Object.keys(manualEdit).length > 0,
    rawArm: cls.rawArm,
    evaCutArm: cls.evaCutArm,
    suffix: cls.suffix,
  };
}

/**
 * مقادیر اولیهٔ یک رول از rawJson با نگاشت فعلی ستون‌ها (بند ۲ نسخهٔ ۱٫۶ —
 * نمایش «از چه مقداری به چه مقداری» در جدول ویرایش‌شده‌ها و دیالوگ ویرایش).
 * fields = زیرمجموعهٔ فیلدهای موردنیاز (پیش‌فرض: همهٔ فیلدهای قابل ویرایش دستی).
 * خروجی null یعنی rawJson در دسترس نیست (مقدار قبلی نامشخص).
 */
export function originalValuesOf(
  rawJson: string | null,
  rowIndex: number,
  headers: string[],
  columnMapping: Record<string, string>,
  fields: readonly MappableField[] = MANUAL_ALL_FIELDS,
): ManualEditMap | null {
  try {
    if (!rawJson) return null;
    const parsed: unknown = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const { map } = buildFieldMapping(headers, columnMapping);
    const rec = normalizeRow(parsed as Record<string, unknown>, map, rowIndex);
    const out: ManualEditMap = {};
    for (const f of fields) {
      const v = rec[f as keyof typeof rec];
      out[f] = v === undefined ? null : (v as number | string | null);
    }
    return out;
  } catch {
    return null;
  }
}

/** ردیف سبک با rawJson — ورودی attachOriginalValues */
export type RawJsonRow = Pick<Roll, 'id' | 'rawJson' | 'rowIndex'>;

/**
 * پیوست‌کردن مقادیر اولیهٔ فایل اکسل به رول‌های ویرایش‌شده (بند ۲ نسخهٔ ۱٫۶) —
 * برای هر رولِ دارای manualEdit، فقط کلیدهای ویرایش‌شده از rawJson با نگاشت
 * فعلی محاسبه و در dto.original قرار می‌گیرد.
 */
export function attachOriginalValues(
  dtos: RollDto[],
  fullRows: RawJsonRow[],
  headers: string[],
  columnMapping: Record<string, string>,
): void {
  const byId = new Map<number, RawJsonRow>();
  for (const row of fullRows) byId.set(row.id, row);
  for (const dto of dtos) {
    const keys = Object.keys(dto.manualEdit) as MappableField[];
    if (keys.length === 0) continue;
    const row = byId.get(dto.id);
    if (!row) continue;
    dto.original = originalValuesOf(row.rawJson, row.rowIndex, headers, columnMapping, keys) ?? {};
  }
}


/** آخرین رکورد ImportBatch (مرتب‌سازی نزولی id) — یا null */
export async function getLastImportBatch(): Promise<ImportBatch | null> {
  return db.importBatch.findFirst({ orderBy: { id: 'desc' } });
}

/** تبدیل رکورد ImportBatch به متادیتای قرارداد API */
export function toLastImportMeta(batch: ImportBatch | null): LastImportMeta | null {
  if (!batch) return null;
  return {
    id: batch.id,
    fileName: batch.fileName,
    sheetName: batch.sheetName,
    importedAt: batch.importedAt.toISOString(),
    totalRows: batch.totalRows,
  };
}

/** پارس JSON آرایه‌ای از رشته (مثل فیلد headers در ImportBatch) — خطا → آرایهٔ خالی */
export function parseJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const arr: unknown = JSON.parse(s);
    return Array.isArray(arr) ? arr.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

/** مانده زمان (روز) = وزن ÷ (ظرفیت هر شیفت × تعداد شیفت) — ظرفیت صفر → 0 */
export function remainingDaysOf(
  weight: number,
  params: { evaCapacityPerShift: number; shiftsPerDay: number },
): number {
  const denom = params.evaCapacityPerShift * params.shiftsPerDay;
  return denom > 0 ? weight / denom : 0;
}

/** گردکردن تا n رقم اعشار (پاک‌سازی خطای جمع ممیز شناور) */
export function roundTo(n: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** پاسخ استاندارد خطای ۵۰۰ + ثبت در لاگ سرور */
export function serverError(e: unknown): NextResponse<ApiError> {
  console.error('[eva-api] خطای داخلی:', e);
  return NextResponse.json<ApiError>({ ok: false, message: 'خطای داخلی سرور' }, { status: 500 });
}
