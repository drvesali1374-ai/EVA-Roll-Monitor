/* =========================================================================
   /api/rolls/cut-groups — گروه‌بندی رول‌های برش‌خوردهٔ EVA (سمت سرور)
   -------------------------------------------------------------------------
   کلید گروه: شماره ستاپ + سالن تولید + رقم سال + عرض
   (cutGroupKey در lib/eva/classify.ts — سالن/سال از شمارهٔ رول استخراج می‌شود)
   هر گروه: تعداد، مجموع وزن و آمار X/U/Q/T/بدون گرید.
   مرتب‌سازی: setupNumber صعودی سپس width صعودی.
   ========================================================================= */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/eva/settings';
import { cutGroupKey, gradeLetter } from '@/lib/eva/classify';
import { ROLL_SELECT, roundTo, serverError, toRollDto } from '@/lib/eva/api-helpers';
import type { CutGroupDto, CutGroupsResponse } from '@/types/eva';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GradeKey = 'X' | 'U' | 'Q' | 'T' | 'none';

/** ساخت آمار خالی هر پنج گرید */
function emptyGrades(): Record<GradeKey, { count: number; weight: number }> {
  return {
    X: { count: 0, weight: 0 },
    U: { count: 0, weight: 0 },
    Q: { count: 0, weight: 0 },
    T: { count: 0, weight: 0 },
    none: { count: 0, weight: 0 },
  };
}

export async function GET() {
  try {
    // ۱) همهٔ رول‌ها + دسته‌بندی زنده — فقط رول‌های برش‌خورده
    const settings = await getSettings();
    const rows = await db.roll.findMany({ select: ROLL_SELECT });

    const groups = new Map<string, CutGroupDto>();
    let totalCount = 0;
    let totalWeight = 0;

    for (const row of rows) {
      const dto = toRollDto(row, settings);
      if (dto.category !== 'cut') continue;

      // کلید گروه: ستاپ + سالن + رقم سال + عرض
      const key = cutGroupKey(dto.setupNumber, dto.hall, dto.yearDigit, dto.width);
      let g = groups.get(key);
      if (!g) {
        g = {
          key,
          setupNumber: dto.setupNumber,
          hall: dto.hall,
          yearDigit: dto.yearDigit,
          year: dto.year,
          width: dto.width,
          count: 0,
          totalWeight: 0,
          grades: emptyGrades(),
        };
        groups.set(key, g);
      }

      // مجموع گروه + آمار گرید (حرف مجاز اول گرید — خالی/غیرمجاز → none)
      const w = dto.netWeight ?? 0; // null-safe
      g.count += 1;
      g.totalWeight += w;
      const gl: GradeKey = gradeLetter(dto.grade) ?? 'none';
      g.grades[gl].count += 1;
      g.grades[gl].weight += w;

      totalCount += 1;
      totalWeight += w;
    }

    // ۲) گردکردن وزن‌ها + مرتب‌سازی: ستاپ صعودی سپس عرض صعودی (null ها آخر)
    const list: CutGroupDto[] = [...groups.values()]
      .map((g) => ({
        ...g,
        totalWeight: roundTo(g.totalWeight, 3),
        grades: {
          X: { count: g.grades.X.count, weight: roundTo(g.grades.X.weight, 3) },
          U: { count: g.grades.U.count, weight: roundTo(g.grades.U.weight, 3) },
          Q: { count: g.grades.Q.count, weight: roundTo(g.grades.Q.weight, 3) },
          T: { count: g.grades.T.count, weight: roundTo(g.grades.T.weight, 3) },
          none: { count: g.grades.none.count, weight: roundTo(g.grades.none.weight, 3) },
        },
      }))
      .sort(
        (a, b) =>
          (a.setupNumber ?? Number.MAX_SAFE_INTEGER) - (b.setupNumber ?? Number.MAX_SAFE_INTEGER) ||
          (a.width ?? Number.MAX_SAFE_INTEGER) - (b.width ?? Number.MAX_SAFE_INTEGER),
      );

    const res: CutGroupsResponse = {
      groups: list,
      stats: { groups: list.length, count: totalCount, weight: roundTo(totalWeight, 3) },
    };
    return NextResponse.json(res);
  } catch (e) {
    return serverError(e);
  }
}
