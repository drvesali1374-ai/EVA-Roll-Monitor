/* =========================================================================
   /api/rolls/[id]/revert — حذف ویرایش‌های دستی یک رول (بند ۴ نسخهٔ ۱٫۳)
   -------------------------------------------------------------------------
   POST /api/rolls/[id]/revert
   بازگردانی کامل رول به حالت اولیهٔ فایل اکسل: همهٔ فیلدها از rawJson با
   نگاشت فعلی دوباره نرمال‌سازی می‌شوند + پاک‌شدن typeOverride و manualEdit.
   اگر rawJson در دسترس نبود، فقط نشانگرهای دستی پاک می‌شوند (fullyReverted=false).
   خروجی: { ok, roll: RollDto, fullyReverted: boolean }
   ========================================================================= */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/eva/settings';
import { serverError, toRollDto } from '@/lib/eva/api-helpers';
import { normalizeRow } from '@/lib/eva/normalize';
import { buildFieldMapping } from '@/lib/eva/column-map';
import type { ApiError, UpdateRollResponse } from '@/types/eva';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // ۱) شناسهٔ رول
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json<ApiError>({ ok: false, message: 'شناسهٔ رول نامعتبر است.' }, { status: 400 });
    }

    // ۲) رول موجود است؟
    const existing = await db.roll.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json<ApiError>({ ok: false, message: 'رول موردنظر یافت نشد.' }, { status: 404 });
    }

    // ۳) بازگردانی فیلدها از rawJson با نگاشت فعلی
    const settings = await getSettings();
    const data: Record<string, unknown> = { typeOverride: null, manualEdit: null };
    let fullyReverted = false;
    try {
      if (existing.rawJson) {
        const row = JSON.parse(existing.rawJson) as Record<string, unknown>;
        if (row && typeof row === 'object' && !Array.isArray(row) && Object.keys(row).length > 0) {
          const last = await db.importBatch.findFirst({ orderBy: { id: 'desc' } });
          let headers: string[] = [];
          try {
            const parsed: unknown = last ? JSON.parse(last.headers) : [];
            if (Array.isArray(parsed)) headers = parsed.map((x) => String(x));
          } catch {
            headers = [];
          }
          const { map } = buildFieldMapping(headers, settings.columnMapping);
          const rec = normalizeRow(row, map, existing.rowIndex);
          Object.assign(data, {
            rollNumber: rec.rollNumber,
            filmType: rec.filmType,
            width: rec.width,
            initialWidth: rec.initialWidth,
            length: rec.length,
            thickness: rec.thickness,
            netWeight: rec.netWeight,
            grade: rec.grade,
            palletNumber: rec.palletNumber,
            setupNumber: rec.setupNumber,
            productionDate: rec.productionDate,
            position: rec.position,
            externalId: rec.externalId,
          });
          fullyReverted = true;
        }
      }
    } catch {
      /* rawJson معتبر نیست → فقط نشانگرهای دستی پاک می‌شوند */
    }

    // ۴) آپدیت + خروجی DTO
    const updated = await db.roll.update({ where: { id }, data });
    const res: UpdateRollResponse = {
      ok: true,
      roll: toRollDto(updated, settings),
      fullyReverted,
    };
    return NextResponse.json(res);
  } catch (e) {
    return serverError(e);
  }
}
