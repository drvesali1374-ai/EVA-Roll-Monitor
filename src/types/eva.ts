/* =========================================================================
   types/eva.ts — قرارداد مشترک فرانت‌اند و بک‌اند (منبع حقیقت واحد)
   ========================================================================= */

/** دسته‌بندی زندهٔ رول‌ها (با تنظیمات فعلی محاسبه می‌شود) */
export type RollCategory =
  | 'raw' // رول خام
  | 'eva' // رول EVA (برش‌نخورده)
  | 'cut' // رول برش‌خوردهٔ EVA
  | 'error_e_film' // خطا: حرف E دارد اما نوع فیلم EVA نیست
  | 'error_no_e' // خطا: نوع فیلم EVA است اما بعد از بازوی برش خام حرف E ندارد
  | 'raw_out_of_range' // اطلاع: فیلم خام اما عرض/ضخامت خارج از محدودهٔ تنظیمات
  | 'other'; // سایر رول‌ها (خارج از پوشش مانیتورینگ EVA)

/** پارامترهای تنظیمات */
export interface EvaSettingsParams {
  /** انواع فیلم رول خام — پیش‌فرض ['FSN02','FTN02'] */
  rawFilmTypes: string[];
  /** حداقل عرض رول خام — پیش‌فرض 1960 */
  rawMinWidth: number;
  /** حداکثر عرض رول خام — پیش‌فرض 1980 */
  rawMaxWidth: number;
  /** ضخامت رول خام (میکرون) — پیش‌فرض 12 */
  rawThickness: number;
  /** انواع فیلم رول EVA — پیش‌فرض ['FST32','FTT32'] */
  evaFilmTypes: string[];
  /** ظرفیت هر شیفت دستگاه EVA (کیلوگرم در شیفت) */
  evaCapacityPerShift: number;
  /** تعداد شیفت در روز */
  shiftsPerDay: number;
  /** ساعت تولید در شبانه‌روز (برای نمایش مانده ساعت) — پیش‌فرض 24 */
  hoursPerDay: number;
  /** نگاشت فیلد منطقی → نام ستون اکسل */
  columnMapping: ColumnMapping;
}

/** فیلدهای نگاشت ستون اکسل */
export type MappableField =
  | 'rollNumber'
  | 'filmType'
  | 'setupNumber'
  | 'width'
  | 'initialWidth'
  | 'thickness'
  | 'length'
  | 'netWeight'
  | 'grade'
  | 'palletNumber'
  | 'productionDate'
  | 'position'
  | 'externalId';

export type ColumnMapping = Partial<Record<MappableField, string>>;

/** متادیتای آخرین Import */
export interface LastImportMeta {
  id: number;
  fileName: string;
  sheetName: string | null;
  importedAt: string;
  totalRows: number;
}

/** خروجی GET /api/settings */
export interface SettingsResponse {
  params: EvaSettingsParams;
  lastImport: LastImportMeta | null;
  /** هدرهای فایل آخرین Import (برای پنل نگاشت) */
  headers: string[];
}

/** ورودی PUT /api/settings */
export interface UpdateSettingsInput {
  params: Partial<EvaSettingsParams>;
  /** true → همهٔ رکوردها با نگاشت جدید از rawJson بازسازی می‌شوند */
  rebuild?: boolean;
}

/** خروجی PUT /api/settings */
export interface UpdateSettingsResponse {
  ok: boolean;
  params: EvaSettingsParams;
  rebuilt?: boolean;
  affectedRows?: number;
  message?: string;
}

/** نتیجهٔ دسته‌بندی یک رول */
export interface RollClassification {
  category: RollCategory;
  /** حرف E بعد از بازوی برش خام وجود دارد؟ */
  hasEAfterArm: boolean;
  /** بازوی برش خام (مثل L8) — در صورت وجود */
  rawArm: string | null;
  /** بازوی برش EVA (مثل R11) — فقط رول‌های برش‌خورده */
  evaCutArm: string | null;
  /** ادامهٔ شمارهٔ رول بعد از بازوی خام (مثل E16 یا E1311R11) */
  suffix: string | null;
}

/** وضعیت دستی رول (بند ۴ نسخهٔ ۱٫۲) — بر تشخیص خودکار اولویت دارد */
export type TypeOverride = 'raw' | 'eva' | 'cut';

/** فیلدهای ویرایش‌شدهٔ دستی رول (بند ۴ نسخهٔ ۱٫۳) — value های عددی number|null و رشته‌ای string|null */
export type ManualEditMap = Partial<Record<MappableField, number | string | null>>;

/** DTO رول برای جداول و drill-down */
export interface RollDto {
  id: number;
  rollNumber: string;
  filmType: string;
  width: number | null;
  initialWidth: number | null;
  thickness: number | null;
  length: number | null;
  netWeight: number | null;
  grade: string | null;
  palletNumber: string | null;
  setupNumber: number | null;
  productionDate: string | null;
  position: string | null;
  externalId: string | null;
  /** سالن تولید — رقم اول شمارهٔ رول بعد از حرف */
  hall: number | null;
  /** رقم آخر سال تولید — رقم دوم شمارهٔ رول */
  yearDigit: number | null;
  /** سال چهاررقمی (1400 + yearDigit) */
  year: number | null;
  /** وضعیت مؤثر — با احتساب انتخاب دستی (بند ۴) */
  category: RollCategory;
  /** تشخیص خودکار بر اساس تنظیمات فعلی (بدون وضعیت دستی) */
  autoCategory: RollCategory;
  /** وضعیت دستی رول — null یعنی خودکار (بند ۴ نسخهٔ ۱٫۲) */
  typeOverride: TypeOverride | null;
  /** فیلدهای ویرایش‌شدهٔ دستی (بند ۴ نسخهٔ ۱٫۳) */
  manualEdit: ManualEditMap;
  /**
   * مقادیر اولیهٔ فایل اکسل برای فیلدهای ویرایش‌شدهٔ دستی (بند ۲ نسخهٔ ۱٫۶) —
   * فقط کلیدهای موجود در manualEdit پر می‌شوند؛ برای رول‌های ویرایش‌نشده خالی است.
   * اگر rawJson در دسترس نباشد هم خالی می‌ماند (مقدار قبلی نامشخص).
   */
  original: ManualEditMap;
  /** آیا رول ویرایش دستی دارد (وضعیت دستی یا فیلد ویرایش‌شده)؟ */
  edited: boolean;
  rawArm: string | null;
  evaCutArm: string | null;
  suffix: string | null;
}

/** خروجی GET /api/rolls */
export interface RollsResponse {
  rolls: RollDto[];
  total: number;
  stats: { count: number; weight: number };
}

/** ورودی PATCH /api/rolls/[id] — ویرایش کامل رول (بند ۴ نسخهٔ ۱٫۲/۱٫۳) */
export interface UpdateRollInput {
  rollNumber?: string;
  filmType?: string;
  width?: number | null;
  initialWidth?: number | null;
  thickness?: number | null;
  length?: number | null;
  netWeight?: number | null;
  grade?: string | null;
  palletNumber?: string | null;
  setupNumber?: number | null;
  productionDate?: string | null;
  position?: string | null;
  externalId?: string | null;
  /** null → خودکار */
  typeOverride?: TypeOverride | null;
}

/** خروجی PATCH /api/rolls/[id] و POST /api/rolls/[id]/revert */
export interface UpdateRollResponse {
  ok: boolean;
  roll?: RollDto;
  /** فقط در revert: آیا مقادیر فیلدها هم به حالت اولیهٔ اکسل بازگشت؟ */
  fullyReverted?: boolean;
  message?: string;
}

/** گروه رول‌های برش‌خورده — کلید: ستاپ + سالن + سال + عرض */
export interface CutGroupDto {
  /** کلید گروه: "setup|hall|yearDigit|width" */
  key: string;
  setupNumber: number | null;
  hall: number | null;
  yearDigit: number | null;
  year: number | null;
  width: number | null;
  /** تعداد رول‌های گروه */
  count: number;
  /** مجموع وزن خالص گروه */
  totalWeight: number;
  /** آمار هر گرید: X/U/Q/T/none (بدون گرید) */
  grades: Record<'X' | 'U' | 'Q' | 'T' | 'none', { count: number; weight: number }>;
}

/** خروجی GET /api/rolls/cut-groups */
export interface CutGroupsResponse {
  groups: CutGroupDto[];
  stats: { groups: number; count: number; weight: number };
}

/** KPI های داشبورد */
export interface DashboardKpis {
  rawCount: number;
  rawWeight: number;
  evaCount: number;
  evaWeight: number;
  cutCount: number;
  cutWeight: number;
  /** مانده زمان کل (روز) */
  remainingDays: number;
  /** مانده زمان کل (ساعت) */
  remainingHours: number;
  /** تعداد هشدار (فقط خطاها) */
  errorsCount: number;
  /** تعداد اطلاع‌ها */
  infosCount: number;
}

/** مانده زمان هر ستاپ */
export interface SetupRemaining {
  setupNumber: number;
  rawCount: number;
  rawWeight: number;
  remainingDays: number;
  remainingHours: number;
}

/** توزیع وزن/تعداد بر اساس یک بعد (گرید یا موقعیت) */
export interface DistributionItem {
  label: string;
  count: number;
  weight: number;
}

/** هشدارهای داشبورد */
export interface DashboardWarnings {
  /** خطا: حرف E دارد اما فیلم EVA نیست */
  error_e_film: RollDto[];
  /** خطا: فیلم EVA است اما E بعد از بازوی خام ندارد */
  error_no_e: RollDto[];
  /** اطلاع: فیلم خام اما خارج از محدودهٔ عرض/ضخامت */
  raw_out_of_range: RollDto[];
}

/** خروجی GET /api/dashboard */
export interface DashboardResponse {
  kpis: DashboardKpis;
  perSetup: SetupRemaining[];
  warnings: DashboardWarnings;
  /** توزیع وزن رول‌های برش‌خورده بر اساس گرید */
  cutGradeDistribution: DistributionItem[];
  /** توزیع وزن رول‌های خام بر اساس موقعیت فعلی */
  rawByPosition: DistributionItem[];
  /** پارامترهای مؤثر در محاسبه (برای نمایش فرمول) */
  settingsUsed: {
    evaCapacityPerShift: number;
    shiftsPerDay: number;
    hoursPerDay: number;
    rawFilmTypes: string[];
    evaFilmTypes: string[];
    rawMinWidth: number;
    rawMaxWidth: number;
    rawThickness: number;
  };
  lastImport: LastImportMeta | null;
}

/** خلاصهٔ نتیجهٔ Import */
export interface ImportSummary {
  fileName: string;
  sheetName: string;
  totalRows: number;
  headers: string[];
  mapping: ColumnMapping;
  counts: Record<RollCategory, number>;
  totalRawWeight: number;
  importedAt: string;
}

/** خروجی POST /api/import */
export interface ImportResponse {
  ok: boolean;
  summary?: ImportSummary;
  message?: string;
  missing?: string[];
  headers?: string[];
}

/** خطای API */
export interface ApiError {
  ok: false;
  message: string;
  missing?: string[];
  headers?: string[];
}

/** برچسب فارسی دسته‌ها */
export const CATEGORY_LABELS: Record<RollCategory, string> = {
  raw: 'رول خام',
  eva: 'رول EVA',
  cut: 'رول برش‌خورده',
  error_e_film: 'خطا: E بدون فیلم EVA',
  error_no_e: 'خطا: فیلم EVA بدون حرف E',
  raw_out_of_range: 'خارج از محدودهٔ خام',
  other: 'سایر',
};

/** برچسب فارسی فیلدهای نگاشت */
export const FIELD_LABELS: Record<MappableField, string> = {
  rollNumber: 'شماره رول',
  filmType: 'نوع فیلم',
  setupNumber: 'شماره ستاپ',
  width: 'عرض',
  initialWidth: 'عرض رول اولیه',
  thickness: 'ضخامت',
  length: 'متراژ',
  netWeight: 'وزن خالص',
  grade: 'گرید',
  palletNumber: 'شماره پالت',
  productionDate: 'تاریخ تولید',
  position: 'موقعیت فعلی',
  externalId: 'شناسه رول',
};

/** فیلدهای الزامی نگاشت */
export const REQUIRED_FIELDS: MappableField[] = [
  'rollNumber',
  'filmType',
  'setupNumber',
  'width',
  'thickness',
  'netWeight',
  'grade',
];
