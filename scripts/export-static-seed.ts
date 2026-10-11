/* اسکریپت تولید دادهٔ اولیهٔ نسخهٔ آفلاین — خروجی: public/roll-monitor/js/seed-data.js
   اجرا: bun scripts/export-static-seed.ts */
/// <reference types="bun-types" />
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';

const db = new PrismaClient();

const APP_NAME = 'سامانه مانیتورینگ رول‌های EVA';
const APP_VERSION = '1.1';
const BACKUP_SCHEMA_VERSION = 1;

async function main() {
  const settings = await db.setting.findMany({ orderBy: { key: 'asc' } });
  const importBatches = await db.importBatch.findMany({ orderBy: { id: 'asc' } });
  const rolls = await db.roll.findMany({ orderBy: { id: 'asc' } });

  const payload = {
    app: APP_NAME,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: { settings: settings.length, importBatches: importBatches.length, rolls: rolls.length },
    data: {
      settings,
      importBatches: importBatches.map((b) => ({
        id: b.id,
        fileName: b.fileName,
        sheetName: b.sheetName,
        importedAt: b.importedAt.toISOString(),
        totalRows: b.totalRows,
        headers: b.headers,
        counts: b.counts,
      })),
      // rawJson برای سبک‌ماندن فایل بذر حذف می‌شود (فقط در ایمپورت/بازیابی جدید ذخیره می‌شود)
      rolls: rolls.map((r) => ({
        id: r.id,
        rollNumber: r.rollNumber,
        filmType: r.filmType,
        width: r.width,
        initialWidth: r.initialWidth,
        length: r.length,
        thickness: r.thickness,
        netWeight: r.netWeight,
        grade: r.grade,
        palletNumber: r.palletNumber,
        setupNumber: r.setupNumber,
        productionDate: r.productionDate,
        position: r.position,
        externalId: r.externalId,
        batchId: r.batchId,
        rowIndex: r.rowIndex,
      })),
    },
  };

  const json = JSON.stringify(payload);
  const banner = `/* دادهٔ اولیهٔ سامانه مانیتورینگ رول‌های EVA — تولید خودکار از دیتابیس در ${new Date().toISOString()} */`;
  const out = `${banner}\nwindow.EVA_SEED = ${json};\n`;
  writeFileSync('public/roll-monitor/js/seed-data.js', out);
  console.log('settings:', settings.length, '| importBatches:', importBatches.length, '| rolls:', rolls.length);
  console.log('seed-data.js bytes:', out.length, `(~${(out.length / 1024 / 1024).toFixed(2)} MB)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
