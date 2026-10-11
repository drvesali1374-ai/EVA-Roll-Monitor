'use client';

/* =========================================================================
   lib/eva/use-persistent-state.ts — حالت ماندگار با localStorage (بند ۱)
   مقدار اولیه = defaultValue (سازگار با SSR)؛ پس از mount یک‌بار مقدار
   ذخیره‌شده بازیابی می‌شود و از آن پس هر تغییر بلافاصله ذخیره می‌شود.
   ========================================================================= */

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * useState با پشتیبان localStorage — پس از رفرش صفحه یا بستن/بازکردن
 * مرورگر، آخرین وضعیت کاربر برگردانده می‌شود.
 *
 * کلیدها توسط فراخوان‌کننده فضانام‌دهی می‌شوند (مثل `eva-table-raw-sort`).
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(defaultValue);
  /** از بازنویسی مقدار ذخیره‌شده پیش از بازیابی جلوگیری می‌کند */
  const skipFirstWrite = useRef(true);

  // بازیابی یک‌بارهٔ مقدار ذخیره‌شده پس از mount (فقط سمت کلاینت)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- بازیابی یک‌بارهٔ وضعیت ذخیره‌شدهٔ کاربر پس از mount (بند ۱) — پاسخ به رویداد نیست
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      /* دادهٔ خراب یا localStorage غیرقابل‌دسترس — مقدار پیش‌فرض باقی می‌ماند */
    }
  }, [key]);

  // ذخیرهٔ هر تغییر (نوشتن مقدار اولیه پیش از بازیابی انجام نمی‌شود)
  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* سهمیهٔ پر یا حالت خصوصی مرورگر — ذخیره نادیده گرفته می‌شود */
    }
  }, [key, value]);

  return [value, setValue];
}
