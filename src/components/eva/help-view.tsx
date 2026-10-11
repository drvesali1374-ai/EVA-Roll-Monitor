'use client';

/* =========================================================================
   help-view.tsx — راهنمای کامل سامانه (الگوی پروژهٔ متالایز — آکاردئونی)
   ========================================================================= */

import {
  BookOpen,
  Upload,
  Database,
  Scissors,
  AlertTriangle,
  Clock,
  Settings2,
  CircleHelp,
  Factory,
  Package,
  Layers,
  HardDriveDownload,
} from '@/components/eva/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReactNode } from 'react';
import { APP_VERSION } from '@/lib/eva/version';
import { toFaDigits } from '@/lib/eva/format';

/* ---------- اجزای کمکی ---------- */

/** کد/متن لاتین داخل متن فارسی */
function Code({ children }: { children: ReactNode }) {
  return (
    <code className="ltr-code mx-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[0.85em] font-semibold">
      {children}
    </code>
  );
}

/** زیرعنوان بخش‌ها */
function SubTitle({ children }: { children: ReactNode }) {
  return <h4 className="mb-1.5 mt-4 flex items-center gap-1.5 text-sm font-bold first:mt-0">{children}</h4>;
}

/** پاراگراف راهنما */
function P({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-sm leading-7 text-muted-foreground">{children}</p>;
}

/** بلوک نمونهٔ کد (چپ‌به‌راست) */
function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre
      dir="ltr"
      className="overflow-x-auto rounded-lg border bg-muted/60 p-3 text-left font-mono text-xs leading-6"
    >
      {children}
    </pre>
  );
}

/** تجزیهٔ بصری ساختار شمارهٔ رول */
function RollNumberBreakdown() {
  const parts: Array<{ value: string; label: string }> = [
    { value: 'F', label: 'خط تولید (BOPP)' },
    { value: '1', label: 'سالن تولید' },
    { value: '5', label: 'رقم آخر سال (۱۴۰۵)' },
    { value: '05710501', label: 'سری ۸ رقمی' },
    { value: 'L8', label: 'بازوی برش خام' },
    { value: 'E16', label: 'ادامه (کد EVA)' },
  ];
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-stretch gap-1">
        {parts.map((p, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="flex min-w-11 items-center justify-center rounded-md border-2 border-primary/40 bg-primary/5 px-2 py-1.5">
              <span className="ltr-code text-sm font-bold">{p.value}</span>
            </div>
            <span className="max-w-24 text-center text-[10px] leading-4 text-muted-foreground">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================= */
/*  راهنما                                                                    */
/* ========================================================================= */

export function HelpView() {
  return (
    <div className="fade-in-up">
      {/* سربرگ راهنما */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookOpen className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
            راهنمای سامانه مانیتورینگ رول‌های EVA
            <Badge variant="outline" className="text-muted-foreground">
              نسخه {toFaDigits(APP_VERSION).replace('.', '٫')}
            </Badge>
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            مستندات کامل کار با سامانه — از بارگذاری فایل تا قوانین دسته‌بندی، هشدارها و تنظیمات. روی هر بخش
            کلیک کنید تا باز شود.
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible defaultValue="intro" className="rounded-xl border bg-card px-4 sm:px-5">
        {/* ================================================================ */}
        {/* ۱) معرفی سامانه */}
        {/* ================================================================ */}
        <AccordionItem value="intro">
          <AccordionTrigger className="text-sm font-bold sm:text-base">
            ۱. معرفی سامانه
          </AccordionTrigger>
          <AccordionContent className="text-card-foreground">
            <P>
              این سامانه ابزار پایش خط تولید EVA است. دادهٔ خام آن، فایل اکسل «رول های موجود» انبار است و وظیفهٔ
              آن دسته‌بندی خودکار رول‌ها (خام / EVA / برش‌خورده)، محاسبهٔ <strong>مانده زمان تولید</strong> بر
              اساس ظرفیت شیفت‌های دستگاه EVA، و شناسایی ناسازگاری‌های احتمالی داده است.
            </P>
            <SubTitle>
              <Factory className="size-4 text-primary" aria-hidden="true" />
              صفحات سامانه
            </SubTitle>
            <div className="my-3 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-card text-right">صفحه</TableHead>
                    <TableHead className="bg-card text-right">توضیح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">داشبورد</TableCell>
                    <TableCell>
                      شاخص‌های کلیدی، نمودار مانده زمان به تفکیک ستاپ، هشدارهای شناسایی‌شده و نمودارهای توزیع
                      گرید و موقعیت.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">ورود داده‌ها</TableCell>
                    <TableCell>
                      بارگذاری فایل اکسل، مشاهدهٔ خلاصهٔ نتیجهٔ Import و مدیریت (حذف) داده‌های موجود.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">رول‌ها</TableCell>
                    <TableCell>
                      سه زبانه: رول‌های خام، رول‌های EVA و گروه‌های رول‌های برش‌خورده — با فیلتر ستونی،
                      مرتب‌سازی چندسطحی و جزئیات هر گروه.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">تنظیمات</TableCell>
                    <TableCell>
                      پارامترهای دسته‌بندی و فرمول (فیلم‌ها، عرض، ضخامت، ظرفیت، شیفت)، نگاشت ستون‌های اکسل و
                      پشتیبان‌گیری/بازیابی.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">راهنما</TableCell>
                    <TableCell>همین مستندات.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <P>
              همهٔ محاسبات (دسته‌بندی، مانده زمان، گروه‌بندی) به‌صورت <strong>زنده</strong> و بر اساس تنظیمات فعلی
              انجام می‌شود؛ یعنی با تغییر پارامترها نتیجه بلافاصله تغییر می‌کند و نیازی به بارگذاری مجدد فایل
              نیست.
            </P>

            <SubTitle>
              <Database className="size-4 text-primary" aria-hidden="true" />
              ماندگاری داده‌ها و وضعیت (جدید در نسخهٔ ۱٫۱)
            </SubTitle>
            <P>
              همهٔ داده‌ها، تنظیمات و متادیتای ورود داده‌ها روی سرور برنامه ذخیره می‌شود و با رفرش صفحه یا
              بستن مرورگر از دست نمی‌رود. وضعیت رابط کاربری هم ماندگار است: زبانهٔ فعال (و زیرزبانهٔ «رول‌ها»)،
              فیلترهای جداول، ترتیب مرتب‌سازی، ترتیب و عرض ستون‌ها و تعداد «ردیف‌های قابل نمایش» پس از
              بازگشت، عیناً بازیابی می‌شوند.
            </P>

            <SubTitle>نمودارهای داشبورد</SubTitle>
            <P>
              نمودار اصلی «مانده زمان به تفکیک ستاپ» راست‌به‌چپ رسم می‌شود: ستاپ‌های کوچک‌تر سمت راست، محور
              «ساعت» در سمت راست و محور «کیلوگرم» در سمت چپ. در نمودار دوناتی «توزیع وزن برش‌خورده بر اساس
              گرید»، با بردن نشانگر ماوس روی هر قطاع (یا آیتم راهنمای زیر نمودار)، جزئیات همان گرید — وزن،
              تعداد رول و درصد — به‌جای مجموع، در مرکز دونات نمایش داده می‌شود. نمودار «وزن خام به تفکیک
              موقعیت» نیز میله‌ها را از سمت راست به چپ رشد می‌دهد و نام موقعیت‌ها سمت راست آن است.
            </P>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* ۲) شروع کار */}
        {/* ================================================================ */}
        <AccordionItem value="start">
          <AccordionTrigger className="text-sm font-bold sm:text-base">۲. شروع کار — ورود فایل اکسل</AccordionTrigger>
          <AccordionContent>
            <SubTitle>
              <Upload className="size-4 text-primary" aria-hidden="true" />
              مراحل بارگذاری
            </SubTitle>
            <ol className="mb-4 list-inside list-decimal space-y-1.5 text-sm leading-7 text-muted-foreground">
              <li>به زبانهٔ «ورود داده‌ها» بروید.</li>
              <li>
                فایل اکسل (پسوند <Code>xls</Code> یا <Code>xlsx</Code>) را در ناحیهٔ نقطه‌چین رها کنید یا با دکمهٔ
                «انتخاب فایل» آن را انتخاب کنید (نمونهٔ واقعی: <Code>EVA Data.xls</Code>).
              </li>
              <li>پس از چند لحظه، خلاصهٔ نتیجه شامل نام فایل، تعداد سطرها و شمارندهٔ هر ۷ دسته نمایش داده می‌شود.</li>
              <li>
                داشبورد، جداول و گروه‌بندی‌ها بلافاصله با دادهٔ جدید به‌روزرسانی می‌شوند.
              </li>
            </ol>
            <SubTitle>
              <Database className="size-4 text-primary" aria-hidden="true" />
              ستون‌های مورد نیاز فایل
            </SubTitle>
            <P>
              سامانه ۱۳ ستون را می‌شناسد؛ هفت ستون زیر <Badge variant="destructive" className="mx-1 px-1.5 py-0 text-[10px]">الزامی</Badge>
              است و نبود هرکدام باعث خطای Import می‌شود (بقیه در صورت وجود خوانده می‌شوند):
            </P>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['شماره رول', true],
                  ['نوع فیلم', true],
                  ['شماره ستاپ', true],
                  ['عرض', true],
                  ['ضخامت', true],
                  ['وزن خالص', true],
                  ['گرید', true],
                  ['متراژ', false],
                  ['شماره پالت', false],
                  ['عرض رول اولیه', false],
                  ['تاریخ تولید', false],
                  ['موقعیت فعلی', false],
                  ['شناسه رول', false],
                ] as Array<[string, boolean]>
              ).map(([label, required]) => (
                <Badge
                  key={label}
                  variant={required ? 'default' : 'outline'}
                  className={required ? '' : 'text-muted-foreground'}
                >
                  {label}
                  {required ? ' *' : ''}
                </Badge>
              ))}
            </div>
            <SubTitle>نام ستون‌ها متفاوت است؟</SubTitle>
            <P>
              سامانه ابتدا نام‌های استاندارد و مترادف‌های رایج را خودکار تشخیص می‌دهد (مثلاً <Code>عرضرول</Code>{' '}
              به‌جای <Code>عرض رول</Code>). اگر باز هم ستونی پیدا نشد، پیام خطا فهرست ستون‌های گم‌شده و هدرهای
              شناسایی‌شدهٔ فایل را نشان می‌دهد؛ در این حالت به «تنظیمات ← نگاشت ستون‌های اکسل» بروید و ستون‌ها را
              دستی متناظر کنید.
            </P>
            <AlertLike className="border-amber-500/40 bg-amber-500/10">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className="text-sm leading-6">
                <strong>جایگزینی داده:</strong> هر بار Import جدید، کل داده‌های قبلی را پاک کرده و جایگزین می‌کند
                (حالت «جمع‌کردن چند فایل» وجود ندارد). برای به‌روزرسانی، کافی است نسخهٔ جدید فایل را بارگذاری
                کنید.
              </p>
            </AlertLike>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* ۳) قوانین شناسایی رول‌ها */}
        {/* ================================================================ */}
        <AccordionItem value="rules">
          <AccordionTrigger className="text-sm font-bold sm:text-base">۳. قوانین شناسایی رول‌ها</AccordionTrigger>
          <AccordionContent>
            <SubTitle>ساختار شمارهٔ رول</SubTitle>
            <P>
              هر شمارهٔ رول، شناسهٔ کامل تولید است. حرف ابتدا نوع خط ( <Code>F</Code> = BOPP و{' '}
              <Code>K</Code> = CPP )، رقم اول سالن تولید و رقم دوم رقمِ آخر سال تولید (سال میلادیِ شمسیِ ۱۴۰x) را
              مشخص می‌کند؛ سپس ۸ رقم سری می‌آید و بعد «بازوی برش خام» (حرف <Code>L</Code> چپ یا <Code>R</Code> راست
              به‌همراه ۱ یا ۲ رقم):
            </P>
            <div className="my-3">
              <RollNumberBreakdown />
            </div>
            <P>
              هر چیزی که بعد از بازوی برش خام بیاید، سرنوشت رول را در فرایند EVA مشخص می‌کند: هیچ چیز → رول خام؛{' '}
              <Code>E</Code> + رقم → رول EVA؛ <Code>E</Code> … به‌همراه بازوی برش دوم → رول برش‌خورده.
            </P>

            <SubTitle>
              <Package className="size-4 text-primary" aria-hidden="true" />
              دستهٔ ۱ — رول خام
            </SubTitle>
            <P>
              نوع فیلم در فهرست فیلم‌های خام (پیش‌فرض: <Code>FSN02</Code> و <Code>FTN02</Code>) باشد، عرض در بازهٔ
              تنظیم‌شده (پیش‌فرض ۱۹۶۰ تا ۱۹۸۰ میلی‌متر) و ضخامت دقیقاً مقدار تنظیم‌شده (پیش‌فرض ۱۲ میکرون) باشد.
              این رول‌ها مبنای محاسبهٔ مانده زمان هستند.
            </P>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <Badge className="gap-1 border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300" variant="outline">
                خام
              </Badge>
              <Code>F1505710501L8</Code>
              <span className="text-muted-foreground">
                فیلم <Code>FSN02</Code>، عرض ۱۹۸۰، ضخامت ۱۲ — بدون ادامه بعد از بازوی خام <Code>L8</Code>
              </span>
            </div>

            <SubTitle>
              <Layers className="size-4 text-primary" aria-hidden="true" />
              دستهٔ ۲ — رول EVA (برش‌نخورده)
            </SubTitle>
            <P>
              نوع فیلم در فهرست فیلم‌های EVA (پیش‌فرض: <Code>FST32</Code> و <Code>FTT32</Code>) باشد و بعد از بازوی
              برش خام، حرف <Code>E</Code> همراه عدد (کد EVA) بیاید اما بازوی برش دوم وجود نداشته باشد.
            </P>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                EVA
              </Badge>
              <Code>F1505710501L8E16</Code>
              <span className="text-muted-foreground">
                همان رول بالا پس از عبور از خط EVA — ادامهٔ <Code>E16</Code> فقط کد EVA است (بدون بازوی برش)
              </span>
            </div>

            <SubTitle>
              <Scissors className="size-4 text-primary" aria-hidden="true" />
              دستهٔ ۳ — رول برش‌خوردهٔ EVA
            </SubTitle>
            <P>
              نوع فیلم EVA باشد و بعد از حرف <Code>E</Code>، الگوی بازوی برش (حرف <Code>L</Code> یا <Code>R</Code>{' '}
              + ۱ یا ۲ رقم) دیده شود — یعنی رول به بازوهای باریک‌تر برش خورده است.
            </P>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                برش‌خورده
              </Badge>
              <Code>F1504210491L9E1311R11</Code>
              <span className="text-muted-foreground">
                بازوی برش خام <Code>L9</Code>، کد EVA <Code>1311</Code> و بازوی برش EVA <Code>R11</Code>
              </span>
            </div>

            <SubTitle>دستهٔ «سایر»</SubTitle>
            <P>
              رول‌هایی که هیچ‌کدام از قوانین بالا روی آن‌ها صدق نکند (مثلاً فیلم <Code>FTN12</Code> یا{' '}
              <Code>FSN12</Code> که مربوط به خطوط دیگر است) «سایر» تلقی می‌شوند؛ این رول‌ها در هیچ‌کدام از سه زبانهٔ
              «رول‌ها» نمایش داده نمی‌شوند و فقط در شمارندهٔ خلاصهٔ Import دیده می‌شوند.
            </P>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* ۴) هشدارهای داشبورد */}
        {/* ================================================================ */}
        <AccordionItem value="warnings">
          <AccordionTrigger className="text-sm font-bold sm:text-base">۴. هشدارهای داشبورد</AccordionTrigger>
          <AccordionContent>
            <P>
              پس از هر Import، سامانه داده را از نظر تناقض میان «نوع فیلم» و «ساختار شمارهٔ رول» بررسی می‌کند.
              نتیجهٔ این بررسی در بخش «هشدارهای شناسایی‌شده» داشبورد می‌آید:
            </P>

            <div className="space-y-3">
              <div className="rounded-lg border border-red-500/40 bg-red-500/[0.07] p-3">
                <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  خطای نوع ۱ — حرف E بدون فیلم EVA (error_e_film)
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  در شمارهٔ رول، بعد از بازوی برش خام حرف <Code>E</Code> آمده است اما نوع فیلم آن جزو فیلم‌های EVA
                  نیست. یعنی شمارهٔ رول ادعا می‌کند رول از خط EVA گذشته ولی نوع فیلم آن را تأیید نمی‌کند — احتمال
                  خطای ثبت نوع فیلم یا شمارهٔ رول در فایل انبار. هر چند رول از این نوع، یک خطا شمرده می‌شود.
                </p>
              </div>

              <div className="rounded-lg border border-red-500/40 bg-red-500/[0.07] p-3">
                <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  خطای نوع ۲ — فیلم EVA بدون حرف E (error_no_e)
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  نوع فیلم رول EVA است (مثل <Code>FST32</Code>) اما در شمارهٔ رول، بعد از بازوی برش خام، حرف{' '}
                  <Code>E</Code> وجود ندارد. چنین رولی نه «برش‌نخورده» است و نه «برش‌خورده» و دسته‌بندی آن قطعی
                  نیست؛ باید با انبار تطبیق داده شود.
                </p>
              </div>

              <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-3">
                <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                  <CircleHelp className="size-4" aria-hidden="true" />
                  اطلاع — فیلم خام خارج از محدوده (raw_out_of_range)
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  نوع فیلم رول «خام» است اما عرض آن خارج از بازهٔ تنظیم‌شده یا ضخامت آن با مقدار تنظیم‌شده فرق
                  دارد؛ بنابراین رول «خام» تلقی نشده و در محاسبهٔ مانده زمان لحاظ نمی‌شود (مثال واقعی: رول{' '}
                  <Code>FSN02</Code> با عرض ۲۰۳۰ وقتی بازه ۱۹۶۰–۱۹۸۰ تنظیم شده است). این مورد خطا نیست و صرفاً
                  برای شفافیت گزارش می‌شود؛ با اصلاح بازهٔ عرض در تنظیمات می‌توان آن را به دستهٔ خام برگرداند.
                </p>
              </div>
            </div>

            <P>
              با دکمهٔ «مشاهدهٔ رول‌ها» در هر هشدار، فهرست کامل همان رول‌ها (شماره رول، نوع فیلم، عرض، ضخامت و
              ستاپ) در یک پنجرهٔ جدا نمایش داده می‌شود تا پیگیری دستی تسهیل شود؛ این جدول هم از ابزارهای مشترک
              جداول (فیلتر هر ستون، مرتب‌سازی و ترتیب ستون‌ها) بهره می‌برد.
            </P>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* ۵) فرمول مانده زمان */}
        {/* ================================================================ */}
        <AccordionItem value="formula">
          <AccordionTrigger className="text-sm font-bold sm:text-base">۵. فرمول مانده زمان تولید</AccordionTrigger>
          <AccordionContent>
            <SubTitle>
              <Clock className="size-4 text-primary" aria-hidden="true" />
              فرمول
            </SubTitle>
            <div className="rounded-lg border bg-muted/50 p-4 text-sm font-medium leading-8">
              <p>مانده زمان (روز) = مجموع وزن خالص رول‌های خام ÷ (ظرفیت هر شیفت × تعداد شیفت در روز)</p>
              <p className="text-muted-foreground">
                مانده زمان (ساعت) = مانده زمان (روز) × ساعت تولید در شبانه‌روز
              </p>
            </div>
            <P>
              «مجموع وزن خالص رول‌های خام» همان وزن رول‌هایی است که شرط‌های دستهٔ خام را دارند (فیلم خام + عرض و
              ضخامت در محدودهٔ تنظیمات). این فرمول یک‌بار برای کل سالن و یک‌بار به تفکیک هر شمارهٔ ستاپ محاسبه
              می‌شود — نمودار اصلی داشبورد همان نسخهٔ «به تفکیک ستاپ» است.
            </P>
            <SubTitle>مثال عددی</SubTitle>
            <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-8">
              <p>
                وزن رول‌های خام: <strong>۱۸٬۶۷۸٫۷</strong> کیلوگرم — ظرفیت هر شیفت: <strong>۵٬۰۰۰</strong> کیلوگرم
                — تعداد شیفت: <strong>۳</strong> — ساعت تولید: <strong>۲۴</strong>
              </p>
              <p dir="ltr" className="ltr-code my-2 text-left">
                18678.7 ÷ (5000 × 3) = 18678.7 ÷ 15000 = 1.245 days
              </p>
              <p>
                ≈ <strong>۱ روز و ۶ ساعت</strong> (معادل حدود ۲۹٫۹ ساعت تولید)
              </p>
            </div>
            <P>
              اگر ساعت تولید در شبانه‌روز را روی ۱۶ تنظیم کنید، همان ۱٫۲۴ روز به‌صورت «۱۹٫۹ ساعت» گزارش می‌شود؛
              یعنی ساعت نمایش، به تعداد ساعات واقعی تولید شما در شبانه‌روز وابسته است.
            </P>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* ۶) رول‌های برش‌خورده */}
        {/* ================================================================ */}
        <AccordionItem value="cut">
          <AccordionTrigger className="text-sm font-bold sm:text-base">۶. زبانهٔ رول‌های برش‌خورده</AccordionTrigger>
          <AccordionContent>
            <SubTitle>کلید گروه‌بندی</SubTitle>
            <P>
              رول‌های برش‌خورده معمولاً بسیار زیادند؛ برای خوانایی، آن‌ها بر اساس کلید <strong>«شماره ستاپ +
              سالن تولید + سال + عرض»</strong> گروه‌بندی می‌شوند. هر ردیف جدول یک گروه است و ستون‌های آن عبارت‌اند
              از: ستاپ، سالن، سال، عرض، تعداد کل رول‌ها و مجموع وزن خالص گروه.
            </P>
            <SubTitle>ستون‌های گرید X / U / Q / T</SubTitle>
            <P>
              برای هر گروه، رول‌ها بر اساس <strong>حرف اولِ</strong> ستون «گرید» فایل اکسل به چهار دستهٔ{' '}
              <Code>X</Code>، <Code>U</Code>، <Code>Q</Code> و <Code>T</Code> تفکیک می‌شوند (مثلاً گرید{' '}
              <Code>X-13</Code> در ستون X می‌نشیند). اگر گرید رول با هیچ‌کدام از این چهار حرف شروع نشود یا خالی
              باشد، در ستون «بدون گرید» شمرده می‌شود.
            </P>
            <div className="my-3 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-card text-right">ستون</TableHead>
                    <TableHead className="bg-card text-right">محتوا</TableHead>
                    <TableHead className="bg-card text-right">نمونه</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">گرید X</TableCell>
                    <TableCell>تعداد و مجموع وزن رول‌های با گرید X…</TableCell>
                    <TableCell>
                      <Code>X</Code>، <Code>X-13</Code>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">گرید U</TableCell>
                    <TableCell>تعداد و مجموع وزن رول‌های با گرید U…</TableCell>
                    <TableCell>
                      <Code>U</Code>، <Code>U2</Code>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">گرید Q</TableCell>
                    <TableCell>تعداد و مجموع وزن رول‌های با گرید Q…</TableCell>
                    <TableCell>
                      <Code>Q1</Code>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">گرید T</TableCell>
                    <TableCell>تعداد و مجموع وزن رول‌های با گرید T…</TableCell>
                    <TableCell>
                      <Code>T-A</Code>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">بدون گرید</TableCell>
                    <TableCell>رول‌های بدون گرید یا با پیشوند نامعتبر</TableCell>
                    <TableCell>
                      خالی، <Code>R7</Code>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <P>
              در هر سلول گرید، عدد بالایی <strong>تعداد</strong> رول‌ها و عدد پایینی <strong>مجموع وزن خالص</strong>{' '}
              (کیلوگرم) است. با دکمهٔ «جزئیات» هر ردیف، فهرست تک‌تک رول‌های همان گروه به‌همراه شمارهٔ رول کامل،
              بازوی برش EVA، عرض، وزن، گرید و موقعیت فعلی نمایش داده می‌شود.
            </P>
            <SubTitle>ابزارهای جداول (جدید در نسخهٔ ۱٫۱)</SubTitle>
            <P>
              همهٔ جداول سامانه — رول‌های خام، رول‌های EVA و گروه‌های برش‌خورده، جدول جزئیات هر گروه، خلاصهٔ
              Import و هشدارهای داشبورد — از یک مجموعه‌ابزار مشترک استفاده می‌کنند:
            </P>
            <div className="my-3 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-card text-right">ابزار</TableHead>
                    <TableHead className="bg-card text-right">توضیح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">فیلتر هر ستون</TableCell>
                    <TableCell>
                      زیر هر سرستون یک کادر «فیلتر…» است که فقط ردیف‌های «شامل» متن واردشده را نگه می‌دارد
                      (ارقام فارسی/عربی و جداکننده‌های هزارگان خودکار نرمال می‌شوند). دکمهٔ کوچک «≠» منطق را به
                      «شامل نشود» برمی‌گرداند — مثلاً برای دیدن همهٔ نوع فیلم‌ها به‌جز یک نوع.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">پاک‌کردن همهٔ فیلترها</TableCell>
                    <TableCell>
                      همهٔ فیلترهای فعال را یک‌جا پاک می‌کند؛ تعداد فیلترهای فعال کنار دکمه نشان داده می‌شود.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">مرتب‌سازی</TableCell>
                    <TableCell>
                      مرتب‌سازی چندسطحی: در پنل «مرتب‌سازی» سطح‌ها را با کشیدن جابه‌جا کنید، جهت هر سطح با ↑/↓
                      عوض می‌شود و شمارهٔ اولویت روی هر چیپ می‌نشیند (مثلاً اول بر اساس ستاپ، سپس وزن).
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">ترتیب ستون‌ها</TableCell>
                    <TableCell>
                      در پنل «ترتیب ستون‌ها»، ستون‌ها را بکشید تا جابه‌جا شوند، با دکمهٔ چشم هر ستون را
                      نمایش/مخفی کنید و عرض هر ستون را برحسب پیکسل مشخص کنید (خالی = خودکار).
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">ردیف‌های قابل نمایش</TableCell>
                    <TableCell>
                      تعداد ردیف‌های داخل اسکرول جدول را تعیین می‌کند (۵ تا ۲۰۰؛ پیش‌فرض ۲۵) — برای جداول بزرگ،
                      خوانایی و سرعت بهتر.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">جمع ستونی</TableCell>
                    <TableCell>
                      ردیف جمع چسبان پایین جدول، مجموع ستون‌های عددی را فقط روی ردیف‌های فیلترشده محاسبه می‌کند.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium">ماندگاری وضعیت</TableCell>
                    <TableCell>
                      فیلترها، مرتب‌سازی، ترتیب/عرض/نمایش ستون‌ها و تعداد ردیف‌های هر جدول پس از رفرش صفحه یا
                      بستن مرورگر حفظ می‌شود (بند ماندگاری در بخش ۱ را ببینید).
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <P>
              چیپ وضعیت پایین هر جدول هم همیشه نشان می‌دهد چند رکورد از چه تعداد کل در حال نمایش است (با نشانگر
              «(فیلترشده)» وقتی فیلتری فعال است).
            </P>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* ۷) تنظیمات */}
        {/* ================================================================ */}
        <AccordionItem value="settings">
          <AccordionTrigger className="text-sm font-bold sm:text-base">۷. تنظیمات — پارامترها، نگاشت ستون‌ها و پشتیبان‌گیری</AccordionTrigger>
          <AccordionContent>
            <SubTitle>
              <Settings2 className="size-4 text-primary" aria-hidden="true" />
              پارامترهای سامانه
            </SubTitle>
            <P>
              پارامترها به‌صورت زنده روی دسته‌بندی و محاسبه‌ها اثر می‌گذارند؛ یعنی با ذخیرهٔ آن‌ها، داشبورد و جداول
              بلافاصله بازمحاسبه می‌شوند — بدون نیاز به Import مجدد یا بازسازی.
            </P>
            <div className="my-3 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-card text-right">پارامتر</TableHead>
                    <TableHead className="bg-card text-right">پیش‌فرض</TableHead>
                    <TableHead className="bg-card text-right">واحد</TableHead>
                    <TableHead className="bg-card text-right">توضیح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">انواع فیلم رول خام</TableCell>
                    <TableCell>
                      <Code>FSN02</Code>، <Code>FTN02</Code>
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>فهرست قابل ویرایش؛ رول این فیلم‌ها در صورت برقراری عرض/ضخامت، «خام» است.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">حداقل عرض رول خام</TableCell>
                    <TableCell>۱۹۶۰</TableCell>
                    <TableCell>میلی‌متر</TableCell>
                    <TableCell>کران پایین عرض برای پذیرش رول خام.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">حداکثر عرض رول خام</TableCell>
                    <TableCell>۱۹۸۰</TableCell>
                    <TableCell>میلی‌متر</TableCell>
                    <TableCell>کران بالای عرض برای پذیرش رول خام.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">ضخامت رول خام</TableCell>
                    <TableCell>۱۲</TableCell>
                    <TableCell>میکرون</TableCell>
                    <TableCell>ضخامت دقیق مورد انتظار برای رول خام.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">انواع فیلم رول EVA</TableCell>
                    <TableCell>
                      <Code>FST32</Code>، <Code>FTT32</Code>
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>فهرست قابل ویرایش فیلم‌های خط EVA.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">ظرفیت هر شیفت دستگاه EVA</TableCell>
                    <TableCell>۵٬۰۰۰</TableCell>
                    <TableCell>کیلوگرم در شیفت</TableCell>
                    <TableCell>مصرف رول خام در هر شیفت — صورت کسر فرمول مانده زمان.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">تعداد شیفت در روز</TableCell>
                    <TableCell>۳</TableCell>
                    <TableCell>شیفت</TableCell>
                    <TableCell>تعداد شیفت‌های تولید در شبانه‌روز.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">ساعت تولید در شبانه‌روز</TableCell>
                    <TableCell>۲۴</TableCell>
                    <TableCell>ساعت</TableCell>
                    <TableCell>برای تبدیل مانده روز به مانده ساعت.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <SubTitle>نگاشت ستون‌های اکسل</SubTitle>
            <P>
              مشخص می‌کند هر فیلد منطقی سامانه از کدام ستون فایل خوانده شود. اولویت تشخیص: <strong>انتخاب دستی
              شما</strong> ← نام استاندارد ← مترادف‌های رایج. گزینهٔ «— خودکار —» یعنی همان تشخیص خودکار استفاده
              شود. هدرهای فایل آخرین Import در این بخش نمایش داده می‌شوند؛ تا وقتی فایلی وارد نکرده‌اید، این بخش
              غیرفعال است.
            </P>
            <AlertLike className="border-primary/40 bg-primary/[0.06]">
              <Database className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm leading-6">
                <strong>بازسازی داده‌ها:</strong> برخلاف پارامترها، تغییر نگاشت به‌صورت زنده اعمال نمی‌شود؛ دکمهٔ
                «ذخیرهٔ نگاشت و بازسازی داده‌ها» همهٔ رکوردهای موجود را یک‌بار از دادهٔ خامِ ذخیره‌شده با نگاشت جدید
                بازسازی می‌کند (بدون نیاز به Import مجدد فایل). دکمهٔ «بازگردانی پیش‌فرض» هم انتخاب‌های دستی را پاک
                می‌کند.
              </p>
            </AlertLike>

            <SubTitle>
              <HardDriveDownload className="size-4 text-primary" aria-hidden="true" />
              پشتیبان‌گیری و بازیابی (جدید در نسخهٔ ۱٫۱)
            </SubTitle>
            <P>
              کارت «پشتیبان‌گیری و بازیابی» در همین زبانهٔ تنظیمات، یک فایل JSON کامل از سامانه می‌سازد که شامل
              تنظیمات، متادیتای ورود داده‌ها و همهٔ رکوردهای رول‌ها است و روی هر نصب دیگری از همین برنامه قابل
              بازیابی است.
            </P>
            <ul className="mb-3 list-inside list-disc space-y-1.5 text-sm leading-7 text-muted-foreground">
              <li>
                <strong className="text-foreground">ساخت فایل پشتیبان:</strong> با دکمهٔ «ساخت فایل پشتیبان»، فایلی
                با نام تاریخ‌دار شمسی (مثل <Code>EVA-Monitor-Backup-1405-07-01.json</Code>) دانلود می‌شود؛ پیام
                موفقیت، تعداد رکوردهای داخل فایل (رول‌ها، ورود داده‌ها و تنظیمات) را هم نشان می‌دهد.
              </li>
              <li>
                <strong className="text-foreground">بازیابی از فایل:</strong> با دکمهٔ «بازیابی از فایل»، فایل JSON
                پشتیبان را انتخاب کنید؛ پس از بررسی ساختار، خلاصهٔ محتوای فایل (تعداد رول‌ها، ورود داده‌ها و
                تنظیمات + تاریخ ساخت فایل) نمایش داده می‌شود و بازیابی فقط پس از تأیید شما اجرا می‌شود. پس از
                پایان، همهٔ بخش‌های سامانه (داشبورد، جداول و تنظیمات) خودکار به‌روزرسانی می‌شوند.
              </li>
              <li>
                فایل نامعتبر (متعلق به برنامهٔ دیگر، نسخهٔ ساختار ناسازگار یا خراب) با فهرست دقیق خطاهای فارسی رد
                می‌شود و هیچ داده‌ای تغییر نمی‌کند.
              </li>
            </ul>
            <AlertLike className="border-amber-500/40 bg-amber-500/10">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className="text-sm leading-6">
                <strong>توجه:</strong> بازیابی، <strong>جایگزینی کامل</strong> داده‌های فعلی است و بازگشت‌پذیر
                نیست — پیش از تأیید، از درست بودن فایل مطمئن شوید. توصیه می‌شود به‌صورت دوره‌ای (مثلاً هفتگی یا
                پیش از هر تغییر بزرگ) از داده‌ها پشتیبان تهیه کنید تا در صورت خطای انسانی یا خرابی، اطلاعات قابل
                بازگردانی باشد.
              </p>
            </AlertLike>
          </AccordionContent>
        </AccordionItem>

        {/* ================================================================ */}
        {/* ۸) پرسش‌های متداول */}
        {/* ================================================================ */}
        <AccordionItem value="faq">
          <AccordionTrigger className="text-sm font-bold sm:text-base">۸. پرسش‌های متداول</AccordionTrigger>
          <AccordionContent>
            <Accordion type="multiple" className="rounded-lg border px-3">
              <AccordionItem value="faq-1">
                <AccordionTrigger className="py-3 text-right text-sm font-medium">
                  چرا رولی در هیچ‌کدام از زبانه‌های «رول‌ها» دیده نمی‌شود؟
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  آن رول در دستهٔ «سایر» قرار گرفته است؛ یعنی نوع فیلم آن با هیچ‌کدام از فهرست‌های فیلم خام یا EVA
                  مطابقت ندارد (مثلاً <Code>FTN12</Code> یا <Code>FSN12</Code> مربوط به خطوط دیگر است) یا ساختار
                  شمارهٔ رول آن شناخته نشده است. تعداد این رول‌ها در خلاصهٔ Import نمایش داده می‌شود. اگر فکر
                  می‌کنید رولی باید دسته‌بندی شود، نوع فیلم آن را در تنظیمات به فهرست مربوطه اضافه کنید.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2">
                <AccordionTrigger className="py-3 text-right text-sm font-medium">
                  تغییر تنظیمات نیاز به بارگذاری مجدد فایل دارد؟
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  برای <strong>پارامترها</strong> (انواع فیلم، عرض، ضخامت، ظرفیت، شیفت و ساعت تولید): خیر — همه‌چیز
                  زنده بازمحاسبه می‌شود. برای <strong>نگاشت ستون‌ها</strong>: داده‌های موجود باید بازسازی شوند که
                  دکمهٔ «ذخیرهٔ نگاشت و بازسازی داده‌ها» همین کار را خودکار انجام می‌دهد؛ باز هم نیازی به Import
                  مجدد فایل نیست.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3">
                <AccordionTrigger className="py-3 text-right text-sm font-medium">
                  فایل اکسل من چه فرمت و ستون‌هایی باید داشته باشد؟
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  پسوند <Code>xls</Code> یا <Code>xlsx</Code> (فایل خروجی انبار مثل «EVA Data.xls»). هفت ستون
                  «شماره رول، نوع فیلم، شماره ستاپ، عرض، ضخامت، وزن خالص و گرید» الزامی است؛ شش ستون «متراژ، شماره
                  پالت، عرض رول اولیه، تاریخ تولید، موقعیت فعلی و شناسه رول» اختیاری است. نام ستون‌ها می‌تواند کمی
                  متفاوت باشد؛ سامانه مترادف‌های رایج را می‌شناسد و در غیر این صورت می‌توانید در تنظیمات نگاشت دستی
                  انجام دهید.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-4">
                <AccordionTrigger className="py-3 text-right text-sm font-medium">
                  معنی هشدار «خارج از محدودهٔ خام» (raw_out_of_range) چیست؟
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  نوع فیلم رول جزو فیلم‌های خام است اما عرض یا ضخامت آن با تنظیمات سامانه نمی‌خواند (مثلاً عرض
                  ۲۰۳۰ وقتی بازهٔ ۱۹۶۰ تا ۱۹۸۰ تنظیم شده). این رول‌ها «خام» شمرده نمی‌شوند و در مانده زمان لحاظ
                  نمی‌شوند. این هشدار صرفاً اطلاعی است؛ اگر چنین عرض‌هایی هم قابل مصرف‌اند، بازهٔ عرض را در تنظیمات
                  اصلاح کنید.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-5">
                <AccordionTrigger className="py-3 text-right text-sm font-medium">
                  چرا مانده زمان صفر است؟
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  مانده زمان از وزن «رول‌های خام» محاسبه می‌شود. اگر صفر است یعنی با تنظیمات فعلی هیچ رول خامی
                  شناسایی نشده است. بررسی کنید: ۱) فایل درستی بارگذاری شده باشد؛ ۲) انواع فیلم خام در تنظیمات با
                  فایل بخواند؛ ۳) بازهٔ عرض و ضخامت، رول‌های واقعی را پوشش دهد (رول‌های خارج از بازه در هشدار
                  اطلاعی «خارج از محدوده» فهرست می‌شوند).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-6">
                <AccordionTrigger className="py-3 text-right text-sm font-medium">
                  آیا می‌توانم چند فایل را هم‌زمان در سامانه نگه دارم؟
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  خیر؛ هر بار Import جدید، کل داده‌های قبلی را جایگزین می‌کند تا وضعیت سامانه همیشه با آخرین فایل
                  انبار یکی باشد. اگر فایل جدیدتری دارید، همان را بارگذاری کنید. با دکمهٔ «حذف همهٔ داده‌ها» هم
                  می‌توانید سامانه را کاملاً خالی کنید.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-7">
                <AccordionTrigger className="py-3 text-right text-sm font-medium">
                  ستون «گرید» رول‌ها از کجا می‌آید و چگونه تفسیر می‌شود؟
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  مقدار گرید عیناً از ستون «گرید» فایل اکسل خوانده می‌شود. در زبانهٔ رول‌های برش‌خورده، فقط{' '}
                  <strong>حرف اول</strong> آن برای تفکیک X / U / Q / T استفاده می‌شود (مثلاً <Code>X-13</Code> →
                  گرید X). اگر گرید خالی باشد یا با هیچ‌یک از این چهار حرف شروع نشود، رول در ستون «بدون گرید»
                  می‌نشیند.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** باکس هشدار/نکتهٔ داخلی بخش‌های راهنما */
function AlertLike({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`my-3 flex items-start gap-2.5 rounded-lg border p-3 ${className ?? ''}`} role="note">
      {children}
    </div>
  );
}
