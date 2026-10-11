'use client';

/* =========================================================================
   import-view.tsx — ورود داده‌ها: بارگذاری فایل اکسل «رول های موجود»،
   خلاصهٔ نتیجهٔ Import، جدول رول‌های فایل واردشده با ویرایش کامل و وضعیت
   دستی (بند ۴ نسخهٔ ۱٫۲)، رول‌های ویرایش‌شده (بند ۴ نسخهٔ ۱٫۳) و مدیریت
   آخرین Import (حذف داده‌ها) — پورت کامل views/import.js نسخهٔ ۱٫۴
   ========================================================================= */

import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Database,
  CalendarDays,
  Weight,
  ListFilter,
  Table,
  Pencil,
  Save,
  ArrowLeft,
} from '@/components/eva/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, ApiRequestError, InfoHint, QueryErrorAlert } from '@/components/eva/shared';
import { DataTable, type DataTableColumn } from '@/components/eva/data-table';
import { cn } from '@/lib/utils';
import type {
  ImportResponse,
  ImportSummary,
  MappableField,
  RollCategory,
  RollDto,
  RollsResponse,
  SettingsResponse,
  TypeOverride,
  UpdateRollInput,
  UpdateRollResponse,
} from '@/types/eva';
import { CATEGORY_LABELS, FIELD_LABELS } from '@/types/eva';
import { faDateTime, faInt, faNum } from '@/lib/eva/format';

/** ترتیب نمایش دسته‌ها در خلاصهٔ Import */
const CATEGORY_ORDER: RollCategory[] = [
  'raw',
  'eva',
  'cut',
  'error_e_film',
  'error_no_e',
  'raw_out_of_range',
  'other',
];

/** رنگ Badge هر دسته (پالت فیروزه‌ای/کهربایی — بدون آبی) */
const CATEGORY_BADGE: Record<RollCategory, string> = {
  raw: 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300',
  eva: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  cut: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  error_e_film: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  error_no_e: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  raw_out_of_range: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  other: 'border-stone-500/40 bg-stone-500/10 text-stone-600 dark:text-stone-300',
};

/** برچسب فارسی وضعیت دستی (بند ۴) */
const OVERRIDE_LABEL: Record<TypeOverride, string> = {
  raw: 'رول خام',
  eva: 'رول EVA',
  cut: 'رول برش‌خورده',
};

/** مقدار Sentinel گزینهٔ «خودکار» در Select وضعیت دستی (مقدار خالی مجاز نیست) */
const AUTO_OVERRIDE = '__auto';

/** گزینه‌های وضعیت دستی رول (بند ۴) — '__auto' = بدون انتخاب (تشخیص خودکار) */
const TYPE_OVERRIDE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: AUTO_OVERRIDE, label: 'خودکار (بدون انتخاب)' },
  { value: 'raw', label: 'رول خام' },
  { value: 'eva', label: 'رول EVA' },
  { value: 'cut', label: 'رول برش‌خورده' },
];

/** ردیف جدول خلاصهٔ دسته‌ها (DataTable — بند ۸) */
interface SummaryRow {
  cat: RollCategory;
  count: number;
  share: number | null;
}

/** ستون‌های جدول خلاصهٔ دسته‌ها */
const SUMMARY_COLUMNS: DataTableColumn<SummaryRow>[] = [
  {
    key: 'cat',
    label: 'دسته',
    render: (r) => (
      <Badge variant="outline" className={cn('gap-1.5', CATEGORY_BADGE[r.cat])}>
        {CATEGORY_LABELS[r.cat]}
      </Badge>
    ),
    tokens: (r) => [CATEGORY_LABELS[r.cat], r.cat],
  },
  {
    key: 'count',
    label: 'تعداد',
    sortableType: 'number',
    render: (r) => <span className="font-bold tabular-nums">{faInt(r.count)}</span>,
  },
  {
    key: 'share',
    label: 'سهم از کل',
    render: (r) => (
      <span className="text-muted-foreground tabular-nums">
        {r.share === null ? '—' : `${faNum(r.share, 1)}٪`}
      </span>
    ),
    tokens: (r) => (r.share === null ? [] : [String(Math.round(r.share * 10) / 10)]),
  },
];

/** خطای Import با ستون‌های الزامی گم‌شده */
interface MissingError {
  message: string;
  missing: string[];
  headers?: string[];
}

/* ========================================================================= */
/*  InfoHint — به shared.tsx منتقل شد (تغییر #۲ نسخهٔ ۱٫۵)؛ صادرات مجدد برای  */
/*  سازگاری فراخوانی‌های موجود                                                */
/* ========================================================================= */

export { InfoHint } from '@/components/eva/shared';

/** پرچم کوچک «دستی» کنار بج وضعیت — نشانگر انتخاب دستی رول (بند ۴) */
function ManualFlag({ typeOverride }: { typeOverride: TypeOverride }) {
  return (
    <span
      className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
      title={`انتخاب دستی: ${OVERRIDE_LABEL[typeOverride]} — بر منطق خودکار اولویت دارد`}
    >
      دستی
    </span>
  );
}

/* ---------- بند ۲ نسخهٔ ۱٫۶: نمایش «از چه مقداری به چه مقداری» ---------- */

/** متن نمایش مقدار تغییر — عدد به رقم فارسی؛ خالی/نامشخص → «—» */
function changeValueText(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return typeof v === 'number' ? faNum(v) : String(v);
}

/** نشان کوچک کهربایی «ویرایش‌شده» — علامت اختصاصی فیلدهای ویرایش‌شدهٔ دستی */
function EditedMark({ title = 'این فیلد به‌صورت دستی ویرایش شده است' }: { title?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
      title={title}
    >
      <Pencil className="size-2.5" aria-hidden="true" />
      ویرایش‌شده
    </span>
  );
}

/** چیپ یک تغییر: عنوان فیلد + مقدار قبلی (خط‌خورده) ← مقدار جدید (پررنگ) */
function ChangeChip({
  fieldLabel,
  oldVal,
  newVal,
  title,
}: {
  fieldLabel: string;
  oldVal: string;
  newVal: string;
  title: string;
}) {
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[11px] leading-5"
      title={title}
    >
      <span className="font-medium text-amber-700 dark:text-amber-400">{fieldLabel}:</span>
      <span dir="auto" className="text-muted-foreground line-through decoration-muted-foreground/50">
        {oldVal}
      </span>
      <ArrowLeft className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span dir="auto" className="font-bold text-teal-700 dark:text-teal-300">
        {newVal}
      </span>
    </span>
  );
}

/**
 * تغییرات یک رول ویرایش‌شده (بند ۲ نسخهٔ ۱٫۶) — فقط مواردی که تغییر کرده‌اند:
 * وضعیت دستی (در صورت وجود) + هر فیلد manualEdit به‌صورت «مقدار قبلی ← مقدار جدید».
 */
function EditedRollChanges({ roll }: { roll: RollDto }) {
  const chips: ReactNode[] = [];
  if (roll.typeOverride) {
    const from = `${CATEGORY_LABELS[roll.autoCategory]} · خودکار`;
    const to = `${OVERRIDE_LABEL[roll.typeOverride]} · دستی`;
    chips.push(
      <ChangeChip
        key="__status__"
        fieldLabel="وضعیت رول"
        oldVal={from}
        newVal={to}
        title={`وضعیت رول: از «${CATEGORY_LABELS[roll.autoCategory]}» (تشخیص خودکار) به «${OVERRIDE_LABEL[roll.typeOverride]}» (انتخاب دستی)`}
      />,
    );
  }
  const keys = Object.keys(roll.manualEdit ?? {}) as MappableField[];
  for (const k of keys) {
    const label = k in FIELD_LABELS ? FIELD_LABELS[k] : k;
    const oldVal = changeValueText(roll.original?.[k]);
    const newVal = changeValueText(roll.manualEdit?.[k]);
    chips.push(
      <ChangeChip
        key={k}
        fieldLabel={label}
        oldVal={oldVal}
        newVal={newVal}
        title={`${label}: از «${oldVal}» به «${newVal}»`}
      />,
    );
  }
  if (chips.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <span className="flex max-w-[26rem] flex-wrap gap-1.5">{chips}</span>;
}

/** توکن‌های فیلتر ستون «تغییرات» — برچسب فیلدها + مقادیر قبلی/جدید */
function editedChangesTokens(r: RollDto): string[] {
  const out: string[] = [];
  if (r.typeOverride) {
    out.push('وضعیت رول', CATEGORY_LABELS[r.autoCategory], OVERRIDE_LABEL[r.typeOverride], 'دستی', 'خودکار');
  }
  for (const k of Object.keys(r.manualEdit ?? {}) as MappableField[]) {
    out.push(k in FIELD_LABELS ? FIELD_LABELS[k] : k);
    out.push(changeValueText(r.original?.[k]), changeValueText(r.manualEdit?.[k]));
  }
  return out;
}

/** اسکلتون بارگذاری جدول‌های بند ۴ */
function TableSkeletonState({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

/* ========================================================================= */
/*  دیالوگ ویرایش رول (بند ۴ — پورت openEditDialog نسخهٔ ۱٫۴)                  */
/* ========================================================================= */

/** پیش‌نویس فیلدهای فرم ویرایش — همهٔ مقادیر رشته‌ای (null → '') */
interface RollEditDraft {
  rollNumber: string;
  filmType: string;
  setupNumber: string;
  width: string;
  initialWidth: string;
  thickness: string;
  length: string;
  netWeight: string;
  grade: string;
  palletNumber: string;
  productionDate: string;
  position: string;
  externalId: string;
  /** AUTO_OVERRIDE یا یکی از raw|eva|cut */
  typeOverride: string;
}

/** مقدار فیلد فرم از DTO — null → رشتهٔ خالی */
function formValue(v: number | string | null | undefined): string {
  return v === null || v === undefined ? '' : String(v);
}

/** ساخت پیش‌نویس اولیهٔ فرم از DTO رول */
function draftFromRoll(r: RollDto): RollEditDraft {
  return {
    rollNumber: formValue(r.rollNumber),
    filmType: formValue(r.filmType),
    setupNumber: formValue(r.setupNumber),
    width: formValue(r.width),
    initialWidth: formValue(r.initialWidth),
    thickness: formValue(r.thickness),
    length: formValue(r.length),
    netWeight: formValue(r.netWeight),
    grade: formValue(r.grade),
    palletNumber: formValue(r.palletNumber),
    productionDate: formValue(r.productionDate),
    position: formValue(r.position),
    externalId: formValue(r.externalId),
    typeOverride: r.typeOverride ?? AUTO_OVERRIDE,
  };
}

/** فیلد فرم ویرایش — عنوان + ورودی h-10 با واحد داخل ورودی و LTR اختیاری.
 *  بند ۲ نسخهٔ ۱٫۶: فیلدهای ویرایش‌شدهٔ دستی با علامت و رنگ کهربایی + مقدار قبلی فایل اکسل. */
function EditField({
  id,
  label,
  value,
  onChange,
  unit,
  ltr,
  placeholder,
  fieldRef,
  edited,
  previous,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** واحد داخل ورودی (سمت چپ) — ورودی عددی LTR می‌شود */
  unit?: string;
  /** کد لاتین چپ‌به‌راست (بدون واحد) */
  ltr?: boolean;
  placeholder?: string;
  fieldRef?: RefObject<HTMLInputElement | null>;
  /** آیا این فیلد به‌صورت دستی ویرایش شده است؟ (بند ۲ نسخهٔ ۱٫۶) */
  edited?: boolean;
  /** متن مقدار قبلی فایل اکسل — فقط برای فیلدهای ویرایش‌شده نمایش داده می‌شود */
  previous?: string;
}) {
  const hasUnit = unit !== undefined;
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className={cn(
          'flex flex-wrap items-center gap-1.5 text-xs font-medium leading-5',
          edited && 'text-amber-700 dark:text-amber-400',
        )}
      >
        {edited && <Pencil className="size-3 shrink-0" aria-hidden="true" />}
        {label}
        {edited && <EditedMark />}
        {unit && <span className="font-normal text-muted-foreground"> ({unit})</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          ref={fieldRef}
          type="text"
          inputMode={hasUnit ? 'decimal' : undefined}
          dir={hasUnit || ltr ? 'ltr' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={edited ? `${label} — ویرایش‌شده دستی (مقدار قبلی: ${previous ?? '—'})` : undefined}
          className={cn(
            'h-10',
            hasUnit && 'pl-14 tabular-nums',
            !hasUnit && ltr && 'ltr-code',
            edited &&
              'border-amber-500/60 ring-1 ring-amber-500/25 focus-visible:ring-amber-500/45',
          )}
        />
        {unit && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {edited && (
        <p className="text-[11px] leading-5 text-muted-foreground">
          مقدار قبلی فایل اکسل:{' '}
          <span
            dir="auto"
            className="font-medium text-foreground/70 line-through decoration-muted-foreground/60"
          >
            {previous ?? '—'}
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * دیالوگ ویرایش کامل رول: وضعیت فعلی + تغییر وضعیت دستی + هر ۱۳ فیلد +
 * ذخیره/انصراف (بند ۴ نسخهٔ ۱٫۳/۱٫۴). پیش‌نویس فرم با هر بار بازشدن از
 * DTO فعلی ساخته می‌شود (تنظیم state در رندر — بدون Effect تا محتوای
 * دیالوگ هنگام انیمیشن بسته‌شدن پایدار بماند).
 */
function RollEditDialog({
  roll,
  open,
  onClose,
}: {
  roll: RollDto | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const [view, setView] = useState<{ roll: RollDto; draft: RollEditDraft } | null>(null);

  /* با هر بار بازشدن، پیش‌نویس تازه از DTO ساخته می‌شود */
  if (open && !wasOpen) {
    setWasOpen(true);
    if (roll) setView({ roll, draft: draftFromRoll(roll) });
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  /* بند ۲ نسخهٔ ۱٫۶: فیلدهای ویرایش‌شدهٔ دستی + مقدار قبلی فایل اکسل — برای علامت‌گذاری کهربایی فیلدها */
  const manual = view?.roll.manualEdit ?? {};
  const orig = view?.roll.original ?? {};
  const mark = (f: MappableField) => ({
    edited: f in manual,
    previous: changeValueText(orig[f]),
  });
  const statusEdited = view?.roll.typeOverride != null;

  /* تغییر یک فیلد پیش‌نویس */
  const setField = (key: keyof RollEditDraft, value: string) =>
    setView((v) => (v ? { ...v, draft: { ...v.draft, [key]: value } } : v));

  /* ---------- ذخیرهٔ تغییرات — PATCH /api/rolls/[id] ---------- */
  const saveMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateRollInput }) =>
      apiFetch<UpdateRollResponse>(`/api/rolls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: async (res, vars) => {
      const updated = res.roll;
      toast.success(`رول «${updated?.rollNumber ?? vars.input.rollNumber ?? ''}» به‌روزرسانی شد`, {
        description: `وضعیت مؤثر: ${updated ? CATEGORY_LABELS[updated.category] : '—'}`,
      });
      onClose();
      await queryClient.invalidateQueries();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'ذخیرهٔ تغییرات ناموفق بود');
    },
  });

  /* اعتبارسنجی سمت کلاینت + ساخت ورودی + ارسال (بند ۴) */
  function handleSave() {
    if (!view) return;
    const { roll: r, draft } = view;
    const rollNumber = draft.rollNumber.trim();
    if (rollNumber === '') {
      toast.error('شمارهٔ رول نمی‌تواند خالی باشد.');
      return;
    }
    const filmType = draft.filmType.trim();
    if (filmType === '') {
      toast.error('نوع فیلم نمی‌تواند خالی باشد.');
      return;
    }
    const num = (v: string): number | null => {
      const t = v.trim();
      return t === '' ? null : Number(t);
    };
    const str = (v: string): string | null => {
      const t = v.trim();
      return t === '' ? null : t;
    };
    const input: UpdateRollInput = {
      rollNumber,
      filmType,
      setupNumber: num(draft.setupNumber),
      width: num(draft.width),
      initialWidth: num(draft.initialWidth),
      thickness: num(draft.thickness),
      length: num(draft.length),
      netWeight: num(draft.netWeight),
      grade: str(draft.grade),
      palletNumber: str(draft.palletNumber),
      productionDate: str(draft.productionDate),
      position: str(draft.position),
      externalId: str(draft.externalId),
      typeOverride: draft.typeOverride === AUTO_OVERRIDE ? null : (draft.typeOverride as TypeOverride),
    };
    saveMutation.mutate({ id: r.id, input });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      {view && (
        <DialogContent
          className="max-h-[85vh] max-w-3xl overflow-y-auto"
          dir="rtl"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            firstFieldRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <Pencil className="size-4 text-primary" aria-hidden="true" />
              ویرایش رول
              <Badge variant="secondary" className="ltr-code text-xs" title={view.roll.rollNumber}>
                {view.roll.rollNumber}
              </Badge>
              <InfoHint text="اطلاعات این رول را اصلاح کنید؛ ذخیره، بلافاصله در داشبورد، رول‌ها و گروه‌ها اثر می‌کند. فیلدهایی که قبلاً دستی ویرایش شده‌اند با علامت و رنگ کهربایی مشخص می‌شوند و مقدار قبلی فایل اکسل زیر آن‌ها نمایش داده می‌شود." />
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* وضعیت فعلی رول (بند ۴ — نسخهٔ ۱٫۳) */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium">وضعیت فعلی رول:</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={CATEGORY_BADGE[view.roll.category]}>
                  {CATEGORY_LABELS[view.roll.category]}
                </Badge>
                {view.roll.typeOverride ? (
                  <span className="text-[11px] leading-5 text-muted-foreground">
                    انتخاب دستی ({OVERRIDE_LABEL[view.roll.typeOverride]}) — تشخیص خودکار:{' '}
                    {CATEGORY_LABELS[view.roll.autoCategory]}
                  </span>
                ) : (
                  <span className="text-[11px] leading-5 text-muted-foreground">
                    تشخیص خودکار بر اساس تنظیمات فعلی
                  </span>
                )}
              </div>
            </div>

            {/* تغییر وضعیت رول — تنها مسیر تغییر وضعیت (بند ۴ نسخهٔ ۱٫۳؛ علامت‌گذاری بند ۲ نسخهٔ ۱٫۶) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ef-type-override"
                className={cn(
                  'flex flex-wrap items-center gap-1.5 text-xs font-medium',
                  statusEdited && 'text-amber-700 dark:text-amber-400',
                )}
              >
                تغییر وضعیت رول (شناسایی دستی)
                {statusEdited && (
                  <EditedMark title="وضعیت این رول به‌صورت دستی انتخاب شده است — مقدار قبلی، تشخیص خودکار است" />
                )}
                <InfoHint text="«خودکار (بدون انتخاب)» یعنی وضعیت طبق منطق شناسایی تنظیمات تعیین شود؛ انتخاب هر وضعیت، بر منطق خودکار اولویت دارد." />
              </Label>
              <Select dir="rtl" value={view.draft.typeOverride} onValueChange={(v) => setField('typeOverride', v)}>
                <SelectTrigger
                  id="ef-type-override"
                  className={cn('h-10 w-full', statusEdited && 'border-amber-500/60 ring-1 ring-amber-500/25')}
                  aria-label="تغییر وضعیت دستی رول"
                >
                  <SelectValue placeholder="تغییر وضعیت دستی رول" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OVERRIDE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusEdited && (
                <p className="text-[11px] leading-5 text-muted-foreground">
                  مقدار قبلی:{' '}
                  <span className="font-medium text-foreground/70 line-through decoration-muted-foreground/60">
                    تشخیص خودکار ({view.roll.autoCategory ? CATEGORY_LABELS[view.roll.autoCategory] : '—'})
                  </span>
                </p>
              )}
            </div>

            <Separator />

            {/* هر ۱۳ فیلد رول — فیلدهای ویرایش‌شده با علامت کهربایی (بند ۲ نسخهٔ ۱٫۶) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <EditField
                id="ef-roll"
                label="شماره رول"
                value={view.draft.rollNumber}
                onChange={(v) => setField('rollNumber', v)}
                ltr
                fieldRef={firstFieldRef}
                {...mark('rollNumber')}
              />
              <EditField
                id="ef-film"
                label="نوع فیلم"
                value={view.draft.filmType}
                onChange={(v) => setField('filmType', v)}
                ltr
                placeholder="FSN02"
                {...mark('filmType')}
              />
              <EditField
                id="ef-setup"
                label="شماره ستاپ"
                value={view.draft.setupNumber}
                onChange={(v) => setField('setupNumber', v)}
                unit="عدد"
                {...mark('setupNumber')}
              />
              <EditField
                id="ef-width"
                label="عرض"
                value={view.draft.width}
                onChange={(v) => setField('width', v)}
                unit="میلی‌متر"
                {...mark('width')}
              />
              <EditField
                id="ef-initial"
                label="عرض رول اولیه"
                value={view.draft.initialWidth}
                onChange={(v) => setField('initialWidth', v)}
                unit="میلی‌متر"
                {...mark('initialWidth')}
              />
              <EditField
                id="ef-thickness"
                label="ضخامت"
                value={view.draft.thickness}
                onChange={(v) => setField('thickness', v)}
                unit="میکرون"
                {...mark('thickness')}
              />
              <EditField
                id="ef-length"
                label="متراژ"
                value={view.draft.length}
                onChange={(v) => setField('length', v)}
                unit="متر"
                {...mark('length')}
              />
              <EditField
                id="ef-weight"
                label="وزن خالص"
                value={view.draft.netWeight}
                onChange={(v) => setField('netWeight', v)}
                unit="کیلوگرم"
                {...mark('netWeight')}
              />
              <EditField
                id="ef-grade"
                label="گرید"
                value={view.draft.grade}
                onChange={(v) => setField('grade', v)}
                ltr
                placeholder="X"
                {...mark('grade')}
              />
              <EditField
                id="ef-pallet"
                label="شماره پالت"
                value={view.draft.palletNumber}
                onChange={(v) => setField('palletNumber', v)}
                {...mark('palletNumber')}
              />
              <EditField
                id="ef-date"
                label="تاریخ تولید"
                value={view.draft.productionDate}
                onChange={(v) => setField('productionDate', v)}
                {...mark('productionDate')}
              />
              <EditField
                id="ef-position"
                label="موقعیت فعلی"
                value={view.draft.position}
                onChange={(v) => setField('position', v)}
                {...mark('position')}
              />
              <EditField
                id="ef-external"
                label="شناسه رول"
                value={view.draft.externalId}
                onChange={(v) => setField('externalId', v)}
                {...mark('externalId')}
              />
            </div>

            {/* نکتهٔ فیلدهای خالی — درون InfoHint (تغییر #۲ نسخهٔ ۱٫۵) */}
            <div className="flex items-center">
              <InfoHint text="فیلدهای خالی به‌صورت «بدون مقدار» ذخیره می‌شوند. ویرایش‌ها در بازسازی نگاشت ستون‌ها و فایل پشتیبان حفظ می‌شوند." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={onClose} disabled={saveMutation.isPending}>
              انصراف
            </Button>
            <Button className="min-h-11" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              ذخیرهٔ تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

/* ========================================================================= */
/*  نمای ورود داده‌ها                                                          */
/* ========================================================================= */

export function ImportView() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [missingError, setMissingError] = useState<MissingError | null>(null);

  /* رول در حال ویرایش / رول در انتظار تأیید حذف ویرایش‌ها (بند ۴) */
  const [editingRoll, setEditingRoll] = useState<RollDto | null>(null);
  const [revertRoll, setRevertRoll] = useState<RollDto | null>(null);

  /* ردیف‌های جدول خلاصهٔ دسته‌ها (DataTable) */
  const summaryRows = useMemo<SummaryRow[]>(() => {
    if (!summary) return [];
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      count: summary.counts[cat] ?? 0,
      share: summary.totalRows > 0 ? ((summary.counts[cat] ?? 0) / summary.totalRows) * 100 : null,
    }));
  }, [summary]);

  /* ---------- آخرین Import (از تنظیمات) ---------- */
  const {
    data: settings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery<SettingsResponse, Error>({
    queryKey: ['settings'],
    queryFn: () => apiFetch<SettingsResponse>('/api/settings'),
  });

  const lastImport = settings?.lastImport ?? null;

  /* ---------- همهٔ رول‌های فایل واردشده (بند ۴ — GET /api/rolls?category=all) ---------- */
  const {
    data: allRollsData,
    isPending: allRollsPending,
    isError: allRollsError,
    error: allRollsErr,
    refetch: refetchAllRolls,
  } = useQuery<RollsResponse, Error>({
    queryKey: ['rolls', 'all'],
    queryFn: () => apiFetch<RollsResponse>('/api/rolls?category=all'),
    enabled: lastImport !== null,
  });

  const allRolls = useMemo<RollDto[]>(() => allRollsData?.rolls ?? [], [allRollsData]);
  const editedRolls = useMemo<RollDto[]>(() => allRolls.filter((r) => r.edited), [allRolls]);

  /* ---------- بی‌اعتبارکردن همهٔ کوئری‌های مرتبط ---------- */
  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['rolls'] }),
      queryClient.invalidateQueries({ queryKey: ['cutGroups'] }),
      queryClient.invalidateQueries({ queryKey: ['settings'] }),
    ]);
  }

  /* ---------- حذف ویرایش‌های یک رول — POST /api/rolls/[id]/revert (بند ۴ نسخهٔ ۱٫۳) ---------- */
  const revertMutation = useMutation({
    mutationFn: (roll: RollDto) =>
      apiFetch<UpdateRollResponse>(`/api/rolls/${roll.id}/revert`, { method: 'POST' }),
    onSuccess: async (res, roll) => {
      const number = res.roll?.rollNumber ?? roll.rollNumber;
      toast.success(`ویرایش‌های رول «${number}» حذف شد`, {
        description:
          res.fullyReverted === false
            ? 'وضعیت دستی پاک شد؛ به دلیل نبود دادهٔ خام، مقادیر فیلدها تغییر نکرد.'
            : 'مقادیر رول به حالت اولیهٔ فایل اکسل بازگشت.',
      });
      setRevertRoll(null);
      await queryClient.invalidateQueries();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'خطا در حذف ویرایش‌ها');
    },
  });

  /* ---------- ستون‌های جدول رول‌های فایل واردشده (ترتیب RTL — پورت importedRollsColumns) ---------- */
  const importedRollColumns = useMemo<DataTableColumn<RollDto>[]>(
    () => [
      {
        key: 'category',
        label: 'وضعیت شناسایی‌شده',
        headerTitle: 'وضعیت مؤثر رول — با احتساب انتخاب دستی',
        render: (r) => (
          <span className="flex flex-col items-start gap-1">
            <Badge variant="outline" className={CATEGORY_BADGE[r.category]}>
              {CATEGORY_LABELS[r.category]}
            </Badge>
            {r.typeOverride && <ManualFlag typeOverride={r.typeOverride} />}
          </span>
        ),
        tokens: (r) => [CATEGORY_LABELS[r.category], r.category],
      },
      {
        key: 'rollNumber',
        label: 'شماره رول',
        headerTitle: 'شمارهٔ کامل رول — ساختار: حرف + سالن + سال + سری + بازوی برش',
        render: (r) => (
          <span className="ltr-code text-xs font-bold" title={r.rollNumber}>
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
        key: 'setupNumber',
        label: 'شماره ستاپ',
        sortableType: 'number',
        render: (r) => <span className="tabular-nums">{faInt(r.setupNumber)}</span>,
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
        key: 'netWeight',
        label: 'وزن خالص (کیلوگرم)',
        sortableType: 'number',
        render: (r) => <span className="font-bold tabular-nums">{faNum(r.netWeight, 2)}</span>,
      },
      {
        key: 'grade',
        label: 'گرید',
        render: (r) =>
          r.grade ? (
            <Badge variant="outline" className="ltr-code text-xs">
              {r.grade}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        tokens: (r) => (r.grade ? [r.grade] : []),
      },
      {
        key: 'length',
        label: 'متراژ (متر)',
        sortableType: 'number',
        render: (r) => <span className="tabular-nums">{faNum(r.length, 0)}</span>,
      },
      {
        key: 'initialWidth',
        label: 'عرض رول اولیه (میلی‌متر)',
        sortableType: 'number',
        render: (r) => <span className="tabular-nums">{faNum(r.initialWidth, 0)}</span>,
      },
      {
        key: 'palletNumber',
        label: 'شماره پالت',
        render: (r) => <span className="tabular-nums">{r.palletNumber == null ? '—' : r.palletNumber}</span>,
        tokens: (r) => (r.palletNumber == null ? [] : [r.palletNumber]),
      },
      {
        key: 'productionDate',
        label: 'تاریخ تولید',
        render: (r) => <span className="text-xs">{r.productionDate == null ? '—' : r.productionDate}</span>,
        tokens: (r) => (r.productionDate == null ? [] : [r.productionDate]),
      },
      {
        key: 'position',
        label: 'موقعیت فعلی',
        render: (r) => <span className="text-xs">{r.position == null ? '—' : r.position}</span>,
        tokens: (r) => (r.position == null ? [] : [r.position]),
      },
      {
        key: 'externalId',
        label: 'شناسه رول',
        render: (r) => <span className="ltr-code text-xs">{r.externalId == null ? '—' : r.externalId}</span>,
        tokens: (r) => (r.externalId == null ? [] : [r.externalId]),
      },
      {
        key: 'actions',
        label: 'ویرایش',
        headerTitle: 'ویرایش کامل اطلاعات این رول',
        filterable: false,
        align: 'center',
        render: (r) => (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2"
            onClick={() => setEditingRoll(r)}
            aria-label={`ویرایش رول ${r.rollNumber}`}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            ویرایش
          </Button>
        ),
      },
    ],
    [],
  );

  /* ---------- ستون‌های جدول رول‌های ویرایش‌شده (بند ۲ نسخهٔ ۱٫۶ — فقط تغییرات: از چه مقداری به چه مقداری) ---------- */
  const editedRollColumns = useMemo<DataTableColumn<RollDto>[]>(
    () => [
      {
        key: 'rollNumber',
        label: 'شماره رول',
        headerTitle: 'شمارهٔ کامل رول — ساختار: حرف + سالن + سال + سری + بازوی برش',
        render: (r) => (
          <span className="ltr-code text-xs font-bold" title={r.rollNumber}>
            {r.rollNumber}
          </span>
        ),
        tokens: (r) => [r.rollNumber],
      },
      {
        key: 'changes',
        label: 'تغییرات',
        headerTitle:
          'فقط مواردی که تغییر کرده‌اند — مقدار قبلی فایل اکسل (خط‌خورده) به مقدار جدید (پررنگ)',
        render: (r) => <EditedRollChanges roll={r} />,
        tokens: (r) => editedChangesTokens(r),
      },
      {
        key: 'actions',
        label: 'عملیات',
        headerTitle: 'ویرایش مجدد یا حذف ویرایش‌ها (بازگشت به حالت اولیهٔ فایل اکسل)',
        filterable: false,
        align: 'center',
        render: (r) => (
          <span className="inline-flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={() => setEditingRoll(r)}
              aria-label={`ویرایش رول ${r.rollNumber}`}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              ویرایش
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setRevertRoll(r)}
              aria-label={`حذف ویرایش‌های رول ${r.rollNumber}`}
              title="حذف ویرایش‌ها — بازگشت رول به حالت اولیهٔ فایل اکسل"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              حذف
            </Button>
          </span>
        ),
      },
    ],
    [],
  );

  /* ---------- انتخاب و اعتبارسنجی فایل ---------- */
  function pickFile(file: File | null | undefined) {
    if (!file) return;
    if (!/\.(xls|xlsx)$/i.test(file.name)) {
      toast.error('فرمت فایل مجاز نیست', {
        description: 'فقط فایل‌های اکسل با پسوند xls یا xlsx پذیرفته می‌شوند.',
      });
      return;
    }
    setSelectedFile(file);
    setMissingError(null);
    importMutation.mutate(file);
  }

  /* ---------- ارسال فایل به سرور ---------- */
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFetch<ImportResponse>('/api/import', { method: 'POST', body: fd });
    },
    onSuccess: async (res) => {
      if (res.ok && res.summary) {
        setSummary(res.summary);
        setMissingError(null);
        toast.success(`فایل «${res.summary.fileName}» با موفقیت وارد شد`, {
          description: `${faInt(res.summary.totalRows)} سطر پردازش و دسته‌بندی شد.`,
        });
        await invalidateAll();
      } else {
        toast.error(res.message ?? 'پردازش فایل با خطا مواجه شد');
      }
    },
    onError: (e: unknown) => {
      if (e instanceof ApiRequestError && e.apiError?.missing?.length) {
        setMissingError({
          message: e.apiError.message,
          missing: e.apiError.missing ?? [],
          headers: e.apiError.headers,
        });
        toast.error('ستون‌های الزامی در فایل یافت نشد');
      } else {
        toast.error(e instanceof Error ? e.message : 'خطای نامشخص در بارگذاری فایل');
      }
    },
  });

  /* ---------- حذف همهٔ داده‌ها ---------- */
  const deleteMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>('/api/import', { method: 'DELETE' }),
    onSuccess: async () => {
      toast.success('همهٔ داده‌های واردشده حذف شد');
      setSummary(null);
      setSelectedFile(null);
      setMissingError(null);
      if (inputRef.current) inputRef.current.value = '';
      await invalidateAll();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'خطا در حذف داده‌ها');
    },
  });

  /* ---------- رویدادهای Drag & Drop ---------- */
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  const uploading = importMutation.isPending;

  return (
    <div className="space-y-6 fade-in-up">
      {/* ---------------- کارت آپلود ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
            <Upload className="size-5 text-primary" aria-hidden="true" />
            بارگذاری فایل اکسل «رول های موجود»
            <InfoHint
              text={
                <>
                  فایل اکسل خروجی انبار (نمونه: <span className="ltr-code">EVA Data.xls</span>) را اینجا رها کنید
                  یا انتخاب کنید. هر بار Import جدید، <strong>کل داده‌های قبلی را جایگزین می‌کند</strong>؛ بنابراین
                  برای به‌روزرسانی، کافی است نسخهٔ جدید فایل را بارگذاری کنید.{' '}
                  <a
                    href="/samples/EVA%20Data.xls"
                    download="EVA Data.xls"
                    className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    دریافت فایل نمونه
                  </a>
                </>
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ناحیهٔ Drag & Drop */}
          <div
            role="button"
            tabIndex={0}
            aria-label="ناحیهٔ بارگذاری فایل — فایل را اینجا رها کنید یا برای انتخاب کلیک کنید"
            onClick={() => !uploading && inputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={onDragOver}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
              dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted/50',
              uploading && 'pointer-events-none opacity-60',
            )}
          >
            <div
              className={cn(
                'flex size-14 items-center justify-center rounded-full',
                dragOver ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
              )}
            >
              <FileSpreadsheet className="size-7" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {selectedFile && !uploading
                  ? 'برای جایگزینی، فایل جدیدی انتخاب کنید'
                  : 'فایل اکسل را اینجا رها کنید یا کلیک کنید'}
              </p>
              <p className="text-xs text-muted-foreground">
                فرمت‌های مجاز: <span className="ltr-code">xls</span> و <span className="ltr-code">xlsx</span> —
                حداکثر یک فایل
              </p>
            </div>
          </div>

          {/* ورودی مخفی انتخاب فایل */}
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="min-h-11"
              aria-label="انتخاب فایل اکسل رول های موجود"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileSpreadsheet className="size-4" aria-hidden="true" />
              )}
              {uploading ? 'در حال پردازش…' : 'انتخاب فایل'}
            </Button>
            {selectedFile && !uploading && (
              <p className="text-xs text-muted-foreground">
                آخرین فایل انتخاب‌شده: <span className="ltr-code font-medium">{selectedFile.name}</span>
              </p>
            )}
          </div>

          {/* نوار پیشرفت هنگام آپلود */}
          {uploading && (
            <div className="space-y-2" aria-live="polite">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                در حال بارگذاری «{selectedFile?.name}» و پردازش سطرها…
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="در حال پردازش">
                <div className="h-full w-full animate-pulse rounded-full bg-primary/70" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- خطای ستون‌های الزامی ---------------- */}
      {missingError && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>ستون‌های الزامی در فایل یافت نشد</AlertTitle>
          <AlertDescription className="w-full space-y-3">
            <p className="leading-6">
              {missingError.message} — نگاشت ستون‌ها را در بخش تنظیمات اصلاح کنید یا هدرهای فایل را بررسی کنید.
            </p>
            <div>
              <p className="mb-1.5 text-xs font-medium">ستون‌های یافت‌نشده:</p>
              <ul className="flex flex-wrap gap-1.5">
                {missingError.missing.map((m) => {
                  const faLabel = FIELD_LABELS[m as MappableField];
                  return (
                    <li
                      key={m}
                      className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs"
                    >
                      {faLabel ?? <span className="ltr-code">{m}</span>}
                      {faLabel && <span className="ltr-code mr-1 opacity-70">({m})</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
            {missingError.headers && missingError.headers.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium">هدرهای شناسایی‌شده در فایل:</p>
                <p className="flex flex-wrap gap-1.5">
                  {missingError.headers.map((h) => (
                    <Badge key={h} variant="outline" className="font-normal text-muted-foreground">
                      {h}
                    </Badge>
                  ))}
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* ---------------- خلاصهٔ موفقیت آخرین Import ---------------- */}
      {summary && (
        <Card className="border-emerald-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              خلاصهٔ نتیجهٔ Import
              <InfoHint text="این خلاصه با تنظیمات فعلی سامانه محاسبه شده است؛ اگر پارامترها یا نگاشت ستون‌ها را تغییر دهید، دسته‌بندی به‌صورت زنده بازمحاسبه می‌شود و نیازی به Import مجدد نیست." />
            </CardTitle>
            <CardDescription>
              فایل «{summary.fileName}» — برگهٔ «{summary.sheetName || '—'}» — {faDateTime(summary.importedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ListFilter className="size-3.5" aria-hidden="true" /> کل سطرها
                </p>
                <p className="mt-1 text-lg font-bold">{faInt(summary.totalRows)}</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Database className="size-3.5" aria-hidden="true" /> رول‌های پایش‌شده
                </p>
                <p className="mt-1 text-lg font-bold">
                  {faInt(
                    (summary.counts.raw ?? 0) +
                      (summary.counts.eva ?? 0) +
                      (summary.counts.cut ?? 0) +
                      (summary.counts.error_e_film ?? 0) +
                      (summary.counts.error_no_e ?? 0) +
                      (summary.counts.raw_out_of_range ?? 0),
                  )}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Weight className="size-3.5" aria-hidden="true" /> وزن رول‌های خام
                </p>
                <p className="mt-1 text-lg font-bold">
                  {faNum(summary.totalRawWeight, 1)}
                  <span className="mr-1 text-[10px] font-medium text-muted-foreground">کیلوگرم</span>
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-sm font-medium">شمارندهٔ دسته‌ها پس از دسته‌بندی زنده:</p>
              <DataTable
                tableId="import-summary"
                columns={SUMMARY_COLUMNS}
                rows={summaryRows}
                getRowKey={(r) => r.cat}
                compact
                sums={{ count: { type: 'number', format: faInt } }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------- رول‌های فایل واردشده (بند ۴) ---------------- */}
      {lastImport && (
        <Card className="fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
              <Table className="size-5 text-primary" aria-hidden="true" />
              رول‌های فایل واردشده
              <Badge variant="secondary" className="tabular-nums">
                {faInt(allRolls.length)} رول
              </Badge>
              <InfoHint
                text={
                  <>
                    تمام رول‌های فایل «
                    <span className="ltr-code font-medium text-foreground">{lastImport.fileName}</span>» — هر ردیف با
                    دکمهٔ «ویرایش» قابل اصلاح است و وضعیت هر رول (خام / EVA / برش‌خورده) فقط از طریق همان دکمه قابل
                    تغییر است؛ رکوردهای ویرایش‌شده در بخش «رول‌های ویرایش‌شده» جمع می‌شوند. حداقل ۲۰۰۰ رکورد در هر
                    صفحه نمایش داده می‌شود و ادامهٔ رکوردها با صفحه‌بندی در دسترس است. همهٔ تغییرات بلافاصله در کل
                    پروژه اثر می‌کنند و در فایل پشتیبان و بازسازی نگاشت حفظ می‌شوند.
                  </>
                }
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allRollsError ? (
              <QueryErrorAlert
                error={allRollsErr}
                onRetry={() => void refetchAllRolls()}
                title="خطا در دریافت رول‌های فایل واردشده"
              />
            ) : allRollsPending ? (
              <TableSkeletonState />
            ) : (
              <DataTable
                tableId="import-rolls"
                columns={importedRollColumns}
                rows={allRolls}
                getRowKey={(r) => r.id}
                compact
                defaultVisibleRows={15}
                paginated
                defaultPageSize={2000}
                emptyText="رولی یافت نشد."
                sums={{ netWeight: { type: 'number', format: (n) => faNum(n, 2) } }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------- رول‌های ویرایش‌شده (بند ۴ — نسخهٔ ۱٫۳) ---------------- */}
      {lastImport && (
        <Card className="fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
              <Pencil className="size-5 text-primary" aria-hidden="true" />
              رول‌های ویرایش‌شده
              <Badge variant="secondary" className="tabular-nums">
                {faInt(editedRolls.length)} رول
              </Badge>
              <InfoHint
                text={
                  <>
                    فقط مواردی که تغییر کرده‌اند نمایش داده می‌شود: مقدار قبلی فایل اکسل (خط‌خورده) و مقدار جدید (پررنگ). با «ویرایش» قابل اصلاح مجدد هستند و با «حذف»، همهٔ ویرایش‌ها پاک شده و رول به حالت اولیهٔ فایل اکسل بازمی‌گردد.
                  </>
                }
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allRollsError ? (
              <QueryErrorAlert
                error={allRollsErr}
                onRetry={() => void refetchAllRolls()}
                title="خطا در دریافت رول‌های ویرایش‌شده"
              />
            ) : allRollsPending ? (
              <TableSkeletonState rows={4} />
            ) : (
              <DataTable
                tableId="import-rolls-edited"
                columns={editedRollColumns}
                rows={editedRolls}
                getRowKey={(r) => r.id}
                compact
                defaultVisibleRows={10}
                emptyText="هیچ رولی به‌صورت دستی ویرایش نشده است — با دکمهٔ «ویرایش» در جدول بالا شروع کنید."
                footerNote="ویرایش و حذف در این بخش فوراً در کل پروژه و جدول بالا اعمال می‌شود"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------- وضعیت آخرین Import ذخیره‌شده ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
            <Database className="size-5 text-primary" aria-hidden="true" />
            وضعیت آخرین Import
            <InfoHint text="داده‌های فعلی سامانه مبنای داشبورد و جداول است. با حذف، همهٔ رول‌ها و متادیتای مرتبط پاک می‌شود." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : lastImport ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-x-8">
                <div>
                  <p className="text-xs text-muted-foreground">نام فایل</p>
                  <p className="mt-0.5 truncate font-medium">
                    <span className="ltr-code" title={lastImport.fileName}>
                      {lastImport.fileName}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden="true" /> تاریخ ورود
                  </p>
                  <p className="mt-0.5 font-medium">{faDateTime(lastImport.importedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">تعداد سطرها</p>
                  <p className="mt-0.5 font-medium">{faInt(lastImport.totalRows)} سطر</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="min-h-11 sm:min-w-40"
                    aria-label="حذف همهٔ داده‌های واردشده"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                    حذف همهٔ داده‌ها
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف همهٔ داده‌های واردشده؟</AlertDialogTitle>
                    <AlertDialogDescription className="leading-6">
                      همهٔ {faInt(lastImport.totalRows)} سطرِ فایل «{lastImport.fileName}» به‌همراه داشبورد، جداول
                      و گروه‌بندی‌ها حذف می‌شود. این عمل بازگشت‌پذیر نیست و برای بازیابی باید فایل را دوباره
                      بارگذاری کنید.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="min-h-11">انصراف</AlertDialogCancel>
                    <AlertDialogAction
                      className="min-h-11 bg-destructive text-white hover:bg-destructive/90"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteMutation.mutate();
                      }}
                    >
                      بله، حذف کن
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">هنوز هیچ فایلی وارد نشده است.</p>
              <Button variant="outline" className="min-h-11" onClick={() => void refetchSettings()}>
                <Database className="size-4" aria-hidden="true" />
                به‌روزرسانی وضعیت
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- دیالوگ ویرایش رول (بند ۴) ---------------- */}
      <RollEditDialog
        roll={editingRoll}
        open={editingRoll !== null}
        onClose={() => setEditingRoll(null)}
      />

      {/* ---------------- دیالوگ تأیید حذف ویرایش‌های رول (بند ۴ نسخهٔ ۱٫۳) ---------------- */}
      <AlertDialog
        open={revertRoll !== null}
        onOpenChange={(open) => {
          if (!open) setRevertRoll(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف ویرایش‌های این رول؟</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              همهٔ ویرایش‌های دستی رول «<span className="ltr-code">{revertRoll?.rollNumber}</span>» پاک می‌شود و
              مقادیر آن به حالت اولیهٔ فایل اکسل بازمی‌گردد؛ وضعیت رول نیز دوباره بر اساس منطق خودکار تنظیمات
              تعیین می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={revertMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-destructive text-white hover:bg-destructive/90"
              disabled={revertMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (revertRoll) revertMutation.mutate(revertRoll);
              }}
            >
              {revertMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              بله، حذف کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
