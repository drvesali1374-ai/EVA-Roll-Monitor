# Worklog — سامانه مانیتورینگ رول‌های EVA

## نیازمندی‌های تجزیه‌شده (تحلیل کامل پیام کاربر + پروژه مرجع + فایل نمونه)

### ۰) یافته‌های تحلیل فایل نمونه EVA Data.xls (۸۱۸۹ سطر)
- ستون‌ها: شناسه رول، شماره رول، شماره پالت، نوع فیلم، شماره ستاپ، عرض، متراژ، ضخامت، گرید، عرض رول اولیه، تاریخ تولید، ...، وزن خالص، ...، موقعیت فعلی، عیوب
- انواع فیلم: FRN21(68), KRN21(2), FSN02(67), FTN02(11), FST32(1413), FTT32(1449), FTN12(1439), FTN21(2369), FSN12(1352), FPI02, FTC20, FMN12, FPC02
- ساختار شماره رول: `[FK] + رقم سالن + رقم سال + ۸ رقم سری + بازوی خام([LR]+۱یا۲رقم) + ادامه`
  - خام: `F1505710501L8` — EVA: `F1505710501L8E16` — برش‌خورده: `F1504210491L9E1311R11`
  - ادامه بعد از بازوی خام در رول‌های EVA شامل: `E12`، `DE12`، `E1311L1`، `P1:0E1111L1`، `E1111R1D`، `E11P1:011R2`، `E1311R1P0:1` و ...
  - قانون قطعی: رول برش‌خورده = وجود الگوی `[LR]رقم` بعد از حرف E ؛ رول EVA برش‌نخورده = فقط `E+ارقام` بعد از بازوی خام
- رول‌های FSN02/FTN02: عرض ۱۹۸۰ (۷۷عدد) + یک مورد ۲۰۳۰ ؛ همه ضخامت ۱۲ ؛ ستاپ‌ها: 12,69,72,89,90
- ۷۷ رول خام پس از فیلتر عرض [۱۹۶۰..۱۹۸۰]+ضخامت ۱۲ → وزن کل ۱۸۶۷۸٫۷ کیلوگرم
- توزیع: EVA برش‌نخورده=۷۵، برش‌خورده=۲۷۸۷، خطای بدون E=۰، خطای E بدون فیلم EVA=۰
- گرید برش‌خورده‌ها: X=2723, T=8, U=2 (حرف اول ستون گرید)
- سالن و سال از شماره رول: رقم اول بعد از حرف = سالن، رقم دوم = رقم آخر سال (F15… → سالن ۱، سال ۱۴۰۵)
- گروه‌بندی برش‌خورده‌ها با کلید ستاپ+سالن+سال+عرض → ۶۴ گروه در نمونه

### ۱) صفحات (۵ زبانه در مسیر / — تنها مسیر مجاز)
1. **داشبورد**: چارت مانده زمان (ساعت) + نمودار ستونی مانده زمان به تفکیک ستاپ (هر ستاپ یک میله؛ وزن هر ستاپ هم روی همان ستون نمایش داده شود) + هشدارهای شناسایی‌شده + KPI + نمودارهای مکمل
2. **ورود داده‌ها**: بارگذاری فایل اکسل «رول های موجود» (نمونه: EVA Data.xls) + خلاصه نتیجه Import + اطلاعات آخرین Import
3. **رول‌ها**: سه زبانه: «رولهای خام» / «رولهای EVA» / «رولهای برش خورده»
4. **تنظیمات**: نگاشت ستون‌های اکسل (Mapping) + پارامترهای قابل تنظیم
5. **راهنما**: توضیح کامل سراسر پروژه (الگو: پروژه متالایز)

### ۲) قوانین دسته‌بندی رول‌ها (پارامترها قابل تغییر در تنظیمات)
- **رول خام**: نوع فیلم ∈ {FSN02, FTN02} + عرض ∈ [حداقل ۱۹۶۰, حداکثر ۱۹۸۰] + ضخامت = ۱۲
- **رول EVA**: نوع فیلم ∈ {FST32, FTT32} + حرف E بعد از بازوی برش خام در شماره رول (بدون بازوی برش دوم بعد از E)
- **رول برش‌خورده EVA**: نوع فیلم ∈ {FST32, FTT32} + وجود مشخصه و شماره بازوی برش EVA (الگوی [LR]+رقم) بعد از حرف E

### ۳) هشدارهای داشبورد (خطا)
1. رول دارای حرف E در شماره رول اما نوع فیلم ∉ {FST32, FTT32} → خطا
2. نوع فیلم ∈ {FST32, FTT32} اما بعد از بازوی برش خام حرف E وجود ندارد → خطا
3. (اطلاعی — افزودنی برای شفافیت) نوع فیلم خام اما عرض/ضخامت خارج از محدوده تنظیمات

### ۴) فرمول مانده زمان
`مانده زمان (روز) = مجموع وزن خالص رول‌های خام ÷ (ظرفیت هر شیفت دستگاه EVA × تعداد شیفت در روز)`
- کل و به تفکیک هر ستاپ ؛ نمایش به روز و ساعت (ساعت = روز × ساعت تولید در شبانه‌روز، پیش‌فرض ۲۴)

### ۵) زبانه «رولهای برش خورده»
- گروه‌بندی با کلید: **شماره ستاپ + سالن تولید + عدد سال + عرض**
- هر گروه: مجموع وزن خالص + تعداد + وزن و تعداد هر چهار گرید X, U, Q, T در ستون‌های جداگانه (الگوی پروژه متالایز: تعداد و وزن روی هم در یک سلول)
- تشخیص گرید: حرف اول لاتین ستون گرید (X/U/Q/T)؛ بدون پیشوند مجاز → «بدون گرید»

### ۶) تنظیمات — پارامترها
- انواع فیلم رول خام (لیست قابل ویرایش: FSN02, FTN02)
- حداقل عرض رول خام (۱۹۶۰) / حداکثر عرض رول خام (۱۹۸۰) / ضخامت رول خام (۱۲)
- انواع فیلم رول EVA (لیست قابل ویرایش: FST32, FTT32)
- ظرفیت هر شیفت دستگاه EVA (کیلوگرم) / تعداد شیفت در روز / ساعت تولید در شبانه‌روز (۲۴)
- نگاشت ستون‌های اکسل: شماره رول*، نوع فیلم*، شماره ستاپ*، عرض*، ضخامت*، وزن خالص*، گرید*، متراژ، شماره پالت، عرض رول اولیه، تاریخ تولید، موقعیت فعلی، شناسه رول (* = الزامی)
- ذخیره نگاشت → بازسازی Dataset موجود از داده خام ذخیره‌شده (مانند متالایز)

### ۷) معماری فنی
- Next.js 16 App Router + TypeScript + Tailwind 4 + shadcn/ui + Prisma(SQLite) + Recharts + TanStack Query + sonner
- RTL کامل فارسی + فونت Vazirmatn (local woff2) + light/dark (next-themes)
- دسته‌بندی رول‌ها به‌صورت زنده (Live) از داده نرمال‌شده ذخیره‌شده محاسبه می‌شود → تغییر تنظیمات بدون نیاز به Import مجدد فوراً اعمال می‌شود (به‌جز نگاشت ستون‌ها که بازسازی می‌شود)
- هر Import کل Dataset قبلی را جایگزین می‌کند (مانند متالایز)
- نمایش ارقام فارسی + جداکننده هزارگان

### ۸) قرارداد API (برای Task های 2-a و 2-b)
فایل مشترک تایپ‌ها: `src/types/eva.ts` (منبع حقیقت واحد — هر دو ایجنت باید از آن استفاده کنند)

- `GET /api/settings` → `{ params: EvaSettingsParams, lastImport: LastImportMeta | null, headers: string[] }`
- `PUT /api/settings` body: `{ params: Partial<EvaSettingsParams>, rebuild?: boolean }` → `{ ok: true, params, rebuilt?: boolean, affectedRows?: number }` ؛ rebuild=true → نرمال‌سازی مجدد همه رکوردها با نگاشت جدید
- `POST /api/import` (multipart، فیلد file) → `{ ok, summary: ImportSummary }` ؛ خطای ستون الزامی: 400 با `{ ok:false, message, missing: string[], headers: string[] }`
- `DELETE /api/import` → `{ ok: true }` (پاک‌کردن کل داده‌ها)
- `GET /api/dashboard` → `DashboardResponse` (kpis, perSetup[], warnings{type→rolls[]}, cutGradeDistribution[], rawByPosition[], settingsUsed, lastImport)
- `GET /api/rolls?category=raw|eva|cut|error_e_film|error_no_e|raw_out_of_range` → `{ rolls: RollDto[], total, stats: {count, weight} }`
- `GET /api/rolls/cut-groups` → `{ groups: CutGroupDto[], stats: {groups, count, weight} }`

---

## مراحل اجرا
- Task 1 (me): پایه — فونت/RTL/تم، Prisma schema + push، types، lib (classify/settings/format)، صفحه اصلی با پوسته و stub ها
- Task 2-a (subagent): پیاده‌سازی کامل API routes طبق قرارداد
- Task 2-b (subagent): پیاده‌سازی کامل ۵ نما (Dashboard/Import/Rolls/Settings/Help) طبق قرارداد
- Task 3 (me): یکپارچه‌سازی، lint، تست مرورگر با agent-browser، رفع خطا

---
Task ID: 1
Agent: main (Z.ai Code)
Task: پایه‌گذاری پروژه — تحلیل، اسکیما، موتور دسته‌بندی، تم/RTL، پوسته صفحه

Work Log:
- پروژه مرجع Metallized-Report کلون و تحلیل شد (config/calc/normalize/cutrolls/rules)
- فایل نمونه EVA Data.xls تحلیل شد (۸۱۸۹ سطر، ۱۳ نوع فیلم، الگوهای شماره رول استخراج شد)
- فونت Vazirmatn (Regular/Medium/Bold) به public/fonts کپی شد
- prisma/schema.prisma: مدل‌های Roll (با rawJson برای بازسازی نگاشت) + ImportBatch + Setting؛ db:push انجام شد
- src/types/eva.ts: قرارداد کامل API (منبع حقیقت واحد) — همه DTO ها
- src/lib/eva/classify.ts: موتور دسته‌بندی (parseRollNumber/parseRollIdentity/classifyRoll/gradeLetter/cutGroupKey) — با داده واقعی تست شد:
  * خام=77 (وزن 18678.7kg)، eva=69، cut=2793، خطاها=0، raw_out_of_range=1، other=5249
  * weightPerSetup: 69→60.74، 72→41.86، 89→653.81، 90→17922.31
- src/lib/eva/column-map.ts: نقشه ستون‌ها + buildFieldMapping (اولویت override کاربر → primary → fallbacks) + پارسر اعداد فارسی
- src/lib/eva/settings.ts: getSettings/saveSettings/validateSettings + پیش‌فرض‌ها (FSN02/FTN02، 1960-1980، ضخامت 12، FST32/FTT32، ظرفیت 5000، 3 شیفت، 24 ساعت)
- src/lib/eva/normalize.ts: normalizeRow/normalizeRows
- src/lib/eva/format.ts: قالب‌بندی فارسی (faInt/faNum/faWeight/faDuration/faDateTime)
- layout.tsx: RTL + lang=fa + Vazirmatn + Toaster(sonner) + Providers
- globals.css: تم فیروزه‌ای/سبز (بدون آبی/نیلی) light+dark + اسکرول‌بار + کلاس‌های cw-cell/ltr-code/table-scroll/fade-in-up
- page.tsx: پوسته با ۵ زبانه (داشبورد/ورود داده‌ها/رول‌ها/تنظیمات/راهنما) + سربرگ sticky + وضعیت آخرین Import + تم + پاصفحه چسبان
- components/eva: providers.tsx + icons.tsx + ۵ استاب view + تست lint موفق + سرور dev بالا (GET / 200)

Stage Summary:
- پایه کاملاً آماده؛ API هنوز 404 است (کار Task 2-a)
- همه فایل‌های lib/types آماده استفاده توسط API ها و فرانت‌اند هستند
- قرارداد API در src/types/eva.ts + بخش ۸ همین worklog — هر دو ایجنت بعدی موظف به رعایت آن هستند
- نکته مهم برای Task 2-a: دسته‌بندی زنده با classifyRoll انجام می‌شود (ستون category در DB نیست)
- نکته مهم برای Task 2-b: فایل نمونه واقعی در /home/z/my-project/eva-sample.xls برای تست Import

---
Task ID: 2-a
Agent: backend-api (Z.ai Code)
Task: پیاده‌سازی کامل ۶ API Route Handler طبق قرارداد بخش ۸

Work Log:
- init-fullstack اجرا شد (idempotent — پروژه از قبل مقداردهی شده بود)
- رفع مسدودی محیط: dashboard-view.tsx (فایل Task 2-b در حال نگارش) با `PieChart as PieChartIcon` از icons.ts ایمپورت می‌کرد که خطای «Export PieChart doesn't exist» می‌داد و **کل مسیرها حتی /api را 500 کرده بود**؛ با یک خط به `PieChartIcon` اصلاح شد (توجه Task 2-b)
- src/lib/eva/api-helpers.ts (جدید): toRollDto (DB + classifyRoll + parseRollIdentity) — ROLL_SELECT بدون rawJson — getLastImportBatch/toLastImportMeta — parseJsonArray — remainingDaysOf — roundTo — serverError(500). توجه: این فایل db را import می‌کند → در کلاینت استفاده نشود
- src/app/api/settings/route.ts: GET (params از getSettings + lastImport + headers از ImportBatch.headers) — PUT: اعتبارسنجی با validateSettings (خطاها با ؛) → coerceInput دفاعی (رشتهٔ عددی/ارقام فارسی/جداکننده، لیست فیلم رشته‌ای با جداکننده، null/خالی = ارسال‌نشده، مقادیر زباله عمداً به validate سپرده می‌شوند تا ۴۰۰ فارسی بدهد) → merge با فعلی (لیست‌ها با normalizeFilmList، columnMapping جایگزین کامل) → اعتبارسنجی دوبارهٔ merge (گرفتن min>max در تغییر یک‌طرفه) → rebuild: بررسی missing نگاشت جدید روی هدرهای آخرین ImportBatch **قبل از هر write** (۴۰۰ = هیچ تغییری ذخیره نمی‌شود) → بازسازی اتمیک همهٔ Roll ها از JSON.parse(rawJson) + normalizeRow در تراکنش با چانک‌های ۵۰۰تایی + Promise.all + ذخیرهٔ تنظیمات در همان تراکنش
- src/app/api/import/route.ts: POST — multipart فیلد file، فقط xls/xlsx، سقف ۵۰MB، XLSX.read(buffer) + sheet_to_json(defval:null, raw:true) شییت اول، هدرها از Object.keys(rows[0])، فایل خالی → ۴۰۰، buildFieldMapping با تنظیمات فعلی → missing → ۴۰۰ با {message, missing[labels فارسی], headers}، normalizeRows، شمارش ۷ دسته با classifyRoll، totalRawWeight فقط از دستهٔ raw، جایگزینی کامل در $transaction (deleteMany×۲ + create ImportBatch با headers/counts JSON + createMany چانک‌های ۵۰۰تایی — پرهیز از سقف پارامتر SQLite)، خروجی {ok, summary} با importedAt=ISO و sheetName — DELETE: پاک‌کردن Roll+ImportBatch → {ok:true}
- src/app/api/dashboard/route.ts: دسته‌بندی زندهٔ همهٔ رول‌ها با تنظیمات فعلی — kpis (شمارش/وزن سه دسته، remainingDays=rawWeight÷(capacity×shifts)، remainingHours=×hoursPerDay، errorsCount=e_film+no_e، infosCount) — perSetup (خام‌های دارای setupNumber، مرتب صعودی) — warnings سه آرایه با سقف ۵۰ و مرتب بر اساس rollNumber — cutGradeDistribution (X/U/Q/T/بدون گرید؛ فقط گریدهای موجود؛ label فارسی) — rawByPosition (null→«نامشخص»، مرتب نزولی وزن) — settingsUsed + lastImport
- src/app/api/rolls/route.ts: ?category= با پیش‌فرض raw و اعتبارسنجی (نامعتبر → ۴۰۰ با مقادیر مجاز)، مرتب‌سازی setupNumber صعودی سپس rollNumber (null آخر)، stats = count + مجموع وزن null-safe
- src/app/api/rolls/cut-groups/route.ts: گروه‌بندی رول‌های cut با cutGroupKey(setup,hall,yearDigit,width)، سال/سالن از parseRollIdentity، هر گروه count/totalWeight/grades{X,U,Q,T,none} همیشه هر ۵ کلید، مرتب‌سازی ستاپ سپس عرض صعودی، stats{groups,count,weight}
- همهٔ route ها: `export const runtime='nodejs'` + `dynamic='force-dynamic'`، بدون 'use client'، خطای غیرمنتظره → 500 {ok:false,message:'خطای داخلی سرور'} + console.error، اعداد null-safe، وزن‌ها گرد تا ۳ رقم اعشار (رفع خطای ممیز شناور)

تست‌های curl (همه موفق):
- GET /api/settings → params پیش‌فرض + lastImport:null + headers:[] (قبل از Import)؛ بعد از Import → lastImport کامل + ۴۰ هدر
- POST /api/import (eva-sample.xls, 25MB) → 200 در ~۳.۵-۶ ثانیه: ok:true, totalRows:8189, counts={raw:77, eva:69, cut:2793, error_e_film:0, error_no_e:0, raw_out_of_range:1, other:5249}, totalRawWeight:18678.72 ✓ (مطابق انتظار خام=77/eva=69/cut=2793)
- GET /api/dashboard → remainingDays:1.245 ✓ (≈18678.72÷15000)، remainingHours:29.886، perSetup: 69→60.74kg, 72→41.86, 89→653.81, 90→17922.31 (دقیقاً مطابق تست Task 1)، cutGrade: X=2775/U=8/Q=1/T=9، rawByPosition: ۳ انبار (تلاش 9605.9، فیدار سپند 7415.98، BOPP 1656.84)
- GET /api/rolls?category=raw → total:77, stats:{count:77, weight:18678.72}؛ eva→69، other→5249، خطاها→۰، raw_out_of_range→1
- GET /api/rolls/cut-groups → stats:{groups:66, count:2793, weight:85738.66} (تأیید مستقل با پایتون: ۶۶ گروه)
- PUT /api/settings: مقدار منفی → ۴۰۰؛ min>max (تغییر یک‌طرفه) → ۴۰۰؛ رشتهٔ عددی «2»→2 و «FSN02, FTN02»→آرایه؛ زباله («abc»، 123 برای لیست) → ۴۰۰ فارسی؛ rebuild=true → rebuilt:true, affectedRows:8189؛ rebuild با نگاشت گنده (rollNumber→ستون ناموجود) → ۴۰۰ و تنظیمات دست‌نخورده؛ remap واقعی externalId→«شماره سفارش» + rebuild → مقدار رول‌ها از rawJson عوض شد و با بازگردانی نگاشت {} + rebuild → به حالت اول برگشت
- POST /api/import بدون فایل → ۴۰۰ «فایلی ارسال نشده است.»؛ بدون multipart → ۴۰۰؛ پسوند غلط → ۴۰۰؛ فایل خراب random → ۴۰۰ (missing + headers؛ XLSX.read روی بایت‌های تصادفی throw نمی‌کند بلکه شییت بی‌معنی می‌سازد — پیام ستون‌های الزامی واضح است)
- DELETE /api/import → {ok:true} و همهٔ داده‌ها صفر شد؛ سپس Import مجدد برای باقی‌گذاشتن دادهٔ سالم برای Task 2-b
- bun run lint: فایل‌های این تسک بدون خطا (۲ error باقی‌مانده متعلق به help-view.tsx و ۱ warning متعلق به settings-view.tsx از Task 2-b در حال نگارش است)
- tsc --noEmit: فایل‌های این تسک بدون خطا (خطاهای باقی‌مانده در examples/، skills/ و import-view.tsx مربوط به دیگران است)

تصمیم‌ها / انحرافات از قرارداد:
1. بازسازی rebuild در یک $transaction واحد (آپدیت چانکی ۵۰۰تایی + ذخیرهٔ تنظیمات) انجام می‌شود تا در خطای وسط کار حالت نیمه‌کاره نماند — قرارداد فقط «هیچ تغییر در نگاشت گم‌شده» را الزامی کرده بود که قبل از تراکنش چک می‌شود
2. coerceInput دفاعی در PUT: ورودی فرم‌ها (رشتهٔ عددی با ارقام فارسی/جداکنندهٔ هزارگان، لیست با کاما) نرمال می‌شود؛ رشتهٔ خالی/null یعنی «ارسال‌نشده»؛ مقادیر غیرقابل‌تبدیل عمداً به validateSettings می‌روند تا ۴۰۰ با پیام فارسی بدهد
3. createMany در چانک‌های ۵۰۰تایی — پرهیز از سقف SQLITE_MAX_VARIABLE_NUMBER (۸۱۸۹×۱۶ پارامتر > ۳۲۷۶۶)
4. ستون «گرید» در COLUMN_SPECS فیلد required ندارد (برخلاف REQUIRED_FIELDS در types که آن را الزامی نشان می‌دهد) — طبق دستور، منطق lib دست نخورد؛ یعنی فایل بدون ستون گرید Import می‌شود و گرید null → «بدون گرید». تصمیم نهایی با Task 3
5. cut-groups = ۶۶ گروه (نه ۶۴ تخمینی بخش ۰) — تأیید مستقل؛ اختلاف از تفاوت دسته‌بندی موتور classify (2793 برش‌خورده) با اسکن ابتدایی (2787) است؛ موتور تست‌شدهٔ Task 1 مبناست
6. وزن‌ها تا ۳ رقم اعشار گرد می‌شوند (18678.72) تا خطای جمع ممیز شناور در JSON نیاید
7. رفع یک‌خطی dashboard-view.tsx (Task 2-b) برای بازگشایی سرور — در ابتدای همین گزارش توضیح داده شد
8. فایل api/route.ts موجود (Hello World) دست نخورد

Stage Summary:
- هر ۶ Route Handler (۵ فایل) کامل، تست‌شده و منطبق با src/types/eva.ts
- وضعیت نهایی DB: نمونهٔ eva-sample.xls ایمپورت‌شده (8189 سطر) + تنظیمات پیش‌فرض + نگاشت کامل پیش‌فرض — آماده برای توسعه/تست Task 2-b
- نکته برای Task 2-b: فایل lib/eva/api-helpers.ts فقط سمت سرور است (db را import می‌کند)؛ در کلاینت از types/eva.ts استفاده شود

---
Task ID: 2-b
Agent: frontend (Z.ai Code)
Task: پیاده‌سازی کامل ۵ نمای فرانت‌اند (Dashboard / Import / Rolls / Settings / Help)

Work Log:
- **src/components/eva/shared.tsx** (فایل جدید — ابزارهای مشترک):
  * `navigateTo(tab)` → dispatch رویداد سفارشی `eva:navigate` روی window
  * `apiFetch<T>` + کلاس `ApiRequestError` (status/payload/apiError) — fetch سادهٔ نسبی با هندل خطای شبکه و بدنهٔ ApiError
  * `EmptyDataState` (آیکون Database + دکمهٔ «رفتن به ورود داده‌ها» با navigateTo) و `QueryErrorAlert` (با دکمهٔ تلاش مجدد) و `LegendDot`
- **src/app/page.tsx** (تغییر کوچک): useEffect جدید با گوش‌دادن به `eva:navigate` → changeTab + scrollTo top؛ TAB_VALUES برای اعتبارسنجی
- **dashboard-view.tsx**: useQuery(['dashboard']) با سه حالت Skeleton/خطا/خالی (EmptyDataState وقتی lastImport=null)
  * ۶ کارت KPI (grid-cols-2/3/6): وزن+تعداد خام، مانده زمان (faDuration+faHours + فرمول ظرفیت×شیفت داخل کارت)، EVA (تعداد+وزن)، برش‌خورده (تعداد+وزن)، خطاها (قرمز اگر >0)، اطلاع‌ها (کهربایی)
  * نمودار اصلی ComposedChart (ResponsiveContainer height=340): Bar مانده ساعت (chart-1) + Bar وزن خام با yAxisId راست (chart-2 کهربایی) + LabelList روی هر دو میله + محورهای Y دومقه‌دار (ساعت/کیلوگرم) + XAxis با ارقام فارسی + Tooltip سفارشی فارسی + Legend سفارشی RTL
  * هشدارها: Alert سبز «هیچ خطایی شناسایی نشد» یا سه Alert (دو قرمز error_e_film/error_no_e + کهربایی raw_out_of_range) با توضیح فارسی قانون (با مقادیر واقعی settingsUsed)، Badge شمارنده، دکمهٔ «مشاهدهٔ رول‌ها» → Dialog جدول رول‌ها (شماره رول ltr-code/فیلم/عرض/ضخامت/ستاپ)
  * دو نمودار مکمل: PieChart دونات توزیع وزن برش‌خورده بر اساس گرید (رنگ ثابت X/U/Q/T + مرکز مجموع وزن + legend سفارشی) و BarChart افقی وزن خام به تفکیک موقعیت (ارتفاع داینامیک + LabelList)
- **import-view.tsx**: کارت آپلود با drag&drop (dragover/dragleave/drop + استایل) + input مخفی accept=.xls,.xlsx + اعتبارسنجی پسوند + useMutation(POST FormData) با حالت Progress (نوار pulse + Loader2 + غیرفعال‌شدن)
  * خطای ۴۰۰: Alert قرمز با لیست ستون‌های الزامی گم‌شده (برچسب فارسی از FIELD_LABELS + کد لاتین) + هدرهای شناسایی‌شده + پیام راهنمای نگاشت
  * موفقیت: toast + کارت خلاصه (نام فایل/برگه/تاریخ faDateTime/کل سطرها/رول‌های پایش‌شده/وزن خام) + جدول ۷ دسته با Badge رنگی و سهم درصدی + invalidate همهٔ کوئری‌ها (dashboard/rolls/settings/cutGroups)
  * کارت «وضعیت آخرین Import» از ['settings'] + دکمهٔ «حذف همهٔ داده‌ها» با AlertDialog تایید (DELETE + invalidate + toast)
- **rolls-view.tsx**: Tabs داخلی ۳ زبانه
  * خام/EVA: RollsTable مشترک (category=raw|eva) — چیپ‌های آمار (تعداد/وزن کل/نتیجهٔ فیلتر)، جستجوی متنی (شماره رول/فیلم/ستاپ/موقعیت)، مرتب‌سازی ۸ ستون با SortableHead (آیکون‌های Up/Down/UpDown + aria-sort)، جدول table-scroll با هدر sticky و bg-card، ستون موقعیت hidden md:table-cell، زبانهٔ EVA ستون اضافهٔ «کد EVA» (suffix با Badge ltr-code)، سقف نمایش ۱۵۰ ردیف + دکمهٔ «نمایش … ردیف بیشتر»
  * برش‌خورده: useQuery(['cutGroups']) — جدول گروه‌ها (ستاپ/سالن/سال/عرض/تعداد/مجموع وزن) + ۵ ستون گرید X/U/Q/T/بدون‌گرید با الگوی cw-cell (cw-count + cw-weight) و bg ملایم متمایز هر ستون + مرتب‌سازی + جستجو + دکمهٔ «جزئیات» → Dialog با fetch تنبل ['rolls','cut'] (enabled وقتی دیالوگ باز) و فیلتر سمت کلاینت با cutGroupKey (همان تابع lib برای سازگاری کلید) → جدول شماره رول کامل/بازوی برش/عرض/وزن/گرید/موقعیت
  * Empty state هر سه زبانه + Skeleton + ارقام فارسی همه‌جا
- **settings-view.tsx**: الگوی draft (numDraft/rawTypesDraft/evaTypesDraft/mappingDraft با fallback به سرور — بدون useEffect و بدون setState در effect؛ dirty badge + دکمهٔ صرف‌نظر)
  * کارت پارامترها: FilmTypesEditor (تگ + دکمهٔ X + Input + افزودن با اعتبارسنجی تکراری) برای خام/EVA + ۶ فیلد عددی با واحد (mm/میکرون/kg/شیفت/ساعت) + اعتبارسنجی زندهٔ useMemo (مثبت بودن، min<=max، صحیح بودن شیفت/ساعت ۱..۲۴) با Alert خطاها + دکمهٔ ذخیره (PUT بدون rebuild + invalidate) + **فرمول زندهٔ مانده زمان** زیر فرم با مقادیر فعلی و وزن خام واقعی از ['dashboard']
  * کارت نگاشت: اگر headers خالی → پیام «ابتدا فایل وارد کنید» + دکمهٔ navigate؛ وگرنه ۱۳ ردیف (برچسب فارسی + Badge «الزامی» + Badge «دستی/خودکار» + Select با گزینهٔ «— خودکار —» و هدرها + hint «انتخاب مؤثر» از buildFieldMapping محلی)؛ ذخیره → PUT با columnMapping کامل + rebuild:true + toast تعداد رکوردهای بازسازی‌شده؛ «بازگردانی پیش‌فرض» با AlertDialog (columnMapping:{} + rebuild)
  * کارت راهنمای کوتاه (پارامترها زنده / نگاشت نیازمند بازسازی) + دکمهٔ رفتن به راهنما
- **help-view.tsx**: آکاردئون ۸ بخشی کامل (معرفی/شروع کار/قوانین/هشدارها/فرمول/برش‌خورده‌ها/تنظیمات/FAQ هفت‌سوالی) با جدول صفحات، Badge ستون‌های الزامی، تجزیهٔ بصری ساختار شمارهٔ رول (F|1|5|05710501|L8|E16)، مثال‌های واقعی سه دسته، توضیح کامل سه هشدار، فرمول + مثال عددی ۱۸٬۶۷۸٫۷÷(۵۰۰۰×۳)، جدول پارامترها با پیش‌فرض و واحد، FAQ تودرتو

تست مرورگر (agent-browser — API های Task 2-a زنده بودند و eva-sample.xls وارد شده بود):
- داشبورد: KPI ها (مانده «۱ روز و ۶ ساعت»)، چارت ستاپ‌ها (ساعت‌ها ۰٫۱/۱/۲۸٫۷ + وزن‌ها ۶۰٫۷۴…۱۷٬۹۲۲٫۳۱)، دیالوگ هشدار (رول FSN02 عرض ۲۰۳۰)، دونات گریدها (X=۲۷۷۵…) و چارت موقعیت‌ها (۳ انبار) — همه صحیح
- Import: آپلود واقعی eva-sample.xls → خلاصهٔ ۸٬۱۸۹ سطر با ۷ دسته (خام ۷۷/EVA ۶۹/برش ۲٬۷۹۳/سایر ۵٬۲۴۹) — منطبق بر تحلیل Task 1
- رول‌ها: جستجوی «تلاش» → ۴۴ رول؛ زبانهٔ EVA با ستون کد EVA؛ جدول ۶۶ گروه برش‌خورده با سلول‌های cw و دیالوگ جزئیات گروه (فیلتر کلید گروه سمت کلاینت کار کرد)
- تنظیمات: تغییر ظرفیت ۵۰۰۰→۶۰۰۰ → فرمول زندهٔ «۱ روز و ۱ ساعت (۲۴٫۹ ساعت)» به‌روز شد + فعال‌شدن دکمهٔ ذخیره + صرف‌نظر → بازگشت
- خطای صفحه/کنسول: صفر ✅ — lint پاس ✅ — tsc (فایل‌های خودمان) بدون خطا ✅

تصمیم‌ها و نکات:
- رنگ نمودارها از متغیرهای CSS تم (var(--chart-1..5)) — سازگار با dark mode و بدون آبی/نیلی
- نگاشت: گزینهٔ «— خودکار —» با sentinel `__auto__` (Radix Select مقدار خالی را قبول نمی‌کند)؛ هینت «انتخاب مؤثر» با buildFieldMapping سمت کلاینت
- دیالوگ جزئیات گروه برش‌خورده از همان کوئری کش‌شدهٔ ['rolls','cut'] استفاده می‌کند (enabled تنبل)
- درج سقف ۱۵۰/۲۵۰ ردیف + «نمایش بیشتر» برای جلوگیری از رندر هزاران DOM (۲٬۷۹۳ رول برش‌خورده)
- درصد سهم دسته‌ها در خلاصهٔ Import با faNum(…,1) + ٪
- خطاهای pre-existing در examples/ و skills/ در tsc مربوط به فایل‌های خارج از scope این تسک است

Stage Summary:
- هر ۵ نما طبق قرارداد types/eva.ts کامل، ریسپانسیو، RTL و فارسی‌سازی‌شده است و روی دادهٔ واقعی تست شد
- گزارش‌گیری بصری نهایی و تست حالت‌های خاص (فایل خراب، خطای ۴۰۰ نگاشت) با مالک پروژه انجام شود

---
Task ID: 3
Agent: main (Z.ai Code)
Task: یکپارچه‌سازی، تست‌های مرورگر کامل (E2E)، رفع خطا و نهایی‌سازی

Work Log:
- lint کامل پاس شد؛ tsc فقط خطاهای پیش‌زمینه examples/skills دارد (غیرمرتبط)
- تست‌های E2E با agent-browser (همه موفق):
  * داشبورد: KPI ها (خام ۷۷/۱۸٬۶۷۸٫۷۲kg، مانده ۱ روز و ۶ ساعت/۲۹٫۹ ساعت)، چارت ستونی مانده زمان به تفکیک ۴ ستاپ با وزن هر ستاپ روی میله‌ها (۶۰٫۷۴/۴۱٫۸۶/۶۵۳٫۸۱/۱۷٬۹۲۲٫۳۱)، ۳ نمودار رندر شد
  * آپلود واقعی فایل EVA Data.xls از UI: خلاصه Import با ۷ دسته (خام ۷۷/EVA ۶۹/برش‌خورده ۲٬۷۹۳/خطاها ۰/خارج محدوده ۱/سایر ۵٬۲۴۹) ✓
  * زبانه رول‌ها: ۳ زیرزبانه + جستجو + مرتب‌سازی + جدول ۶۶ گروه برش‌خورده با سلول‌های دوخطی گرید X/U/Q/T + دیالوگ جزئیات گروه ✓
  * تنظیمات — دسته‌بندی زنده: تغییر حداکثر عرض ۱۹۸۰→۲۰۳۰ → خام ۷۷→۷۸ و اطلاع ۱→۰ (بدون Import مجدد) و بازگشت ✓
  * تنظیمات — بازسازی نگاشت: تغییر نگاشت «موقعیت فعلی»→«شیفت» + rebuild → توزیع موقعیت‌ها A/C/B شد و بازگردانی خودکار ✓
  * هشدارها: با محدود کردن فیلم EVA به FST32 → هشدار قرمز «E بدون فیلم EVA» با ۱٬۴۴۹ رول + دیالوگ drill-down باز شد و برگشت ✓
  * دیالوگ هشدار اطلاعی (رول ۲۰۳۰: F1500710171R4P2:0) ✓
  * تم تاریک ✓ · موبایل ۳۹۰px بدون سرریز افقی ✓ · فوتر sticky در viewport بلند و push طبیعی در محتوا بلند ✓
  * راهنما: ۸ بخش آکاردئونی با فرمول و مثال عددی ✓
- رفع نکات: واحد kg لاتین → «کیلوگرم» فارسی در کارت KPI؛ فایل نمونه به public/samples/EVA Data.xls منتقل + لینک «دریافت فایل نمونه» در صفحه ورود داده‌ها
- سرور dev یک‌بار متوقف شد (خارج از اپ) → مجدداً در پس‌زمینه راه‌اندازی و صحت‌سنجی شد
- کنترل بصری نهایی با مدل بینایی (VLM): داشبورد دسکتاپ و موبایل — «حرفه‌ای، تمیز، بدون گلچ بصری، RTL صحیح»

Stage Summary:
- پروژه کامل و تست‌شده است: ۵ صفحه (داشبورد/ورود داده‌ها/رول‌ها با ۳ زیرزبانه/تنظیمات/راهنما)
- همه نیازمندی‌های کاربر پیاده و با داده واقعی ۸٬۱۸۹ سطری تأیید شد
- داده نمونه در دیتابیس فعلی بارگذاری است؛ کاربر می‌تواند فایل خودش را جایگزین کند

---
Task ID: 4
Agent: main (Z.ai Code)
Task: بررسی وجود «نسخهٔ ۳٫۷ با آخرین تغییرات» پیش از اعمال ۹ تغییر جدید (دستور مشروط کاربر)

Work Log:
- کاربر اعلام کرد نسخهٔ فعلی پروژه باید ۳٫۷ باشد و از پنل «پشتیبان‌گیری و بازیابی» با دکمهٔ «ساخت فایل پشتیبان» فایل JSON پشتیبان ساخته است؛ دستور: اگر نسخهٔ ۳٫۷ را داشتم ۹ تغییر را اعمال کن و نسخه را افزایش بده؛ اگر نداشتم کاری نکن و اطلاع بده
- بررسی کامل انجام شد:
  * footer در src/app/page.tsx سطر ۱۸۲ = «سامانه مانیتورینگ رول‌های EVA — نسخه ۱٫۰» — هیچ اشاره‌ای به ۳٫۷ در کل پروژه نیست
  * settings-view.tsx فقط ۳ کارت دارد (پارامترهای سامانه / نگاشت ستون‌های اکسل / راهنمای کوتاه) — پنل «پشتیبان‌گیری و بازیابی» وجود ندارد
  * grep سراسری «پشتیبان | backup | بازیابی» در src فقط نتایج بی‌ربط (متن راهنما/کامنت) داد
  * git فقط ۲ کامیت (Initial + session)؛ worklog فقط Task 1/2-a/2-b/3 یعنی ساخت اولیهٔ نسخهٔ ۱٫۰
  * هیچ فایل JSON پشتیبانی در download/، upload/، tool-results/، /tmp وجود ندارد؛ لینک فایل پشتیبان هم در متن پیام کاربر نیامده بود
  * پروژهٔ مرجع Metallized (نسخهٔ ۳٫۶) در /home/z/metallized-ref موجود است — دارای js/backup.js (الگوی پنل پشتیبان) و الگوی کامل جداول (فیلتر ستونی «شامل»/مرتب‌سازی/ترتیب ستون‌ها/ردیف‌های قابل نمایش) که مبنای تغییرات ۴ و ۸ کاربر خواهد بود
- نتیجه: نسخهٔ ۳٫۷ (و تغییرات ۲٫x تا ۳٫۷ از جمله پنل پشتیبان) در این محیط موجود نیست؛ فقط نسخهٔ ۱٫۰ کامل و تست‌شده موجود است
- طبق دستور صریح کاربر («اگر آن را نداشتی کاری نکن و به من اطلاع بده») هیچ تغییری در کد/دیتابیس اعمال نشد
- ۹ تغییر درخواستی تحلیل و به‌صورت لیست منظم در پاسخ کاربر ارائه شد — آمادهٔ اجرا پس از تعیین تکلیف نسخهٔ مبنا

Stage Summary:
- نتیجهٔ بررسی: نسخهٔ ۳٫۷ در اختیار نیست؛ موجود = نسخهٔ ۱٫۰ (ساخت اولیهٔ کامل، سالم و تست‌شده با دادهٔ نمونهٔ ۸۱۸۹ سطری)
- دو مسیر به کاربر پیشنهاد شد: (الف) ارسال مجدد فایل پشتیبان JSON + کد/شرح تغییرات نسخهٔ ۳٫۷، یا (ب) مجوز اعمال ۹ تغییر روی نسخهٔ ۱٫۰ موجود
- هیچ تغییری اعمال نشده؛ سرور dev روی پورت ۳۰۰۰ سالم است

---
Task ID: 5
Agent: main (Z.ai Code)
Task: تصحیح مبنا به نسخهٔ ۱ — تحلیل کامل ۹ تغییر جدید و تهیهٔ لیست اجرایی (نسخهٔ ۱٫۰ → ۱٫۱)

Work Log:
- کاربر تصحیح کرد: مبنا نسخهٔ ۱ است (نه ۳٫۷). بررسی شد: نسخهٔ ۱٫۰ با آخرین تغییرات (پایان Task 3) کامل موجود است — سرور سالم، دادهٔ eva-sample ایمپورت‌شده. شرط «داشتن نسخهٔ ۱» برقرار → اجرای ۹ تغییر + افزایش نسخه در پایان مجاز است
- نکتهٔ فایل پشتیبان کاربر: لینک JSON در پیام نرسید؛ ولی چون نسخهٔ ۱٫۰ اصلاً پنل پشتیبان ندارد، آن فایل مربوط به پروژهٔ دیگری بوده و نیازی به آن نیست — دادهٔ آماده (۸۱۸۹ سطر) از قبل در DB بارگذاری است
- پروژهٔ مرجع متالایز (نسخهٔ ۳٫۶ در /home/z/metallized-ref) برای موارد ۴ و ۸ به‌طور کامل مطالعه شد:
  * ui.js: سیستم filterTable — ردیف فیلتر زیر سرستون (input «فیلتر…» + دکمهٔ کوچک «≠» برای سوییچ شامل‌بودن/شامل‌نشودن)، دکمهٔ «پاک‌کردن همهٔ فیلترها» بالای جدول با شمارندهٔ فعال، نوار پایین (یادداشت + چیپ وضعیت «X از Y رکورد (فیلترشده)» + باکس «ردیف‌های قابل نمایش»)، نرمال‌سازی ارقام فارسی/جداکننده‌ها در تطبیق، جمع‌های ستونی با دیتای فیلترشده (tfoot چسبان)، maxDomRows، ارتفاع جدول = تعداد ردیف × ارتفاع ردیف
  * ui.js: sortPanel — مرتب‌سازی چندسطحی با چیپ‌های کشیدنی (شمارهٔ اولویت + جهت ↑/↓ + حذف) و orderPanel — ترتیب ستون‌ها با کشیدن + دکمهٔ چشم نمایش/مخفی + باکس عرض px
  * backup.js: ساختار payload {app, schemaVersion, exportedAt, counts, data} + نام فایل شمسی + validate (خطاهای فارسی دقیق) + restore تراکنشی (clear + bulkAdd)
  * index.html: پنل «پشتیبان‌گیری و بازیابی» = هشدار زرد + دکمهٔ «ساخت فایل پشتیبان» + «بازیابی از فایل» (input مخفی)
- فایل‌های فعلی پروژه برای نقاط تغییر بررسی شد:
  * rolls-view.tsx سطرهای ۳۸۹/۶۲۱/۶۷۷: faInt(year) → سال با جداکنندهٔ هزارگان نمایش داده می‌شود (نقض بند ۸) → نیاز به faYear بدون جداکننده
  * settings-view.tsx: کارت پارامترها — گرید lg:grid-cols-2 باعث می‌شود ۳ فیلد عددی خام (حداقل عرض/حداکثر عرض/ضخامت) در نیمهٔ چپ و ادیتور فیلم در نیمهٔ راست قرار گیرند و لیبل‌های هم‌طول‌نبودن + hint های اختیاری باعث ناترازی عمودی شود (بند ۹)؛ واحد «kg» لاتین در ظرفیت (بند ۲)
  * dashboard-view.tsx: دونات گرید Tooltip شناور (سطر ۴۹۸) + لیبل مرکزی مجموع → تداخل (بند ۷)؛ محورهای نمودار LTR (بند ۶)
  * page.tsx: ترتیب زبانه‌ها DOM = داشبورد…راهنما؛ باید تأیید بصری شود داشبورد سمت راست است (بند ۵)؛ footer نسخه ۱٫۰ → ۱٫۱
  * layout.tsx: dir="rtl" lang="fa" از قبل برقرار (بند ۳ پایه‌اش هست)
- src/lib/eva/version.ts ساخته شد: APP_NAME + APP_VERSION='1.1' + BACKUP_SCHEMA_VERSION=1 (منبع واحد نسخه برای footer، پنل پشتیبان و API)
- لیست اجرایی نهایی (۹ بند تفکیک‌شده به زیرمجموعه‌های فنی) ثبت شد — در پاسخ کاربر نیز ارائه می‌شود
- تخصیص اجرا: Task 6-a (API پشتیبان — زیرایجنت) ∥ Task 6-b (سیستم DataTable + ماندگاری UI) → Task 7 (نمودارها/پنل پشتیبان UI/تراز فیلدها/ترتیب زبانه‌ها/راهنما/ممیزی فارسی-RTL) → Task 8 (یکپارچه‌سازی + E2E + گزارش)

Stage Summary:
- مبنا تأیید شد: نسخهٔ ۱٫۰ کامل موجود؛ اجرای ۹ تغییر مجاز و شروع شد
- لیست جامع ۹ بند با جزئیات فنی هر بند تهیه و در این بخش ثبت شد (منبع مرجع برای Task های 6-a/6-b/7/8)
- version.ts با APP_VERSION='1.1' ایجاد شد — در پایان کار footer و پشتیبان از آن استفاده می‌کنند

---
Task ID: 6-a
Agent: backend-backup (Z.ai Code)
Task: API پشتیبان‌گیری و بازیابی (GET /api/backup ساخت فایل پشتیبان + POST بازیابی) — بند ۴ از ارتقای ۱٫۰→۱٫۱، الگوی backup.js متالایز (§61-§62 و §72)

Work Log:
- worklog + فایل‌های قرارداد مطالعه شد (types/eva.ts، api-helpers، settings.ts، route های settings/import، schema.prisma، version.ts، متالایز backup.js)؛ نکته: کلید تنظیمات در DB «evaSettings» است (نه eva-settings) — از ثابت SETTINGS_KEY استفاده شد
- src/app/api/backup/route.ts (فایل جدید — تنها فایل این تسک):
  * GET: خواندن هر سه جدول (Setting با orderBy key / ImportBatch و Roll با orderBy id — خروجی قطعی) + ROLL_BACKUP_SELECT اختصاصی شامل rawJson (ROLL_SELECT مشترک آن را ندارد) → payload {app, schemaVersion, appVersion, exportedAt, counts, data{settings, importBatches, rolls}} همه عین‌گونه بدون گردکردن → پاسخ با Content-Type: application/json; charset=utf-8 و Content-Disposition: attachment; filename="EVA-Monitor-Backup-<شمسی YYYY-MM-DD>.json" (ارقام لاتین؛ امروز: 1405-07-01؛ با Intl.DateTimeFormat('en-US-u-ca-persian').formatToParts و حذف غیرارقام) + Cache-Control: no-store
  * POST: request.json() (خراب → «ساختار فایل معتبر نیست.») → اعتبارسنجی با جمع‌کردن همهٔ خطاها (الگوی §72): app === APP_NAME، schemaVersion === BACKUP_SCHEMA_VERSION، data شیء، هر سه جدول آرایه (خالی بودن importBatches مجاز؛ کلید گم‌شده = خطا)، سقف rolls > 200000، اعتبارسنجی حداقلی سطرها با شمارش در پیام (تنظیمات: key/value رشته‌ای + ردیف evaSettings باید JSON پارس شود؛ batch: fileName رشته + totalRows عدد + headers قابل‌پارس به آرایه + counts قابل‌پارس به شیء — رشتهٔ JSON یا مقدار بومی پذیرفته می‌شود؛ رول: rollNumber/filmType رشته + netWeight عدد یا null) → 400 {ok:false, message:'فایل پشتیبان معتبر نیست:', errors[...]}
  * بازیابی اتمیک در یک $transaction (timeout 120s): deleteMany×۳ → Setting ها با createMany چانک ۵۰۰تایی (فقط key/value) → ImportBatch ها تک‌به‌تک (برای گرفتن id جدید و نگاشت id قدیمی→جدید) → Roll ها با createMany چانک ۵۰۰تایی (strip id؛ فیلدها عین‌گونه؛ rawJson: رشته عین‌گونه / شیء→JSON.stringify / سایر→«{}»؛ batchId با نگاشت به batch جدید بازنویسی می‌شود تا ارجاع معتبر بماند) → 200 {ok:true, counts{settings, importBatches, rolls}}
  * خطای غیرمنتظره → 500 {ok:false, message:'خطای داخلی سرور'} + console.error (serverError مشترک)؛ runtime='nodejs' + dynamic='force-dynamic'؛ بدون 'use client'/'use server'
- اصلاحات حین توسعه: importedAt عدد epoch → new Date() (پرایما رشته/Date می‌پذیرد)؛ متغیرهای محلی settingsRows/batchRows/rollRows با cast بعد از گارد آرایه‌بودن (TS narrowing بعد از errors.length زنده نمی‌ماند)؛ اولویت resolveBatchId: نگاشت‌شده → اولین batch بازیابی‌شده → مقدار عین‌گونه → 0
- lint پاس ✅ — tsc (فایل‌های این تسک) بدون خطا ✅ — dev.log بدون خطای غیرمنتظره ✅
- تست‌های curl (همه موفق — سرور پورت ۳۰۰۰):
  * GET /api/backup → 200 با 15,149,178 بایت در ~۰٫۷s؛ filename="EVA-Monitor-Backup-1405-07-01.json" ✓؛ counts={settings:1, importBatches:1, rolls:8189} ✓؛ هر ۸۱۸۹ رول rawJson غیرخالی ✓؛ batch با headers/counts رشتهٔ JSON ✓
  * شبیه‌سازی از دست دادن داده: DELETE /api/import → settings lastImport:null + dashboard همه صفر ✓
  * POST /api/backup با فایل کامل → 200 {ok:true, counts:{1,1,8189}} در ~۱٫۵s → dashboard عین baseline (خام ۷۷/۱۸٬۶۷۸٫۷۲، EVA ۶۹/۸٬۳۷۶٫۶۵، برش ۲٬۷۹۳/۸۵٬۷۳۸٫۶۶، مانده ۱٫۲۴۵ روز/۲۹٫۸۸۶ ساعت، خطا ۰/اطلاع ۱ — مقایسهٔ عمیق با حذف id های خودافزایش: یکسان) ✓؛ raw rolls 77/18678.72 ✓؛ cut-groups 66/2793/85738.66 ✓؛ importedAt اصلی عین‌واره حفظ شد ✓؛ batchId همهٔ رول‌ها به batch جدید نگاشت شد (۰ ارجاع شکسته) ✓
  * خطاها: {} → 400 با ۳ خطا (app/schemaVersion undefined/data) ✓؛ {"app":"wrong","schemaVersion":1,"data":{}} → 400 «این فایل متعلق به سامانه مانیتورینگ رول‌های EVA نیست.» + ۳ خطای جدول ✓؛ بدنهٔ غیر JSON → «ساختار فایل معتبر نیست.» ✓؛ یک رول بدون rollNumber → «۱ رکورد رول در فایل ساختار نامعتبر دارد.» ✓؛ evaSettings با JSON خراب → «تنظیمات ذخیره‌شده در فایل معتبر نیست.» ✓؛ batch با totalRows رشته‌ای → «۱ رکورد ورود داده‌ها در فایل ساختار نامعتبر دارد.» ✓؛ ۲۰۰٬۰۰۱ رول → «حجم فایل پشتیبان بیش از حد مجاز است.» ✓ — هیچ POST نامعتبر داده را تغییر نداد ✓
  * حالت‌های خاص: پشتیبان فقط-تنظیمات (آرایه‌های خالی) → بازیابی موفق {1,0,0} و params زنده ماند ✓؛ فایل دست‌ساز با headers/counts بومی (آرایه/شیء) + rawJson شیء → به رشتهٔ JSON تبدیل و ذخیره شد ✓؛ Export از DB خالی → 200 معتبر {1,0,0} ✓
  * رفت‌وبرگشت: خروجی مجدد بعد از بازیابی — counts یکسان و هر ۸۱۸۹ رول محتوای یکسان (بدون id/batchId) ✓
- وضعیت نهایی DB: کاملاً بازیابی‌شده (settings:1 / importBatches:1 / rolls:8189) — آماده برای Task 7

Stage Summary:
- بک‌اند پشتیبان‌گیری/بازیابی کامل و تست‌شده؛ هیچ فایل موجودی تغییر نکرد (فقط فایل جدید route.ts)
- قرارداد دقیق برای Task 7 (پنل «پشتیبان‌گیری و بازیابی» در صفحهٔ تنظیمات):
  * GET /api/backup → 200 با هدر Content-Disposition: attachment; filename="EVA-Monitor-Backup-<شمسی>.json" و Content-Type: application/json; charset=utf-8. بدنه: {app:'سامانه مانیتورینگ رول‌های EVA', schemaVersion:1, appVersion:'1.1', exportedAt:ISO, counts:{settings,importBatches,rolls}, data:{settings:[{key,value}], importBatches:[{id,fileName,sheetName,importedAt,totalRows,headers,counts}], rolls:[...شامل rawJson]}}. UI می‌تواند مستقیم <a href="/api/backup"> بگذارد یا fetch→blob→download کند؛ برای نمایش خلاصه، متن blob را JSON.parse و counts را بخواند
  * POST /api/backup → بدنه: همان JSON پارس‌شدهٔ فایل (Content-Type: application/json؛ نه multipart). موفق: 200 {ok:true, counts:{settings:number, importBatches:number, rolls:number}}. نامعتبر: 400 {ok:false, message:'فایل پشتیبان معتبر نیست:', errors:string[]} — آرایهٔ errors را فهرستی (ul) زیر message نمایش دهد. سایر: 500 {ok:false, message:'خطای داخلی سرور'}
  * پیام‌های errors (فارسی، ثابت): «ساختار فایل معتبر نیست.» / «این فایل متعلق به سامانه مانیتورینگ رول‌های EVA نیست.» / «نسخهٔ ساختار پشتیبان (X) پشتیبانی نمی‌شود.» / «بخش داده‌های فایل یافت نشد.» / «جدول «تنظیمات|ورود داده‌ها|رول‌ها» در فایل یافت نشد یا معتبر نیست.» / «X رکورد تنظیمات|ورود داده‌ها|رول در فایل ساختار نامعتبر دارد.» (اعداد فارسی) / «تنظیمات ذخیره‌شده در فایل معتبر نیست.» / «حجم فایل پشتیبان بیش از حد مجاز است.»
  * نکتهٔ UI: بازیابی جایگزینی کامل است (دادهٔ فعلی حذف می‌شود) — قبل از POST حتماً تأیید بگیرد (الگوی متالایز §70)؛ بعد از موفقیت همهٔ کوئری‌ها (dashboard/rolls/settings/cutGroups) را invalidate کند

---
Task ID: 6-b
Agent: frontend-tables (Z.ai Code) — تکمیل و تأیید توسط main
Task: سیستم DataTable الگوی متالایز (بند ۸) + ماندگاری وضعیت UI (بند ۱) + سال بدون جداکننده (بند ۸)

Work Log:
- زیرایجنت پیاده‌سازی را کامل کرد اما در مرحلهٔ تست مرورگر به سقف نوبت رسید؛ main ادامهٔ تأیید و اصلاحات را انجام داد
- src/lib/eva/use-persistent-state.ts (جدید): هوک usePersistentState — localStorage-backed، SSR-safe، الگوی eslint-disable مطابق page.tsx برای بازیابی یک‌باره
- src/lib/eva/format.ts: faYear اضافه شد (عدد صحیح بدون جداکنندهٔ هزارگان — رفع باگ نمایش سال به‌صورت ۱٬۴۰۵)
- src/components/eva/data-table.tsx (جدید — هستهٔ بند ۸): کامپوننت DataTable با:
  * نوار ابزار بالای جدول: «مرتب‌سازی» (Popover چندسطحی با چیپ‌های کشیدنی dnd-kit + اولویت + جهت ↑/↓ + حذف + افزودن سطح) و «ترتیب ستون‌ها» (Popover چیپ‌های کشیدنی + دکمهٔ چشم نمایش/مخفی + ورودی عرض px با placeholder «خودکار» + الزام حداقل یک ستون نمایان) و «پاک‌کردن همهٔ فیلترها» (غیرفعال بدون فیلتر فعال + شمارنده + toast)
  * ردیف فیلتر زیر سرستون هر ستون: input «فیلتر…» + دکمهٔ کوچک «≠» سوییچ شامل‌بودن/شامل‌نشودن (title های دقیق متالایز)؛ نرمال‌سازی ارقام فارسی/عربی + حذف جداکننده‌ها + lowercase روی کوئری و توکن‌ها
  * مرتب‌سازی چندسطحی (null ها همیشه آخر)، سقف رندر DOM (maxDomRows=300)، ارتفاع اسکرول = ردیف‌های قابل نمایش × ارتفاع ردیف
  * نوار پایین: یادداشت + چیپ وضعیت «X از Y رکورد (فیلترشده)» + «نمایش M ردیف» + ورودی «ردیف‌های قابل نمایش» (۵..۲۰۰، پیش‌فرض ۲۵)
  * ردیف جمع چسبان (tfoot) با دیتای فیلترشده (number/pair)
  * ماندگاری کامل: eva-table-{id}-filters/-sort/-columns/-rows + merge سازگار ستون‌های جدید
- rolls-view.tsx بازنویسی شد: هر ۴ جدول با DataTable (rolls-raw / rolls-eva با ستون کد EVA / rolls-cut با سلول‌های دوخطی گرید / rolls-cut-detail در دیالوگ) + ماندگاری زیرزبانهٔ فعال (eva-rolls-subtab) + سال‌ها با faYear — حذف SearchBox/SortableHead/سقف ۱۵۰ردیف
- import-view.tsx: جدول خلاصهٔ ۷ دسته → DataTable (import-summary) با جمع تعداد/وزن
- اصلاح main پس از تأیید: واحدهای لاتین سرستون‌ها → فارسی («عرض (mm)»→«عرض (میلی‌متر)»، «ضخامت (μ)»→«ضخامت (میکرون)»، «متراژ (m)»→«متراژ (متر)»، «وزن خالص (kg)»→«وزن خالص (کیلوگرم)») در rolls-view + dashboard-view (بند ۲)
- lint پاس ✅ — tsc بدون خطا (فایل‌های پروژه) ✅
- تست مرورگر (main، agent-browser):
  * زبانهٔ فعال «رول‌ها» + زیرزبانهٔ «رولهای EVA» بعد از باز شدن مجدد مرورگر از localStorage بازیابی شد ✓ (بند ۱)
  * فیلتر «FTT32» روی نوع فیلم → ۱۸ ردیف + چیپ «(فیلترشده)» ✓؛ کلیک ≠ → ۵۱ ردیف (شامل نشود) ✓؛ رفرش صفحه → مقدار فیلتر و نتیجه عیناً برگشت ✓
  * «پاک‌کردن همهٔ فیلترها» → جدول گروه‌ها از ۶۲ به ۶۶ رکورد کامل برگشت ✓
  * پنل مرتب‌سازی: باز شد، دکمهٔ جهت + combobox «افزودن سطح مرتب‌سازی» ✓
  * پنل ترتیب ستون‌ها: ۱۲ چیپ شماره‌دار (۱..۱۲) با px و کشیدن dnd-kit (دستورالعمل کیبورد نیز حاضر) ✓
  * ورودی «ردیف‌های قابل نمایش» = ۲۵ ✓
  * ستون سال جدول برش‌خورده‌ها: «۱۴۰۵» بدون جداکننده ✓ (hasSeparator=false)

Stage Summary:
- سیستم جداول متالایزی + ماندگاری کامل وضعیت پیاده و تست‌شده؛ بند ۸ (به‌جز جدول‌های dashboard-view که با Task 7 تبدیل می‌شوند) و بخش جداول بند ۱ کامل
- API کامپوننت DataTable برای Task 7: import { DataTable, type DataTableColumn } from '@/components/eva/data-table' — props: tableId, columns[{key,label,render,tokens,filterable,width,align,className,sortableType}], rows, getRowKey, compact?, sums?{colKey:{type:'number',format}|{type:'pair',weightOf}}, defaultVisibleRows?, maxDomRows?, emptyText?, footerNote? — نمونهٔ استفاده: rolls-view.tsx (جدول‌های اصلی و دیالوگ compact)
- نکته برای Task 7: جاهای Latin باقی‌مانده (mm/μ/kg) در dashboard-view سرستون‌های دیالوگ هشدارها باید فارسی شود؛ ستون‌های سرستون دیالوگ هشدار: شماره رول/نوع فیلم/عرض/ضخامت/ستاپ

---
Task ID: 7
Agent: frontend-final (Z.ai Code)
Task: تغییرات باقی‌ماندهٔ رابط کاربری ارتقای ۱٫۰ → ۱٫۱ — بندهای ۲، ۳، ۴، ۵، ۶، ۷، ۸ و ۹ (پنل پشتیبان UI، تراز فیلدها، نمودارهای RTL، دونات بدون تولتیپ، ترتیب زبانه‌ها، جدول هشدارها با DataTable، ممیزی فارسی/RTL/سال، نسخهٔ ۱٫۱ و راهنما)

Work Log:
- قرارداد Task 6-a (API پشتیبان) و Task 6-b (DataTable) از worklog مطالعه و همهٔ فایل‌های هدف کامل خوانده شد؛ icons.ts با HardDriveDownload و ArchiveRestore (lucide) گسترش شد
- **بند ۴ (Item A) — settings-view.tsx**: کامپوننت BackupCard جدید بین کارت نگاشت و راهنمای کوتاه: هشدار کهربایی (AlertTriangle + «هشدار مهم»)، دکمهٔ «ساخت فایل پشتیبان» (fetch /api/backup → blob → پارس یک‌باره برای counts/exportedAt → دانلود با نام Content-Disposition وگرنه EVA-Monitor-Backup.json + toast موفقیت با شمارش فارسی + Loader2 هنگام کار)، دکمهٔ «بازیابی از فایل» (input مخفی .json → JSON.parse؛ خطای پارس → toast+Alert «ساختار فایل معتبر نیست.»)؛ پیش‌اعتبارسنجی ساختاری سمت کلاینت (validateBackupStructure با پیام‌های هماهنگ سرور: app===APP_NAME، schemaVersion===BACKUP_SCHEMA_VERSION از version.ts، آرایه‌بودن سه جدول) → فایل نامعتبر مستقیم Alert خطا بدون دیالوگ؛ فایل معتبر → AlertDialog تأیید (نام فایل + رول‌ها/ورود داده‌ها/تنظیمات با faInt + exportedAt با faDateTime + هشدار قرمز «جایگزینی کامل… بازگشت‌پذیر نیست.» + انصراف/بازیابی مخرب) → POST /api/backup → موفق: toast + queryClient.invalidateQueries() همهٔ کوئری‌ها + خط «آخرین عمل: …» گذرا؛ ۴۰۰: Alert با message + errors به‌صورت ul فارسی؛ دیالوگ در حین isPending با اسپینر باز می‌ماند و دکمه‌ها disable
- **بند ۹ (Item B) — settings-view.tsx**: هر دو بخش کارت پارامترها بازساخت شد: FilmTypesEditor ردیف تمام‌عرض + سه فیلد عددی در یک ردیف grid-cols-1 sm:grid-cols-3 یکسان؛ NumFieldBox با ناحیهٔ لیبل min-h-6 (flex items-start) + ناحیهٔ hint همیشه‌حاضر min-h-4 (خالی هم رندر می‌شود) + ورودی h-11 → هم‌ترازی عمودی کامل حتی با hint های اختیاری؛ واحدهای لاتین → فارسی: unit="mm"×2 → «میلی‌متر»، unit="kg" → «کیلوگرم» (pl-14→pl-16 برای جای واحد فارسی)؛ منطق draft/اعتبارسنجی/ذخیره/فرمول زنده دست‌نخورده
- **بند ۶ (Item C) — dashboard-view.tsx**: نمودار اصلی ComposedChart: XAxis reversed (ستاپ ۶۹ سمت راست، ۹۰ سمت چپ)، محور ساعت orientation=right + لیبل insideTopRight، محور کیلوگرم orientation=left + لیبل insideTopLeft، متن توضیح کارت به‌روز («ساعت، محور راست»)، Legend سفارشی با dir=rtl (مانده زمان از راست خوانده می‌شود)، margin ها 10px؛ نمودار افقی موقعیت: XAxis type=number reversed (میله‌ها از راست رشد می‌کنند — همهٔ میله‌ها به لبهٔ راست 593 می‌چسبند)، YAxis category orientation=right (لیبل موقعیت‌ها سمت راست)، radius آینه‌ای [4,0,0,4]، LabelList position="right" (کشف شد در محور معکوس recharts چپ/راست لیبل را برعکس تفسیر می‌کند؛ با "left" لیبل‌ها روی محور دسته‌ها می‌افتاد — با box-های دقیق تست و اصلاح شد: لیبل وزن حالا کنار نوک میله در چپ، بدون برخورد و بدون کلیپ، margin left=56)
- **بند ۷ (Item D) — dashboard-view.tsx**: Tooltip دونات کاملاً حذف شد (و کامپوننت DistTooltip)؛ state فعال activeGrade با onMouseEnter/onMouseLeave روی Pie و آیتم‌های legend زیر نمودار؛ لیبل مرکزی پویا: حالت پیش‌فرض «مجموع وزن برش‌خورده/faWeightShort/کیلوگرم» و هنگام هاور «گرید X/وزن/N رول · درصد ۱رقمی ٪» — همان ساختار ۳خطی بدون جابه‌جایی چیدمان؛ قطاع فعال با opacity و سایرین کم‌رنگ؛ رفع باگ «گرید گرید X» (لیبل API خودش «گرید X» است — پیشوند حذف شد)
- **بند ۵ (Item E) — page.tsx**: کشف ریشه‌ای: ریشهٔ Radix Tabs به‌طور پیش‌فرض dir="ltr" رندر می‌کند و علی‌رغم dir=rtl صفحه، زبانه‌ها را چپ‌به‌راست می‌چیند (داشبورد سمت چپ!) — با getBoundingClientRect ثابت شد؛ اصلاح: dir="rtl" روی هر دو <Tabs> صفحه (نوار زبانه‌ها + محتوا)؛ TAB_VALUES و ترتیب DOM/ذخیره‌سازی دست‌نخورده؛ بعد از اصلاح: داشبورد x=1089 (راست‌ترین) → ورود داده‌ها → رول‌ها → تنظیمات → راهنما x=110 (چپ‌ترین)؛ موبایل 390px: scrollLeft=0 از راست شروع می‌شود، اولین زبانهٔ نمایان = داشبورد ✓
- **بند ۸ بخش جدول هشدارها (Item F) — dashboard-view.tsx**: جدول دست‌ساز دیالوگ هشدار → DataTable مشترک با WARN_COLUMNS (شماره رول با span.ltr-code+tokens، نوع فیلم، عرض (میلی‌متر)، ضخامت (میکرون)، شماره ستاپ — همه sortableType=number و فارسی) + tableId پویا dashboard-warn-{key} (فیلترها/چیدمان هر نوع هشدار جدا ماندگار) + compact + defaultVisibleRows=10؛ import های Table حذف شد؛ سربرگ/توضیح دیالوگ دست‌نخورده
- **بند ۲/۳/۸ ممیزی (Item G)**: grep فارسی: تنها موارد لاتین = unit های mm/kg (بند ۲ — اصلاح شد در Item B)؛ xls/xlsx/EVA/FSN02/FTT32/گریدها مجاز؛ ممیزی سال: هیچ faInt(year) در کل src نیست (rolls-view از Task 6-b همه faYear دارد؛ داشبورد/راهنما سال چهاررقمی فارسی ثابت دارند — ۱۴۰۵)؛ RTL: charts (بند ۶)، دیالوگ‌ها dir=rtl، toasts طبق دستور همان bottom-left ماند، KPI/بج/دراپ‌زون از dir=rtl سرریث می‌کنند — مورد LTR دیگری یافت نشد
- **نسخه و راهنما (Item H)**: footer page.tsx → «سامانه مانیتورینگ رول‌های EVA — نسخه ۱٫۱» با import APP_VERSION از version.ts و toFaDigits().replace('.','٫')؛ help-view.tsx: بج «نسخه ۱٫۱» در سربرگ (از APP_VERSION)، بخش ۱: زیربخش جدید «ماندگاری داده‌ها و وضعیت» (بند ۱) + «نمودارهای داشبورد» (RTL نمودار اصلی + هاور دونات → مرکز + میله‌های موقعیت راست‌به‌چپ)، جدول صفحات به‌روز (رول‌ها: فیلتر ستونی/مرتب‌سازی چندسطحی؛ تنظیمات: + پشتیبان‌گیری)، بخش ۶: پاراگراف قدیمی «کلیک روی عنوان ستون‌ها و کادر جستجو» حذف و جدول کامل «ابزارهای جداول (جدید در نسخهٔ ۱٫۱)» جایگزین شد (فیلتر «شامل بودن» + «≠» شامل نشود، پاک‌کردن همهٔ فیلترها، مرتب‌سازی چندسطحی کشیدنی، ترتیب ستون‌ها با چشم+عرض px، ردیف‌های قابل نمایش ۵..۲۰۰، جمع ستونی فیلترشده، ماندگاری)، بخش ۴: اشاره به ابزارهای مشترک جدول در دیالوگ هشدار، بخش ۷: عنوان → «پارامترها، نگاشت ستون‌ها و پشتیبان‌گیری» + زیربخش کامل «پشتیبان‌گیری و بازیابی (جدید در نسخهٔ ۱٫۱)» با نام فایل نمونه، مراحل ساخت/بازیابی، رد فایل نامعتبر و AlertLike کهربایی توصیهٔ پشتیبان دوره‌ای؛ آیکون Search از imports حذف و HardDriveDownload/APP_VERSION/toFaDigits اضافه شد
- **تست مرورگر (agent-browser، همه موفق)**:
  * زبانه‌ها: قبل از اصلاح داشبورد x=110 (چپ‌ترین!) → بعد از dir=rtl: داشبورد 1089 (راست‌ترین)…راهنما 110 ✓ (Item E)؛ موبایل: اسکرول از راست، داشبورد اولین زبانهٔ نمایان ✓
  * نمودار اصلی: تیک X از راست: ۶۹(1120)→۷۲→۸۹→۹۰(319) ✓؛ محور ساعت راست (x=1267: ۰،۸،۱۶) و کیلوگرم چپ (x=137: ۰،۴٬۵۰۰،۹٬۰۰۰) ✓؛ legend از راست: «مانده زمان (ساعت)» سپس «وزن خام» ✓؛ لیبل‌های میله‌ها بدون کلیپ (راست‌ترین r=1192 < 1311، چپ‌ترین x=359 > 129) ✓؛ تولتیپ ستاپ ۹۰ هنگام هاور سالم ✓
  * دونات: هیچ Tooltip wrapper در DOM نیست ✓؛ مرکز پیش‌فرض «مجموع وزن برش‌خورده/۸۵٬۷۳۸٫۶۶/کیلوگرم» ✓؛ هاور قطاع X → «گرید X/۸۵٬۲۶۱٫۲۳/۲٬۷۷۵ رول · ۹۹٫۴٪» ✓ (رفع «گرید گرید X» تأیید شد)؛ هاور legend گرید T → «گرید T/۲۶۵٫۰۶/۹ رول · ۰٫۳٪» ✓؛ خروج ماوس → بازگشت به مجموع ✓ — بدون هیچ تولتیپ شناور = رفع تداخل بند ۷
  * نمودار موقعیت: میله‌ها لبهٔ راست مشترک 593 و رشد به چپ ✓؛ لیبل موقعیت‌ها x=600..649 سمت راست ✓؛ لیبل‌های وزن کنار نوک میله در چپ (165..196 < نوک 201) بدون برخورد و کلیپ ✓
  * پنل پشتیبان: کارت‌ها به‌ترتیب «پارامترها → نگاشت → پشتیبان‌گیری و بازیابی → راهنمای کوتاه» ✓؛ «ساخت فایل پشتیبان» → GET /api/backup 200 در network + toast «فایل پشتیبان ساخته شد — ۸٬۱۸۹ رول، ۱ ورود داده‌ها، ۱ تنظیمات — EVA-Monitor-Backup-1405-07-01.json» + خط «آخرین عمل: ساخت پشتیبان — ۱۴۰۵/۰۷/۰۱, ۱۴:۵۸» ✓؛ بازیابی فایل واقعی (curl 15MB): دیالوگ تأیید با نام فایل + «رول‌ها: ۸٬۱۸۹ رکورد/ورود داده‌ها: ۱/تنظیمات: ۱» + تاریخ + هشدار جایگزینی ✓ → تأیید → toast «بازیابی با موفقیت انجام شد.» + بسته‌شدن دیالوگ + داشبورد بعد از invalidate همچنان «۷۷ رول قابل مصرف» (داده سالم) ✓؛ فایل نامعتبر {"hello":1} → بدون دیالوگ، Alert قرمز با ۳ خطای فارسی (این فایل متعلق به… نیست/نسخهٔ ساختار (—) پشتیبانی نمی‌شود/بخش داده‌ها یافت نشد) ✓
  * تراز فیلدها: هر ۳ فیلد خام: labelY=-185 و inputY=-133 یکسان، inputH=44، hintH=16 (حتی بی-hint) ✓؛ هر ۳ فیلد EVA: labelY=146، inputY=198 یکسان ✓؛ واحدها فارسی (میلی‌متر/میکرون/کیلوگرم/شیفت/ساعت) ✓
  * دیالوگ هشدارها (DataTable): اطلاعی (۱ رول) → سرستون‌های ۵گانه + ۵ اینپوت فیلتر + «≠» + نوار ابزار (مرتب‌سازی/ترتیب ستون‌ها/پاک‌کردن همهٔ فیلترها) ✓؛ تست مسیر خطا: FTT32 از فیلم‌های EVA حذف و ذخیره شد → خطای «حرف E بدون فیلم EVA» با ۵۰ رول → دیالوگ: ۵۰ ردیف + چیپ «۵۰ رکورد» ✓ → FTT32 دوباره اضافه و ذخیره شد → داشبورد به حالت اولیه (صفر خطا، فقط اطلاع ۱ رول) برگشت ✓
  * پاصفحه: «سامانه مانیتورینگ رول‌های EVA — نسخه ۱٫۱» ✓؛ راهنما: بج نسخه + همهٔ محتوای جدید (بخش‌های ۱/۶/۷ باز و متون تأیید شدند؛ جستجوی قدیمی حذف شده) ✓
  * agent-browser errors خالی ✓؛ کنسول فقط Fast Refresh ✓
- lint پاس ✅ — bunx tsc --noEmit فقط خطاهای ازپیش‌موجود examples/ و skills/ (فایل‌های پروژه پاک) ✅ — dev.log بدون خطای ران‌تایم ✅
- نکتهٔ ریز: خروجی faDateTime با «, » لاتین بین تاریخ و ساعت است (خروجی استاندارد Intl fa-IR) — در کل برنامه یکدست است و دست نزدم (محدودیت format.ts: فقط append)
- **یافته برای Task 8 (خارج از محدودهٔ من — rolls-view.tsx فقط‌خواندنی)**: زیرزبانه‌های «رول‌ها» (خام/EVA/برش‌خورده) نیز همان باگ ریشه‌ای Radix Tabs dir=ltr را دارند — «رولهای خام» سمت چپ رندر می‌شود (x=108) در حالی که در RTL باید راست‌ترین باشد (اندازه‌گیری: خام 108 < EVA 229 < برش‌خورده 355). اصلاح یک‌خطی: افزودن dir="rtl" به <Tabs value={active}…> در rolls-view.tsx سطر ~541 (همان الگویی که در page.tsx اعمال شد)

Stage Summary:
- همهٔ ۸ ایتم (A تا H) تکمیل و در مرورگر تأیید شد؛ ارتقای ۱٫۰ → ۱٫۱ از نظر رابط کاربری کامل است: پنل پشتیبان‌گیری/بازیابی، تراز فیلدها + واحدهای فارسی، نمودارهای راست‌به‌چپ، دونات با مرکز پویا بدون تولتیپ، زبانه‌ها با داشبورد در راست، جدول هشدارها با DataTable، ممیزی فارسی/RTL/سال پاک، نسخهٔ ۱٫۱ و مستندات راهنما
- فایل‌های تغییریافته: src/app/page.tsx، src/components/eva/settings-view.tsx، src/components/eva/dashboard-view.tsx، src/components/eva/help-view.tsx، src/components/eva/icons.ts — API routes/rolls-view/import-view/data-table/prisma دست‌نخورده
- باقی‌مانده برای Task 8 (یکپارچه‌سازی + E2E نهایی): (۱) dir="rtl" روی زیرزبانه‌های rolls-view.tsx سطر ~541 (باگ مشترک Radix Tabs — بالا مستند شد)؛ (۲) مرور نهایی کل ۹ بند + E2E از صفر (ایمپورت→تنظیم→پشتیبان→بازیابی)؛ (۳) در صورت تمایل یکدست‌سازی جداکنندهٔ تاریخ/ساعت faDateTime به «،» فارسی

---
Task ID: 8
Agent: main (Z.ai Code)
Task: یکپارچه‌سازی نهایی، تست E2E کامل هر ۹ بند، افزایش نسخه به ۱٫۱ و گزارش نهایی

Work Log:
- اصلاحات نهایی main پس از Task 7:
  * rolls-view.tsx: dir="rtl" به <Tabs> زیرزبانه‌ها اضافه شد (همان باگ آینه‌ای Radix که Task 7 در زبانه‌های اصلی یافته بود — زیرزبانهٔ «رولهای خام» چپ‌ترین بود)
  * format.ts: faDateTime ویرگول لاتین Intl (۱۴۰۵/۰۷/۰۱, ۱۴:۵۸) → ویرگول فارسی (۱۴۰۵/۰۷/۰۱، ۱۴:۵۸) — بند ۲
  * (اصلاح واحدهای لاتین سرستون‌ها در Task 6-b توسط main انجام شده بود)
- lint پاس ✅ — tsc بدون خطا (فقط خطاهای پیش‌زمینهٔ examples/skills) ✅ — dev.log بدون خطای ران‌تایم ✅ — agent-browser errors خالی ✅
- تست E2E نهایی (agent-browser):
  * بند ۵: زبانه‌های اصلی — داشبورد x=1089 (راست‌ترین) → ورود داده‌ها → رول‌ها → تنظیمات → راهنما x=110 (چپ‌ترین) ✓؛ زیرزبانه‌های رول‌ها — خام x=1215 (راست) → EVA → برش‌خورده ✓
  * بند ۱: بعد از reload کامل — زبانهٔ فعال «تنظیمات» بازیابی شد ✓؛ (قبلاً: فیلتر FTT32 + منطق شامل‌نشود + زیرزبانهٔ EVA بعد از رفرش عیناً برگشت ✓)
  * بند ۶: نمودار اصلی — میله‌ها راست‌به‌چپ (اولی x=1051 راست، آخری x=250 چپ) ✓؛ محور ساعت راست/وزن چپ ✓؛ نمودار موقعیت‌ها — میله‌ها از راست رشد ✓
  * بند ۷: هاور قطاع دونات → مرکز «گرید U / ۱۹۰٫۳۴ / ۸ رول · ۰٫۲٪» + تولتیپ شناور روی صفحه = صفر ✓ (پیش‌فرض: مجموع ۸۵٬۷۳۸٫۶۶)
  * بند ۴: دکمهٔ «ساخت فایل پشتیبان» → GET /api/backup 200 + toast «فایل پشتیبان ساخته شد — ۸٬۱۸۹ رول، ۱ ورود داده‌ها، ۱ تنظیمات — EVA-Monitor-Backup-1405-07-01.json» ✓ (بازیابی و فایل نامعتبر قبلاً در Task 6-a/7 تست شد)
  * بند ۹: سه فیلد خام در یک ردیف — هر سه label دقیقاً y=-185 (هم‌تراز کامل، ترتیب راست‌به‌چپ: حداقل x=928، حداکثر x=528، ضخامت x=129) ✓
  * بند ۸: ستون سال ۱۴۰۵ بدون جداکننده ✓ (Task 6-b)؛ واحدهای سرستون‌ها فارسی ✓؛ جداول همه DataTable با فیلتر/≠/مرتب‌سازی/ترتیب ستون‌ها/ردیف‌های قابل نمایش ✓
  * بند ۲/۳: کنترل VLM داشبورد — «تب‌بار راست‌به‌چپ با داشبورد راست‌ترین، نمودارها ذاتاً RTL، بدون گلچ/هم‌پوشانی/LTR، ظاهر حرفه‌ای» ✓؛ موبایل ۳90px بدون سرریز افقی، اولین زبانه از راست ✓؛ واحدهای فیلدهای تنظیمات فارسی (میلی‌متر/میکرون/کیلوگرم/شیفت/ساعت) ✓
  * بند ۱ (مستند): راهنما — بخش‌های ماندگاری/راست‌به‌چپ/پشتیبان‌گیری/ابزار جداول همه رندر شدند ✓
  * نسخه: پاصفحه «نسخه ۱٫۱» ✓ + بج «نسخه ۱٫۱» در راهنما ✓

Stage Summary:
- هر ۹ بند کاربر کامل، پیاده و E2E-تست‌شده است؛ نسخه از ۱٫۰ به ۱٫۱ ارتقا یافت
- فایل‌های کلیدی این ارتقا: api/backup/route.ts (جدید)، data-table.tsx (جدید)، use-persistent-state.ts (جدید)، version.ts (جدید)، + بازنویسی/به‌روزرسانی rolls-view / import-view / settings-view / dashboard-view / help-view / page.tsx / format.ts / icons.ts
- دادهٔ نمونهٔ ۸۱۸۹ سطری سالم در دیتابیس باقی است؛ کاربر می‌تواند با پنل جدید پشتیبان بگیرد/بازیابی کند

---
Task ID: 10 (بازیابی ۱٫۴ — بک‌اند)
Agent: main (Z.ai Code)
Task: بازیابی پروژه از سورس ۱٫۴ آفلاین (GitHub: Metallized-Report/EVA/roll-monitor) — زیرساخت بک‌اند ویرایش دستی رول (بند ۴ نسخهٔ ۱٫۲/۱٫۳)

Work Log:
- نسخهٔ روی دیسک ۱٫۱ بود (نه ۱٫۴) → طبق دستور کاربر، سورس آفلاین ۱٫۴ از https://github.com/drvesali1374-ai/Metallized-Report (مسیر EVA/roll-monitor — اپ استاتیک index.html + js/ + css/ با ۸۱۸۹ رول seed) کلون و کامل مطالعه شد: domain.js (۸۵۵ سطر)، store.js (۹۳۴)، tables.js (۷۵۶)، import.js (۸۱۱)، rolls.js (۳۳۴)، dashboard.js (۲۶۱)، settings.js (۶۴۴)، help.js (۲۹۴)، charts.js (۵۰۲)، app.js/format.js/ui.js
- تحلیل شکاف ۱٫۱ → ۱٫۴: بند ۴ (typeOverride وضعیت دستی + ویرایش ۱۳ فیلد + manualEdit)، بند ۱/۳ ۱٫۳ (صفحه‌بندی ≥۲۰۰۰ + جدول fixed با colgroup + اسکرول افقی)، بند ۱ ۱٫۴ (تولتیپ مقدار کامل در سلول‌های بریده‌شده)، بند ۲ ۱٫۴ (چیدمان dir=ltr دکمه‌های صفحه‌بندی « ‹ info › »)، بند ۶ ۱٫۳ (نمودار دو میله‌ای + دیتالیبل بولد تیره)
- prisma/schema.prisma: ستون‌های typeOverride String? و manualEdit String? به مدل Roll اضافه شد + bun run db:push (دیتای ۸۱۸۹ رولی سالم ماند)
- src/types/eva.ts: TypeOverride، ManualEditMap، UpdateRollInput، UpdateRollResponse + RollDto گسترش یافت (category=override||auto، autoCategory، typeOverride، manualEdit، edited)
- src/lib/eva/manual-edit.ts (جدید): MANUAL_NUM_FIELDS/MANUAL_STR_FIELDS/parseManualEdit/serializeManualEdit/manualStr/manualNum
- src/lib/eva/api-helpers.ts: ROLL_SELECT + typeOverride/manualEdit؛ toRollDto با اولویت typeOverride بر دستهٔ خودکار + پرچم edited
- src/app/api/rolls/route.ts: پارامتر category=all (همهٔ رول‌های فایل واردشده — جدول بند ۴)
- src/app/api/rolls/[id]/route.ts (جدید): PATCH — اعتبارسنجی فارسی کامل (شماره رول/فیلم غیرخالی، اعداد ≥۰، ستاپ صحیح ≥۰، override فقط raw|eva|cut) + diff حداقلی manualEdit نسبت به rawJson با نگاشت فعلی (فقط فیلدهای متفاوت با اکسل می‌مانند)
- src/app/api/rolls/[id]/revert/route.ts (جدید): POST — بازگردانی کامل از rawJson + پاک‌سازی typeOverride/manualEdit + fullyReverted
- src/app/api/settings/route.ts: rebuild اکنون manualEdit را بر خروجی نرمال‌سازی مقدم می‌دارد (رشته‌ها با ?? و اعداد با !== undefined)
- src/app/api/backup/route.ts: ROLL_BACKUP_SELECT/PreparedRoll/prepareRollRow + typeOverride (با اعتبارسنجی raw|eva|cut) و manualEdit
- src/lib/eva/version.ts: ۱٫۱ → ۱٫۴ (پایهٔ بازیابی؛ بعد از تغییرات جدید کاربر → ۱٫۵)
- tsc پاس ✅ — dev server restart + prisma generate ✅ — تست curl: GET ?category=all ✓، PATCH (netWeight=25.5,typeOverride=raw → category=raw, manualEdit={netWeight:25.5}, edited=true) ✓، revert (fullyReverted=true، بازگشت 19.44 از rawJson، edited=false) ✓

Stage Summary:
- بک‌اند ۱٫۴ کامل: ویرایش دستی رول + وضعیت دستی + حفظ ویرایش‌ها در rebuild نگاشت و فایل پشتیبان + category=all
- قرارداد API برای فرانت: PATCH /api/rolls/[id] → {ok, roll: RollDto}؛ POST /api/rolls/[id]/revert → {ok, roll, fullyReverted}؛ GET /api/rolls?category=all → RollsResponse
- ادامه برای Task 11+: data-table.tsx (صفحه‌بندی/جدول fixed/تولتیپ سلول)، import-view.tsx (جدول رول‌های فایل واردشده + دیالوگ ویرایش + بخش رول‌های ویرایش‌شده)، dashboard (نمودار دو میله‌ای)، سپس دو تغییر جدید کاربر (گروه‌بندی خام/EVA + آیکون !)

---
Task ID: 11
Agent: data-table-upgrade (Z.ai Code)
Task: ارتقای src/components/eva/data-table.tsx از ۱٫۱ به مجموعهٔ امکانات ۱٫۴ (پورت از سورس آفلاین tables.js) — بند ۱+۳ نسخهٔ ۱٫۳ (صفحه‌بندی + چیدمان fixed) + بند ۱ و ۲ نسخهٔ ۱٫۴ (تولتیپ سلول + چیدمان استاندارد نوار صفحه‌بندی)

Work Log:
- سورس حقیقت /tmp/Metallized-Report/EVA/roll-monitor/js/tables.js (۷۵۶ سطر) کامل خوانده شد + css/style.css (قوانین .dt-pager/.dt-pg-btn/.dt-table.fixed/.dt-page-size) + نسخهٔ فعلی data-table.tsx (۹۲۶ سطر) — فقط data-table.tsx ویرایش شد (طبق محدودهٔ-task)
- **صفحه‌بندی (بند ۱ نسخهٔ ۱٫۳)**: props جدید paginated? (پیش‌فرض false) + defaultPageSize? (پیش‌فرض ۲۰۰۰)؛ ثابت PAGE_SIZES=[2000,4000,8000]؛ اندازهٔ صفحه ماندگار با usePersistentState کلید eva-table-{tableId}-pageSize (اعتبارسنجی: باید در PAGE_SIZES باشد وگرنه defaultPageSize)؛ شمارهٔ صفحه فقط در حافظه useState(1)؛ totalPages=max(1,ceil(len/pageSize)) و clamp ایمن در هر رندر با safePage=Math.min(Math.max(1,page),totalPages) که همه‌جا استفاده می‌شود؛ domRows در حالت paginated = برش sortedRows از (safePage-1)*pageSize به اندازهٔ pageSize؛ سقف maxDomRows فقط وقتی !paginated فعال (domCapped = !paginated && len>maxDomRows)
- **نوار صفحه‌بندی (بند ۲ نسخهٔ ۱٫۴)**: بین باکس اسکرول جدول و نوار وضعیت پایین، فقط وقتی paginated && sortedRows.length>0؛ ردیف flex با justify-between: (۱) گروه دکمه‌ها در div dir="ltr" — ترتیب بصری چپ‌به‌راست: «(صفحهٔ اول، disabled در صفحهٔ ۱) ‹(صفحهٔ قبلی) · span dir=rtl با aria-live=polite «صفحهٔ X از Y» با faInt (min-w-[110px]) · ›(صفحهٔ بعدی) »(صفحهٔ آخر) — استایل دکمه‌ها pgBtnCls مشترک: h-8 w-8 border rounded-md bg-background hover:bg-muted disabled:pointer-events-none disabled:opacity-40؛ (۲) لیبل محدودهٔ «نمایش A تا B از C رکورد» + « (فیلترشده)» وقتی فیلتر فعال (faInt + tabular-nums)؛ (۳) لیبل «ردیف در هر صفحه:» (title: تعداد رکورد در هر صفحه — حداقل ۲۰۰۰ رکورد) با select بومی سبک‌شده با Tailwind (h-8 border rounded-md bg-background px-2 text-xs — بدون shadcn Select) با ۳ گزینهٔ faInt؛ تغییر select → setPageSize ماندگار + setPage(1)
- **چیدمان fixed + اسکرول افقی (بند ۱+۳ نسخهٔ ۱٫۳)**: useFixed = hasWidths || paginated؛ وقتی فعال: Table کلاس table-fixed + style minWidth=totalWidth (مجموع عرض‌ها) → اسکرول افقی روی overflow-x-auto موجود؛ colgroup همیشه در useFixed با هر col دارای width+minWidth صریح — عرض هر ستون = عرض کاربر ?? عرض تعریف ?? ۱۲۰px پیش‌فرض (هیچ ستون auto نمی‌ماند؛ قبلاً colgroup فقط با hasWidths و colهای بی‌عرض auto بودند)؛ کامنت علت از سورس: auto layout با ۳۰هزار سلول صفحه را قفل می‌کند
- **تولتیپ سلول (بند ۱ نسخهٔ ۱٫۴)**: هر td بدنه title=String(raw) فقط وقتی typeof raw === 'number' || (typeof raw === 'string' && raw !== '') — عین سورس؛ کلاس سلول: cn(cellPad, alignCls, col.className, useFixed && 'truncate max-w-0 overflow-hidden') → محتوای پهن‌تر از ستون با «…» بریده می‌شود و مقدار کامل با تولتیپ دیده می‌شود؛ td ردیف خالی (colspan) و سلول‌های tfoot دست‌نخورده (tfoot از قبل title دارد)
- **چیپ‌های وضعیت**: چیپ «نمایش N ردیف» (سقف DOM) در حالت paginated رندر نمی‌شود (domCapped=false)؛ چیپ «X از Y رکورد (فیلترشده)» و ورودی «ردیف‌های قابل نمایش» برای همهٔ جدول‌ها می‌ماند
- header docblock کامپوننت به‌روز شد (شرط صفحه‌بندی/fixed/تولتیپ/کلید pageSize در لیست localStorage)
- bunx tsc --noEmit → بدون خطای پروژه ✅ (فقط examples/skills ازپیش‌موجود که فیلتر شد) — bun run lint → پاس ✅ — dev server: GET / 200 بدون خطای ران‌تایم ✅
- سازگاری عقبی کامل: همهٔ props قبلی با همان نام‌ها؛ فراخوان‌های موجود (rolls-view ×۵، dashboard-view هشدارها) بی‌تغییر کار می‌کنند (paginated پیش‌فرض خاموش)

Stage Summary:
- data-table.tsx اکنون هم‌ارز کامل tables.js نسخهٔ ۱٫۴ است: صفحه‌بندی ماندگار ۲۰۰۰/۴۰۰۰/۸۰۰۰ + نوار صفحه‌بندی استاندارد dir=ltr (اول/قبلی چپ، بعدی/آخر راست) + چیدمان fixed با colgroup صریح و اسکرول افقی + تولتیپ مقدار کامل سلول‌های بریده‌شده
- API عمومی جدید: paginated?: boolean (پیش‌فرض false) و defaultPageSize?: number (پیش‌فرض ۲۰۰۰) روی DataTableProps — بقیهٔ API بدون تغییر
- ادامه برای Task 12+: import-view.tsx (جدول «رول‌های فایل واردشده» با paginated + دیالوگ ویرایش ۱۳ فیلد + بخش رول‌های ویرایش‌شده — بک‌اند PATCH/revert از Task 10 آماده است)، dashboard (نمودار دو میله‌ای بند ۶ نسخهٔ ۱٫۳)

---
Task ID: 12
Agent: import-view-edit (Z.ai Code) — تکمیل و تأیید توسط main
Task: بازنویسی src/components/eva/import-view.tsx — جدول «رول‌های فایل واردشده» با ویرایش کامل (بند ۴ نسخهٔ ۱٫۲) + بخش «رول‌های ویرایش‌شده» (بند ۴ نسخهٔ ۱٫۳) — پورت از views/import.js نسخهٔ ۱٫۴ آفلاین

Work Log:
- زیرایجنت پیاده‌سازی را کامل کرد اما پیش از ثبت worklog به سقف زمان رسید؛ main تأیید کرد (tsc/lint/dev-log همه پاس)
- کامپوننت جدید InfoHint (export از همین فایل): آیکون دایره‌ای کوچک «!» کهربایی (size-5, border-amber, hover ring) + Popover dir=rtl با متن توضیح — عمومی برای استفادهٔ سراسری در تغییر #۲ کاربر
- جدول «رول‌های فایل واردشده»: DataTable با tableId=import-rolls، paginated + defaultPageSize=2000 + compact + defaultVisibleRows=15 + جمع netWeight؛ ۱۵ ستون عین سورس آفلاین (وضعیت شناسایی‌شده + پرچم «دستی»، شماره رول، نوع فیلم، ستاپ، عرض، ضخامت، وزن، گرید، متراژ، عرض اولیه، پالت، تاریخ تولید، موقعیت، شناسه، دکمهٔ ویرایش)؛ داده از useQuery(['rolls','all']) → GET /api/rolls?category=all
- دیالوگ ویرایش رول (RollEditDialog): جعبهٔ وضعیت فعلی (بج + «انتخاب دستی/تشخیص خودکار») + select تغییر وضعیت (خودکار/خام/EVA/برش‌خورده با hint) + ۱۳ فیلد فرم با واحد داخل ورودی + نکتهٔ فیلدهای خالی؛ ذخیره: اعتبارسنجی کلاینت فارسی → PATCH → toast + invalidateQueries() کامل؛ انصراف/ذخیره با Loader2
- بخش «رول‌های ویرایش‌شده»: DataTable tableId=import-rolls-edited با ۴ ستون (شماره رول، وضعیت فعلی + دستی، فیلدهای ویرایش‌شده با بج‌های برچسب فیلد و title مقدار فعلی، عملیات ویرایش/حذف) + footerNote؛ ردیف‌ها = allRolls.filter(r=>r.edited)
- دیالوگ تأیید حذف ویرایش‌ها (AlertDialog): متن عین سورس + دکمهٔ مخرب «بله، حذف کن» → POST /api/rolls/[id]/revert → toast با description بر اساس fullyReverted
- همهٔ بخش‌های موجود (دراپ‌زون، خطای ستون‌های الزامی، خلاصهٔ Import، وضعیت آخرین Import + حذف همه) دست‌نخورده ماندند
- tsc بدون خطا ✅ — lint پاس ✅ — dev.log: GET /api/rolls?category=all → 200 ✓

Stage Summary:
- بند ۴ نسخهٔ ۱٫۲ و ۱٫۳ کامل در ورود داده‌ها: ویرایش کامل رول + وضعیت دستی + بخش ویرایش‌شده‌ها + صفحه‌بندی ۲۰۰۰+
- InfoHint اکنون export شده از import-view.tsx — برای تغییر #۲ کاربر (آیکون !) به shared.tsx منتقل/دوباره‌استفاده می‌شود
- ادامه: Task 13 (نمودار دو میله‌ای داشبورد — بند ۶ نسخهٔ ۱٫۳)، سپس تغییر #۱ کاربر (گروه‌بندی خام/EVA) و تغییر #۲ (آیکون ! سراسری)

---
Task ID: 13
Agent: main + 13-a/13-b (Z.ai Code)
Task: تکمیل بازیابی ۱٫۴ (نمودار دو میله‌ای بند ۶ نسخهٔ ۱٫۳) + تغییر #۲ کاربر: جمع‌آوری همهٔ توضیحات پروژه در آیکون کوچک «!» (InfoHint) — همهٔ صفحات به‌جز راهنما

Work Log:
- **dashboard-view.tsx (main)**: نمودار اصلی — متن کارت به «هر ستاپ دو میله دارد: … عدد بالای هر میله با فونت بولد نمایش داده می‌شود…»؛ تیک‌های محور X: بولد/مشکی/13px؛ دیتالیبل هر دو میله: بولد 11px تیره (#1d2528)؛ maxBarSize 26 + minPointSize 2
- **InfoHint به shared.tsx منتقل شد** (13-a): تعریف از import-view.tsx به src/components/eva/shared.tsx (همان ظاهر کهربایی + Popover)؛ import-view فقط re-export دارد؛ رپر متن از <p> به <div> تغییر یافت (main — پشتیبانی ul/li در راهنمای کوتاه تنظیمات بدون هشدار nesting)
- **dashboard (13-a)**: توضیح کارت نمودار اصلی → InfoHint (نام فایل/تاریخ بولد)؛ توضیح قانون هر هشدار → InfoHint کنار عنوان Alert؛ توضیح کارت نمودار موقعیت → InfoHint؛ توضیح دیالوگ هشدار → InfoHint کنار عنوان؛ فرمول زندهٔ زیر نمودار + KPI ها + آلارم سبز → دست‌نخورده
- **data-table (13-a)**: footerNote نوار پایین از متن نمایان → InfoHint (اولین آیتم ردیف چیپ‌ها)
- **page.tsx (13-a)**: زیرعنوان سربرگ («پایش رول‌های خام…») → InfoHint کنار h1؛ فرمول پاصفحه → InfoHint + آیکون Factory (متن نسخه نمایان ماند)
- **import-view (13-b)**: توضیح کارت آپلود (متن کامل + لینک فایل نمونه داخل Popover) → InfoHint؛ یادداشت خلاصهٔ Import → InfoHint؛ توضیح وضعیت آخرین Import → InfoHint؛ دیالوگ ویرایش: توضیح → InfoHint کنار عنوان + hint وضعیت دستی → InfoHint کنار لیبل + یادداشت پایانی فیلدها → InfoHint
- **settings-view (13-b)**: توضیح پارامترها → InfoHint؛ توضیح دو ادیتور فیلم → InfoHint کنار لیبل؛ hint دو فیلد عددی → InfoHint (حوزهٔ hint حذف؛ تراز عمودی لیبل‌ها حفظ شد)؛ توضیح نگاشت → InfoHint؛ توضیح پشتیبان → InfoHint؛ کل لیست «راهنمای کوتاه تنظیمات» → یک InfoHint با ul داخل Popover (دکمهٔ راهنمای کامل ماند)؛ یادداشت ذخیرهٔ پارامترها → InfoHint
- **خط‌چین تبدیل/بقای**: داده‌های زنده (کپشن خلاصه، فرمول زنده، «انتخاب مؤثر»، «N ستون در فایل»)، بازخورد خطا/اعتبارسنجی، آلارم‌های ایمنی (هشدار مهم)، empty state ها و hint ریز دراپ‌زون → عمداً نمایان ماندند (داده/بازخورد هستند نه توضیح بخش)
- **راهنما**: هیچ تغییری — محتوای خود صفحه صفر InfoHint (فقط آیکون‌های سراسری header/footer شل)

Stage Summary:
- تغییر #۲ کامل: همهٔ توضیحات ثابت پروژه در آیکون «!» جمع شدند؛ راهنما دست‌نخورده؛ tsc/lint پاس
- تست مرورگر: داشبورد ۵ InfoHint + Popover ها با متن صحیح؛ تنظیمات ۱۱ InfoHint؛ جدول‌ها InfoHint اول ردیف پایین

---
Task ID: 14
Agent: main (Z.ai Code)
Task: تغییر #۱ کاربر — گروه‌بندی رول‌های خام و EVA با کلید «شماره ستاپ + سالن تولید + سال + عرض» مانند زبانهٔ برش‌خورده + افزایش نسخه به ۱٫۵ + تست E2E کامل

Work Log:
- **rolls-view.tsx بازنویسی**: RollsTable قبلی → RollsGroupsTable؛ groupRolls() سمت کلاینت (همان cutGroupKey: ستاپ|سالن|رقم سال|عرض)؛ جدول گروه‌ها با همان ستون‌های زبانهٔ برش‌خورده (شماره ستاپ/سالن/سال/عرض/تعداد/مجموع وزن + جزئیات) + جمع ستونی count/totalWeight؛ دیالوگ جزئیات هر گروه با ستون‌های کامل رول (EVA: ستون «کد EVA» اضافه)؛ چیپ‌های آماری: تعداد گروه/تعداد رول/وزن کل؛ عنوان‌ها: «گروه‌های رول‌های خام» / «گروه‌های رول‌های EVA (برش‌نخورده)» + InfoHint با توضیح کلید گروه‌بندی + توضیح اصلی دسته؛ tableId های جدید: rolls-raw-groups / rolls-eva-groups / rolls-raw-detail / rolls-eva-detail
- نسخه: version.ts → 1.5 (پاصفحه «نسخهٔ ۱٫۵» تأیید شد)
- **تست E2E مرورگر (agent-browser) — همه موفق**:
  * پاصفحه «سامانه مانیتورینگ رول‌های EVA — نسخهٔ ۱٫۵» ✓
  * داشبورد: ۵ InfoHint (سربرگ/نمودار اصلی/هشدار موقعیت/نمودار موقعیت/پاصفحه) + Popover ها با متن کامل (نام فایل EVA Data.xls + تاریخ بولد) ✓؛ نمودار: ۸ میله (۴ ستاپ × ۲) + ۸ دیتالیبل بولد + ۴ تیک محور X بولد ✓
  * رول‌ها → خام: «گروه‌های رول‌های خام» — ۷۷ رول → ۴ گروه (۶۹/۱/۱۴۰۵/۱۹۸۰ → ۱ رول؛ …؛ ۹۰/۱/۱۴۰۵/۱۹۸۰ → ۶۶ رول) ✓؛ دیالوگ جزئیات ستاپ ۶۹: عنوان + بج + توضیح داده‌ای (سالن/سال/عرض/وزن) + جدول رول‌ها ✓
  * رول‌ها → EVA: ۶۹ رول → ۶ گروه ✓؛ رول‌ها → برش‌خورده: رگرسیون ندارد (۶۶ گروه / ۲٬۷۹۳ رول / ۸۵٬۷۳۸٫۶۶ کیلوگرم) ✓
  * ورود داده‌ها: جدول «رول‌های فایل واردشده» ۸٬۱۸۹ رول، صفحهٔ ۱ با ۲۰۰۰ ردیف، select اندازهٔ صفحه=۲۰۰۰ ✓؛ دکمه‌های صفحه‌بندی: صفحهٔ اول x=969 چپ → صفحهٔ آخر x=1199 راست (چیدمان استاندارد بند ۲ نسخهٔ ۱٫۴) ✓؛ «صفحهٔ آخر» → صفحهٔ ۵ با ۱۸۹ ردیف + دکمه‌های بعدی/آخر disabled ✓
  * دیالوگ ویرایش: ۱۳ فیلد + لیبل‌ها + جعبهٔ وضعیت فعلی (سایر/تشخیص خودکار) ✓؛ تغییر وزن 19.44→21.5 + ذخیره → PATCH موفق، manualEdit={"netWeight":21.5}، edited=true، بخش «رول‌های ویرایش‌شده»: ۱ رول با بج «وزن خالص» و دکمه‌های ویرایش/حذف ✓؛ حذف ویرایش‌ها → دیالوگ تأیید → revert → edited=0 و netWeight=19.44 (بازگشت به اکسل) ✓
  * تنظیمات: ۱۱ InfoHint + کارت راهنمای کوتاه → Popover با ul ✓؛ راهنما: محتوای صفحه صفر InfoHint (همانطور که کاربر خواست) ✓
  * موبایل ۳90px: بدون سرریز افقی ✓؛ agent-browser errors خالی ✓
- tsc پاس ✅ — lint پاس ✅ — dev.log بدون خطا ✓

Stage Summary:
- بازیابی کامل ۱٫۴ از سورس آفلاین + هر دو تغییر کاربر پیاده و E2E-تست‌شده؛ نسخهٔ نهایی: ۱٫۵
- فایل‌های تغییریافته این نشست: prisma/schema.prisma، types/eva.ts، lib/eva/{api-helpers,manual-edit,version}.ts، api/{rolls,rolls/[id],rolls/[id]/revert,settings,backup}/route.ts، components/eva/{data-table,import-view,rolls-view,dashboard-view,settings-view,shared,icons}.tsx، app/page.tsx
- دادهٔ ۸٬۱۸۹ رولی سالم؛ ویرایش دستی در rebuild نگاشت و فایل پشتیبان حفظ می‌شود

---
Task ID: 15 (نشست ۱٫۶ — بخش اول: اپ Next.js + آماده‌سازی آفلاین)
Agent: main (Z.ai Code)
Task: دو تغییر کاربر: ۱) قرار دادن نسخهٔ آفلاین در public ۲) بازطراحی «رول‌های ویرایش‌شده»: جدول فقط تغییرات (از چه مقداری به چه مقداری) + علامت‌گذاری فیلدهای ویرایش‌شده در دیالوگ ویرایش با مقدار قبلی

Work Log:
- نسخهٔ روی دیسک ۱٫۵ تأیید شد (version.ts + worklog)؛ دو تغییر جدید به عنوان نسخهٔ ۱٫۶ اعمال شد
- **بک‌اند Next.js**: types/eva.ts → فیلد original: ManualEditMap به RollDto؛ api-helpers.ts → originalValuesOf(rawJson,rowIndex,headers,columnMapping,fields?) مشترک + attachOriginalValues(dtos,rows,headers,mapping) + original:{} پیش‌فرض در toRollDto؛ api/rolls/route.ts → category=all اکنون rawJson رول‌های ویرایش‌شده را می‌خواند و dto.original (فقط کلیدهای manualEdit، از فایل اکسل با نگاشت فعلی) را پر می‌کند؛ api/rolls/[id]/route.ts → پاسخ PATCH هم dto.original دارد (پیاده‌سازی محلی به helper مشترک منتقل شد)
- **فرانت Next.js (import-view.tsx)**: جدول «رول‌های ویرایش‌شده» → ۳ ستون: شماره رول | تغییرات | عملیات — ستون تغییرات: چیپ‌های کهربایی «[فیلد:] مقدارقبلی(خط‌خورده) ← مقدارجدید(بولد فیروزه‌ای)» + چیپ وضعیت (خودکار → دستی) در صورت typeOverride؛ توکن‌های فیلتر شامل برچسب + مقادیر قبلی/جدید؛ دیالوگ ویرایش: EditField با props edited/previous — لیبل کهربایی + آیکون مداد + بج «ویرایش‌شده» + حاشیه کهربایی input + خط «مقدار قبلی فایل اکسل: X» زیر ورودی؛ سلکت وضعیت هم علامت‌گذاری + «مقدار قبلی: تشخیص خودکار (X)»؛ آیکون ArrowLeft به icons.ts
- version.ts → 1.6؛ tsc/lint پاس
- **تست E2E مرورگر (اپ Next.js)**: PATCH آزمایشی (وزن ۶۰٫۷۴→۸۱٫۵، ستاپ ۶۹→۷۰) → original صحیح در پاسخ و GET all؛ جدول ویرایش‌شده‌ها: ۳ ستون + چیپ‌ها («وزن خالص: ۶۰٫۷۴ ← ۸۱٫۵» و «شماره ستاپ: ۶۹ ← ۷۰») با VLM تأیید شد؛ دیالوگ: ۲ بج ویرایش‌شده + «مقدار قبلی فایل اکسل: ۶۹/۶۰٫۷۴»؛ وضعیت دستی «رول خام» → چیپ «وضعیت رول: رول خام · خودکار ← رول خام · دستی»؛ بازگشایی دیالوگ: ۳ علامت + «مقدار قبلی: تشخیص خودکار (رول خام)»؛ حذف ویرایش‌ها → رول آزمایشی پاک شد (تنها رول ویرایش‌شدهٔ پیش‌existing باقی ماند)؛ پاصفحه «نسخهٔ ۱٫۶» ✓؛ errors خالی ✓
- **نسخهٔ آفلاین**: سورس ۱٫۴ از /tmp/Metallized-Report/EVA/roll-monitor → public/offline/ کپی شد (۴٫۴MB)
- **آفلاین — بند ۲ نسخهٔ ۱٫۶ پیاده شد**: ui.js آیکون arrow-left؛ store.js صادرات originalValuesOf؛ import.js: changeValueText/changeChipHtml/editedChangesHtml/editedChangesTokens/attachOriginals + جدول ویرایش‌شده‌ها ۳ ستونه با چیپ‌ها + attachOriginals ناهمگام با گارد holder.isConnected + دیالوگ ویرایش: openEditDialog ناهمگام (Store.originalValuesOf) → buildEditDialog با mark(field) و علامت‌گذاری کهربایی همهٔ ۱۳ فیلد + سلکت وضعیت + خطوط مقدار قبلی؛ style.css: .change-chip/.cc-label/.cc-old/.cc-arrow/.cc-new/.changes-cell/.edited-label/.edited-mark/.edited-input/.prev-value/.prev-val-strike؛ node --check همه پاس

Stage Summary:
- اپ Next.js کامل در ۱٫۶: diff قدیم→جدید در جدول ویرایش‌شده‌ها + علامت‌گذاری فیلدهای ویرایش‌شده در دیالوگ با مقدار قبلی فایل اکسل؛ E2E تأیید شده
- قرارداد API: RollDto.original = مقادیر اولیهٔ اکسلِ فقط کلیدهای manualEdit (خالی وقتی ویرایشی نیست یا rawJson ناموجود)
- نسخهٔ آفلاین در public/offline — بند ۲ (diff + علامت‌گذاری) پیاده شد؛ باقی‌مانده برای Task 16: پورت بند ۱ و ۲ نسخهٔ ۱٫۵ به آفلاین (گروه‌بندی خام/EVA با کلید ستاپ+سالن+سال+عرض + آیکون توضیح «!» سراسری به‌جز راهنما) + نسخهٔ ۱٫۶ در domain.js/index.html + zip
- نکتهٔ کلیدهای localStorage: هر دو اپ همان کلیدهای eva-* را استفاده می‌کنند (سازگاری با دادهٔ آفلاین ۱٫۴ کاربر) — تغییر ندهید

---
Task ID: 16
Agent: offline-port (Z.ai Code)
Task: پورت دو ویژگی نسخهٔ ۱٫۵ به اپ آفلاین (public/offline): ۱) گروه‌بندی رول‌های خام/EVA با کلید «شماره ستاپ + سالن تولید + سال + عرض» مانند زبانهٔ برش‌خورده ۲) InfoHint — جمع‌کردن همهٔ توضیحات متنی ثابت در آیکون کوچک «!» به‌جز صفحهٔ راهنما + ارتقای نسخه به ۱٫۶

Work Log:
- مرجع‌ها خوانده شد: src/components/eva/{rolls-view,shared,dashboard-view,import-view,settings-view,data-table}.tsx + src/app/page.tsx؛ کارهای Task 15 (diff-table + علامت‌گذاری دیالوگ ویرایش در import.js، arrow-left در ui.js، originalValuesOf در store.js، CSS کهربایی) دست‌نخورده ماند
- Feature A — js/views/rolls.js بازنویسی: groupRolls(rolls) با EVA.cutGroupKey و مرتب‌سازی ستاپ↑ سپس عرض↑ (null آخر با MAX_SAFE_INTEGER)؛ rollGroupColumns() (شماره ستاپ بولد، سالن، سال faYear، عرض faNum، تعداد/مجموع وزن با font-medium، دکمهٔ جزئیات data-group + eye)؛ groupDetailColumns(category) (شماره رول بولد + کد EVA فقط برای eva + نوع فیلم/عرض/ضخامت/متراژ/وزن بولد/گرید/موقعیت فعلی)؛ renderRollsGroups جایگزین renderRollsTable — چیپ‌های boxes/layers/weight، جدول 'rolls-raw-groups'/'rolls-eva-groups' با sums {count,totalWeight}، دیالوگ جزئیات wide با tableId 'rolls-raw-detail'/'rolls-eva-detail' (compact، ۱۰ ردیف، emptyText «رولی در این گروه یافت نشد.»)؛ توابع قدیمی rollColumns/renderRollsTable حذف شدند؛ SUB_TABS/SUBTAB_KEY و empty-state بدون تغییر
- Feature B — ui.js: تابع infoHint(html) (html مورد اعتماد، بدون escape) + افزودن به window.UI + init یک‌باره در بارگذاری اسکریپت: کلیک روی «!» (closeAll بجز خودش + toggle open/aria-expanded)، کلیک بیرون info-hint-wrap → بستن همه، Esc → بستن همه
- Feature B — css/style.css: بلوک InfoHint (wrap/info دکمهٔ گرد کهربایی ۲۰px با hover ring/pop مطلق right:0 با z-index:70 و max-width:290px + ul/li/b/a) + .font-medium؛ .brand h1 بدون overflow:hidden (پاپ‌اور داخل h1 بریده نشود)؛ .dt-note مرده حذف شد
- Feature B — index.html: نسخهٔ ۱٫۶ در کامنت/title/متن پاصفحه؛ زیرعنوان سربرگ → InfoHint داخل h1 (متن عین page.tsx: «پایش رول‌های خام، EVA و برش‌خورده — محاسبه مانده زمان تولید»)؛ فرمول پاصفحه → آیکون factory + InfoHint
- Feature B — tables.js: footerNote به‌عنوان اولین آیتم نوار پایین → UI.infoHint(UI.esc(footerNote))
- Feature B — dashboard.js: توضیح چارت اصلی (با <b> نام/تاریخ فایل) → InfoHint کنار عنوان؛ توضیح قانون هر هشدار → InfoHint کنار عنوان هشدار (بج شمارنده ماند)؛ توضیح چارت موقعیت → InfoHint (chart-hint حذف)؛ توضیح دیالوگ هشدار → InfoHint کنار عنوان (پارامتر desc حذف)؛ خط فرمول زندهٔ زیر چارت و KPI ها دست‌نخورده
- Feature B — import.js: کارت آپلود (پاراگراف + لینک «دریافت فایل نمونه» با href نسبی ../samples/EVA%20Data.xls — عین import-view.tsx) / کارت رول‌های فایل واردشده (نام فایل <b>) / کارت رول‌های ویرایش‌شده / کارت وضعیت آخرین Import → InfoHint کنار عنوان‌ها؛ نکتهٔ خلاصهٔ Import (chart-hint) → InfoHint (خط دادهٔ فایل/برگه/تاریخ کارت خلاصه ماند)؛ دیالوگ ویرایش: desc → InfoHint کنار عنوان؛ راهنمای سلکت وضعیت همیشه به‌عنوان InfoHint کنار لیبل + خط «مقدار قبلی» فقط هنگام statusEdited؛ نکتهٔ «فیلدهای خالی…» → ردیف InfoHint پایین بدنهٔ دیالوگ؛ جدول diff و علامت‌گذاری Task 15 دست‌نخورده
- Feature B — settings.js: پارامترها/نگاشت/پشتیبان → InfoHint کنار عنوان‌ها (با strong زنده/بازسازی)؛ توضیح هر دو ادیتور فیلم → InfoHint کنار لیبل؛ دو راهنمای عددی (مصرف رول خام در هر شیفت، تبدیل روز به ساعت) → InfoHint کنار عنوان فیلد (field-hint زیر فیلد حذف)؛ «راهنمای کوتاه تنظیمات» → یک InfoHint با ul چهار موردی (۳ مورد عین settings-view.tsx + نکتهٔ آفلاینِ rawJson) و دکمهٔ «راهنمای کامل» ماند؛ یادداشت ذخیره → InfoHint کنار دکمه‌ها؛ راهنما (help.js) کاملاً دست‌نخورده — بدون هیچ InfoHint
- js/domain.js: APP_VERSION '1.4' → '1.6' (بقیهٔ منطق بدون تغییر؛ app.js داینامیک از EVA.APP_VERSION پاصفحه را می‌سازد — «نسخهٔ ۱٫۶»)
- node --check روی هر ۷ فایل JS تغییر یافته پاس؛ اسکن card-desc: تنها مورد باقی‌مانده خط داده‌ای فایل/برگه/تاریخ کارت خلاصهٔ Import است (دادهٔ زنده، مطابق CardDescription نسخهٔ وب)

Stage Summary:
- تست مرورگر (agent-browser روی /offline/index.html): بارگذاری بدون خطای کنسول؛ پاصفحه «نسخهٔ ۱٫۶ (آفلاین)» ✓؛ رولهای خام: «گروه‌های رول‌های خام» + InfoHint + چیپ‌ها (۴ گروه/۷۷ رول/۱۸٬۶۷۸٫۷۲kg) + جدول ۴ ردیفی با sums (۷۷/۱۸٬۶۷۸٫۷۲) + دیالوگ جزئیات با ۸ ستون ✓؛ رولهای EVA: «گروه‌های رول‌های EVA (برش‌نخورده)» (۶ گروه/۶۹ رول) + ستون «کد EVA» در دیالوگ ✓؛ برش‌خورده: ۶۶ گروه با ستون‌های گرید ✓؛ InfoHint: باز/بسته با کلیک دوم/کلیک بیرون/Esc + aria-expanded ✓؛ ورود داده‌ها: ۴ InfoHint کارت + جدول ویرایش‌شده‌ها ۳ ستونه — ویرایش آزمایشی (وزن ۱۹٫۴۴→۹۹٫۵) چیپ «وزن خالص: ۱۹٫۴۴←۹۹٫۵» + بازگشایی دیالوگ با ۱ علامت کهربایی و «مقدار قبلی فایل اکسل: ۱۹٫۴۴» + ۳ InfoHint دیالوگ؛ سپس revert و بازگشت به حالت اولیه ✓؛ تنظیمات: ۴ InfoHint کارت + ۲ ادیتور فیلم + ۲ راهنمای عددی + یادداشت ذخیره + ul چهار موردی راهنمای کوتاه ✓؛ راهنما: صفر InfoHint ✓؛ footerNote همهٔ جداول: InfoHint به‌عنوان اولین چیپ نوار پایین ✓؛ اسکرین‌شات بصری تأیید شد
- انحراف کوچک از متن مشخصات: (۱) متن InfoHint سربرگ از page.tsx برداشته شد («پایش رول‌های خام، EVA و برش‌خورده — محاسبه مانده زمان تولید») نه متن طولانی‌تر حدسی؛ (۲) لینک فایل نمونه نسبی شد (../samples/EVA%20Data.xls) تا هم از /offline/ سرو شود و هم با file:// کار کند؛ (۳) در InfoHint کارت پشتیبان عبارت آفلاین‌محور «— حتی نسخهٔ وب» و در ul راهنمای کوتاه «نکتهٔ بازسازی در نسخهٔ آفلاین» حفظ شد (اطلاعات اختصاصی آفلاین)؛ (۴) جملهٔ «ساختار پذیرفته‌شده…» کارت آپلود طبق محتوای دقیق import-view.tsx حذف شد (همان متن در صفحهٔ راهنما موجود است)
- فایل‌های تغییر یافته: public/offline/{index.html، css/style.css، js/ui.js، js/domain.js (فقط APP_VERSION)، js/tables.js، js/views/{rolls,dashboard,import,settings}.js} — بدون تغییر: seed-data.js، vendor/*، charts.js، store.js، app.js، help.js، کلیدهای localStorage و نام IndexedDB
- دو ویژگی ۱٫۵ به‌طور کامل و اپ آفلاین هم‌اکنون هم‌ارز ویژگی‌های ۱٫۶ اپ Next.js است

---
Task ID: 17 (نشست ۱٫۶ — جمع‌بندی نهایی)
Agent: main (Z.ai Code)
Task: تأیید نهایی پورت آفلاین + بستهٔ zip + بررسی E2E هر دو اپ + رفع lint/eslintignore + بازگرداندن dev server

Work Log:
- تأیید مستقل کار زیرایجنت Task 16 در مرورگر (/offline/index.html): پاصفحه «نسخهٔ ۱٫۶ (آفلاین)» ✓؛ خام: «گروه‌های رول‌های خام» ۴ گروه/۷۷ رول/۱۸٬۶۷۸٫۷۲ کیلوگرم + ستون‌های گروه + InfoHint با متن کلید گروه‌بندی (کلیک → باز، کلیک مجدد/خارج/Esc → بسته) ✓؛ EVA: ۶ گروه/۶۹ رول ✓؛ تست زندهٔ ویرایش: عرض ۴۴۵→۵۰۰ → چیپ «عرض: ۴۴۵ ← ۵۰۰» در جدول ویرایش‌شده‌ها + بازگشایی دیالوگ: بج «ویرایش‌شده» + «مقدار قبلی فایل اکسل: ۴۴۵» ✓؛ revert → جدول خالی ✓؛ راهنما: ۰ InfoHint ✓؛ errors خالی ✓
- zip قابل دانلود: public/downloads/EVA-Roll-Monitor-Offline-v1.6.zip (۸۸۶KB — پوشهٔ EVA-Roll-Monitor-Offline-v1.6 با ۲۶ فایل)؛ همهٔ مسیرها 200: /offline/index.html، seed-data.js، views، zip ✓
- eslint.config.mjs: public/** به ignores اضافه شد (کتابخانه‌های vendor مینیفای‌شدهٔ نسخهٔ آفلاین ۱ error + ۵۴۳ warning می‌دادند) → bun run lint پاس ✅
- dev server وسط کار کرش کرد (پروسه‌های دستی با پایان Bash call کشته می‌شدند) → راه‌اندازی پایدار با setsid -f؛ تأیید بقای پروسه بین فراخوانی‌ها ✓
- تأیید نهایی اپ اصلی بعد از ری‌استارت: جدول ویرایش‌شده‌ها ۳ ستونه با رول پیش‌موجود «وزن خالص: ۱۹٫۱۳ ← ۲۰» ✓؛ پاصفحه «نسخهٔ ۱٫۶» ✓؛ موبایل ۳90px: چیپ‌ها سالم، بدون سرریز افقی ✓؛ errors خالی ✓

Stage Summary:
- نسخهٔ ۱٫۶ کامل در هر دو نسخه: اپ Next.js (پیش‌نمایش پنل) + نسخهٔ آفلاین (public/offline/ + zip قابل دانلود در public/downloads/)
- بند ۱ کاربر: نسخهٔ آفلاین مانند نسخه‌های قبلی در پوشهٔ public قرار گرفت — قابل استفاده از /offline/index.html و دانلود کامل از /downloads/EVA-Roll-Monitor-Offline-v1.6.zip (بعد از استخراج، index.html را در مرورگر باز کنید — کاملاً آفلاین)
- بند ۲ کاربر: جدول «رول‌های ویرایش‌شده» فقط تغییرات را نشان می‌دهد (مقدار قبلی خط‌خورده ← مقدار جدید پررنگ + چیپ وضعیت در صورت انتخاب دستی) و دیالوگ ویرایش فیلدهای ویرایش‌شده را با علامت/رنگ کهربایی + مقدار قبلی فایل اکسل علامت‌گذاری می‌کند — در هر دو نسخه
- دادهٔ ۸٬۱۸۹ رولی هر دو اپ سالم؛ کلیدهای localStorage/IndexedDB آفلاین تغییر نکردند (سازگاری با دادهٔ کاربر)

---
Task ID: 18 (نشست ۱٫۷)
Agent: main (Z.ai Code)
Task: تکمیل بند ۱ (ماندگاری اسکرول — درخواست نشست قبل) + سه تغییر جدید کاربر (گزینه‌های ۵۰۰/۱۰۰۰/۲۰۰۰، قرینه‌سازی دکمه‌های صفحه‌بندی، حذف محدودیت ۵۰MB) + انتشار در گیت‌هاب (ریپازیتوری عمومی جدید + بروزرسانی ریپازیتوری قدیمی)

Work Log:
- گیت نسخه: ۱٫۶ روی دیسک کامل بود؛ کار نیمه‌کارهٔ بند ۱ (اسکرول) از نشست قبل تکمیل شد
- **بند ۱ — ماندگاری موقعیت اسکرول (هر دو اپ)**:
  * data-table.tsx: بازیابی اسکرول داخلی از useLayoutEffect یک‌باره به useEffect با debounce ۱۲۰ms تبدیل شد (وضعیت‌های ماندگار بعد از mount ناهمگام بازیابی می‌شوند و رندر میانی domRows را عوض می‌کند)؛ خودترمیمی صفحه فقط وقتی rows.length>0 (رفع مسابقهٔ reload: صفحهٔ ذخیره‌شده قبل از رسیدن داده به 1 بازنویسی نمی‌شود)
  * page.tsx + app.js: حلقهٔ بازیابی اسکرول پنجره با backoff فزاینده (۲۰×۵۰ms → ۲۰×۱۵۰ms → ۲۰×۴۰۰ms = تا ~۱۲s برای دادهٔ ۸هزارتایی در reload)؛ در صورت ناکامی مقدار ذخیره بازنویسی نمی‌شود (رفع خرابی مقدار با 0)
  * tables.js آفلاین: بلوک کامل ماندگاری اسکرول داخلی (capture listener روی .dt-scroll با debounce 250ms + restoreInnerScroll با requestAnimationFrame چون جدول بعد از create به DOM وصل می‌شود + فراخوانی در setRows)
  * کلیدهای جدید localStorage: eva-tab-scroll (نقشهٔ زبانه→موقعیت پنجره) + eva-table-{id}-page + eva-table-{id}-scroll — هر دو اپ همان کلیدها را می‌خوانند (هم‌سازگار)
- **بند ۲ — گزینه‌های «ردیف در هر صفحه»**: PAGE_SIZES در data-table.tsx و tables.js از [2000,4000,8000] به [500,1000,2000]؛ متن تولتیپ «حداقل ۲۰۰۰ رکورد» → «۵۰۰ / ۱۰۰۰ / ۲۰۰۰»؛ مقدار ماندگار قدیمی (4000/8000) خودکار به پیش‌فرض 2000 برمی‌گردد
- **بند ۳ — قرینه‌سازی دکمه‌های صفحه‌بندی (هر دو اپ)**: شکل و جای آیکون‌ها ثابت ماند؛ فقط عملکرد/هاور/disabled قرینه شد — « (چپ) = صفحهٔ آخر، ‹ = صفحهٔ بعدی (غیرفعال در صفحهٔ آخر)، › = صفحهٔ قبلی، » (راست) = صفحهٔ اول (غیرفعال در صفحهٔ اول) — منطق RTL: چپ = جهت پیشروی
- **بند ۴ — حذف محدودیت ۵۰MB**: api/import/route.ts — ثابت MAX_FILE_SIZE و بررسی file.size حذف شد (نوع xls/xlsx همچنان چک می‌شود)؛ client و آفلاین محدودیت حجمی نداشتند؛ Caddy/Next route handler بدون سقف body
- نسخه: version.ts + domain.js + index.html (۳ نقطه) → 1.7
- zip: EVA-Roll-Monitor-Offline-v1.7.zip (۸۸۸KB، ۲۶ فایل) جایگزین v1.6؛ zip های قدیمی v1.1-v1.4 از public حذف شدند
- **گیت‌هاب**: ریپازیتوری عمومی جدید https://github.com/drvesali1374-ai/EVA-Roll-Monitor (تاریخچهٔ تازه، ۱۴۱ فایل: سورس Next.js + prisma + public/offline + zip + samples؛ .gitignore: db/tool-results/examples/skills/.zscripts/.env/Caddyfile خارج)؛ ریپازیتوری قدیمی Metallized-Report هم بروز شد (EVA/roll-monitor کامل با ۱٫۷ جایگزین ۱٫۴ + zip در EVA/)؛ توکن بعد از پوش از remote URL پاک شد
- **تست E2E مرورگر**: اپ Next.js — پاصفحه ۱٫۷ ✓؛ گزینه‌های ۵۰۰/۱٬۰۰۰/۲٬۰۰۰ + pageSize=500 → ۱۷ صفحه ✓؛ قرینه‌سازی: ‹ از صفحه ۱→۲، « → صفحه ۵ (غیرفعال در ۵)، › ۵→۴، » →۱ (غیرفعال در ۱) ✓؛ ذخیره/بازیابی از مسیر واقعی: اسکرول ۸۵۰ + صفحه ۳ + اسکرول داخلی ۴۰۰ → تعویض زبانه به رول‌ها (۰) → بازگشت → هر سه دقیقاً بازیابی ✓؛ reload → هر سه بازیابی (رفع مسابقه + backoff) ✓؛ آفلاین — پاصفحه ۱٫۷ (آفلاین) ✓، همان سه مقدار از کلیدهای مشترک بازیابی ✓، دکمه‌ها قرینه ✓، کلیک ‹ از صفحه ۳→۴ + ماندگاری صفحه ✓؛ errors خالی ✓
- نکتهٔ دیباگ: تزریق مصنوعی localStorage در صفحهٔ زنده با flush در pagehide بازنویسی می‌شود (رفتار درست) — تست باید از مسیر واقعی اسکرول کاربر انجام شود
- tsc (src) بدون خطا ✓ — lint پاس ✓ — node --check پاس ✓ — dev.log سالم ✓

Stage Summary:
- نسخهٔ ۱٫۷ کامل در هر دو اپ + انتشار گیت‌هاب (ریپازیتوری جدید EVA-Roll-Monitor عمومی + بروزرسانی Metallized-Report)
- هر ۴ بند تست E2E شده: اسکرول (تعویض زبانه + reload)، گزینه‌های صفحه، قرینه‌سازی دکمه‌ها، حذف محدودیت حجم
- فایل‌های تغییریافته: src/app/page.tsx، src/components/eva/data-table.tsx، src/app/api/import/route.ts، src/lib/eva/version.ts، public/offline/{index.html، js/app.js، js/tables.js، js/domain.js}
- دادهٔ ۸٬۱۸۹ رولی سالم؛ کلیدهای localStorage موجود دست‌نخورده (فقط کلیدهای جدید افزوده شدند)
