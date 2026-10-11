/* =========================================================================
   lib/eva/format.ts — قالب‌بندی فارسی اعداد/وزن/زمان (سمت کلاینت و سرور)
   ========================================================================= */

/** تبدیل ارقام لاتین به فارسی */
export function toFaDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

/** عدد صحیح با جداکنندهٔ هزارگان فارسی — ۱۲۳۴۵۶۷ → ۱٬۲۳۴٬۵۶۷ */
export function faInt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return toFaDigits(Math.trunc(n).toLocaleString('en-US')).replace(/,/g, '٬');
}

/** عدد اعشاری با حداکثر رقم اعشار مشخص + جداکنندهٔ هزارگان فارسی */
export function faNum(n: number | null | undefined, maxFractionDigits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const fixed = Number(n.toFixed(maxFractionDigits));
  const [int, frac] = String(fixed).split('.');
  const intFa = toFaDigits(Number(int).toLocaleString('en-US')).replace(/,/g, '٬');
  return frac ? `${intFa}٫${toFaDigits(frac)}` : intFa;
}

/** وزن (کیلوگرم) — دو رقم اعشار */
export function faWeight(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${faNum(n, 2)} کیلوگرم`;
}

/** وزن کوتاه بدون واحد */
export function faWeightShort(n: number | null | undefined): string {
  return faNum(n, 2);
}

/** سال — عدد صحیح بدون جداکنندهٔ هزارگان (۱۴۰۵ و نه ۱٬۴۰۵) */
export function faYear(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return toFaDigits(Math.trunc(n));
}

/** مانده زمان — «۲ روز و ۵ ساعت» */
export function faDuration(days: number | null | undefined, hoursPerDay = 24): string {
  if (days === null || days === undefined || !Number.isFinite(days)) return '—';
  const totalHours = days * hoursPerDay;
  const d = Math.floor(days);
  const h = Math.round(totalHours - d * hoursPerDay);
  if (d === 0 && h === 0) return '۰ ساعت';
  if (d === 0) return `${toFaDigits(h)} ساعت`;
  if (h === 0) return `${toFaDigits(d)} روز`;
  return `${toFaDigits(d)} روز و ${toFaDigits(h)} ساعت`;
}

/** ساعت با یک رقم اعشار */
export function faHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return '—';
  return `${faNum(hours, 1)} ساعت`;
}

/** روز با دو رقم اعشار */
export function faDays(days: number | null | undefined): string {
  if (days === null || days === undefined || !Number.isFinite(days)) return '—';
  return `${faNum(days, 2)} روز`;
}

/** تاریخ و ساعت ذخیره‌شده (ISO) → نمایش شمسی-گونهٔ خوانا */
export function faDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  // جایگزینی ویرگول لاتین Intl با ویرگول فارسی (بند ۲ — قالب کاملاً فارسی)
  return date.format(d).replace(/,\s*/, '، ');
}
