/* =========================================================================
   /api/backup — پشتیبان‌گیری و بازیابی (سمت سرور — نسخهٔ ۱٫۱)
   -------------------------------------------------------------------------
   GET  → ساخت فایل پشتیبان JSON قابل دانلود (الگوی §61-§62 متالایز):
          { app, schemaVersion, appVersion, exportedAt, counts, data }
          نام فایل: EVA-Monitor-Backup-<تاریخ شمسی YYYY-MM-DD>.json (ارقام لاتین)
   POST → بازیابی اتمیک از محتوای JSON فایل پشتیبان:
          اعتبارسنجی کامل (همهٔ خطاها جمع می‌شوند — §72 متالایز) → ۴۰۰ با errors[]
          جایگزینی کامل سه جدول Setting / ImportBatch / Roll در یک $transaction
   ========================================================================= */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serverError } from '@/lib/eva/api-helpers';
import { SETTINGS_KEY } from '@/lib/eva/settings';
import { APP_NAME, APP_VERSION, BACKUP_SCHEMA_VERSION } from '@/lib/eva/version';
import { faNum } from '@/lib/eva/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** تعداد رکورد در هر createMany — پرهیز از محدودیت پارامترهای SQLite */
const CHUNK_SIZE = 500;

/** سقف تعداد رول در فایل پشتیبان — محافظ سرور در برابر فایل‌های عظیم */
const MAX_BACKUP_ROLLS = 200_000;

/**
 * select مخصوص پشتیبان — همهٔ فیلدهای اسکالر Roll شامل rawJson.
 * (ROLL_SELECT مشترک به‌دلیل حجم زیاد، rawJson را شامل نمی‌شود)
 */
const ROLL_BACKUP_SELECT = {
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
  rawJson: true,
  batchId: true,
  rowIndex: true,
} as const;

/* ------------------------------------------------------------------ */
/* انواع قرارداد                                                       */
/* ------------------------------------------------------------------ */

/** ساختار کامل فایل پشتیبان (خروجی GET / ورودی POST) */
interface BackupPayload {
  app: string;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  counts: { settings: number; importBatches: number; rolls: number };
  data: {
    /** همهٔ ردیف‌های Setting عین‌گونه — value همان رشتهٔ JSON ذخیره‌شده */
    settings: Array<{ key: string; value: string }>;
    /** ردیف‌های ImportBatch — headers/counts رشتهٔ JSON هستند */
    importBatches: Array<Record<string, unknown>>;
    /** همهٔ ردیف‌های Roll شامل rawJson */
    rolls: Array<Record<string, unknown>>;
  };
}

/** پاسخ موفق POST (بازیابی) */
interface RestoreOkResponse {
  ok: boolean;
  counts: { settings: number; importBatches: number; rolls: number };
}

/** پاسخ ۴۰۰ «فایل نامعتبر» — errors برای نمایش فهرستی در UI */
interface RestoreInvalidResponse {
  ok: false;
  message: string;
  errors: string[];
}

/** سطر آمادهٔ درج ImportBatch + شناسهٔ قدیمی برای اصلاح batchId رول‌ها */
interface PreparedBatch {
  oldId: number | null;
  data: {
    fileName: string;
    sheetName: string | null;
    importedAt: string | Date | undefined; // undefined → پیش‌فرض زمان جاری
    totalRows: number;
    headers: string;
    counts: string;
  };
}

/** سطر آمادهٔ درج Roll (فیلدهای الزامی تضمین‌شده، بقیه عین‌گونه پاس داده می‌شوند) */
interface PreparedRoll {
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
  typeOverride: string | null;
  manualEdit: string | null;
  rawJson: string;
  batchId: number | null; // در تراکنش به شناسهٔ جدید ImportBatch نگاشت می‌شود
  rowIndex: number;
}

/** خروجی اعتبارسنجی: یا دادهٔ آمادهٔ درج یا فهرست خطاهای فارسی */
type ValidationResult =
  | { ok: true; data: { settings: Array<{ key: string; value: string }>; batches: PreparedBatch[]; rolls: PreparedRoll[] } }
  | { ok: false; errors: string[] };

/* ------------------------------------------------------------------ */
/* GET — ساخت فایل پشتیبان (دانلود JSON)                               */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    // خواندن هر سه جدول کامل — رول‌ها با rawJson و مرتب بر اساس id (خروجی قطعی)
    const [settings, importBatches, rolls] = await Promise.all([
      db.setting.findMany({ orderBy: { key: 'asc' } }),
      db.importBatch.findMany({ orderBy: { id: 'asc' } }),
      db.roll.findMany({ orderBy: { id: 'asc' }, select: ROLL_BACKUP_SELECT }),
    ]);

    const payload: BackupPayload = {
      app: APP_NAME,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      counts: {
        settings: settings.length,
        importBatches: importBatches.length,
        rolls: rolls.length,
      },
      data: {
        settings: settings.map((s) => ({ key: s.key, value: s.value })),
        importBatches: importBatches.map((b) => ({
          id: b.id,
          fileName: b.fileName,
          sheetName: b.sheetName,
          importedAt: b.importedAt.toISOString(),
          totalRows: b.totalRows,
          headers: b.headers, // رشتهٔ JSON آرایهٔ هدرها — عین‌گونه
          counts: b.counts, // رشتهٔ JSON شمارنده‌ها — عین‌گونه
        })),
        rolls: rolls.map((r) => ({ ...r })), // همهٔ فیلدها شامل rawJson — عین‌گونه
      },
    };

    // نام فایل با تاریخ شمسی و ارقام لاتین: EVA-Monitor-Backup-1405-07-01.json
    const fileName = `EVA-Monitor-Backup-${jalaliFileStamp()}.json`;
    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return serverError(e);
  }
}

/* ------------------------------------------------------------------ */
/* POST — بازیابی از فایل پشتیبان (جایگزینی کامل و اتمیک)               */
/* ------------------------------------------------------------------ */
export async function POST(request: Request) {
  try {
    // ۱) خواندن بدنهٔ JSON (محتوای پارس‌شدهٔ فایل پشتیبان — نه multipart)
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null; // JSON خراب → همان خطای «ساختار فایل معتبر نیست.»
    }

    // ۲) اعتبارسنجی کامل — همهٔ خطاها جمع می‌شوند (الگوی §72 متالایز)
    const check = validateBackup(body);
    if (!check.ok) {
      return NextResponse.json<RestoreInvalidResponse>(
        { ok: false, message: 'فایل پشتیبان معتبر نیست:', errors: check.errors },
        { status: 400 },
      );
    }
    const { settings, batches, rolls } = check.data;

    // ۳) بازیابی اتمیک — پاک‌سازی کامل + بازسازی هر سه جدول در یک تراکنش
    await db.$transaction(
      async (tx) => {
        await tx.roll.deleteMany({});
        await tx.importBatch.deleteMany({});
        await tx.setting.deleteMany({});

        // تنظیمات — عین‌گونه (کلید این جدول همان key است؛ id ندارد)
        for (let i = 0; i < settings.length; i += CHUNK_SIZE) {
          await tx.setting.createMany({
            data: settings.slice(i, i + CHUNK_SIZE).map((s) => ({ key: s.key, value: s.value })),
          });
        }

        // ImportBatch ها — درج تک‌به‌تک برای گرفتن شناسه‌های جدید؛
        // نگاشت id قدیمی → جدید تا batchId رول‌ها پس از بازیابی معتبر بماند
        const batchIdMap = new Map<number, number>();
        let firstBatchId: number | null = null;
        for (const b of batches) {
          const created = await tx.importBatch.create({ data: b.data });
          if (b.oldId !== null) batchIdMap.set(b.oldId, created.id);
          if (firstBatchId === null) firstBatchId = created.id;
        }

        // رول‌ها — چانک‌های ۵۰۰تایی؛ batchId به شناسهٔ جدید نگاشت می‌شود
        // (شناسهٔ نگاشت‌نشده → اولین batch بازیابی‌شده تا ارجاع رول‌ها معتبر بماند)
        const resolveBatchId = (oldId: number | null): number =>
          (oldId === null ? undefined : batchIdMap.get(oldId)) ?? firstBatchId ?? oldId ?? 0;
        for (let i = 0; i < rolls.length; i += CHUNK_SIZE) {
          await tx.roll.createMany({
            data: rolls.slice(i, i + CHUNK_SIZE).map((r) => ({
              ...r,
              batchId: resolveBatchId(r.batchId),
            })),
          });
        }
      },
      { timeout: 120_000, maxWait: 10_000 },
    );

    // ۴) خروجی — تعداد رکوردهای بازیابی‌شده
    return NextResponse.json<RestoreOkResponse>({
      ok: true,
      counts: {
        settings: settings.length,
        importBatches: batches.length,
        rolls: rolls.length,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}

/* ------------------------------------------------------------------ */
/* اعتبارسنجی فایل پشتیبان — همهٔ خطاها جمع می‌شوند                     */
/* ------------------------------------------------------------------ */
function validateBackup(body: unknown): ValidationResult {
  const errors: string[] = [];

  // ساختار کلی فایل
  if (!isRecord(body)) {
    return { ok: false, errors: ['ساختار فایل معتبر نیست.'] };
  }
  if (body.app !== APP_NAME) {
    errors.push(`این فایل متعلق به ${APP_NAME} نیست.`);
  }
  if (body.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    errors.push(`نسخهٔ ساختار پشتیبان (${String(body.schemaVersion)}) پشتیبانی نمی‌شود.`);
  }

  // بخش داده‌ها
  const d = body.data;
  if (!isRecord(d)) {
    errors.push('بخش داده‌های فایل یافت نشد.');
    return { ok: false, errors };
  }

  // جداول ضروری — باید آرایه باشند (آرایهٔ خالی importBatches مجاز است)
  if (!Array.isArray(d.settings)) errors.push('جدول «تنظیمات» در فایل یافت نشد یا معتبر نیست.');
  if (!Array.isArray(d.importBatches)) errors.push('جدول «ورود داده‌ها» در فایل یافت نشد یا معتبر نیست.');
  if (!Array.isArray(d.rolls)) errors.push('جدول «رول‌ها» در فایل یافت نشد یا معتبر نیست.');
  if (errors.length > 0) return { ok: false, errors };
  // پس از گارد بالا هر سه جدول قطعاً آرایه هستند
  const settingsRows = d.settings as unknown[];
  const batchRows = d.importBatches as unknown[];
  const rollRows = d.rolls as unknown[];

  // سقف حجم — ادامهٔ اعتبارسنجی رکوردها معنا ندارد
  if (rollRows.length > MAX_BACKUP_ROLLS) {
    errors.push('حجم فایل پشتیبان بیش از حد مجاز است.');
    return { ok: false, errors };
  }

  // سطرهای تنظیمات — شیء با key/value رشته‌ای
  const settings: Array<{ key: string; value: string }> = [];
  let badSettings = 0;
  for (const row of settingsRows) {
    if (isRecord(row) && typeof row.key === 'string' && typeof row.value === 'string') {
      settings.push({ key: row.key, value: row.value });
    } else {
      badSettings += 1;
    }
  }
  if (badSettings > 0) {
    errors.push(`${faNum(badSettings)} رکورد تنظیمات در فایل ساختار نامعتبر دارد.`);
  }

  // ردیف تنظیمات اصلی برنامه باید JSON معتبر باشد (وگرنه getSettings کرش می‌کند)
  const mainSettings = settings.find((s) => s.key === SETTINGS_KEY);
  if (mainSettings) {
    try {
      JSON.parse(mainSettings.value);
    } catch {
      errors.push('تنظیمات ذخیره‌شده در فایل معتبر نیست.');
    }
  }

  // سطرهای ImportBatch — fileName رشته، totalRows عدد، headers/counts قابل‌پارس
  const batches: PreparedBatch[] = [];
  let badBatches = 0;
  for (const row of batchRows) {
    const prepared = prepareBatchRow(row);
    if (prepared) batches.push(prepared);
    else badBatches += 1;
  }
  if (badBatches > 0) {
    errors.push(`${faNum(badBatches)} رکورد ورود داده‌ها در فایل ساختار نامعتبر دارد.`);
  }

  // سطرهای رول — rollNumber/filmType رشته و netWeight عدد یا null
  const rolls: PreparedRoll[] = [];
  let badRolls = 0;
  for (const row of rollRows) {
    const prepared = prepareRollRow(row);
    if (prepared) rolls.push(prepared);
    else badRolls += 1;
  }
  if (badRolls > 0) {
    errors.push(`${faNum(badRolls)} رکورد رول در فایل ساختار نامعتبر دارد.`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { settings, batches, rolls } };
}

/* ------------------------------------------------------------------ */
/* ابزارهای داخلی                                                      */
/* ------------------------------------------------------------------ */

/** آیا مقدار یک شیء ساده است (نه آرایه و نه null)؟ */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** تاریخ شمسی به‌صورت YYYY-MM-DD با ارقام لاتین — برای نام فایل پشتیبان */
function jalaliFileStamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  // سال تقویم فارسی ممکن است با عصر (AP) همراه شود → فقط ارقام نگه داشته می‌شوند
  const digits = (type: string): string =>
    (parts.find((p) => p.type === type)?.value ?? '').replace(/\D+/g, '');
  const y = digits('year');
  const m = digits('month').padStart(2, '0');
  const d = digits('day').padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * پارس فیلد JSON (headers/counts): رشتهٔ JSON قابل‌پارس یا مقدار بومی
 * (آرایه برای headers / شیء برای counts) — نامعتبر → undefined
 */
function parseJsonField(v: unknown, kind: 'array' | 'object'): unknown {
  let parsed: unknown = v;
  if (typeof v === 'string') {
    try {
      parsed = JSON.parse(v);
    } catch {
      return undefined;
    }
  }
  if (kind === 'array') return Array.isArray(parsed) ? parsed : undefined;
  return isRecord(parsed) ? parsed : undefined;
}

/**
 * آماده‌سازی سطر ImportBatch — نامعتبر → null (شمرده می‌شود).
 * headers/counts می‌تواند رشتهٔ JSON یا مقدار بومی (آرایه/شیء) باشد؛
 * مقدار بومی پیش از ذخیره به رشتهٔ JSON تبدیل می‌شود.
 */
function prepareBatchRow(row: unknown): PreparedBatch | null {
  if (!isRecord(row)) return null;
  if (typeof row.fileName !== 'string') return null;
  if (typeof row.totalRows !== 'number' || !Number.isFinite(row.totalRows)) return null;
  const headers = parseJsonField(row.headers, 'array');
  if (headers === undefined) return null;
  const counts = parseJsonField(row.counts, 'object');
  if (counts === undefined) return null;

  return {
    oldId: typeof row.id === 'number' ? row.id : null,
    data: {
      fileName: row.fileName,
      sheetName: typeof row.sheetName === 'string' ? row.sheetName : null,
      // عین‌گونه — رشتهٔ ISO؛ عدد epoch → Date؛ ناموجود → پیش‌فرض زمان جاری
      importedAt:
        typeof row.importedAt === 'string'
          ? row.importedAt
          : typeof row.importedAt === 'number'
            ? new Date(row.importedAt)
            : undefined,
      totalRows: row.totalRows,
      headers: typeof row.headers === 'string' ? row.headers : JSON.stringify(headers),
      counts: typeof row.counts === 'string' ? row.counts : JSON.stringify(counts),
    },
  };
}

/** فیلد عددی اختیاری — عین‌گونه پاس داده می‌شود (undefined/null → null) */
function passNumber(v: unknown): number | null {
  return (v === undefined || v === null ? null : v) as number | null;
}

/** فیلد رشته‌ای اختیاری — عین‌گونه پاس داده می‌شود (undefined/null → null) */
function passString(v: unknown): string | null {
  return (v === undefined || v === null ? null : v) as string | null;
}

/** وضعیت دستی رول — فقط raw|eva|cut (بند ۴ نسخهٔ ۱٫۲)؛ سایر → null */
function passTypeOverride(v: unknown): string | null {
  return v === 'raw' || v === 'eva' || v === 'cut' ? v : null;
}

/** rawJson — رشته عین‌گونه؛ شیء/آرایه → JSON.stringify؛ سایر حالت‌ها → «{}» */
function normalizeRawJson(v: unknown): string {
  if (typeof v === 'string') return v;
  if (isRecord(v) || Array.isArray(v)) return JSON.stringify(v);
  return '{}';
}

/**
 * آماده‌سازی سطر Roll — نامعتبر → null (شمرده می‌شود).
 * الزامی: rollNumber و filmType رشته و netWeight عدد یا null؛
 * سایر فیلدها عین‌گونه پاس داده می‌شوند (بدون گردکردن یا تبدیل).
 */
function prepareRollRow(row: unknown): PreparedRoll | null {
  if (!isRecord(row)) return null;
  if (typeof row.rollNumber !== 'string' || typeof row.filmType !== 'string') return null;
  const netWeight = row.netWeight;
  if (netWeight !== undefined && netWeight !== null && typeof netWeight !== 'number') return null;

  return {
    rollNumber: row.rollNumber,
    filmType: row.filmType,
    width: passNumber(row.width),
    initialWidth: passNumber(row.initialWidth),
    length: passNumber(row.length),
    thickness: passNumber(row.thickness),
    netWeight: passNumber(netWeight),
    grade: passString(row.grade),
    palletNumber: passString(row.palletNumber),
    setupNumber: passNumber(row.setupNumber),
    productionDate: passString(row.productionDate),
    position: passString(row.position),
    externalId: passString(row.externalId),
    typeOverride: passTypeOverride(row.typeOverride),
    manualEdit: passString(row.manualEdit),
    rawJson: normalizeRawJson(row.rawJson),
    batchId: typeof row.batchId === 'number' ? row.batchId : null,
    rowIndex: typeof row.rowIndex === 'number' ? row.rowIndex : 0,
  };
}
