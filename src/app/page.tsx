'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Upload,
  RollsIcon,
  Settings2,
  BookOpen,
  Moon,
  Sun,
  Factory,
  FileSpreadsheet,
  AlertTriangle,
} from '@/components/eva/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardView } from '@/components/eva/dashboard-view';
import { ImportView } from '@/components/eva/import-view';
import { RollsView } from '@/components/eva/rolls-view';
import { SettingsView } from '@/components/eva/settings-view';
import { HelpView } from '@/components/eva/help-view';
import { InfoHint } from '@/components/eva/shared';
import type { SettingsResponse } from '@/types/eva';
import { faDateTime, faInt, toFaDigits } from '@/lib/eva/format';
import { APP_VERSION } from '@/lib/eva/version';

const TAB_KEY = 'eva-active-tab';

/** بند ۱ نسخهٔ ۱٫۷ — ماندگاری موقعیت اسکرول هر زبانه (پنجره) */
const SCROLL_KEY = 'eva-tab-scroll';

const TAB_VALUES = ['dashboard', 'import', 'rolls', 'settings', 'help'];

/** وضعیت بازیابی در جریان موقعیت اسکرول */
interface ScrollRestoreState {
  tab: string;
  target: number;
  attempts: number;
  timer: ReturnType<typeof setTimeout> | null;
}

/** خواندن موقعیت‌های اسکرول ذخیره‌شدهٔ زبانه‌ها از localStorage */
function loadScrollPositions(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SCROLL_KEY) ?? '{}') as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export default function Home() {
  const [tab, setTab] = useState('dashboard');
  const { resolvedTheme, setTheme } = useTheme();

  /* ---------------- بند ۱ نسخهٔ ۱٫۷: ماندگاری موقعیت اسکرول هر زبانه ----------------
     هنگام اسکرول، موقعیت فعلی هر زبانه ذخیره می‌شود؛ با بازگشت به زبانه، صفحه
     یک‌دفعه (بدون انیمیشن اسکرول) در همان موقعیت ظاهر می‌شود. */
  const scrollPosRef = useRef<Record<string, number>>({});
  const scrollInitRef = useRef(false);
  const activeTabRef = useRef(tab);
  const restoreRef = useRef<ScrollRestoreState | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** ذخیرهٔ موقعیت‌ها در localStorage (با تأخیر کوتاه برای جلوگیری از نوشتن پیوسته) */
  const persistScroll = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      try {
        localStorage.setItem(SCROLL_KEY, JSON.stringify(scrollPosRef.current));
      } catch {
        /* سهمیهٔ پر یا حالت خصوصی — نادیده گرفته می‌شود */
      }
    }, 250);
  }, []);

  /** لغو بازیابی در جریان (تعامل کاربر یا تعویض زبانه) */
  const cancelRestore = useCallback(() => {
    const r = restoreRef.current;
    if (r?.timer) clearTimeout(r.timer);
    restoreRef.current = null;
  }, []);

  /** پرش آنی به موقعیت ذخیره‌شده — بدون انیمیشن اسکرول؛ اگر محتوا هنوز کوتاه‌تر
      است (در حال بارگذاری داده)، با فاصله‌های فزاینده تا رسیدن به ارتفاع کافی
      تکرار می‌شود (تا ~۱۲ ثانیه — دادهٔ ۸هزارتایی در reload دیرتر می‌رسد)؛
      اولین تعامل کاربر آن را لغو می‌کند. در صورت ناکامی، مقدار ذخیره‌شده
      بازنویسی نمی‌شود تا تلاش بعدی امکان‌پذیر بماند. */
  const beginRestore = useCallback(
    (tabKey: string, target: number) => {
      cancelRestore();
      const state: ScrollRestoreState = {
        tab: tabKey,
        target: Math.max(0, Math.floor(Number(target) || 0)),
        attempts: 0,
        timer: null,
      };
      restoreRef.current = state;
      const attempt = () => {
        if (restoreRef.current !== state) return; // لغو یا جایگزین شده
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: Math.min(state.target, max), behavior: 'instant' });
        if (window.scrollY >= state.target - 1) {
          // موفقیت — مقدار رسیده‌شده (ممکن است clamp شده باشد) ذخیره می‌شود
          restoreRef.current = null;
          scrollPosRef.current[tabKey] = window.scrollY;
          persistScroll();
          return;
        }
        if (++state.attempts >= 60) {
          // ناکامی — مقدار ذخیره‌شده دست‌نخورده می‌ماند (بازنویسی با 0 نه)
          restoreRef.current = null;
          return;
        }
        // ۲۰ تلاش اول ۵۰ms → ۲۰ تلاش ۱۵۰ms → باقی ۴۰۰ms
        const delay = state.attempts < 20 ? 50 : state.attempts < 40 ? 150 : 400;
        state.timer = setTimeout(attempt, delay);
      };
      attempt();
    },
    [cancelRestore, persistScroll],
  );

  // بازیابی زبانهٔ ذخیره‌شده — فقط یک‌بار در ابتدای بارگذاری
  useEffect(() => {
    const saved = localStorage.getItem(TAB_KEY);
    if (saved && saved !== 'dashboard') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- بازیابی یک‌بارهٔ زبانهٔ فعال
      setTab(saved);
    }
  }, []);

  function changeTab(value: string) {
    if (value === tab) return;
    // ذخیرهٔ موقعیت زبانهٔ در حال ترک — مگر بازیابی برای همان زبانه در جریان باشد
    // (در آن صورت هدفِ ذخیره‌شده معتبرتر از موقعیت میانی فعلی است)
    if (!(restoreRef.current && restoreRef.current.tab === tab)) {
      scrollPosRef.current[tab] = window.scrollY;
    }
    cancelRestore();
    persistScroll();
    setTab(value);
    localStorage.setItem(TAB_KEY, value);
  }

  // بازگرداندن موقعیت ذخیره‌شده پس از رندر محتوای زبانه — پیش از رنگ‌آمیزی
  // (useLayoutEffect) تا صفحه یک‌دفعه در همان موقعیت ظاهر شود، نه با اسکرول دیداری
  useLayoutEffect(() => {
    if (!scrollInitRef.current) {
      scrollInitRef.current = true;
      scrollPosRef.current = loadScrollPositions();
    }
    activeTabRef.current = tab;
    beginRestore(tab, scrollPosRef.current[tab] ?? 0);
  }, [tab, beginRestore]);

  // ناوبری بین نماهای فرزند (Empty State ها) از طریق رویداد سفارشی window
  useEffect(() => {
    function onEvaNavigate(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === 'string' && TAB_VALUES.includes(detail)) {
        // ناوبری از Empty State — شروع تازه از بالای صفحه
        scrollPosRef.current[detail] = 0;
        if (detail === tab) beginRestore(detail, 0);
        else changeTab(detail);
      }
    }
    window.addEventListener('eva:navigate', onEvaNavigate as EventListener);
    return () => window.removeEventListener('eva:navigate', onEvaNavigate as EventListener);
  }, [tab, beginRestore]);

  // ذخیرهٔ پیوستهٔ موقعیت اسکرول زبانهٔ فعال هنگام اسکرول کاربر
  useEffect(() => {
    const onScroll = () => {
      if (restoreRef.current) return; // اسکرول برنامه‌ای در حین بازیابی — ذخیره نکن
      scrollPosRef.current[activeTabRef.current] = window.scrollY;
      persistScroll();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [persistScroll]);

  // لغو بازیابی در جریان با اولین تعامل کاربر (چرخ ماوس / لمس / کلید)
  useEffect(() => {
    const cancel = () => cancelRestore();
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchmove', cancel, { passive: true });
    window.addEventListener('keydown', cancel);
    return () => {
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchmove', cancel);
      window.removeEventListener('keydown', cancel);
    };
  }, [cancelRestore]);

  // ذخیرهٔ نهایی موقعیت‌ها هنگام ترک/بستن صفحه
  useEffect(() => {
    const flush = () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      try {
        localStorage.setItem(SCROLL_KEY, JSON.stringify(scrollPosRef.current));
      } catch {
        /* نادیده گرفته می‌شود */
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // وضعیت آخرین Import برای نمایش در سربرگ
  const { data: settings } = useQuery<SettingsResponse>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('خطا در دریافت تنظیمات');
      return res.json();
    },
  });

  const lastImport = settings?.lastImport ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* ---------------- سربرگ ---------------- */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Factory className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex min-w-0 items-center gap-1">
                  <h1 className="min-w-0 truncate text-base font-bold sm:text-lg">
                    سامانه مانیتورینگ رول‌های EVA
                  </h1>
                  <InfoHint
                    text={<>پایش رول‌های خام، EVA و برش‌خورده — محاسبه مانده زمان تولید</>}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastImport ? (
                <Badge
                  variant="secondary"
                  className="hidden items-center gap-1.5 max-w-64 md:inline-flex"
                  title={`آخرین ورود: ${lastImport.fileName} — ${faDateTime(lastImport.importedAt)}`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{lastImport.fileName}</span>
                  <span className="shrink-0 opacity-70">·</span>
                  <span className="shrink-0 opacity-70">{faInt(lastImport.totalRows)} سطر</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="hidden items-center gap-1.5 md:inline-flex">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  داده‌ای وارد نشده است
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="تغییر تم روشن/تاریک"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="hidden h-5 w-5 dark:block" />
                <Moon className="h-5 w-5 dark:hidden" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- ناوبری زبانه‌ها ---------------- */}
      <div className="sticky top-16 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* dir="rtl" — ریشهٔ Radix Tabs به‌طور پیش‌فرض dir=ltr رندر می‌کند و زبانه‌ها را چپ‌به‌راست می‌چیند؛
              با rtl زبانهٔ داشبورد در سمت راست و راهنما در انتهای چپ قرار می‌گیرد (بند ۵) */}
          <Tabs value={tab} onValueChange={changeTab} dir="rtl" className="w-full">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-1.5">
              <TabsTrigger value="dashboard" className="gap-1.5 px-3 py-2 text-sm">
                <LayoutDashboard className="h-4 w-4" />
                داشبورد
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-1.5 px-3 py-2 text-sm">
                <Upload className="h-4 w-4" />
                ورود داده‌ها
              </TabsTrigger>
              <TabsTrigger value="rolls" className="gap-1.5 px-3 py-2 text-sm">
                <RollsIcon className="h-4 w-4" />
                رول‌ها
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 px-3 py-2 text-sm">
                <Settings2 className="h-4 w-4" />
                تنظیمات
              </TabsTrigger>
              <TabsTrigger value="help" className="gap-1.5 px-3 py-2 text-sm">
                <BookOpen className="h-4 w-4" />
                راهنما
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ---------------- محتوا ---------------- */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Tabs value={tab} onValueChange={changeTab} dir="rtl">
          <TabsContent value="dashboard" className="mt-0 fade-in-up">
            <DashboardView />
          </TabsContent>
          <TabsContent value="import" className="mt-0 fade-in-up">
            <ImportView />
          </TabsContent>
          <TabsContent value="rolls" className="mt-0 fade-in-up">
            <RollsView />
          </TabsContent>
          <TabsContent value="settings" className="mt-0 fade-in-up">
            <SettingsView />
          </TabsContent>
          <TabsContent value="help" className="mt-0 fade-in-up">
            <HelpView />
          </TabsContent>
        </Tabs>
      </main>

      {/* ---------------- پاصفحه (چسبان به پایین) ---------------- */}
      <footer className="mt-auto border-t bg-background/80">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>سامانه مانیتورینگ رول‌های EVA — نسخه {toFaDigits(APP_VERSION).replace('.', '٫')}</p>
          <p className="flex items-center gap-1">
            <Factory className="h-3.5 w-3.5" aria-hidden="true" />
            <InfoHint
              text={<>مانده زمان = وزن خالص رول‌های خام ÷ (ظرفیت شیفت × تعداد شیفت در روز)</>}
            />
          </p>
        </div>
      </footer>
    </div>
  );
}
