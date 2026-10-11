'use client';

/* =========================================================================
   dashboard-view.tsx — داشبورد: KPI، چارت مانده زمان به تفکیک ستاپ،
   هشدارهای شناسایی‌شده و نمودارهای مکمل
   ========================================================================= */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Clock,
  Package,
  Layers,
  Scissors,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle2,
  Eye,
  BarChart3,
  PieChartIcon,
} from '@/components/eva/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { DataTable, type DataTableColumn } from '@/components/eva/data-table';
import { EmptyDataState, QueryErrorAlert, apiFetch, LegendDot, InfoHint } from '@/components/eva/shared';
import type { DashboardResponse, DistributionItem, RollDto } from '@/types/eva';
import {
  faDuration,
  faDateTime,
  faHours,
  faInt,
  faNum,
  faWeight,
  faWeightShort,
  toFaDigits,
} from '@/lib/eva/format';

/* ---------- پالت رنگ نمودار (متغیرهای CSS تم — فیروزه‌ای/کهربایی) ---------- */
const C_PRIMARY = 'var(--chart-1)';
const C_AMBER = 'var(--chart-2)';
const C_PINK = 'var(--chart-3)';
const C_PURPLE = 'var(--chart-4)';
const C_GREEN = 'var(--chart-5)';

/** رنگ ثابت هر گرید در نمودارها */
const GRADE_COLORS: Record<string, string> = {
  X: C_PRIMARY,
  U: C_GREEN,
  Q: C_PINK,
  T: C_AMBER,
};
const FALLBACK_PALETTE = [C_PRIMARY, C_AMBER, C_PINK, C_PURPLE, C_GREEN];

function distColor(label: string, index: number): string {
  return GRADE_COLORS[label] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

/* ---------- انواع داخلی ---------- */
type WarningKey = 'error_e_film' | 'error_no_e' | 'raw_out_of_range';

const WARNING_ORDER: WarningKey[] = ['error_e_film', 'error_no_e', 'raw_out_of_range'];

const WARNING_TITLES: Record<WarningKey, string> = {
  error_e_film: 'خطا: حرف E بدون فیلم EVA',
  error_no_e: 'خطا: فیلم EVA بدون حرف E',
  raw_out_of_range: 'اطلاع: فیلم خام خارج از محدوده',
};

/* ======================================================================= */
/*  کامپوننت اصلی داشبورد                                                   */
/* ======================================================================= */

export function DashboardView() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DashboardResponse, Error>({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardResponse>('/api/dashboard'),
  });

  const [dialogWarning, setDialogWarning] = useState<WarningKey | null>(null);
  /* گرید فعال دونات (بند ۷) — هاور روی قطاع یا آیتم legend؛ null = حالت مجموع */
  const [activeGrade, setActiveGrade] = useState<number | null>(null);

  /* مانده زمان هر ستاپ — مرتب بر اساس شمارهٔ ستاپ (قبل از هرگونه return) */
  const perSetup = useMemo(
    () => [...(data?.perSetup ?? [])].sort((a, b) => (a.setupNumber ?? 0) - (b.setupNumber ?? 0)),
    [data],
  );

  /* ---------- حالت لودینگ ---------- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2.5 rounded-xl border bg-card p-4">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[340px] w-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  /* ---------- حالت خطا ---------- */
  if (isError) {
    return (
      <QueryErrorAlert
        error={error}
        onRetry={() => void refetch()}
        title="داشبورد در دسترس نیست"
      />
    );
  }

  /* ---------- حالت خالی — هنوز Import انجام نشده ---------- */
  if (!data) return null;
  if (!data.lastImport) {
    return (
      <EmptyDataState
        title="داشبورد خالی است"
        description="برای مشاهدهٔ شاخص‌ها، نمودار مانده زمان و هشدارها، ابتدا فایل اکسل «رول های موجود» را در بخش ورود داده‌ها بارگذاری کنید."
      />
    );
  }

  const { kpis, settingsUsed } = data;
  const hoursPerDay = settingsUsed.hoursPerDay || 24;
  const perDayCapacity = settingsUsed.evaCapacityPerShift * settingsUsed.shiftsPerDay;

  const warningEntries = WARNING_ORDER.map((key) => ({
    key,
    rolls: data.warnings[key] ?? [],
  }));

  return (
    <div className="space-y-6 fade-in-up">
      {/* ---------------- شاخص‌های کلیدی ---------------- */}
      <section aria-label="شاخص‌های کلیدی داشبورد" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {/* رول‌های خام */}
        <Card className="gap-2 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Package className="size-3.5 text-primary" aria-hidden="true" />
              رول‌های خام
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-base font-bold leading-6 sm:text-lg" title="وزن کل رول‌های خام">
              {faWeightShort(kpis.rawWeight)}
              <span className="mr-1 text-[10px] font-medium text-muted-foreground">کیلوگرم</span>
            </div>
            <p className="text-xs text-muted-foreground">{faInt(kpis.rawCount)} رول قابل مصرف</p>
          </CardContent>
        </Card>

        {/* مانده زمان */}
        <Card className="gap-2 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              مانده زمان تولید
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-base font-bold leading-6 sm:text-lg">{faDuration(kpis.remainingDays, hoursPerDay)}</div>
            <p className="text-xs text-muted-foreground">{faHours(kpis.remainingHours)}</p>
            <p
              className="mt-1.5 rounded-md bg-muted/70 px-1.5 py-1 text-[10px] leading-4 text-muted-foreground"
              title="فرمول مانده زمان: وزن رول‌های خام ÷ (ظرفیت هر شیفت × تعداد شیفت در روز)"
            >
              ظرفیت {faNum(settingsUsed.evaCapacityPerShift, 0)} × {faNum(settingsUsed.shiftsPerDay, 0)} شیفت ={' '}
              {faNum(perDayCapacity, 0)} کیلوگرم در روز
            </p>
          </CardContent>
        </Card>

        {/* رول‌های EVA */}
        <Card className="gap-2 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Layers className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              رول‌های EVA
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-base font-bold leading-6 sm:text-lg">
              {faInt(kpis.evaCount)}
              <span className="mr-1 text-[10px] font-medium text-muted-foreground">رول برش‌نخورده</span>
            </div>
            <p className="text-xs text-muted-foreground">{faWeight(kpis.evaWeight)}</p>
          </CardContent>
        </Card>

        {/* رول‌های برش‌خورده */}
        <Card className="gap-2 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Scissors className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              رول‌های برش‌خورده
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-base font-bold leading-6 sm:text-lg">
              {faInt(kpis.cutCount)}
              <span className="mr-1 text-[10px] font-medium text-muted-foreground">رول</span>
            </div>
            <p className="text-xs text-muted-foreground">{faWeight(kpis.cutWeight)}</p>
          </CardContent>
        </Card>

        {/* خطاها */}
        <Card className="gap-2 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertCircle
                className={`size-3.5 ${kpis.errorsCount > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}
                aria-hidden="true"
              />
              خطاهای شناسایی‌شده
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div
              className={`text-base font-bold leading-6 sm:text-lg ${
                kpis.errorsCount > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {faInt(kpis.errorsCount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {kpis.errorsCount > 0 ? 'نیازمند بررسی دستی' : 'هیچ خطایی شناسایی نشد'}
            </p>
          </CardContent>
        </Card>

        {/* اطلاع‌ها */}
        <Card className="gap-2 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Info className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              هشدارهای اطلاعی
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div
              className={`text-base font-bold leading-6 sm:text-lg ${
                kpis.infosCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
              }`}
            >
              {faInt(kpis.infosCount)}
            </div>
            <p className="text-xs text-muted-foreground">فیلم خام خارج از محدوده</p>
          </CardContent>
        </Card>
      </section>

      {/* ---------------- نمودار اصلی: مانده زمان به تفکیک ستاپ ---------------- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
            <BarChart3 className="size-5 text-primary" aria-hidden="true" />
            مانده زمان تولید به تفکیک ستاپ
            <InfoHint
              text={
                <>
                  هر ستاپ دو میله دارد: مانده زمان تولید (ساعت — محور راست) و وزن رول‌های خام همان ستاپ (کیلوگرم —
                  محور چپ)؛ عدد بالای هر میله با فونت بولد نمایش داده می‌شود. مبنای محاسبه: فایل «
                  <span className="font-medium text-foreground">{data.lastImport.fileName}</span>» —{' '}
                  {faDateTime(data.lastImport.importedAt)}
                </>
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {perSetup.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
              <Package className="size-8 opacity-50" aria-hidden="true" />
              رول خامی برای محاسبهٔ مانده زمان وجود ندارد.
            </div>
          ) : (
            <div dir="ltr" className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {/* محور X معکوس (بند ۶): ستاپ اول سمت راست — روند خوانش راست‌به‌چپ */}
                <ComposedChart data={perSetup} margin={{ top: 22, right: 10, left: 10, bottom: 0 }} barGap={5}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="setupNumber"
                    reversed
                    tickFormatter={(v: number) => toFaDigits(v)}
                    /* شماره ستاپ‌ها: درشت‌تر، بولد و مشکی (بند ۶ نسخهٔ ۱٫۳) */
                    tick={{ fontSize: 13, fontWeight: 'bold', fill: '#000000' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  {/* محور اصلی (ساعت) در راست (بند ۶) */}
                  <YAxis
                    yAxisId="hours"
                    orientation="right"
                    tickFormatter={(v: number) => faNum(v, 0)}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    width={42}
                    label={{
                      value: 'ساعت',
                      position: 'insideTopRight',
                      offset: -2,
                      fontSize: 10,
                      fill: 'var(--muted-foreground)',
                    }}
                  />
                  {/* محور دوم (کیلوگرم) در چپ (بند ۶) */}
                  <YAxis
                    yAxisId="weight"
                    orientation="left"
                    tickFormatter={(v: number) => faNum(v, 0)}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    label={{
                      value: 'کیلوگرم',
                      position: 'insideTopLeft',
                      offset: -2,
                      fontSize: 10,
                      fill: 'var(--muted-foreground)',
                    }}
                  />
                  <Tooltip content={<SetupTooltip hoursPerDay={hoursPerDay} />} cursor={{ fill: 'var(--muted)', opacity: 0.35 }} />
                  <Legend content={<SetupLegend />} verticalAlign="bottom" height={28} />
                  <Bar
                    yAxisId="hours"
                    dataKey="remainingHours"
                    name="مانده زمان (ساعت)"
                    fill={C_PRIMARY}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={26}
                    minPointSize={2}
                  >
                    {/* دیتالیبل بولد و تیره (بند ۶ نسخهٔ ۱٫۳ — مثل نسخهٔ ۱٫۴ آفلاین) */}
                    <LabelList
                      dataKey="remainingHours"
                      position="top"
                      formatter={(v: number) => faNum(v, 1)}
                      style={{ fontSize: 11, fontWeight: 'bold', fill: '#1d2528' }}
                    />
                  </Bar>
                  <Bar
                    yAxisId="weight"
                    dataKey="rawWeight"
                    name="وزن خام (کیلوگرم)"
                    fill={C_AMBER}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={26}
                    minPointSize={2}
                  >
                    <LabelList
                      dataKey="rawWeight"
                      position="top"
                      formatter={(v: number) => faWeightShort(v)}
                      style={{ fontSize: 11, fontWeight: 'bold', fill: '#1d2528' }}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            مانده زمان هر ستاپ = وزن رول‌های خام همان ستاپ ÷ ({faNum(settingsUsed.evaCapacityPerShift, 0)} ×{' '}
            {faNum(settingsUsed.shiftsPerDay, 0)}) — ساعت = روز × {faNum(hoursPerDay, 0)} ساعت تولید در شبانه‌روز.
          </p>
        </CardContent>
      </Card>

      {/* ---------------- هشدارهای شناسایی‌شده ---------------- */}
      <section aria-label="هشدارهای شناسایی‌شده" className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold sm:text-lg">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          هشدارهای شناسایی‌شده
        </h2>

        {kpis.errorsCount === 0 && kpis.infosCount === 0 ? (
          <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <AlertTitle>هیچ خطایی شناسایی نشد</AlertTitle>
            <AlertDescription>
              همهٔ رول‌های واردشده بدون تناقض در قوانین دسته‌بندی شناسایی شدند.
            </AlertDescription>
          </Alert>
        ) : (
          warningEntries.map(({ key, rolls }) => {
            if (rolls.length === 0) return null;
            const isError = key !== 'raw_out_of_range';
            return (
              <Alert
                key={key}
                variant={isError ? 'destructive' : 'default'}
                className={isError ? '' : 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200'}
              >
                {isError ? (
                  <AlertCircle className="size-4" aria-hidden="true" />
                ) : (
                  <Info className="size-4" aria-hidden="true" />
                )}
                <AlertTitle className="flex flex-wrap items-center gap-2">
                  {WARNING_TITLES[key]}
                  <Badge
                    variant={isError ? 'destructive' : 'secondary'}
                    className={isError ? '' : 'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200'}
                  >
                    {faInt(rolls.length)} رول
                  </Badge>
                  <InfoHint
                    text={warningDescription(
                      key,
                      settingsUsed.evaFilmTypes,
                      settingsUsed.rawFilmTypes,
                      settingsUsed.rawMinWidth,
                      settingsUsed.rawMaxWidth,
                      settingsUsed.rawThickness,
                    )}
                  />
                </AlertTitle>
                <AlertDescription className="w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 min-h-9"
                    onClick={() => setDialogWarning(key)}
                    aria-label={`مشاهدهٔ رول‌های ${WARNING_TITLES[key]}`}
                  >
                    <Eye className="size-3.5" aria-hidden="true" />
                    مشاهدهٔ رول‌ها
                  </Button>
                </AlertDescription>
              </Alert>
            );
          })
        )}
      </section>

      {/* ---------------- نمودارهای مکمل ---------------- */}
      <section aria-label="نمودارهای مکمل" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* توزیع وزن برش‌خورده‌ها بر اساس گرید */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-bold sm:text-base">
              <PieChartIcon className="size-4 text-primary" aria-hidden="true" />
              توزیع وزن رول‌های برش‌خورده بر اساس گرید
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.cutGradeDistribution.length === 0 ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                رول برش‌خورده‌ای برای نمایش وجود ندارد.
              </div>
            ) : (
              <>
                <div className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    {/* بدون Tooltip شناور (بند ۷): هاور روی هر قطاع، جزئیات همان گرید را
                        در لیبل مرکزی دونات نشان می‌دهد — رفع تداخل تولتیپ/لیبل مرکزی */}
                    <PieChart>
                      <Pie
                        data={data.cutGradeDistribution}
                        dataKey="weight"
                        nameKey="label"
                        innerRadius="58%"
                        outerRadius="88%"
                        paddingAngle={2}
                        stroke="var(--card)"
                        strokeWidth={2}
                        onMouseEnter={(_, i) => setActiveGrade(i)}
                        onMouseLeave={() => setActiveGrade(null)}
                      >
                        {data.cutGradeDistribution.map((item, i) => (
                          <Cell
                            key={item.label}
                            fill={distColor(item.label, i)}
                            opacity={activeGrade === null || activeGrade === i ? 1 : 0.45}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {(() => {
                    const activeItem =
                      activeGrade !== null ? data.cutGradeDistribution[activeGrade] : undefined;
                    const totalWeight = data.cutGradeDistribution.reduce((s, d) => s + d.weight, 0);
                    return (
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        {activeItem ? (
                          <>
                            <span className="text-[10px] text-muted-foreground">{activeItem.label}</span>
                            <span className="text-lg font-bold">{faWeightShort(activeItem.weight)}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {faInt(activeItem.count)} رول · {faNum(totalWeight > 0 ? (activeItem.weight / totalWeight) * 100 : 0, 1)}٪
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] text-muted-foreground">مجموع وزن برش‌خورده</span>
                            <span className="text-lg font-bold">{faWeightShort(kpis.cutWeight)}</span>
                            <span className="text-[10px] text-muted-foreground">کیلوگرم</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <Separator className="my-3" />
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  {data.cutGradeDistribution.map((item, i) => (
                    <li
                      key={item.label}
                      className="flex flex-col gap-0.5"
                      onMouseEnter={() => setActiveGrade(i)}
                      onMouseLeave={() => setActiveGrade(null)}
                    >
                      <LegendDot color={distColor(item.label, i)}>
                        <span className="font-medium">{item.label}</span>
                      </LegendDot>
                      <span className="mr-4 text-[11px] text-muted-foreground">
                        {faInt(item.count)} رول · {faWeightShort(item.weight)} کیلوگرم
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* وزن رول‌های خام به تفکیک موقعیت فعلی */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-bold sm:text-base">
              <BarChart3 className="size-4 text-primary" aria-hidden="true" />
              وزن رول‌های خام به تفکیک موقعیت فعلی
              <InfoHint
                text={<>موقعیت فعلی رول‌های خام از ستون «موقعیت فعلی» فایل اکسل خوانده می‌شود.</>}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.rawByPosition.length === 0 ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                رول خامی برای نمایش وجود ندارد.
              </div>
            ) : (
              <div dir="ltr" className="w-full" style={{ height: Math.max(200, data.rawByPosition.length * 40 + 36) }}>
                <ResponsiveContainer width="100%" height="100%">
                  {/* آینهٔ راست‌به‌چپ (بند ۶): میله‌ها از راست به چپ رشد می‌کنند و
                      لیبل موقعیت‌ها سمت راست نمودار است */}
                  <BarChart
                    data={data.rawByPosition}
                    layout="vertical"
                    margin={{ top: 4, right: 8, bottom: 4, left: 56 }}
                    barCategoryGap="30%"
                  >
                    <XAxis
                      type="number"
                      reversed
                      tickFormatter={(v: number) => faNum(v, 0)}
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      orientation="right"
                      width={86}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<PosTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                    <Bar dataKey="weight" name="وزن خام" fill={C_GREEN} radius={[4, 0, 0, 4]} barSize={16}>
                      {/* در محور معکوس، موقعیت «right» سمت نوک میله (چپ صفحه) می‌افتد */}
                      <LabelList
                        dataKey="weight"
                        position="right"
                        formatter={(v: number) => faWeightShort(v)}
                        style={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ---------------- دیالوگ لیست رول‌های هشدار ---------------- */}
      <WarningRollsDialog
        warningKey={dialogWarning}
        rolls={dialogWarning ? data.warnings[dialogWarning] ?? [] : []}
        onClose={() => setDialogWarning(null)}
      />
    </div>
  );
}

/* ======================================================================= */
/*  اجزای داخلی داشبورد                                                     */
/* ======================================================================= */

/** توضیح فارسی قانون هر هشدار */
function warningDescription(
  key: WarningKey,
  evaFilmTypes: string[],
  rawFilmTypes: string[],
  rawMinWidth: number,
  rawMaxWidth: number,
  rawThickness: number,
): string {
  const evaFilms = evaFilmTypes.join('، ');
  const rawFilms = rawFilmTypes.join('، ');
  switch (key) {
    case 'error_e_film':
      return `قانون: اگر در شمارهٔ رول، بعد از بازوی برش خام حرف E وجود داشته باشد، نوع فیلم باید جزو فیلم‌های EVA (${evaFilms}) باشد. نوع فیلم این رول‌ها با ساختار شمارهٔ رول آن‌ها تناقض دارد.`;
    case 'error_no_e':
      return `قانون: نوع فیلم‌های EVA (${evaFilms}) باید بعد از بازوی برش خام در شمارهٔ رول، حرف E داشته باشند. این رول‌ها حرف E ندارند و دسته‌بندی آن‌ها قطعی نیست.`;
    case 'raw_out_of_range':
      return `نوع فیلم این رول‌ها خام (${rawFilms}) است، اما عرض آن‌ها خارج از بازهٔ ${faNum(rawMinWidth, 0)} تا ${faNum(rawMaxWidth, 0)} میلی‌متر یا ضخامت آن‌ها ${faNum(rawThickness, 0)} میکرون نیست؛ بنابراین در محاسبهٔ مانده زمان لحاظ نمی‌شوند.`;
  }
}

/** Tooltip فارسی نمودار اصلی (مانده زمان هر ستاپ) */
function SetupTooltip({
  active,
  payload,
  hoursPerDay,
}: {
  active?: boolean;
  payload?: Array<{ payload: { setupNumber: number; rawCount: number; rawWeight: number; remainingDays: number; remainingHours: number } }>;
  hoursPerDay?: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div dir="rtl" className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-bold">ستاپ {toFaDigits(row.setupNumber)}</p>
      <p>مانده زمان: {faDuration(row.remainingDays, hoursPerDay ?? 24)}</p>
      <p className="text-muted-foreground">معادل {faHours(row.remainingHours)}</p>
      <Separator className="my-1.5" />
      <p>وزن خام: {faWeight(row.rawWeight)}</p>
      <p>{faInt(row.rawCount)} رول خام</p>
    </div>
  );
}

/** Legend راست‌به‌چپ برای نمودار اصلی — «مانده زمان» از سمت راست خوانده می‌شود (بند ۶) */
function SetupLegend({ payload }: { payload?: Array<{ value?: string | number; color?: string }> }) {
  return (
    <div dir="rtl" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs">
      {payload?.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: item.color }} aria-hidden="true" />
          {item.value}
        </span>
      ))}
    </div>
  );
}

/** Tooltip نمودار موقعیت */
function PosTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DistributionItem }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div dir="rtl" className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-bold">موقعیت: {item.label}</p>
      <p>وزن خام: {faWeight(item.weight)}</p>
      <p>{faInt(item.count)} رول</p>
    </div>
  );
}

/** دیالوگ نمایش رول‌های یک هشدار — جدول مشترک DataTable (بند ۸) */
const WARN_COLUMNS: DataTableColumn<RollDto>[] = [
  {
    key: 'rollNumber',
    label: 'شماره رول',
    render: (r) => (
      <span className="ltr-code font-medium" title={r.rollNumber}>
        {r.rollNumber}
      </span>
    ),
    tokens: (r) => [r.rollNumber],
  },
  {
    key: 'filmType',
    label: 'نوع فیلم',
    render: (r) => <span className="ltr-code text-xs">{r.filmType}</span>,
    tokens: (r) => [r.filmType],
  },
  {
    key: 'width',
    label: 'عرض (میلی‌متر)',
    sortableType: 'number',
    render: (r) => <span className="tabular-nums">{faNum(r.width, 0)}</span>,
  },
  {
    key: 'thickness',
    label: 'ضخامت (میکرون)',
    sortableType: 'number',
    render: (r) => <span className="tabular-nums">{faNum(r.thickness, 0)}</span>,
  },
  {
    key: 'setupNumber',
    label: 'شماره ستاپ',
    sortableType: 'number',
    render: (r) => <span className="tabular-nums">{faInt(r.setupNumber)}</span>,
  },
];

function WarningRollsDialog({
  warningKey,
  rolls,
  onClose,
}: {
  warningKey: WarningKey | null;
  rolls: RollDto[];
  onClose: () => void;
}) {
  if (!warningKey) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl" dir="rtl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {WARNING_TITLES[warningKey]}
            <Badge variant="secondary">{faInt(rolls.length)} رول</Badge>
            <InfoHint text={<>فهرست رول‌های دارای این هشدار به همراه مشخصات فنی آن‌ها</>} />
          </DialogTitle>
        </DialogHeader>
        <DataTable
          tableId={`dashboard-warn-${warningKey}`}
          columns={WARN_COLUMNS}
          rows={rolls}
          getRowKey={(r) => r.id}
          compact
          defaultVisibleRows={10}
          emptyText="رولی با این هشدار یافت نشد."
        />
      </DialogContent>
    </Dialog>
  );
}
