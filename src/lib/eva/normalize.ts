/* =========================================================================
   lib/eva/normalize.ts — نرمال‌سازی سطرهای اکسل به مدل داخلی رول
   -------------------------------------------------------------------------
   Excel Columns → buildFieldMapping → normalizeRow → Roll (دیتابیس)
   rawJson سطر اصلی را برای بازسازی با نگاشت جدید نگه می‌دارد.
   ========================================================================= */

import type { MappableField } from '@/types/eva';
import { parseIntSafe, parseNumber, parseText } from './column-map';

/** مدل داخلی رول (پیش از ذخیره در دیتابیس) */
export interface NormalizedRoll {
  rollNumber: string;
  filmType: string;
  width: number | null;
  initialWidth: number | null;
  length: number | null;
  thickness: number | null;
  netWeight: number | null;
  grade: string | null;
  palletNumber: string | null;
  setupNumber: number | null;
  productionDate: string | null;
  position: string | null;
  externalId: string | null;
  rawJson: string;
  rowIndex: number;
}

type FieldMap = Partial<Record<MappableField, string | null>>;

/** نرمال‌سازی یک سطر اکسل با نگاشت داده‌شده */
export function normalizeRow(row: Record<string, unknown>, map: FieldMap, rowIndex: number): NormalizedRoll {
  const get = (field: MappableField): unknown => {
    const col = map[field];
    return col === null || col === undefined ? null : row[col];
  };

  const productionDateRaw = get('productionDate');

  return {
    // شماره رول همیشه رشته
    rollNumber: parseText(get('rollNumber')) ?? '',
    filmType: parseText(get('filmType')) ?? '',
    width: parseNumber(get('width')),
    initialWidth: parseNumber(get('initialWidth')),
    length: parseNumber(get('length')),
    thickness: parseNumber(get('thickness')),
    netWeight: parseNumber(get('netWeight')),
    grade: parseText(get('grade')),
    palletNumber: parseText(get('palletNumber')),
    setupNumber: parseIntSafe(get('setupNumber')),
    productionDate:
      productionDateRaw === null || productionDateRaw === undefined || productionDateRaw === ''
        ? null
        : String(productionDateRaw).trim(),
    position: parseText(get('position')),
    externalId: parseText(get('externalId')),
    rawJson: JSON.stringify(row),
    rowIndex,
  };
}

/** نرمال‌سازی کل سطرها */
export function normalizeRows(
  rows: Record<string, unknown>[],
  map: FieldMap,
): { records: NormalizedRoll[]; issues: { rollNumber: number; filmType: number; netWeight: number; setupNumber: number } } {
  const records: NormalizedRoll[] = [];
  const issues = { rollNumber: 0, filmType: 0, netWeight: 0, setupNumber: 0 };

  rows.forEach((row, i) => {
    const rec = normalizeRow(row, map, i + 1);
    if (rec.rollNumber === '') issues.rollNumber++;
    if (rec.filmType === '') issues.filmType++;
    if (rec.netWeight === null) issues.netWeight++;
    if (rec.setupNumber === null) issues.setupNumber++;
    records.push(rec);
  });

  return { records, issues };
}
