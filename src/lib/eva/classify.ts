/* =========================================================================
   lib/eva/classify.ts — موتور دسته‌بندی رول‌های EVA (Single Source of Truth)
   -------------------------------------------------------------------------
   ساختار شمارهٔ رول:
     [F|K] + رقم سالن + رقم آخر سال + ارقام سری + بازوی برش خام([LR]+۱/۲رقم) + ادامه
   نمونه‌ها:
     خام:          F1505710501L8
     EVA:          F1505710501L8E16        (E + شمارهٔ بازوی EVA بعد از بازوی خام)
     برش‌خورده:    F1504210491L9E1311R11   (بازوی برش EVA = R11 بعد از حرف E)
   قوانین:
     - رول خام: فیلم ∈ rawFilmTypes + عرض ∈ [min,max] + ضخامت = تنظیم‌شده
     - رول EVA: فیلم ∈ evaFilmTypes + E بعد از بازوی خام + بدون بازوی برش بعد از E
     - برش‌خورده: فیلم ∈ evaFilmTypes + وجود [LR]رقم بعد از حرف E
     - خطا ۱: حرف E در شمارهٔ رول اما فیلم ∉ evaFilmTypes
     - خطا ۲: فیلم ∈ evaFilmTypes اما بدون E بعد از بازوی برش خام
     - اطلاع: فیلم خام اما عرض/ضخامت خارج از محدوده
   ========================================================================= */

import type { RollCategory, RollClassification } from '@/types/eva';

/** الگوی بازوی برش: حرف L یا R + یک یا دو رقم */
const ARM_RE = /[LR]\d{1,2}/;

/** اولین بازوی برش در رشته (index + متن) */
function firstArm(s: string): { arm: string; index: number; end: number } | null {
  const m = ARM_RE.exec(s);
  if (!m) return null;
  return { arm: m[0], index: m.index, end: m.index + m[0].length };
}

/** تجزیهٔ هویت شمارهٔ رول: خط تولید/سالن/رقم سال */
export function parseRollIdentity(rollNumber: string): {
  line: 'BOPP' | 'CPP' | null;
  hall: number | null;
  yearDigit: number | null;
  year: number | null;
} {
  const s = String(rollNumber ?? '').trim().toUpperCase();
  const m = /^([FK])(\d)(\d)/.exec(s);
  if (!m) return { line: null, hall: null, yearDigit: null, year: null };
  const hall = Number.parseInt(m[2], 10);
  const yearDigit = Number.parseInt(m[3], 10);
  return {
    line: m[1] === 'F' ? 'BOPP' : 'CPP',
    hall: Number.isFinite(hall) ? hall : null,
    yearDigit: Number.isFinite(yearDigit) ? yearDigit : null,
    year: Number.isFinite(yearDigit) ? 1400 + yearDigit : null,
  };
}

/**
 * تجزیهٔ ساختاری شمارهٔ رول — بازوی برش خام و ادامهٔ آن.
 * خروجی:
 *   rawArm   بازوی برش خام (مثل L8) یا null
 *   suffix   ادامهٔ شمارهٔ رول بعد از بازوی خام (مثل E16 یا E1311R11) یا null
 *   hasE     آیا بعد از بازوی خام حرف E وجود دارد؟
 *   evaCutArm بازوی برش EVA (مثل R11) — فقط وقتی بعد از E بیاید
 */
export function parseRollNumber(rollNumber: string): {
  rawArm: string | null;
  suffix: string | null;
  hasE: boolean;
  hasEAnywhere: boolean;
  evaCutArm: string | null;
  restAfterE: string | null;
} {
  const s = String(rollNumber ?? '').trim().toUpperCase();
  const hasEAnywhere = s.includes('E');
  const arm = firstArm(s);
  if (!arm) {
    return { rawArm: null, suffix: null, hasE: false, hasEAnywhere, evaCutArm: null, restAfterE: null };
  }
  const suffix = s.slice(arm.end);
  const eIndex = suffix.indexOf('E');
  const hasE = eIndex !== -1;
  let evaCutArm: string | null = null;
  let restAfterE: string | null = null;
  if (hasE) {
    restAfterE = suffix.slice(eIndex + 1);
    const cut = ARM_RE.exec(restAfterE);
    if (cut) evaCutArm = cut[0];
  }
  return { rawArm: arm.arm, suffix: suffix || null, hasE, hasEAnywhere, evaCutArm, restAfterE };
}

/** پارامترهای لازم برای دسته‌بندی */
export interface ClassifyParams {
  rawFilmTypes: string[];
  rawMinWidth: number;
  rawMaxWidth: number;
  rawThickness: number;
  evaFilmTypes: string[];
}

/** نرمال‌سازی نوع فیلم برای مقایسه (حذف فاصله + بزرگ‌نویسی) */
function normFilm(filmType: string | null | undefined): string {
  return String(filmType ?? '').trim().toUpperCase();
}

/**
 * دسته‌بندی یک رول با تنظیمات فعلی — اولویت خطا بر تشخیص عادی است.
 * ورودی filmType/width/thickness از دادهٔ نرمال‌شدهٔ فایل.
 */
export function classifyRoll(
  rollNumber: string,
  filmType: string | null | undefined,
  width: number | null,
  thickness: number | null,
  params: ClassifyParams,
): RollClassification {
  const film = normFilm(filmType);
  const parsed = parseRollNumber(rollNumber);

  const rawFilms = params.rawFilmTypes.map(normFilm);
  const evaFilms = params.evaFilmTypes.map(normFilm);

  let category: RollCategory = 'other';

  if (parsed.hasEAnywhere && !evaFilms.includes(film)) {
    // خطای نوع ۱: حرف E در شمارهٔ رول اما نوع فیلم EVA نیست
    category = 'error_e_film';
  } else if (evaFilms.includes(film)) {
    if (!parsed.hasE) {
      // خطای نوع ۲: فیلم EVA است اما بعد از بازوی برش خام حرف E وجود ندارد
      category = 'error_no_e';
    } else if (parsed.evaCutArm) {
      // بازوی برش EVA بعد از حرف E → رول برش‌خورده
      category = 'cut';
    } else {
      // فقط E + ارقام → رول EVA برش‌نخورده
      category = 'eva';
    }
  } else if (rawFilms.includes(film)) {
    const widthOk =
      width !== null && width >= params.rawMinWidth && width <= params.rawMaxWidth;
    const thicknessOk = thickness !== null && Math.abs(thickness - params.rawThickness) < 1e-9;
    if (widthOk && thicknessOk) {
      category = 'raw';
    } else {
      // فیلم خام اما خارج از محدودهٔ عرض/ضخامت تنظیمات
      category = 'raw_out_of_range';
    }
  }

  return {
    category,
    hasEAfterArm: parsed.hasE,
    rawArm: parsed.rawArm,
    evaCutArm: parsed.evaCutArm,
    suffix: parsed.suffix,
  };
}

/** حرف گرید: فقط پیشوند لاتین X/U/Q/T از ستون گرید — وگرنه null */
export function gradeLetter(grade: string | null | undefined): 'X' | 'U' | 'Q' | 'T' | null {
  const g = String(grade ?? '').trim();
  if (!g) return null;
  const first = g.charAt(0).toUpperCase();
  return first === 'X' || first === 'U' || first === 'Q' || first === 'T' ? first : null;
}

/** کلید گروه رول‌های برش‌خورده: ستاپ + سالن + رقم سال + عرض */
export function cutGroupKey(
  setupNumber: number | null,
  hall: number | null,
  yearDigit: number | null,
  width: number | null,
): string {
  return `${setupNumber ?? '؟'}|${hall ?? '؟'}|${yearDigit ?? '؟'}|${width ?? '؟'}`;
}
