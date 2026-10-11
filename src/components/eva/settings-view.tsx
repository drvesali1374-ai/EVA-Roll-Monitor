'use client';

/* =========================================================================
   settings-view.tsx — تنظیمات: پارامترهای سامانه (دسته‌بندی زنده) +
   نگاشت ستون‌های اکسل (با بازسازی داده‌ها) + راهنمای کوتاه
   ========================================================================= */

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Save,
  Plus,
  X,
  RotateCcw,
  Loader2,
  Settings2,
  Tag,
  Gauge,
  Clock,
  Database,
  Info,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  HardDriveDownload,
  ArchiveRestore,
} from '@/components/eva/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { QueryErrorAlert, apiFetch, navigateTo, ApiRequestError } from '@/components/eva/shared';
import { InfoHint } from '@/components/eva/import-view';
import { buildFieldMapping } from '@/lib/eva/column-map';
import { cn } from '@/lib/utils';
import type {
  ColumnMapping,
  DashboardResponse,
  MappableField,
  SettingsResponse,
  UpdateSettingsResponse,
} from '@/types/eva';
import { FIELD_LABELS, REQUIRED_FIELDS } from '@/types/eva';
import { faDateTime, faDuration, faHours, faInt, faNum, faWeightShort, toFaDigits } from '@/lib/eva/format';
import { APP_NAME, BACKUP_SCHEMA_VERSION } from '@/lib/eva/version';

/** مقدار Sentinel گزینهٔ «خودکار» در Select (مقدار خالی مجاز نیست) */
const AUTO_VALUE = '__auto__';

/** فیلدهای عددی فرم پارامترها */
type NumField =
  | 'rawMinWidth'
  | 'rawMaxWidth'
  | 'rawThickness'
  | 'evaCapacityPerShift'
  | 'shiftsPerDay'
  | 'hoursPerDay';

const MAP_FIELDS = Object.keys(FIELD_LABELS) as MappableField[];

/* ========================================================================= */
/*  ادیتور لیست انواع فیلم (تگ‌های قابل ویرایش)                                */
/* ========================================================================= */

function FilmTypesEditor({
  id,
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  value: string[];
  onChange: (types: string[]) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim().toUpperCase();
    if (!v) return;
    if (value.includes(v)) {
      toast.error(`نوع فیلم ${v} قبلاً در فهرست وجود دارد.`);
      return;
    }
    onChange([...value, v]);
    setInput('');
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium">
        {label}
        <InfoHint text={description} />
      </Label>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5" role="list" aria-label={label}>
        {value.length === 0 && <span className="text-xs text-destructive">هیچ نوع فیلمی تعریف نشده است</span>}
        {value.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 py-1 pl-1.5 pr-2.5" role="listitem">
            <span className="ltr-code text-xs font-semibold">{t}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
              aria-label={`حذف نوع فیلم ${t}`}
              disabled={disabled}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="مثلاً FSN02"
          className="h-10 max-w-44 ltr-code"
          disabled={disabled}
          aria-label={`افزودن نوع فیلم به ${label}`}
        />
        <Button
          type="button"
          variant="outline"
          className="h-10 min-h-10"
          onClick={add}
          disabled={disabled || !input.trim()}
        >
          <Plus className="size-4" aria-hidden="true" />
          افزودن
        </Button>
      </div>
    </div>
  );
}

/* ========================================================================= */
/*  فیلد عددی با واحد                                                         */
/* ========================================================================= */

function NumFieldBox({
  id,
  label,
  unit,
  hint,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  unit?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {/* ارتفاع ثابت ناحیهٔ لیبل — همهٔ لیبل‌های یک ردیف هم‌تراز عمودی می‌شوند (بند ۹) */}
      <div className="min-h-6">
        <Label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium leading-6">
          {label}
          {hint && <InfoHint text={hint} />}
        </Label>
      </div>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          className={cn('h-11 pl-16 tabular-nums', invalid && 'border-destructive focus-visible:ring-destructive/30')}
          dir="ltr"
        />
        {unit && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/*  کارت پشتیبان‌گیری و بازیابی (بند ۴ — الگوی متالایز backup.js)              */
/* ========================================================================= */

/** بدنهٔ فایل پشتیبان (خروجی GET /api/backup — فقط فیلدهای موردنیاز UI) */
interface BackupPayload {
  app?: unknown;
  schemaVersion?: unknown;
  exportedAt?: unknown;
  counts?: { settings?: number; importBatches?: number; rolls?: number } | null;
  data?: Record<string, unknown> | null;
}

/** فایل معتبرِ خوانده‌شده — در انتظار تأیید کاربر برای بازیابی */
interface PendingRestore {
  payload: unknown;
  fileName: string;
  counts: { settings: number; importBatches: number; rolls: number };
  exportedAt: string | null;
}

/** پیش‌اعتبارسنجی ساختاری فایل پشتیبان — پیام‌های فارسی هماهنگ با اعتبارسنجی سرور */
function validateBackupStructure(payload: unknown): string[] {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['ساختار فایل معتبر نیست.'];
  }
  const p = payload as BackupPayload;
  if (p.app !== APP_NAME) {
    errors.push('این فایل متعلق به سامانه مانیتورینگ رول‌های EVA نیست.');
  }
  if (p.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    errors.push(`نسخهٔ ساختار پشتیبان (${toFaDigits(String(p.schemaVersion ?? '—'))}) پشتیبانی نمی‌شود.`);
  }
  if (!p.data || typeof p.data !== 'object') {
    errors.push('بخش داده‌های فایل یافت نشد.');
    return errors;
  }
  const tables: Array<[string, string]> = [
    ['settings', 'تنظیمات'],
    ['importBatches', 'ورود داده‌ها'],
    ['rolls', 'رول‌ها'],
  ];
  for (const [key, label] of tables) {
    if (!Array.isArray(p.data[key])) {
      errors.push(`جدول «${label}» در فایل یافت نشد یا معتبر نیست.`);
    }
  }
  return errors;
}

function BackupCard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [pending, setPending] = useState<PendingRestore | null>(null);
  /** خطاهای ساختاری فایل یا پاسخ ۴۰۰ سرور — نمایش درون‌خطی زیر دکمه‌ها */
  const [restoreErrors, setRestoreErrors] = useState<string[] | null>(null);
  const [restoreErrorTitle, setRestoreErrorTitle] = useState('فایل پشتیبان معتبر نیست:');
  /** گزارش گذرای آخرین عمل موفق (بدون ذخیره‌سازی) */
  const [lastAction, setLastAction] = useState<string | null>(null);

  /* ---------------- ساخت فایل پشتیبان (GET /api/backup) ---------------- */
  async function exportBackup() {
    setExporting(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error(`خطای سرور (کد ${res.status})`);
      const text = await res.text();
      let counts: PendingRestore['counts'] | null = null;
      let exportedAt: string | null = null;
      try {
        const parsed = JSON.parse(text) as BackupPayload;
        counts = {
          settings: parsed.counts?.settings ?? 0,
          importBatches: parsed.counts?.importBatches ?? 0,
          rolls: parsed.counts?.rolls ?? 0,
        };
        exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null;
      } catch {
        /* بدنهٔ غیر JSON — فقط دانلود انجام می‌شود */
      }
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = match?.[1] ?? 'EVA-Monitor-Backup.json';
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setLastAction(`آخرین عمل: ساخت پشتیبان — ${faDateTime(exportedAt ?? new Date().toISOString())}`);
      toast.success('فایل پشتیبان ساخته شد', {
        description: counts
          ? `${faInt(counts.rolls)} رول، ${faInt(counts.importBatches)} ورود داده‌ها، ${faInt(counts.settings)} تنظیمات — ${fileName}`
          : fileName,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ساخت فایل پشتیبان');
    } finally {
      setExporting(false);
    }
  }

  /* ---------------- انتخاب فایل برای بازیابی (خواندن + اعتبارسنجی ساختاری) ---------------- */
  async function onFilePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // امکان انتخاب مجدد همان فایل
    if (!file) return;
    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      setRestoreErrorTitle('ساختار فایل معتبر نیست.');
      setRestoreErrors(['ساختار فایل معتبر نیست.']);
      toast.error('ساختار فایل معتبر نیست.');
      return;
    }
    const errors = validateBackupStructure(payload);
    if (errors.length > 0) {
      setRestoreErrorTitle('فایل پشتیبان معتبر نیست:');
      setRestoreErrors(errors);
      toast.error('فایل پشتیبان معتبر نیست.');
      return;
    }
    const p = payload as BackupPayload;
    setRestoreErrors(null);
    setPending({
      payload,
      fileName: file.name,
      counts: {
        settings: p.counts?.settings ?? 0,
        importBatches: p.counts?.importBatches ?? 0,
        rolls: p.counts?.rolls ?? 0,
      },
      exportedAt: typeof p.exportedAt === 'string' ? p.exportedAt : null,
    });
  }

  /* ---------------- بازیابی (POST /api/backup — جایگزینی کامل) ---------------- */
  const restoreBackup = useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch<{ ok: true; counts: { settings: number; importBatches: number; rolls: number } }>('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: async (res) => {
      setPending(null);
      setRestoreErrors(null);
      setLastAction(`آخرین عمل: بازیابی از فایل — ${faDateTime(new Date().toISOString())}`);
      toast.success('بازیابی با موفقیت انجام شد.', {
        description: `${faInt(res.counts.rolls)} رول، ${faInt(res.counts.importBatches)} ورود داده‌ها و ${faInt(res.counts.settings)} تنظیمات از فایل پشتیبان بازیابی شد.`,
      });
      /* بی‌اعتبارکردن همهٔ کوئری‌ها: داشبورد، رول‌ها، گروه‌های برش و تنظیمات */
      await queryClient.invalidateQueries();
    },
    onError: (e: unknown) => {
      setPending(null);
      if (e instanceof ApiRequestError && e.status === 400) {
        const body = e.payload as { message?: string; errors?: string[] } | null;
        const errors =
          Array.isArray(body?.errors) && body.errors.length > 0
            ? body.errors
            : [body?.message ?? 'فایل پشتیبان معتبر نیست.'];
        setRestoreErrorTitle(body?.message ?? 'فایل پشتیبان معتبر نیست:');
        setRestoreErrors(errors);
        toast.error(body?.message ?? 'فایل پشتیبان معتبر نیست.');
      } else {
        toast.error(e instanceof Error ? e.message : 'خطا در بازیابی از فایل پشتیبان');
      }
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
          <HardDriveDownload className="size-5 text-primary" aria-hidden="true" />
          پشتیبان‌گیری و بازیابی
          <InfoHint text="فایل JSON شامل تنظیمات، متادیتای ورود داده‌ها و همهٔ رکوردهای رول‌ها (قابل بازیابی روی هر نصب از برنامه)." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>هشدار مهم</AlertTitle>
          <AlertDescription>
            برای جلوگیری از از دست رفتن اطلاعات، به‌صورت دوره‌ای از داده‌ها پشتیبان تهیه کنید.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" onClick={() => void exportBackup()} disabled={exporting}>
            {exporting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <HardDriveDownload className="size-4" aria-hidden="true" />
            )}
            ساخت فایل پشتیبان
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => fileInputRef.current?.click()}
            disabled={restoreBackup.isPending}
          >
            <ArchiveRestore className="size-4" aria-hidden="true" />
            بازیابی از فایل
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            hidden
            aria-hidden="true"
            onChange={(e) => void onFilePick(e)}
          />
        </div>

        {restoreErrors && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>{restoreErrorTitle}</AlertTitle>
            <AlertDescription className="w-full">
              <ul className="list-inside list-disc space-y-1">
                {restoreErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {lastAction && <p className="text-xs leading-5 text-muted-foreground">{lastAction}</p>}
      </CardContent>

      {/* --- تأییدیهٔ بازیابی (جایگزینی کامل — الگوی §70 متالایز) --- */}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>بازیابی از فایل پشتیبان</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 leading-6">
                <p>
                  محتوای فایل <span className="font-medium text-foreground">{pending?.fileName}</span> خوانده شد و
                  پس از تأیید، این موارد بازیابی خواهند شد:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>رول‌ها: {faInt(pending?.counts.rolls ?? 0)} رکورد</li>
                  <li>ورود داده‌ها: {faInt(pending?.counts.importBatches ?? 0)} رکورد</li>
                  <li>تنظیمات: {faInt(pending?.counts.settings ?? 0)} رکورد</li>
                </ul>
                {pending?.exportedAt && <p>تاریخ ساخت فایل پشتیبان: {faDateTime(pending.exportedAt)}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium leading-6 text-destructive">
            این عمل جایگزینی کامل داده‌های فعلی است و بازگشت‌پذیر نیست.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={restoreBackup.isPending}>
              انصراف
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={restoreBackup.isPending}
              onClick={() => pending && restoreBackup.mutate(pending.payload)}
            >
              {restoreBackup.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArchiveRestore className="size-4" aria-hidden="true" />
              )}
              بازیابی
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ========================================================================= */
/*  نمای اصلی تنظیمات                                                         */
/* ========================================================================= */

export function SettingsView() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SettingsResponse, Error>({
    queryKey: ['settings'],
    queryFn: () => apiFetch<SettingsResponse>('/api/settings'),
  });

  /* وزن رول‌های خام برای نمایش زندهٔ فرمول (کش مشترک با داشبورد) */
  const { data: dash } = useQuery<DashboardResponse, Error>({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardResponse>('/api/dashboard'),
  });

  /* ---------------- پیش‌نویس‌ها — تا زمان ذخیره فقط محلی ---------------- */
  const [numDraft, setNumDraft] = useState<Record<NumField, string> | null>(null);
  const [rawTypesDraft, setRawTypesDraft] = useState<string[] | null>(null);
  const [evaTypesDraft, setEvaTypesDraft] = useState<string[] | null>(null);
  const [mappingDraft, setMappingDraft] = useState<ColumnMapping | null>(null);

  const params = data?.params;

  const numValue = (f: NumField): string => numDraft?.[f] ?? (params ? String(params[f] ?? '') : '');
  const rawTypes = rawTypesDraft ?? params?.rawFilmTypes ?? [];
  const evaTypes = evaTypesDraft ?? params?.evaFilmTypes ?? [];
  const mapping = mappingDraft ?? params?.columnMapping ?? {};
  const headers = data?.headers ?? [];

  const currentNums: Record<NumField, string> = {
    rawMinWidth: numValue('rawMinWidth'),
    rawMaxWidth: numValue('rawMaxWidth'),
    rawThickness: numValue('rawThickness'),
    evaCapacityPerShift: numValue('evaCapacityPerShift'),
    shiftsPerDay: numValue('shiftsPerDay'),
    hoursPerDay: numValue('hoursPerDay'),
  };

  function updateNum(f: NumField, v: string) {
    setNumDraft({ ...currentNums, [f]: v });
  }

  const paramsDirty = numDraft !== null || rawTypesDraft !== null || evaTypesDraft !== null;
  const mappingDirty = mappingDraft !== null;

  function resetParamDrafts() {
    setNumDraft(null);
    setRawTypesDraft(null);
    setEvaTypesDraft(null);
  }

  /* ---------------- اعتبارسنجی زندهٔ پارامترها ---------------- */
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!params) return errs;
    if (rawTypes.length === 0) errs.push('حداقل یک نوع فیلم رول خام باید تعریف شود.');
    if (evaTypes.length === 0) errs.push('حداقل یک نوع فیلم رول EVA باید تعریف شود.');
    const min = Number(currentNums.rawMinWidth);
    const max = Number(currentNums.rawMaxWidth);
    const th = Number(currentNums.rawThickness);
    const cap = Number(currentNums.evaCapacityPerShift);
    const sh = Number(currentNums.shiftsPerDay);
    const h = Number(currentNums.hoursPerDay);
    if (!Number.isFinite(min) || min <= 0) errs.push('حداقل عرض رول خام باید عددی مثبت باشد.');
    if (!Number.isFinite(max) || max <= 0) errs.push('حداکثر عرض رول خام باید عددی مثبت باشد.');
    if (Number.isFinite(min) && Number.isFinite(max) && min > max)
      errs.push('حداقل عرض رول خام نمی‌تواند از حداکثر عرض بیشتر باشد.');
    if (!Number.isFinite(th) || th <= 0) errs.push('ضخامت رول خام باید عددی مثبت باشد.');
    if (!Number.isFinite(cap) || cap <= 0) errs.push('ظرفیت هر شیفت دستگاه EVA باید عددی مثبت باشد.');
    if (!Number.isFinite(sh) || sh <= 0 || !Number.isInteger(sh))
      errs.push('تعداد شیفت در روز باید عدد صحیح مثبت باشد.');
    if (!Number.isFinite(h) || h <= 0 || h > 24 || !Number.isInteger(h))
      errs.push('ساعت تولید در شبانه‌روز باید عدد صحیح بین ۱ تا ۲۴ باشد.');
    return errs;
  }, [params, rawTypes, evaTypes, currentNums]);

  /* ---------------- بی‌اعتبارکردن همهٔ کوئری‌ها ---------------- */
  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['rolls'] }),
      queryClient.invalidateQueries({ queryKey: ['cutGroups'] }),
      queryClient.invalidateQueries({ queryKey: ['settings'] }),
    ]);
  }

  /* ---------------- ذخیرهٔ پارامترها (بدون بازسازی) ---------------- */
  const saveParams = useMutation({
    mutationFn: () => {
      const body = {
        params: {
          rawFilmTypes: rawTypes,
          rawMinWidth: Number(numValue('rawMinWidth')),
          rawMaxWidth: Number(numValue('rawMaxWidth')),
          rawThickness: Number(numValue('rawThickness')),
          evaFilmTypes: evaTypes,
          evaCapacityPerShift: Number(numValue('evaCapacityPerShift')),
          shiftsPerDay: Number(numValue('shiftsPerDay')),
          hoursPerDay: Number(numValue('hoursPerDay')),
        },
      };
      return apiFetch<UpdateSettingsResponse>('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    onSuccess: async () => {
      resetParamDrafts();
      toast.success('پارامترها ذخیره شد', {
        description: 'دسته‌بندی همهٔ رول‌ها به‌صورت زنده با تنظیمات جدید بازمحاسبه شد.',
      });
      await invalidateAll();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیرهٔ پارامترها');
    },
  });

  /* ---------------- ذخیرهٔ نگاشت + بازسازی داده‌ها ---------------- */
  const saveMapping = useMutation({
    mutationFn: () => {
      /* مقدار مؤثر هر فیلد: انتخاب دستی یا خودکار */
      const effective = buildFieldMapping(headers, mapping);
      const columnMapping: ColumnMapping = {};
      for (const f of MAP_FIELDS) {
        const saved = mapping[f];
        if (typeof saved === 'string' && saved.trim() !== '') {
          columnMapping[f] = saved;
        } else {
          const auto = effective.map[f];
          if (typeof auto === 'string' && auto.trim() !== '') columnMapping[f] = auto;
        }
      }
      return apiFetch<UpdateSettingsResponse>('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: { columnMapping }, rebuild: true }),
      });
    },
    onSuccess: async (res) => {
      setMappingDraft(null);
      toast.success('نگاشت ستون‌ها ذخیره شد', {
        description:
          res.rebuilt && typeof res.affectedRows === 'number'
            ? `${faInt(res.affectedRows)} رکورد از دادهٔ خام بازسازی شد.`
            : 'داده‌های موجود با نگاشت جدید بازسازی شدند.',
      });
      await invalidateAll();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیرهٔ نگاشت');
    },
  });

  /* ---------------- بازگردانی نگاشت به پیش‌فرض (خودکار) ---------------- */
  const resetMapping = useMutation({
    mutationFn: () =>
      apiFetch<UpdateSettingsResponse>('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: { columnMapping: {} }, rebuild: true }),
      }),
    onSuccess: async (res) => {
      setMappingDraft(null);
      toast.success('نگاشت به حالت خودکار بازگردانده شد', {
        description:
          res.rebuilt && typeof res.affectedRows === 'number'
            ? `${faInt(res.affectedRows)} رکورد با تشخیص خودکار بازسازی شد.`
            : 'داده‌ها با نگاشت پیش‌فرض بازسازی شدند.',
      });
      await invalidateAll();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'خطا در بازگردانی نگاشت');
    },
  });

  /* ---------------- فرمول زندهٔ مانده زمان ---------------- */
  const capacity = Number(numValue('evaCapacityPerShift'));
  const shifts = Number(numValue('shiftsPerDay'));
  const hoursPerDay = Number(numValue('hoursPerDay'));
  const perDay = Number.isFinite(capacity) && Number.isFinite(shifts) ? capacity * shifts : null;
  const rawWeight = dash?.kpis.rawWeight ?? null;
  const liveDays = perDay && perDay > 0 && rawWeight !== null ? rawWeight / perDay : null;

  /* ---------------- نگاشت مؤثر برای نمایش «خودکار» ---------------- */
  const effectiveMapping = useMemo(
    () => (headers.length > 0 ? buildFieldMapping(headers, mapping) : null),
    [headers, mapping],
  );

  /* ===================================================================== */
  if (isError) {
    return <QueryErrorAlert error={error} onRetry={() => void refetch()} title="تنظیمات در دسترس نیست" />;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up">
      {/* ================ ۱) پارامترهای سامانه ================ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
            <Settings2 className="size-5 text-primary" aria-hidden="true" />
            پارامترهای سامانه
            <InfoHint
              text={
                <>
                  این پارامترها به‌صورت <strong>زنده</strong> روی دسته‌بندی رول‌ها و محاسبهٔ مانده زمان اثر
                  می‌گذارند — بدون نیاز به Import مجدد؛ بلافاصله پس از ذخیره، داشبورد و جداول به‌روزرسانی می‌شوند.
                </>
              }
            />
            {paramsDirty && <Badge variant="secondary" className="text-amber-700 dark:text-amber-300">تغییرات ذخیره‌نشده</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* --- فیلم خام --- */}
          <section aria-label="قوانین رول خام" className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Tag className="size-4 text-primary" aria-hidden="true" />
              قوانین شناسایی رول خام
            </h3>
            <FilmTypesEditor
              id="raw-film-types"
              label="انواع فیلم رول خام"
              description="رول‌هایی با این نوع فیلم، در صورت برقراری شرایط عرض و ضخامت، «خام» شمرده می‌شوند."
              value={rawTypes}
              onChange={(t) => setRawTypesDraft(t)}
              disabled={saveParams.isPending}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumFieldBox
                id="raw-min-width"
                label="حداقل عرض رول خام"
                unit="میلی‌متر"
                value={numValue('rawMinWidth')}
                onChange={(v) => updateNum('rawMinWidth', v)}
                invalid={!Number.isFinite(Number(numValue('rawMinWidth'))) || Number(numValue('rawMinWidth')) <= 0}
              />
              <NumFieldBox
                id="raw-max-width"
                label="حداکثر عرض رول خام"
                unit="میلی‌متر"
                value={numValue('rawMaxWidth')}
                onChange={(v) => updateNum('rawMaxWidth', v)}
                invalid={!Number.isFinite(Number(numValue('rawMaxWidth'))) || Number(numValue('rawMaxWidth')) <= 0}
              />
              <NumFieldBox
                id="raw-thickness"
                label="ضخامت رول خام"
                unit="میکرون"
                value={numValue('rawThickness')}
                onChange={(v) => updateNum('rawThickness', v)}
                invalid={!Number.isFinite(Number(numValue('rawThickness'))) || Number(numValue('rawThickness')) <= 0}
              />
            </div>
          </section>

          <Separator />

          {/* --- خط EVA --- */}
          <section aria-label="قوانین خط EVA" className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Gauge className="size-4 text-primary" aria-hidden="true" />
              قوانین خط EVA و ظرفیت تولید
            </h3>
            <FilmTypesEditor
              id="eva-film-types"
              label="انواع فیلم رول EVA"
              description="رول‌هایی با این نوع فیلم باید در شمارهٔ رول، بعد از بازوی برش خام، حرف E داشته باشند."
              value={evaTypes}
              onChange={(t) => setEvaTypesDraft(t)}
              disabled={saveParams.isPending}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumFieldBox
                id="eva-capacity"
                label="ظرفیت هر شیفت دستگاه EVA"
                unit="کیلوگرم"
                hint="مصرف رول خام در هر شیفت"
                value={numValue('evaCapacityPerShift')}
                onChange={(v) => updateNum('evaCapacityPerShift', v)}
                invalid={!Number.isFinite(Number(numValue('evaCapacityPerShift'))) || Number(numValue('evaCapacityPerShift')) <= 0}
              />
              <NumFieldBox
                id="shifts-per-day"
                label="تعداد شیفت در روز"
                unit="شیفت"
                value={numValue('shiftsPerDay')}
                onChange={(v) => updateNum('shiftsPerDay', v)}
                invalid={!Number.isFinite(Number(numValue('shiftsPerDay'))) || Number(numValue('shiftsPerDay')) <= 0}
              />
              <NumFieldBox
                id="hours-per-day"
                label="ساعت تولید در شبانه‌روز"
                unit="ساعت"
                hint="برای تبدیل روز به ساعت"
                value={numValue('hoursPerDay')}
                onChange={(v) => updateNum('hoursPerDay', v)}
                invalid={!Number.isFinite(Number(numValue('hoursPerDay'))) || Number(numValue('hoursPerDay')) <= 0}
              />
            </div>
          </section>

          {/* --- فرمول زنده --- */}
          <section
            aria-label="فرمول محاسبهٔ مانده زمان"
            className="rounded-xl border border-dashed bg-muted/40 p-4 text-sm"
          >
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Clock className="size-4 text-primary" aria-hidden="true" />
              فرمول مانده زمان (با مقادیر فعلی فرم)
            </h3>
            <div className="space-y-1.5 leading-7">
              <p>
                مانده زمان (روز) = وزن رول‌های خام ÷ (ظرفیت هر شیفت × تعداد شیفت در روز)
              </p>
              <p className="text-muted-foreground">
                = {rawWeight !== null ? faWeightShort(rawWeight) : '—'} کیلوگرم ÷ ({faNum(capacity, 0)} ×{' '}
                {faNum(shifts, 0)}) = {perDay !== null ? `${faNum(perDay, 0)} کیلوگرم در روز` : '—'}
              </p>
              {liveDays !== null && (
                <p className="font-medium text-primary">
                  ≈ {faDuration(liveDays, Number.isFinite(hoursPerDay) && hoursPerDay > 0 ? hoursPerDay : 24)}
                  <span className="mr-2 font-normal text-muted-foreground">
                    (معادل {faHours(liveDays * (hoursPerDay || 24))} با {faNum(hoursPerDay, 0)} ساعت تولید در شبانه‌روز)
                  </span>
                </p>
              )}
            </div>
          </section>

          {/* --- خطاهای اعتبارسنجی --- */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive" role="alert">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertTitle>پیش از ذخیره، موارد زیر را اصلاح کنید</AlertTitle>
              <AlertDescription>
                <ul className="list-inside list-disc space-y-1">
                  {validationErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* --- دکمه‌های ذخیره --- */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="min-h-11"
              onClick={() => saveParams.mutate()}
              disabled={saveParams.isPending || validationErrors.length > 0 || !paramsDirty}
              aria-label="ذخیرهٔ پارامترهای سامانه"
            >
              {saveParams.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              ذخیرهٔ پارامترها
            </Button>
            {paramsDirty && (
              <Button
                variant="ghost"
                className="min-h-11"
                onClick={resetParamDrafts}
                disabled={saveParams.isPending}
                aria-label="صرف‌نظر از تغییرات پارامترها"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                صرف‌نظر از تغییرات
              </Button>
            )}
            <InfoHint text="ذخیرهٔ پارامترها نیازی به بازسازی یا Import مجدد ندارد و بلافاصله اعمال می‌شود." />
          </div>
        </CardContent>
      </Card>

      {/* ================ ۲) نگاشت ستون‌های اکسل ================ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold sm:text-lg">
            <Database className="size-5 text-primary" aria-hidden="true" />
            نگاشت ستون‌های اکسل
            <InfoHint
              text={
                <>
                  مشخص کنید هر فیلد منطقی سامانه از کدام ستون فایل اکسل خوانده شود. انتخاب دستی شما بر تشخیص
                  خودکار اولویت دارد. ذخیرهٔ نگاشت، همهٔ رکوردهای موجود را از دادهٔ خام <strong>بازسازی</strong>
                  می‌کند.
                </>
              }
            />
            {mappingDirty && <Badge variant="secondary" className="text-amber-700 dark:text-amber-300">تغییرات ذخیره‌نشده</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {headers.length === 0 ? (
            <Alert>
              <Info className="size-4" aria-hidden="true" />
              <AlertTitle>هدر فایلی در دسترس نیست</AlertTitle>
              <AlertDescription className="w-full">
                <p>برای تنظیم نگاشت، ابتدا یک فایل در بخش ورود داده‌ها وارد کنید؛ پس از آن، هدرهای فایل اینجا نمایش داده می‌شوند.</p>
                <Button variant="outline" size="sm" className="mt-2 min-h-9" onClick={() => navigateTo('import')}>
                  رفتن به ورود داده‌ها
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {faInt(headers.length)} ستون در فایل «{data.lastImport?.fileName ?? '—'}» شناسایی شده است.
              </p>

              <div className="divide-y rounded-xl border">
                {MAP_FIELDS.map((field) => {
                  const saved = mapping[field];
                  const isRequired = REQUIRED_FIELDS.includes(field);
                  const autoValue = effectiveMapping?.map[field] ?? null;
                  const effectiveValue = typeof saved === 'string' && saved.trim() !== '' ? saved : autoValue;
                  return (
                    <div
                      key={field}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{FIELD_LABELS[field]}</span>
                        {isRequired && (
                          <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                            الزامی
                          </Badge>
                        )}
                        {typeof saved === 'string' && saved.trim() !== '' ? (
                          <Badge variant="outline" className="border-primary/40 text-primary">
                            انتخاب دستی
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            خودکار
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-1 sm:items-end">
                        <Select
                          dir="rtl"
                          value={saved && saved.trim() !== '' ? saved : AUTO_VALUE}
                          onValueChange={(v) => {
                            const next: ColumnMapping = { ...mapping };
                            if (v === AUTO_VALUE) delete next[field];
                            else next[field] = v;
                            setMappingDraft(next);
                          }}
                        >
                          <SelectTrigger
                            className="h-10 w-full min-w-56 sm:w-64"
                            aria-label={`ستون اکسل برای فیلد ${FIELD_LABELS[field]}`}
                          >
                            <SelectValue placeholder="انتخاب ستون" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={AUTO_VALUE}>— خودکار —</SelectItem>
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p
                          className={cn(
                            'text-[11px]',
                            effectiveValue === null && isRequired ? 'text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {effectiveValue === null
                            ? isRequired
                              ? 'ستونی برای این فیلد یافت نشد!'
                              : 'یافت نشد (اختیاری)'
                            : `انتخاب مؤثر: ${effectiveValue}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className="min-h-11"
                  onClick={() => saveMapping.mutate()}
                  disabled={saveMapping.isPending || resetMapping.isPending}
                  aria-label="ذخیرهٔ نگاشت و بازسازی داده‌ها"
                >
                  {saveMapping.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="size-4" aria-hidden="true" />
                  )}
                  ذخیرهٔ نگاشت و بازسازی داده‌ها
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={saveMapping.isPending || resetMapping.isPending}
                      aria-label="بازگردانی نگاشت به حالت خودکار"
                    >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    بازگردانی پیش‌فرض
                  </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>بازگردانی نگاشت به حالت خودکار؟</AlertDialogTitle>
                      <AlertDialogDescription className="leading-6">
                        همهٔ انتخاب‌های دستی شما پاک می‌شود و سامانه ستون‌ها را با نام‌های استاندارد به‌صورت خودکار
                        تشخیص می‌دهد. سپس داده‌های موجود یک‌بار با نگاشت جدید بازسازی خواهند شد.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="min-h-11">انصراف</AlertDialogCancel>
                      <AlertDialogAction
                        className="min-h-11"
                        onClick={(e) => {
                          e.preventDefault();
                          resetMapping.mutate();
                        }}
                      >
                        بله، بازگردانی کن
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================ ۳) پشتیبان‌گیری و بازیابی (بند ۴) ================ */}
      <BackupCard />

      {/* ================ ۴) راهنمای کوتاه ================ */}
      <Card className="border-primary/30 bg-primary/[0.04]">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold">
            <BookOpen className="size-5 text-primary" aria-hidden="true" />
            راهنمای کوتاه تنظیمات
            <InfoHint
              text={
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong className="text-foreground">پارامترها (فیلم‌ها، عرض، ضخامت، ظرفیت، شیفت):</strong>{' '}
                    تغییر آن‌ها بلافاصله و بدون بازسازی، روی دسته‌بندی همهٔ رول‌ها و مانده زمان اثر می‌گذارد —
                    نیازی به Import مجدد نیست.
                  </li>
                  <li>
                    <strong className="text-foreground">نگاشت ستون‌ها:</strong> فقط هنگام Import یا ذخیرهٔ نگاشت
                    استفاده می‌شود؛ پس از تغییر آن باید «بازسازی داده‌ها» انجام شود (دکمهٔ ذخیرهٔ نگاشت این کار
                    را خودکار انجام می‌دهد).
                  </li>
                  <li>
                    اگر هنگام Import خطای «ستون الزامی یافت نشد» گرفتید، از همین بخش ستون مربوطه را دستی انتخاب و
                    بازسازی کنید؛ هدرهای شناسایی‌شدهٔ فایل در پیام خطا فهرست شده‌اند.
                  </li>
                </ul>
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="min-h-11" onClick={() => navigateTo('help')}>
            <BookOpen className="size-4" aria-hidden="true" />
            مشاهدهٔ راهنمای کامل سامانه
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
