'use client';

/* =========================================================================
   data-table.tsx — جدول دادهٔ پیشرفته با الگوی پروژهٔ متالایز (بند ۸ + بند ۱)
   ---------------------------------------------------------------------------
   · فیلتر متنی زیر هر سرستون (منطق «شامل بودن») + دکمهٔ کوچک «≠» برای
     سوییچ به «شامل نشود» — نرمال‌سازی ارقام فارسی/عربی و جداکننده‌ها
   · «مرتب‌سازی»: پنل چندسطحی با چیپ‌های کشیدنی (dnd-kit) + جهت + حذف
   · «ترتیب ستون‌ها»: کشیدن برای جابه‌جایی + چشم نمایش/مخفی + عرض px
   · «پاک‌کردن همهٔ فیلترها» با شمارندهٔ فیلترهای فعال
   · «ردیف‌های قابل نمایش» زیر جدول → ارتفاع اسکرول جدول
   · یادداشت پایین جدول (footerNote) در آیکون «!» / InfoHint جمع شده (تغییر #۲ نسخهٔ ۱٫۵)
   · سقف رندر DOM (maxDomRows) + ردیف جمع چسبان (sums) با دیتای فیلترشده
   · صفحه‌بندی (بند ۱ نسخهٔ ۱٫۳): paginated + اندازهٔ صفحهٔ ماندگار ۲۰۰۰/۴۰۰۰/۸۰۰۰
   · چیدمان fixed با colgroup و عرض صریح همهٔ ستون‌ها (بند ۱+۳ نسخهٔ ۱٫۳) —
     جدول با min-width روی نوارندهٔ overflow-x-auto اسکرول افقی می‌گیرد
   · نوار صفحه‌بندی با چیدمان استاندارد dir=ltr (بند ۲ نسخهٔ ۱٫۴) + تولتیپ مقدار
     کامل سلول‌های بریده‌شده با «…» (بند ۱ نسخهٔ ۱٫۴)
   · ماندگاری کامل وضعیت در localStorage (بند ۱) — کلیدهای
     eva-table-{tableId}-{filters|sort|columns|rows|pageSize|page|scroll}
     (صفحهٔ فعلی و اسکرول داخلی — بند ۱ نسخهٔ ۱٫۷)
   ========================================================================= */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  Columns3,
  Eye,
  EyeOff,
  FilterX,
  GripVertical,
  X,
} from '@/components/eva/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePersistentState } from '@/lib/eva/use-persistent-state';
import { cn } from '@/lib/utils';
import { faInt, faWeightShort } from '@/lib/eva/format';
import { InfoHint } from '@/components/eva/shared';

/* ========================================================================= */
/*  انواع عمومی                                                              */
/* ========================================================================= */

/** تعریف یک ستون جدول */
export interface DataTableColumn<T> {
  key: string;
  label: string;
  /** tooltip روی سرستون */
  headerTitle?: string;
  render?: (row: T) => ReactNode;
  /** متن‌های قابل‌جست‌وجوی سلول برای فیلتر (پیش‌فرض: String(row[key])) */
  tokens?: (row: T) => string[];
  /** پیش‌فرض true */
  filterable?: boolean;
  /** عرض پیش‌فرض ستون (px) — ۰/تعریف‌نشده = خودکار؛ عرض کاربر از پنل اولویت دارد */
  width?: number;
  /** پیش‌فرض right (RTL) */
  align?: 'right' | 'left' | 'center';
  /** کلاس‌های اضافه برای td */
  className?: string;
  /** نوع مقایسه در مرتب‌سازی — پیش‌فرض: استنتاج از اولین مقدار غیرتهی */
  sortableType?: 'string' | 'number';
}

/** یک سطح از خط‌لولهٔ مرتب‌سازی */
export interface SortStep {
  key: string;
  dir: 'asc' | 'desc';
}

/** وضعیت فیلتر یک ستون */
interface FilterState {
  value: string;
  invert: boolean;
}

/** وضعیت ترتیب ستون‌ها (ماندگار) */
interface ColumnsState {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
}

/** مشخصات باکس جمع زیر یک ستون */
export type TableSumSpec<T> =
  | { type: 'number'; format?: (n: number) => string }
  | { type: 'pair'; weightOf?: (row: T) => number | null };

export interface DataTableProps<T> {
  /** فضای نام ماندگاری — مثلاً 'rolls-raw' */
  tableId: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  /** پیش‌فرض ۴۱ */
  rowHeight?: number;
  /** پیش‌فرض ۲۵ */
  defaultVisibleRows?: number;
  /** سقف رندر DOM — پیش‌فرض ۳۰۰ (فیلترها روی کل داده اعمال می‌شوند؛ برای جدول‌های صفحه‌بندی‌شده بی‌اثر) */
  maxDomRows?: number;
  /** بند ۱ نسخهٔ ۱٫۳ — فعال‌سازی صفحه‌بندی (پیش‌فرض: خاموش) */
  paginated?: boolean;
  /** اندازهٔ پیش‌فرض صفحه — پیش‌فرض ۲۰۰۰ (باید یکی از PAGE_SIZES باشد) */
  defaultPageSize?: number;
  emptyText?: string;
  filteredEmptyText?: string;
  footerNote?: string;
  sums?: Record<string, TableSumSpec<T>>;
  /** پدینگ‌های جمع‌وجورتر برای دیالوگ‌ها */
  compact?: boolean;
  className?: string;
}

/** اندازه‌های مجاز صفحه — بند ۲ نسخهٔ ۱٫۷: فقط ۵۰۰ / ۱۰۰۰ / ۲۰۰۰ رکورد در هر صفحه */
const PAGE_SIZES = [500, 1000, 2000];

/* ========================================================================= */
/*  ابزارهای فیلتر (منطق متالایز)                                             */
/* ========================================================================= */

/** ارقام فارسی (۰-۹) و عربی (٠-٩) → لاتین */
function toLatinDigits(s: string): string {
  return s
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** نرمال‌سازی متن جست‌وجو/سلول: ارقام لاتین + حذف جداکننده‌های هزارگان و فاصله‌ها + کوچک */
function normalizeFilterText(text: unknown): string {
  return toLatinDigits(String(text ?? ''))
    .replace(/[,\u066C\u2019\u066B\s]/g, '')
    .trim()
    .toLowerCase();
}

/** تطبیق «شامل بودن» (invert = «شامل نشود») — فیلتر خالی → همه */
function filterContains(tokens: string[], value: string, invert: boolean): boolean {
  const needle = normalizeFilterText(value);
  if (needle === '') return true;
  const hay = tokens.map((t) => normalizeFilterText(t)).filter(Boolean).join(' ');
  const contains = hay.includes(needle);
  return invert ? !contains : contains;
}

/** خواندن مقدار خام یک فیلد از رکورد (کلید رشته‌ای روی جنریک) */
function rowValue<T>(row: T, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key];
}

/** مقدار پیش‌فرض توکن‌های فیلتر یک ستون */
function defaultTokens<T>(row: T, key: string): string[] {
  const v = rowValue(row, key);
  return v === null || v === undefined ? [] : [String(v)];
}

/* ========================================================================= */
/*  زیرمولفه‌ها                                                               */
/* ========================================================================= */

/** چیپ کشیدنی عمومی (دستگیره GripVertical — dnd-kit) */
function SortableChip({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border bg-card px-2 py-1.5 text-xs shadow-xs',
        isDragging && 'z-10 opacity-70 ring-2 ring-primary/40',
        className,
      )}
      title={title}
    >
      <button
        type="button"
        className="flex size-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label={`جابه‌جایی ${title ?? id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" aria-hidden="true" />
      </button>
      {children}
    </div>
  );
}

/** باکس «ردیف‌های قابل نمایش» — مقدار میانی تایپ‌شده را حفظ می‌کند و در بازهٔ ۵..۲۰۰ می‌بَرد */
function VisibleRowsInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="number"
      min={5}
      max={200}
      step={1}
      inputMode="numeric"
      className="h-8 w-20 rounded-md border bg-background px-2 text-xs tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      aria-label="تعداد ردیف قابل نمایش"
      title="تعداد ردیف قابل نمایش قبل از اسکرول — ارتفاع جدول طبق این عدد تغییر می‌کند"
      value={focused ? text : String(value)}
      onFocus={() => {
        setFocused(true);
        setText(String(value));
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n)) onChange(Math.min(Math.max(n, 5), 200));
      }}
    />
  );
}

/** باکس عرض ستون (px) — debounce سبک؛ خالی/۰ = خودکار */
function WidthInput({
  width,
  onWidth,
  label,
}: {
  width: number | undefined;
  onWidth: (px: number) => void;
  label: string;
}) {
  const [text, setText] = useState(width ? String(width) : '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <input
      type="number"
      min={0}
      max={1200}
      step={1}
      inputMode="numeric"
      className="h-7 w-16 rounded-md border bg-background px-1.5 text-[11px] tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      aria-label={`عرض ستون ${label}`}
      title="عرض این ستون در جدول (پیکسل) — صفر یا خالی = خودکار"
      placeholder="خودکار"
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          const n = parseInt(t, 10);
          onWidth(Number.isFinite(n) ? Math.min(Math.max(n, 0), 1200) : 0);
        }, 300);
      }}
    />
  );
}

/* ========================================================================= */
/*  مولفهٔ اصلی                                                               */
/* ========================================================================= */

export function DataTable<T>({
  tableId,
  columns,
  rows,
  getRowKey,
  rowHeight = 41,
  defaultVisibleRows = 25,
  maxDomRows = 300,
  paginated = false,
  defaultPageSize = 2000,
  emptyText = 'داده‌ای برای نمایش وجود ندارد.',
  filteredEmptyText = 'هیچ رکوردی با فیلترهای فعلی مطابقت ندارد — فیلترها را پاک کنید.',
  footerNote = 'فیلتر هر ستون در زیر سرستون همان ستون · منطق: شامل بودن (عدد و متن)',
  sums,
  compact = false,
  className,
}: DataTableProps<T>) {
  /* ---------------- ماندگاری وضعیت (بند ۱) ---------------- */
  const [filters, setFilters] = usePersistentState<Record<string, FilterState>>(
    `eva-table-${tableId}-filters`,
    {},
  );
  const [sortSteps, setSortSteps] = usePersistentState<SortStep[]>(`eva-table-${tableId}-sort`, []);
  const [colsState, setColsState] = usePersistentState<ColumnsState>(
    `eva-table-${tableId}-columns`,
    { order: [], hidden: [], widths: {} },
  );
  const [visibleRowsRaw, setVisibleRows] = usePersistentState<number>(
    `eva-table-${tableId}-rows`,
    defaultVisibleRows,
  );
  const visibleRows = Math.min(
    Math.max(Number.isFinite(visibleRowsRaw) && visibleRowsRaw > 0 ? visibleRowsRaw : defaultVisibleRows, 5),
    200,
  );

  /* صفحه‌بندی (بند ۱ نسخهٔ ۱٫۳؛ ماندگاری شمارهٔ صفحه — بند ۱ نسخهٔ ۱٫۷): با ترک و
     بازگشت به زبانه، همان صفحهٔ جدول باز می‌شود؛ اندازهٔ صفحه ماندگار است و باید
     یکی از PAGE_SIZES باشد */
  const [pageRaw, setPage] = usePersistentState<number>(`eva-table-${tableId}-page`, 1);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const [pageSizeRaw, setPageSize] = usePersistentState<number>(
    `eva-table-${tableId}-pageSize`,
    defaultPageSize,
  );
  const pageSize = PAGE_SIZES.includes(pageSizeRaw) ? pageSizeRaw : defaultPageSize;

  /* ---------------- ترکیب ترتیب ستون‌ها با تعریف فعلی ---------------- */
  const byKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);

  const effective = useMemo(() => {
    const order = colsState.order.filter((k) => byKey.has(k));
    for (const c of columns) {
      if (!order.includes(c.key)) order.push(c.key);
    }
    const hidden = colsState.hidden.filter((k) => byKey.has(k));
    const widths: Record<string, number> = {};
    for (const [k, w] of Object.entries(colsState.widths)) {
      if (byKey.has(k) && w > 0) widths[k] = w;
    }
    return { order, hidden, widths };
  }, [columns, byKey, colsState]);

  const orderedCols = useMemo(
    () => effective.order.map((k) => byKey.get(k)!).filter(Boolean),
    [effective.order, byKey],
  );
  const visibleCols = useMemo(
    () => orderedCols.filter((c) => !effective.hidden.includes(c.key)),
    [orderedCols, effective.hidden],
  );

  /** عرض مؤثر هر ستون = عرض کاربر ?? عرض تعریف ?? خودکار */
  const widthOf = (col: DataTableColumn<T>): number =>
    effective.widths[col.key] ?? (col.width && col.width > 0 ? col.width : 0);
  const hasWidths = visibleCols.some((c) => widthOf(c) > 0);
  /* بند ۱+۳ (نسخهٔ ۱٫۳): جدول‌های صفحه‌بندی‌شده همیشه چیدمان fixed دارند (auto با
     ۳۰هزار سلول صفحه را قفل می‌کند)؛ در حالت عرض‌دار/fixed هر ستون عرض صریح
     می‌گیرد (کاربر ?? تعریف ?? ۱۲۰px) تا هیچ ستونی جمع نشود و جدول با min-width
     روی نوارندهٔ overflow-x-auto اسکرول افقی بگیرد. */
  const useFixed = hasWidths || paginated;
  const colWidths = visibleCols.map((c) => widthOf(c) || 120);
  const totalWidth = colWidths.reduce((s, w) => s + w, 0);

  /* ---------------- نوع مرتب‌سازی هر ستون (استنتاج) ---------------- */
  const colTypes = useMemo(() => {
    const m = new Map<string, 'string' | 'number'>();
    for (const col of columns) {
      if (col.sortableType) {
        m.set(col.key, col.sortableType);
        continue;
      }
      let inferred: 'string' | 'number' = 'string';
      for (const r of rows) {
        const v = rowValue(r, col.key);
        if (v !== null && v !== undefined && v !== '') {
          inferred = typeof v === 'number' ? 'number' : 'string';
          break;
        }
      }
      m.set(col.key, inferred);
    }
    return m;
  }, [columns, rows]);

  /* ---------------- فیلتر + مرتب‌سازی + سقف DOM ---------------- */
  const filterableVisible = useMemo(
    () => visibleCols.filter((c) => c.filterable !== false),
    [visibleCols],
  );

  const activeFilterCount = filterableVisible.filter(
    (c) => (filters[c.key]?.value ?? '').trim() !== '',
  ).length;

  const filteredRows = useMemo(() => {
    const active = filterableVisible.filter((c) => (filters[c.key]?.value ?? '').trim() !== '');
    if (active.length === 0) return rows;
    return rows.filter((row) =>
      active.every((c) => {
        const f = filters[c.key] ?? { value: '', invert: false };
        const tokens = c.tokens ? c.tokens(row) : defaultTokens(row, c.key);
        return filterContains(tokens, f.value, f.invert);
      }),
    );
  }, [rows, filterableVisible, filters]);

  const sortedRows = useMemo(() => {
    if (sortSteps.length === 0) return filteredRows;
    const steps = sortSteps
      .map((s) => ({ ...s, type: colTypes.get(s.key) ?? 'string' }))
      .filter((s) => byKey.has(s.key));
    if (steps.length === 0) return filteredRows;
    const out = [...filteredRows];
    out.sort((a, b) => {
      for (const step of steps) {
        const dir = step.dir === 'asc' ? 1 : -1;
        const av = rowValue(a, step.key);
        const bv = rowValue(b, step.key);
        const aNull = av === null || av === undefined || av === '';
        const bNull = bv === null || bv === undefined || bv === '';
        if (aNull && bNull) continue;
        if (aNull) return 1; // تهی‌ها همیشه آخر — مستقل از جهت
        if (bNull) return -1;
        let r: number;
        if (step.type === 'number') {
          r = (Number(av) - Number(bv)) * dir;
        } else {
          r = String(av).localeCompare(String(bv), 'fa') * dir;
        }
        if (r !== 0) return r;
      }
      return 0;
    });
    return out;
  }, [filteredRows, sortSteps, colTypes, byKey]);

  /* صفحه‌بندی (بند ۱ نسخهٔ ۱٫۳): برش رکوردهای صفحهٔ فعلی — شمارهٔ صفحه با تغییر
     فیلتر/مرتب‌سازی در هر رندر به بازهٔ مجاز محدود (clamp) می‌شود */
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (safePage - 1) * pageSize;

  /* سقف DOM فقط برای جدول‌های غیرصفحه‌بندی‌شده فعال است */
  const domCapped = !paginated && sortedRows.length > maxDomRows;
  const domRows = paginated
    ? sortedRows.slice(pageStart, pageStart + pageSize)
    : domCapped
      ? sortedRows.slice(0, maxDomRows)
      : sortedRows;

  /* ---------------- بند ۱ نسخهٔ ۱٫۷: ماندگاری اسکرول داخلی جدول ----------------
     ردیف‌های جدول داخل نوارندهٔ باارتفاع ثابت (ردیف‌های قابل نمایش × ارتفاع ردیف)
     اسکرول می‌شوند؛ موقعیت این اسکرول نیز ذخیره/بازیابی می‌شود تا با بازگشت به
     زبانه، همان ردیف‌های دیداری قبلی نمایش داده شوند. */
  const innerScrollRef = useRef<HTMLDivElement | null>(null);
  const innerRestorePendingRef = useRef(true);
  const innerPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* بازیابی یک‌بارهٔ موقعیت ذخیره‌شده — با debounce کوتاه: وضعیت‌های ماندگار
     (صفحه/فیلتر/مرتب‌سازی) پس از mount به‌صورت ناهمگام بازیابی می‌شوند و رندر
     میانی چند بار domRows را عوض می‌کند؛ اجرای بازیابی تنها زمانی انجام می‌شود
     که محتوا برای ~۱۲۰ms پایدار مانده باشد (آخرین رندر = محتوای نهایی) */
  useEffect(() => {
    if (!innerRestorePendingRef.current) return;
    if (domRows.length === 0) return; // منتظر داده
    const timer = setTimeout(() => {
      if (!innerRestorePendingRef.current) return;
      innerRestorePendingRef.current = false;
      let saved = 0;
      try {
        const n = Number(localStorage.getItem(`eva-table-${tableId}-scroll`));
        if (Number.isFinite(n) && n > 0) saved = n;
      } catch {
        /* دادهٔ خراب — از بالا شروع */
      }
      const el = innerScrollRef.current;
      if (el && saved > 0) {
        el.scrollTop = Math.min(saved, Math.max(0, el.scrollHeight - el.clientHeight));
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [domRows, tableId]);

  /** ذخیرهٔ موقعیت اسکرول داخلی (با تأخیر کوتاه) */
  function handleInnerScroll() {
    const el = innerScrollRef.current;
    if (!el) return;
    if (innerPersistTimerRef.current) clearTimeout(innerPersistTimerRef.current);
    innerPersistTimerRef.current = setTimeout(() => {
      innerPersistTimerRef.current = null;
      if (!innerScrollRef.current) return;
      try {
        localStorage.setItem(`eva-table-${tableId}-scroll`, String(Math.round(innerScrollRef.current.scrollTop)));
      } catch {
        /* نادیده گرفته می‌شود */
      }
    }, 250);
  }

  /* خودترمیمی صفحهٔ ذخیره‌شده: خارج از بازهٔ مجاز (مثلاً پس از تغییر داده/فیلتر)
     به نزدیک‌ترین مقدار مجاز برگردانده و ذخیره می‌شود — فقط وقتی داده رسیده
     باشد؛ در حالت بارگذاری (rows خالی) totalPages=1 است و نباید صفحهٔ ذخیره‌شده
     را قبل از رسیدن داده بازنویسی کند (مسابقهٔ reload) */
  useEffect(() => {
    if (rows.length > 0 && page !== safePage) setPage(safePage);
  }, [rows.length, page, safePage, setPage]);

  /* ---------------- جمع‌ها با دیتای فیلترشده ---------------- */
  const sumsComputed = useMemo(() => {
    if (!sums) return null;
    const out: Record<string, { number?: number; pair?: { count: number; weight: number } }> = {};
    for (const [key, spec] of Object.entries(sums)) {
      if (spec.type === 'number') {
        let total = 0;
        for (const row of sortedRows) {
          const v = rowValue(row, key);
          if (v === null || v === undefined || v === '') continue;
          const n = Number(v);
          if (Number.isFinite(n)) total += n;
        }
        out[key] = { number: total };
      } else {
        let count = 0;
        let weight = 0;
        for (const row of sortedRows) {
          const v = Number(rowValue(row, key));
          if (Number.isFinite(v)) count += v;
          const w = spec.weightOf ? Number(spec.weightOf(row)) : NaN;
          if (Number.isFinite(w)) weight += w;
        }
        out[key] = { pair: { count, weight } };
      }
    }
    return out;
  }, [sums, sortedRows]);

  /* ---------------- کنترلرهای وضعیت ---------------- */
  function setFilter(key: string, next: FilterState) {
    setFilters((prev) => ({ ...prev, [key]: next }));
  }

  function clearAllFilters() {
    const next: Record<string, FilterState> = {};
    for (const k of Object.keys(filters)) next[k] = { value: '', invert: false };
    setFilters(next);
    toast('همهٔ فیلترهای این جدول پاک شد.');
  }

  function addSortStep(key: string) {
    setSortSteps((prev) =>
      prev.some((s) => s.key === key) ? prev : [...prev, { key, dir: 'asc' }],
    );
  }

  function toggleSortDir(key: string) {
    setSortSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : s)),
    );
  }

  function removeSortStep(key: string) {
    setSortSteps((prev) => prev.filter((s) => s.key !== key));
  }

  function toggleColumnHidden(key: string) {
    setColsState((prev) => {
      /* ترتیب ادغام‌شده با تعریف فعلی ستون‌ها (prev.order ممکن است هنوز خالی باشد) */
      const order = prev.order.filter((k) => byKey.has(k));
      for (const c of columns) if (!order.includes(c.key)) order.push(c.key);
      const hidden = prev.hidden.filter((k) => byKey.has(k));
      const isHidden = hidden.includes(key);
      if (!isHidden && order.filter((k) => !hidden.includes(k)).length <= 1) {
        toast('حداقل یک ستون باید نمایان بماند.');
        return prev;
      }
      return {
        ...prev,
        order,
        hidden: isHidden ? hidden.filter((k) => k !== key) : [...hidden, key],
      };
    });
  }

  function setColumnWidth(key: string, px: number) {
    setColsState((prev) => {
      const widths = { ...prev.widths };
      if (px > 0) widths[key] = px;
      else delete widths[key];
      return { ...prev, widths };
    });
  }

  /* ---------------- dnd-kit ---------------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onSortDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSortSteps((prev) => {
      const oldIndex = prev.findIndex((s) => s.key === active.id);
      const newIndex = prev.findIndex((s) => s.key === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function onColumnsDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColsState((prev) => {
      const order = prev.order.filter((k) => byKey.has(k));
      for (const c of columns) if (!order.includes(c.key)) order.push(c.key);
      const oldIndex = order.indexOf(String(active.id));
      const newIndex = order.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, order: arrayMove(order, oldIndex, newIndex) };
    });
  }

  /* ---------------- رندر ---------------- */
  const alignCls = (a?: 'right' | 'left' | 'center') =>
    a === 'center' ? 'text-center' : a === 'left' ? 'text-left' : 'text-right';

  const sortAvailableCols = orderedCols.filter((c) => !sortSteps.some((s) => s.key === c.key));
  const cellPad = compact ? 'px-2 py-1' : 'px-2 py-1.5';
  /** دکمه‌های کوچک طرح outline نوار صفحه‌بندی (بند ۲ نسخهٔ ۱٫۴) */
  const pgBtnCls =
    'flex h-8 w-8 items-center justify-center rounded-md border bg-background text-sm font-bold leading-none transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className={cn('space-y-2', className)}>
      {/* ---------------- نوار ابزار بالای جدول ---------------- */}
      <div className="flex flex-wrap items-center gap-2">
        {/* مرتب‌سازی */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-h-9 gap-1.5"
              aria-label="پنل مرتب‌سازی چندسطحی"
            >
              <ArrowUpDown className="size-3.5" aria-hidden="true" />
              مرتب‌سازی
              {sortSteps.length > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px] tabular-nums">
                  {faInt(sortSteps.length)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3" dir="rtl">
            <div className="space-y-3">
              <p className="text-xs font-medium text-foreground">
                سطح‌های مرتب‌سازی <span className="text-muted-foreground">(اولویت از بالا به پایین)</span>
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSortDragEnd}>
                <SortableContext
                  items={sortSteps.map((s) => s.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {sortSteps.length === 0 && (
                      <p className="py-1 text-xs text-muted-foreground">مرتب‌سازی پیش‌فرض</p>
                    )}
                    {sortSteps.map((step, i) => {
                      const col = byKey.get(step.key);
                      return (
                        <SortableChip key={step.key} id={step.key} title="برای تغییر اولویت بکشید">
                          <span className="w-4 shrink-0 text-center font-bold text-primary tabular-nums">
                            {faInt(i + 1)}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{col?.label ?? step.key}</span>
                          <button
                            type="button"
                            onClick={() => toggleSortDir(step.key)}
                            aria-label="تغییر جهت مرتب‌سازی"
                            title="تغییر جهت"
                            className={cn(
                              'flex size-6 shrink-0 items-center justify-center rounded-md border text-sm font-bold transition-colors',
                              step.dir === 'asc'
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {step.dir === 'asc' ? '↑' : '↓'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSortStep(step.key)}
                            aria-label="حذف از مرتب‌سازی"
                            title="حذف"
                            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="size-3.5" aria-hidden="true" />
                          </button>
                        </SortableChip>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
              {sortAvailableCols.length > 0 ? (
                <Select value="" onValueChange={(k) => addSortStep(k)}>
                  <SelectTrigger size="sm" className="w-full" aria-label="افزودن سطح مرتب‌سازی">
                    <SelectValue placeholder="افزودن سطح مرتب‌سازی…" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {sortAvailableCols.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">همهٔ ستون‌ها در مرتب‌سازی هستند.</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* ترتیب ستون‌ها */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-h-9 gap-1.5"
              aria-label="پنل ترتیب ستون‌ها"
            >
              <Columns3 className="size-3.5" aria-hidden="true" />
              ترتیب ستون‌ها
              {effective.hidden.length > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px] tabular-nums">
                  {faInt(effective.hidden.length)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3" dir="rtl">
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                ترتیب، نمایش و عرض ستون‌ها{' '}
                <span className="text-muted-foreground">(برای جابه‌جایی، دستگیره را بکشید)</span>
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onColumnsDragEnd}>
                <SortableContext items={effective.order} strategy={verticalListSortingStrategy}>
                  <div className="max-h-96 space-y-1.5 overflow-y-auto pl-1">
                    {effective.order.map((key, i) => {
                      const col = byKey.get(key);
                      if (!col) return null;
                      const hidden = effective.hidden.includes(key);
                      return (
                        <SortableChip
                          key={key}
                          id={key}
                          title="برای تغییر ترتیب بکشید"
                          className={hidden ? 'opacity-60' : undefined}
                        >
                          <span className="w-4 shrink-0 text-center font-bold text-primary tabular-nums">
                            {faInt(i + 1)}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{col.label}</span>
                          <button
                            type="button"
                            onClick={() => toggleColumnHidden(key)}
                            aria-pressed={!hidden}
                            aria-label={`نمایش/مخفی‌کردن ستون ${col.label}`}
                            title={
                              hidden
                                ? 'این ستون در جدول مخفی است — برای نمایش دوباره کلیک کنید'
                                : 'مخفی‌کردن این ستون در جدول (از پنل دوباره نمایش داده می‌شود)'
                            }
                            className={cn(
                              'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors',
                              hidden
                                ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                : 'text-primary hover:bg-primary/10',
                            )}
                          >
                            {hidden ? (
                              <EyeOff className="size-3.5" aria-hidden="true" />
                            ) : (
                              <Eye className="size-3.5" aria-hidden="true" />
                            )}
                          </button>
                          <WidthInput
                            width={widthOf(col) || undefined}
                            onWidth={(px) => setColumnWidth(key, px)}
                            label={col.label}
                          />
                          <span className="shrink-0 text-[10px] text-muted-foreground">px</span>
                        </SortableChip>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </PopoverContent>
        </Popover>

        {/* پاک‌کردن همهٔ فیلترها */}
        <Button
          variant="outline"
          size="sm"
          className="min-h-9 gap-1.5"
          onClick={clearAllFilters}
          disabled={activeFilterCount === 0}
          title="پاک‌کردن همهٔ فیلترهای اعمال‌شدهٔ این جدول (متن فیلترها + منطق «شامل نشود»)"
          aria-label="پاک‌کردن همهٔ فیلترهای این جدول"
        >
          <FilterX className="size-3.5" aria-hidden="true" />
          پاک‌کردن همهٔ فیلترها
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px] tabular-nums">
              {faInt(activeFilterCount)}
            </Badge>
          )}
        </Button>
      </div>

      {/* ---------------- جدول (ارتفاع = ردیف‌های قابل نمایش × ارتفاع ردیف) ---------------- */}
      {/* نوارندهٔ داخلی shadcn Table باید overflow-visible باشد تا سرستون چسبان (sticky thead)
          نسبت به همین نوارندهٔ بیرونی عمل کند — با کلاس variant دلخواه + قانون .dt-scroll در globals.css */}
      <div
        ref={innerScrollRef}
        onScroll={handleInnerScroll}
        className="dt-scroll overflow-x-auto overflow-y-auto rounded-lg border bg-card [&>[data-slot=table-container]]:overflow-visible"
        style={{ height: visibleRows * rowHeight, maxHeight: visibleRows * rowHeight }}
      >
        <Table
          className={cn('text-xs sm:text-sm', useFixed && 'table-fixed')}
          style={useFixed ? { minWidth: totalWidth } : undefined}
        >
          {useFixed && (
            <colgroup>
              {visibleCols.map((c, i) => (
                <col key={c.key} style={{ width: colWidths[i], minWidth: colWidths[i] }} />
              ))}
            </colgroup>
          )}
          <TableHeader className="sticky top-0 z-10">
            {/* ردیف ۱ — عنوان ستون‌ها (چندخطی مجاز) */}
            <TableRow className="hover:bg-transparent">
              {visibleCols.map((col) => (
                <TableHead
                  key={col.key}
                  title={col.headerTitle}
                  className={cn(
                    'h-auto whitespace-normal border-b bg-card px-2 py-1.5 text-xs font-medium',
                    alignCls(col.align),
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
            {/* ردیف ۲ — فیلتر زیر سرستون + دکمهٔ «≠» */}
            <TableRow className="hover:bg-transparent">
              {visibleCols.map((col) => {
                if (col.filterable === false) {
                  return <TableHead key={col.key} className="border-b bg-card px-1 py-1" />;
                }
                const f = filters[col.key] ?? { value: '', invert: false };
                return (
                  <TableHead key={col.key} className="border-b bg-card px-1 py-1">
                    <div className="flex flex-row items-center gap-1">
                      <button
                        type="button"
                        aria-pressed={f.invert}
                        aria-label={`برعکس‌کردن منطق فیلتر ستون ${col.label}`}
                        title={
                          f.invert
                            ? 'منطق فعلی: شامل نشود — برای بازگشت به «شامل بودن» کلیک کنید'
                            : 'برعکس‌کردن منطق: شامل نشود'
                        }
                        onClick={() => setFilter(col.key, { ...f, invert: !f.invert })}
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors',
                          f.invert
                            ? 'border-primary/50 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                        )}
                      >
                        ≠
                      </button>
                      <input
                        type="text"
                        value={f.value}
                        onChange={(e) => setFilter(col.key, { ...f, value: e.target.value })}
                        placeholder="فیلتر…"
                        autoComplete="off"
                        aria-label={`فیلتر ستون ${col.label}`}
                        className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs outline-none placeholder:text-muted-foreground/70 focus-visible:ring-[3px] focus-visible:ring-ring/40"
                      />
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {domRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visibleCols.length || 1}
                  className="h-24 whitespace-normal text-center text-sm text-muted-foreground"
                >
                  {rows.length === 0 ? emptyText : filteredEmptyText}
                </TableCell>
              </TableRow>
            ) : (
              domRows.map((row, i) => (
                <TableRow key={getRowKey(row, i)}>
                  {visibleCols.map((col) => {
                    const raw = rowValue(row, col.key);
                    /* بند ۱ (نسخهٔ ۱٫۴): تولتیپ مقدار کامل — وقتی متن با «…» بریده
                       می‌شود، کاربر با نگه‌داشتن ماوس مقدار کامل را می‌بیند */
                    const tip =
                      typeof raw === 'number' || (typeof raw === 'string' && raw !== '')
                        ? String(raw)
                        : undefined;
                    return (
                      <TableCell
                        key={col.key}
                        title={tip}
                        className={cn(
                          cellPad,
                          alignCls(col.align),
                          col.className,
                          useFixed && 'truncate max-w-0 overflow-hidden',
                        )}
                      >
                        {col.render
                          ? col.render(row)
                          : raw === null || raw === undefined
                            ? '—'
                            : String(raw)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
          {/* ردیف جمع چسبان — با دیتای فیلترشده */}
          {sums && sumsComputed && visibleCols.length > 0 && (
            <TableFooter className="sticky bottom-0 z-10 backdrop-blur">
              <TableRow className="hover:bg-transparent">
                {visibleCols.map((col) => {
                  const spec = sums[col.key];
                  if (!spec) return <TableCell key={col.key} className="px-2 py-1.5" />;
                  const computed = sumsComputed[col.key];
                  return (
                    <TableCell
                      key={col.key}
                      title={`جمع ستون «${col.label}» با دیتای فیلترشده`}
                      className={cn('px-2 py-1.5 text-sm tabular-nums', alignCls(col.align))}
                    >
                      {spec.type === 'number' ? (
                        <span className="font-bold">
                          {spec.format
                            ? spec.format(computed?.number ?? 0)
                            : faInt(computed?.number ?? 0)}
                        </span>
                      ) : (
                        <span className="cw-cell">
                          <span className="cw-count">{faInt(computed?.pair?.count ?? 0)}</span>
                          <span className="cw-weight">
                            {faWeightShort(computed?.pair?.weight ?? 0)}
                          </span>
                        </span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* ---------------- نوار صفحه‌بندی (بند ۱ نسخهٔ ۱٫۳ + بند ۲ نسخهٔ ۱٫۴ + بند ۳ نسخهٔ ۱٫۷) ---------------- */}
      {paginated && sortedRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-muted-foreground">
          {/* بند ۳ (نسخهٔ ۱٫۷): قرینه‌سازی عملکرد دکمه‌ها — شکل و جای آیکون‌ها
              دقیقاً همان است که بود؛ فقط عملکرد/توضیح هاور/شرط غیرفعال‌بودن قرینه
              شده است: «« و «‹» (سمت چپ = جهت پیشروی در RTL) = آخر/بعدی و
              «»» و «›» (سمت راست = جهت بازگشت در RTL) = اول/قبلی */}
          <div className="flex items-center gap-1.5" dir="ltr">
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              aria-label="صفحهٔ آخر"
              title="صفحهٔ آخر"
              className={pgBtnCls}
            >
              «
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              aria-label="صفحهٔ بعدی"
              title="صفحهٔ بعدی"
              className={pgBtnCls}
            >
              ‹
            </button>
            <span dir="rtl" aria-live="polite" className="min-w-[110px] text-center tabular-nums">
              صفحهٔ {faInt(safePage)} از {faInt(totalPages)}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              aria-label="صفحهٔ قبلی"
              title="صفحهٔ قبلی"
              className={pgBtnCls}
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              aria-label="صفحهٔ اول"
              title="صفحهٔ اول"
              className={pgBtnCls}
            >
              »
            </button>
          </div>
          <span className="tabular-nums">
            نمایش {faInt(pageStart + 1)} تا {faInt(Math.min(pageStart + pageSize, sortedRows.length))} از{' '}
            {faInt(sortedRows.length)} رکورد{activeFilterCount > 0 ? ' (فیلترشده)' : ''}
          </span>
          <label className="flex items-center gap-1.5">
            <span className="whitespace-nowrap" title="تعداد رکورد در هر صفحه — ۵۰۰ / ۱۰۰۰ / ۲۰۰۰">
              ردیف در هر صفحه:
            </span>
            <select
              value={String(pageSize)}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isFinite(n)) {
                  setPageSize(n);
                  setPage(1);
                }
              }}
              aria-label="ردیف در هر صفحه"
              className="h-8 rounded-md border bg-background px-2 text-xs tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={String(n)}>
                  {faInt(n)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* ---------------- نوار پایین: وضعیت + ردیف‌های قابل نمایش ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <InfoHint text={footerNote} />
          {activeFilterCount > 0 ? (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium text-primary tabular-nums">
              {faInt(sortedRows.length)} از {faInt(rows.length)} رکورد (فیلترشده)
            </span>
          ) : (
            <span className="rounded-full border bg-muted px-2 py-0.5 tabular-nums">
              {faInt(rows.length)} رکورد
            </span>
          )}
          {domCapped && (
            <span
              className="rounded-full border bg-muted px-2 py-0.5 tabular-nums"
              title={`برای پاسخ‌گویی فقط ${faInt(domRows.length)} ردیف اولِ فیلترشده رندر شده — با فیلتر دقیق‌تر رکوردهای دلخواه را ببینید`}
            >
              نمایش {faInt(domRows.length)} ردیف
            </span>
          )}
        </div>
        <label className="flex items-center gap-1.5">
          <span
            className="whitespace-nowrap"
            title="تعداد ردیف قابل نمایش قبل از اسکرول — ارتفاع جدول طبق این عدد تغییر می‌کند"
          >
            ردیف‌های قابل نمایش:
          </span>
          <VisibleRowsInput value={visibleRows} onChange={setVisibleRows} />
        </label>
      </div>
    </div>
  );
}
