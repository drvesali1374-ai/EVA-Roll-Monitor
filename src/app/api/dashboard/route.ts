/* =========================================================================
   /api/dashboard — دادهٔ کامل داشبورد (سمت سرور)
   -------------------------------------------------------------------------
   KPI ها، مانده زمان کل و به تفکیک ستاپ، هشدارها (خطا/اطلاع)،
   توزیع گرید رول‌های برش‌خورده و موقعیت رول‌های خام — همه با
   دسته‌بندی «زنده» بر اساس تنظیمات فعلی (بدون نیاز به Import مجدد).
   ========================================================================= */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/eva/settings';
import { gradeLetter } from '@/lib/eva/classify';
import {
  ROLL_SELECT,
  getLastImportBatch,
  remainingDaysOf,
  roundTo,
  serverError,
  toLastImportMeta,
  toRollDto,
} from '@/lib/eva/api-helpers';
import type {
  DashboardKpis,
  DashboardResponse,
  DashboardWarnings,
  DistributionItem,
  RollDto,
  SetupRemaining,
} from '@/types/eva';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** سقف آیتم هر آرایهٔ هشدار */
const WARNINGS_CAP = 50;

/** کلیدهای گرید + برچسب فارسی (به‌ترتیب نمایش) */
type GradeKey = 'X' | 'U' | 'Q' | 'T' | 'none';
const GRADE_ORDER: GradeKey[] = ['X', 'U', 'Q', 'T', 'none'];
const GRADE_LABELS: Record<GradeKey, string> = {
  X: 'گرید X',
  U: 'گرید U',
  Q: 'گرید Q',
  T: 'گرید T',
  none: 'بدون گرید',
};

export async function GET() {
  try {
    const settings = await getSettings();
    const rows = await db.roll.findMany({ select: ROLL_SELECT });
    const rolls = rows.map((r) => toRollDto(r, settings));

    // ---- شمارنده‌ها و گروه‌بندی‌ها ----
    let rawCount = 0;
    let rawWeight = 0;
    let evaCount = 0;
    let evaWeight = 0;
    let cutCount = 0;
    let cutWeight = 0;
    let errorsCount = 0; // error_e_film + error_no_e
    let infosCount = 0; // raw_out_of_range

    const setups = new Map<number, { count: number; weight: number }>();
    const grades = new Map<GradeKey, { count: number; weight: number }>();
    const positions = new Map<string, { count: number; weight: number }>();
    const warnEFilm: RollDto[] = [];
    const warnNoE: RollDto[] = [];
    const warnRawOOR: RollDto[] = [];

    for (const d of rolls) {
      const w = d.netWeight ?? 0; // null-safe
      switch (d.category) {
        case 'raw': {
          rawCount += 1;
          rawWeight += w;
          // گروه ستاپ — فقط setupNumber غیر null
          if (d.setupNumber !== null) {
            const s = setups.get(d.setupNumber) ?? { count: 0, weight: 0 };
            s.count += 1;
            s.weight += w;
            setups.set(d.setupNumber, s);
          }
          // گروه موقعیت — null → «نامشخص»
          const p = d.position ?? 'نامشخص';
          const ps = positions.get(p) ?? { count: 0, weight: 0 };
          ps.count += 1;
          ps.weight += w;
          positions.set(p, ps);
          break;
        }
        case 'eva':
          evaCount += 1;
          evaWeight += w;
          break;
        case 'cut': {
          cutCount += 1;
          cutWeight += w;
          // گروه گرید — حرف مجاز اول یا «بدون گرید»
          const g: GradeKey = gradeLetter(d.grade) ?? 'none';
          const gs = grades.get(g) ?? { count: 0, weight: 0 };
          gs.count += 1;
          gs.weight += w;
          grades.set(g, gs);
          break;
        }
        case 'error_e_film':
          errorsCount += 1;
          warnEFilm.push(d);
          break;
        case 'error_no_e':
          errorsCount += 1;
          warnNoE.push(d);
          break;
        case 'raw_out_of_range':
          infosCount += 1;
          warnRawOOR.push(d);
          break;
        default:
          break; // سایر رول‌ها در KPI ها حضور ندارند
      }
    }

    // ---- KPI ها + مانده زمان کل ----
    const totalDays = remainingDaysOf(rawWeight, settings);
    const kpis: DashboardKpis = {
      rawCount,
      rawWeight: roundTo(rawWeight, 3),
      evaCount,
      evaWeight: roundTo(evaWeight, 3),
      cutCount,
      cutWeight: roundTo(cutWeight, 3),
      remainingDays: roundTo(totalDays, 3),
      remainingHours: roundTo(totalDays * settings.hoursPerDay, 3),
      errorsCount,
      infosCount,
    };

    // ---- مانده زمان به تفکیک ستاپ (مرتب صعودی شمارهٔ ستاپ) ----
    const perSetup: SetupRemaining[] = [...setups.entries()]
      .map(([setupNumber, s]) => {
        const days = remainingDaysOf(s.weight, settings);
        return {
          setupNumber,
          rawCount: s.count,
          rawWeight: roundTo(s.weight, 3),
          remainingDays: roundTo(days, 3),
          remainingHours: roundTo(days * settings.hoursPerDay, 3),
        };
      })
      .sort((a, b) => a.setupNumber - b.setupNumber);

    // ---- هشدارها: مرتب بر اساس شمارهٔ رول + سقف ۵۰ آیتم ----
    const byRollNumber = (a: RollDto, b: RollDto) => a.rollNumber.localeCompare(b.rollNumber);
    const warnings: DashboardWarnings = {
      error_e_film: warnEFilm.sort(byRollNumber).slice(0, WARNINGS_CAP),
      error_no_e: warnNoE.sort(byRollNumber).slice(0, WARNINGS_CAP),
      raw_out_of_range: warnRawOOR.sort(byRollNumber).slice(0, WARNINGS_CAP),
    };

    // ---- توزیع گرید رول‌های برش‌خورده (فقط گریدهای موجود، به‌ترتیب X/U/Q/T/بدون) ----
    const cutGradeDistribution: DistributionItem[] = [];
    for (const g of GRADE_ORDER) {
      const v = grades.get(g);
      if (v) {
        cutGradeDistribution.push({ label: GRADE_LABELS[g], count: v.count, weight: roundTo(v.weight, 3) });
      }
    }

    // ---- توزیع موقعیت رول‌های خام (مرتب نزولی بر اساس وزن) ----
    const rawByPosition: DistributionItem[] = [...positions.entries()]
      .map(([label, v]) => ({ label, count: v.count, weight: roundTo(v.weight, 3) }))
      .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label, 'fa'));

    const last = await getLastImportBatch();
    const res: DashboardResponse = {
      kpis,
      perSetup,
      warnings,
      cutGradeDistribution,
      rawByPosition,
      settingsUsed: {
        evaCapacityPerShift: settings.evaCapacityPerShift,
        shiftsPerDay: settings.shiftsPerDay,
        hoursPerDay: settings.hoursPerDay,
        rawFilmTypes: settings.rawFilmTypes,
        evaFilmTypes: settings.evaFilmTypes,
        rawMinWidth: settings.rawMinWidth,
        rawMaxWidth: settings.rawMaxWidth,
        rawThickness: settings.rawThickness,
      },
      lastImport: toLastImportMeta(last),
    };
    return NextResponse.json(res);
  } catch (e) {
    return serverError(e);
  }
}
