'use client';

/* =========================================================================
   rolls-view.tsx — رول‌ها: سه زبانهٔ «رولهای خام» / «رولهای EVA» / «رولهای برش خورده»
   -------------------------------------------------------------------------
   هر سه زبانه گروه‌بندی با کلید «شماره ستاپ + سالن تولید + سال + عرض» دارند
   (تغییر #۱ نسخهٔ ۱٫۵ — خام/EVA مانند زبانهٔ برش‌خورده) + دیالوگ جزئیات هر گروه.
   جداول با مولفهٔ DataTable (الگوی متالایز — بند ۸) + ماندگاری کامل وضعیت (بند ۱).
   توضیحات کارت‌ها در آیکون کوچک «!» (InfoHint — تغییر #۲ نسخهٔ ۱٫۵).
   ========================================================================= */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Layers,
  Scissors,
  Eye,
  Boxes,
  Weight as WeightIcon,
  Loader2,
} from '@/components/eva/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyDataState, InfoHint, QueryErrorAlert, apiFetch } from '@/components/eva/shared';
import { cutGroupKey } from '@/lib/eva/classify';
import type { CutGroupDto, CutGroupsResponse, RollDto, RollsResponse } from '@/types/eva';
import { faInt, faNum, faWeight, faWeightShort, faYear } from '@/lib/eva/format';
import { DataTable, type DataTableColumn } from '@/components/eva/data-table';
import { usePersistentState } from '@/lib/eva/use-persistent-state';

/* ========================================================================= */
/*  ابزارهای مشترک                                                           */
/* ========================================================================= */

/** چیپ آمار بالای جدول */
function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-xs">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

/** اسکلت بارگذاری جدول */
function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" style={{ opacity: 1 - i * 0.09 }} />
      ))}
    </div>
  );
}

/* ========================================================================= */
/*  گروه‌بندی رول‌های خام / EVA (تغییر #۱ نسخهٔ ۱٫۵ — مانند زبانهٔ برش‌خورده)   */
/* ========================================================================= */

/** گروه رول‌ها — کلید: ستاپ + سالن + رقم سال + عرض (همان الگوی CutGroupDto) */
interface RollGroup {
  /** کلید گروه: "setup|hall|yearDigit|width" */
  key: string;
  setupNumber: number | null;
  hall: number | null;
  yearDigit: number | null;
  year: number | null;
  width: number | null;
  count: number;
  totalWeight: number;
}

/** گروه‌بندی رول‌ها با کلید ستاپ + سالن + سال + عرض — مرتب: ستاپ صعودی سپس عرض صعودی (null ها آخر) */
function groupRolls(rolls: RollDto[]): RollGroup[] {
  const map = new Map<string, RollGroup>();
  for (const r of rolls) {
    const key = cutGroupKey(r.setupNumber, r.hall, r.yearDigit, r.width);
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        setupNumber: r.setupNumber,
        hall: r.hall,
        yearDigit: r.yearDigit,
        year: r.year,
        width: r.width,
        count: 0,
        totalWeight: 0,
      };
      map.set(key, g);
    }
    g.count += 1;
    g.totalWeight += r.netWeight ?? 0;
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      (a.setupNumber ?? Number.MAX_SAFE_INTEGER) - (b.setupNumber ?? Number.MAX_SAFE_INTEGER) ||
      (a.width ?? Number.MAX_SAFE_INTEGER) - (b.width ?? Number.MAX_SAFE_INTEGER),
  );
}

/** ستون‌های جدول رول‌های داخل دیالوگ جزئیات گروه — خام/EVA (کد EVA فقط برای EVA) */
function groupDetailColumns(category: 'raw' | 'eva'): DataTableColumn<RollDto>[] {
  const cols: DataTableColumn<RollDto>[] = [
    {
      key: 'rollNumber',
      label: 'شماره رول',
      headerTitle: 'شمارهٔ کامل رول — ساختار: حرف + سالن + سال + سری + بازوی برش',
      render: (r) => (
        <span className="ltr-code font-medium" title={r.rollNumber}>
          {r.rollNumber}
        </span>
      ),
      tokens: (r) => [r.rollNumber],
    },
  ];
  if (category === 'eva') {
    cols.push({
      key: 'suffix',
      label: 'کد EVA',
      headerTitle: 'ادامهٔ شمارهٔ رول بعد از بازوی برش خام (مثل E16)',
      render: (r) =>
        r.suffix ? (
          <Badge variant="outline" className="ltr-code text-xs">
            {r.suffix}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      tokens: (r) => (r.suffix ? [r.suffix] : []),
    });
  }
  cols.push(
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
      key: 'length',
      label: 'متراژ (متر)',
      sortableType: 'number',
      render: (r) => <span className="tabular-nums">{faInt(r.length)}</span>,
    },
    {
      key: 'netWeight',
      label: 'وزن خالص (کیلوگرم)',
      sortableType: 'number',
      render: (r) => <span className="font-medium tabular-nums">{faWeightShort(r.netWeight)}</span>,
    },
    {
      key: 'grade',
      label: 'گرید',
      render: (r) =>
        r.grade ? (
          <span className="ltr-code text-xs">{r.grade}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'position',
      label: 'موقعیت فعلی',
      render: (r) =>
        r.position ? (
          <span className="ltr-code text-xs">{r.position}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  );
  return cols;
}

function RollsGroupsTable({
  category,
  title,
  description,
  icon,
}: {
  category: 'raw' | 'eva';
  title: string;
  description: string;
  icon: typeof Package;
}) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<RollsResponse, Error>({
    queryKey: ['rolls', category],
    queryFn: () => apiFetch<RollsResponse>(`/api/rolls?category=${category}`),
  });

  const [detail, setDetail] = useState<RollGroup | null>(null);

  const rolls = useMemo(() => data?.rolls ?? [], [data]);
  const groups = useMemo(() => groupRolls(rolls), [rolls]);

  const detailRolls = useMemo(() => {
    if (!detail) return [];
    return rolls.filter((r) => cutGroupKey(r.setupNumber, r.hall, r.yearDigit, r.width) === detail.key);
  }, [detail, rolls]);

  const totalWeight = useMemo(
    () => groups.reduce((sum, g) => sum + g.totalWeight, 0),
    [groups],
  );

  const Icon = icon;

  /* ستون‌های جدول گروه‌ها — همان چیدمان زبانهٔ برش‌خورده (بدون ستون‌های گرید) */
  const columns = useMemo<DataTableColumn<RollGroup>[]>(
    () => [
      {
        key: 'setupNumber',
        label: 'شماره ستاپ',
        sortableType: 'number',
        render: (g) => <span className="font-bold tabular-nums">{faInt(g.setupNumber)}</span>,
      },
      {
        key: 'hall',
        label: 'سالن',
        sortableType: 'number',
        render: (g) => <span className="tabular-nums">{faInt(g.hall)}</span>,
      },
      {
        key: 'year',
        label: 'سال',
        sortableType: 'number',
        render: (g) => <span className="tabular-nums">{faYear(g.year)}</span>,
      },
      {
        key: 'width',
        label: 'عرض (میلی‌متر)',
        sortableType: 'number',
        render: (g) => <span className="tabular-nums">{faNum(g.width, 0)}</span>,
      },
      {
        key: 'count',
        label: 'تعداد',
        sortableType: 'number',
        render: (g) => <span className="font-medium tabular-nums">{faInt(g.count)}</span>,
      },
      {
        key: 'totalWeight',
        label: 'مجموع وزن خالص (کیلوگرم)',
        sortableType: 'number',
        render: (g) => <span className="font-medium tabular-nums">{faWeightShort(g.totalWeight)}</span>,
      },
      {
        key: 'details',
        label: 'جزئیات',
        align: 'center',
        filterable: false,
        render: (g) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2"
            onClick={() => setDetail(g)}
            aria-label={`مشاهدهٔ جزئیات گروه ستاپ ${faInt(g.setupNumber)}`}
          >
            <Eye className="size-4" aria-hidden="true" />
            جزئیات
          </Button>
        ),
      },
    ],
    [],
  );

  if (isError) {
    return <QueryErrorAlert error={error} onRetry={() => void refetch()} title={`خطا در دریافت ${title}`} />;
  }

  return (
    <Card className="fade-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
          <Icon className="size-5 text-primary" aria-hidden="true" />
          {title}
          <InfoHint text={<>گروه‌بندی بر اساس کلید «شماره ستاپ + سالن تولید + سال + عرض» — مانند زبانهٔ «رولهای برش خورده». {description}</>} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* آمار */}
        <div className="flex flex-wrap gap-2">
          <StatChip
            icon={Boxes}
            label="تعداد گروه"
            value={isLoading ? '…' : faInt(groups.length)}
          />
          <StatChip
            icon={Layers}
            label="تعداد رول"
            value={isLoading ? '…' : faInt(rolls.length)}
          />
          <StatChip
            icon={WeightIcon}
            label="وزن کل"
            value={isLoading ? '…' : `${faWeightShort(totalWeight)} کیلوگرم`}
          />
        </div>

        {/* جدول گروه‌ها */}
        {isLoading ? (
          <TableSkeleton />
        ) : rolls.length === 0 ? (
          <EmptyDataState
            title={`${title} — بدون داده`}
            description="ابتدا فایل «رول های موجود» در بخش ورود داده‌ها بارگذاری کنید تا رول‌های این دسته نمایش داده شوند. اگر فایل را وارد کرده‌اید، ممکن است با تنظیمات فعلی رولی در این دسته شناسایی نشده باشد."
          />
        ) : (
          <DataTable
            tableId={category === 'eva' ? 'rolls-eva-groups' : 'rolls-raw-groups'}
            columns={columns}
            rows={groups}
            getRowKey={(g) => g.key}
            sums={{
              count: { type: 'number', format: faInt },
              totalWeight: { type: 'number', format: faWeightShort },
            }}
          />
        )}
      </CardContent>

      {/* ---------------- دیالوگ جزئیات گروه ---------------- */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              رول‌های گروه — ستاپ {faInt(detail?.setupNumber ?? null)}
              <Badge variant="secondary">{faInt(detail?.count ?? null)} رول</Badge>
            </DialogTitle>
            <DialogDescription>
              سالن {faInt(detail?.hall ?? null)} · سال {faYear(detail?.year ?? null)} · عرض{' '}
              {faNum(detail?.width ?? null, 0)} میلی‌متر · مجموع وزن {faWeight(detail?.totalWeight ?? null)}
            </DialogDescription>
          </DialogHeader>

          <DataTable
            tableId={category === 'eva' ? 'rolls-eva-detail' : 'rolls-raw-detail'}
            columns={groupDetailColumns(category)}
            rows={detailRolls}
            getRowKey={(r) => r.id}
            compact
            defaultVisibleRows={10}
            emptyText="رولی در این گروه یافت نشد."
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ========================================================================= */
/*  جدول گروه‌های رول‌های برش‌خورده (DataTable)                                 */
/* ========================================================================= */

/** ستون‌های گرید — رنگ پس‌زمینهٔ ملایم متمایز */
const GRADE_COLS: Array<{
  key: 'X' | 'U' | 'Q' | 'T' | 'none';
  label: string;
  cellClass: string;
}> = [
  { key: 'X', label: 'گرید X', cellClass: 'bg-emerald-500/[0.07] dark:bg-emerald-500/[0.1]' },
  { key: 'U', label: 'گرید U', cellClass: 'bg-amber-500/[0.09] dark:bg-amber-500/[0.12]' },
  { key: 'Q', label: 'گرید Q', cellClass: 'bg-pink-500/[0.07] dark:bg-pink-500/[0.1]' },
  { key: 'T', label: 'گرید T', cellClass: 'bg-teal-500/[0.08] dark:bg-teal-500/[0.11]' },
  { key: 'none', label: 'بدون گرید', cellClass: 'bg-muted/70' },
];

/** ستون‌های جدول جزئیات گروه (داخل دیالوگ) — بدون وابستگی reactive */
const DETAIL_COLUMNS: DataTableColumn<RollDto>[] = [
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
    key: 'evaCutArm',
    label: 'بازوی برش',
    render: (r) =>
      r.evaCutArm ? (
        <span className="ltr-code text-xs">{r.evaCutArm}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: 'width',
    label: 'عرض (میلی‌متر)',
    sortableType: 'number',
    render: (r) => <span className="tabular-nums">{faNum(r.width, 0)}</span>,
  },
  {
    key: 'netWeight',
    label: 'وزن خالص (کیلوگرم)',
    sortableType: 'number',
    render: (r) => <span className="font-medium tabular-nums">{faWeightShort(r.netWeight)}</span>,
  },
  {
    key: 'grade',
    label: 'گرید',
    render: (r) =>
      r.grade ? (
        <span className="ltr-code text-xs">{r.grade}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: 'position',
    label: 'موقعیت',
    render: (r) =>
      r.position ? (
        <span className="ltr-code text-xs">{r.position}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

function CutGroupsTable() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CutGroupsResponse, Error>({
    queryKey: ['cutGroups'],
    queryFn: () => apiFetch<CutGroupsResponse>('/api/rolls/cut-groups'),
  });

  const [detail, setDetail] = useState<CutGroupDto | null>(null);

  /* رول‌های برش‌خورده فقط هنگام باز بودن دیالوگ دریافت می‌شود (همان کوئری کش‌شده) */
  const cutRollsQuery = useQuery<RollsResponse, Error>({
    queryKey: ['rolls', 'cut'],
    queryFn: () => apiFetch<RollsResponse>('/api/rolls?category=cut'),
    enabled: detail !== null,
  });

  const groups = useMemo(() => data?.groups ?? [], [data]);

  const detailRolls = useMemo(() => {
    if (!detail || !cutRollsQuery.data) return [];
    return cutRollsQuery.data.rolls.filter(
      (r) => cutGroupKey(r.setupNumber, r.hall, r.yearDigit, r.width) === detail.key,
    );
  }, [detail, cutRollsQuery.data]);

  /* ستون‌های جدول گروه‌ها — ۶ ستون اصلی + ۵ ستون گرید دوخطی + جزئیات */
  const columns = useMemo<DataTableColumn<CutGroupDto>[]>(() => {
    const cols: DataTableColumn<CutGroupDto>[] = [
      {
        key: 'setupNumber',
        label: 'شماره ستاپ',
        sortableType: 'number',
        render: (g) => <span className="font-bold tabular-nums">{faInt(g.setupNumber)}</span>,
      },
      {
        key: 'hall',
        label: 'سالن',
        sortableType: 'number',
        render: (g) => <span className="tabular-nums">{faInt(g.hall)}</span>,
      },
      {
        key: 'year',
        label: 'سال',
        sortableType: 'number',
        render: (g) => <span className="tabular-nums">{faYear(g.year)}</span>,
      },
      {
        key: 'width',
        label: 'عرض (میلی‌متر)',
        sortableType: 'number',
        render: (g) => <span className="tabular-nums">{faNum(g.width, 0)}</span>,
      },
      {
        key: 'count',
        label: 'تعداد',
        sortableType: 'number',
        render: (g) => <span className="font-medium tabular-nums">{faInt(g.count)}</span>,
      },
      {
        key: 'totalWeight',
        label: 'مجموع وزن خالص (کیلوگرم)',
        sortableType: 'number',
        render: (g) => <span className="font-medium tabular-nums">{faWeightShort(g.totalWeight)}</span>,
      },
    ];
    for (const g of GRADE_COLS) {
      cols.push({
        key: `grade-${g.key}`,
        label: g.label,
        align: 'center',
        className: g.cellClass,
        headerTitle: `${g.label} — تعداد (خط اول) و مجموع وزن به کیلوگرم (خط دوم)`,
        render: (grp) => {
          const stat = grp.grades[g.key];
          return stat && stat.count > 0 ? (
            <div
              className="cw-cell"
              title={`گرید ${g.key === 'none' ? 'ندارد' : g.key}: ${faInt(stat.count)} رول — ${faWeightShort(stat.weight)} کیلوگرم`}
            >
              <span className="cw-count">{faInt(stat.count)}</span>
              <span className="cw-weight">{faWeightShort(stat.weight)}</span>
            </div>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          );
        },
        tokens: (grp) => {
          const stat = grp.grades[g.key];
          if (!stat || stat.count <= 0) return [];
          return [String(stat.count), String(stat.weight), g.key === 'none' ? 'بدون' : g.key];
        },
      });
    }
    cols.push({
      key: 'details',
      label: 'جزئیات',
      align: 'center',
      filterable: false,
      render: (grp) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={() => setDetail(grp)}
          aria-label={`مشاهدهٔ جزئیات گروه ستاپ ${faInt(grp.setupNumber)}`}
        >
          <Eye className="size-4" aria-hidden="true" />
          جزئیات
        </Button>
      ),
    });
    return cols;
  }, []);

  if (isError) {
    return (
      <QueryErrorAlert error={error} onRetry={() => void refetch()} title="خطا در دریافت گروه‌های برش‌خورده" />
    );
  }

  return (
    <Card className="fade-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
          <Scissors className="size-5 text-primary" aria-hidden="true" />
          گروه‌های رول‌های برش‌خورده
          <InfoHint
            text={
              <>
                گروه‌بندی بر اساس کلید «شماره ستاپ + سالن تولید + سال + عرض». در سلول‌های گرید، تعداد (خط اول) و
                مجموع وزن خالص به کیلوگرم (خط دوم) نمایش داده می‌شود.
              </>
            }
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* آمار */}
        <div className="flex flex-wrap gap-2">
          <StatChip icon={Boxes} label="تعداد گروه" value={isLoading ? '…' : faInt(data?.stats.groups ?? 0)} />
          <StatChip icon={Layers} label="تعداد رول" value={isLoading ? '…' : faInt(data?.stats.count ?? 0)} />
          <StatChip
            icon={WeightIcon}
            label="وزن کل"
            value={isLoading ? '…' : `${faWeightShort(data?.stats.weight ?? 0)} کیلوگرم`}
          />
        </div>

        {/* جدول گروه‌ها */}
        {isLoading ? (
          <TableSkeleton />
        ) : groups.length === 0 ? (
          <EmptyDataState
            title="رول برش‌خورده‌ای وجود ندارد"
            description="ابتدا فایل «رول های موجود» در بخش ورود داده‌ها بارگذاری کنید. اگر فایل را وارد کرده‌اید، ممکن است با تنظیمات فعلی رول برش‌خورده‌ای شناسایی نشده باشد."
          />
        ) : (
          <DataTable
            tableId="rolls-cut"
            columns={columns}
            rows={groups}
            getRowKey={(g) => g.key}
            sums={{
              count: { type: 'number', format: faInt },
              totalWeight: { type: 'number', format: faWeightShort },
            }}
          />
        )}
      </CardContent>

      {/* ---------------- دیالوگ جزئیات گروه ---------------- */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              رول‌های گروه — ستاپ {faInt(detail?.setupNumber ?? null)}
              <Badge variant="secondary">{faInt(detail?.count ?? null)} رول</Badge>
            </DialogTitle>
            <DialogDescription>
              سالن {faInt(detail?.hall ?? null)} · سال {faYear(detail?.year ?? null)} · عرض{' '}
              {faNum(detail?.width ?? null, 0)} میلی‌متر · مجموع وزن {faWeight(detail?.totalWeight ?? null)}
            </DialogDescription>
          </DialogHeader>

          {cutRollsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              در حال دریافت رول‌های برش‌خورده…
            </div>
          ) : cutRollsQuery.isError ? (
            <p className="py-6 text-center text-sm text-destructive">
              {cutRollsQuery.error instanceof Error ? cutRollsQuery.error.message : 'خطا در دریافت رول‌ها'}
            </p>
          ) : (
            <DataTable
              tableId="rolls-cut-detail"
              columns={DETAIL_COLUMNS}
              rows={detailRolls}
              getRowKey={(r) => r.id}
              compact
              defaultVisibleRows={10}
              emptyText="رولی در این گروه یافت نشد."
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ========================================================================= */
/*  نمای اصلی رول‌ها — زبانهٔ فعال ماندگار (بند ۱)                             */
/* ========================================================================= */

const SUB_TABS = ['raw', 'eva', 'cut'] as const;

export function RollsView() {
  const [subtab, setSubtab] = usePersistentState<string>('eva-rolls-subtab', 'raw');
  const active = (SUB_TABS as readonly string[]).includes(subtab) ? subtab : 'raw';

  return (
    <Tabs value={active} onValueChange={setSubtab} dir="rtl" className="gap-4">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1 sm:w-fit">
        <TabsTrigger value="raw" className="min-h-11 gap-1.5 px-4 text-sm">
          <Package className="size-4" aria-hidden="true" />
          رولهای خام
        </TabsTrigger>
        <TabsTrigger value="eva" className="min-h-11 gap-1.5 px-4 text-sm">
          <Layers className="size-4" aria-hidden="true" />
          رولهای EVA
        </TabsTrigger>
        <TabsTrigger value="cut" className="min-h-11 gap-1.5 px-4 text-sm">
          <Scissors className="size-4" aria-hidden="true" />
          رولهای برش خورده
        </TabsTrigger>
      </TabsList>
      <TabsContent value="raw" className="mt-0">
        <RollsGroupsTable
          category="raw"
          title="گروه‌های رول‌های خام"
          description="رول‌های قابل مصرف دستگاه EVA — نوع فیلم خام با عرض و ضخامت در محدودهٔ تنظیمات. این رول‌ها مبنای محاسبهٔ مانده زمان تولید هستند."
          icon={Package}
        />
      </TabsContent>
      <TabsContent value="eva" className="mt-0">
        <RollsGroupsTable
          category="eva"
          title="گروه‌های رول‌های EVA (برش‌نخورده)"
          description="رول‌هایی که روی خط EVA تولید شده‌اند اما هنوز به بازوهای برش تفکیک نشده‌اند (حرف E بعد از بازوی برش خام، بدون بازوی برش دوم)."
          icon={Layers}
        />
      </TabsContent>
      <TabsContent value="cut" className="mt-0">
        <CutGroupsTable />
      </TabsContent>
    </Tabs>
  );
}
