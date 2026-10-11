'use client';

/* =========================================================================
   shared.tsx — ابزارهای مشترک نماهای EVA (فراخوانی API، ناوبری، وضعیت‌ها،
   آیکون توضیح «!» / InfoHint)
   ========================================================================= */

import type { ReactNode } from 'react';
import { Database, RefreshCw } from '@/components/eva/icons';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/types/eva';

/* ---------------- توضیحات جمع‌شونده در آیکون «!» ---------------- */

/**
 * آیکون کوچک «!» کهربایی — با کلیک، توضیح متن داخل Popover نمایش داده می‌شود.
 * جایگزین توضیحات متنی ثابت کارت‌ها/دیالوگ‌ها (تغییر #۲ نسخهٔ ۱٫۵).
 */
export function InfoHint({ text, className }: { text: ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label="نمایش توضیحات"
        title="نمایش توضیحات"
        className={cn(
          'flex size-5 shrink-0 cursor-help items-center justify-center rounded-full border border-amber-500/50 bg-amber-50 text-[11px] font-bold text-amber-700 transition-all hover:ring-2 hover:ring-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400',
          className,
        )}
      >
        !
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="start" side="bottom" className="max-w-xs p-3">
        {/* div (نه p) — متن‌های InfoHint می‌توانند شامل ul/li باشند */}
        <div className="text-xs leading-6 text-muted-foreground">{text}</div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- ناوبری بین زبانه‌ها (از طریق رویداد window) ---------------- */

const VALID_TABS = ['dashboard', 'import', 'rolls', 'settings', 'help'] as const;

/** ارسال رویداد ناوبری — page.tsx به آن گوش می‌دهد و زبانه را عوض می‌کند */
export function navigateTo(tab: (typeof VALID_TABS)[number]): void {
  window.dispatchEvent(new CustomEvent<string>('eva:navigate', { detail: tab }));
}

/* ---------------- فراخوانی API با مدیریت خطا ---------------- */

/** خطای دارای پیام + وضعیت HTTP + بدنهٔ خطای سرور */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }

  /** بدنهٔ خطا در قالب ApiError (اگر سرور همان قالب را فرستاده باشد) */
  get apiError(): ApiError | null {
    if (this.payload && typeof this.payload === 'object' && 'message' in this.payload) {
      return this.payload as ApiError;
    }
    return null;
  }
}

/** fetch سادهٔ JSON با هندل خطای شبکه و خطای سرور */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiRequestError('خطای شبکه — اتصال به سرور برقرار نشد', 0, null);
  }

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const apiMsg =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : null;
    throw new ApiRequestError(apiMsg ?? `خطای سرور (کد ${res.status})`, res.status, payload);
  }

  return payload as T;
}

/* ---------------- وضعیت‌های مشترک رابط کاربری ---------------- */

/** حالت خالی — هنوز فایلی وارد نشده است */
export function EmptyDataState({
  title = 'هنوز داده‌ای وارد نشده است',
  description = 'ابتدا فایل «رول های موجود» را در بخش ورود داده‌ها بارگذاری کنید تا داشبورد و جداول پُر شوند.',
  actionLabel = 'رفتن به ورود داده‌ها',
}: {
  title?: string;
  description?: string;
  actionLabel?: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-card/50 p-10 text-center sm:p-14">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Database className="size-8" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionLabel !== null && (
        <Button size="lg" className="min-h-11" onClick={() => navigateTo('import')}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/** خطای کوئری — با دکمهٔ تلاش مجدد */
export function QueryErrorAlert({
  error,
  onRetry,
  title = 'خطا در دریافت داده‌ها',
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const message = error instanceof Error ? error.message : 'خطای نامشخص';
  return (
    <Alert variant="destructive" role="alert">
      <RefreshCw className="size-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="w-full">
        <p>{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2 min-h-9" onClick={onRetry}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            تلاش مجدد
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** بستهٔ کوچک رنگ برای Legend های دستی نمودار */
export function LegendDot({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  );
}
