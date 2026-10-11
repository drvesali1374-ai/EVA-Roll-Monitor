/* =========================================================================
   app.js — راه‌انداز برنامه (bootstrap)
   -------------------------------------------------------------------------
   بارگذاری لایهٔ داده (IndexedDB + درج دادهٔ اولیه در نخستین اجرا) →
   ساخت اسنپ‌شات (تنظیمات + رول‌ها + آخرین Import) → رندر زبانه‌ها.
   زبانهٔ فعال و زیرزبانه‌ها و وضعیت جداول در localStorage ماندگارند.
   بند ۱ نسخهٔ ۱٫۷ — موقعیت اسکرول هر زبانه نیز ماندگار است؛ با بازگشت به
   زبانه، صفحه یک‌دفعه (بدون انیمیشن اسکرول) در همان موقعیت ظاهر می‌شود.
   ========================================================================= */
(function () {
  'use strict';

  var TABS = ['dashboard', 'import', 'rolls', 'settings', 'help'];
  var TAB_KEY = 'eva-active-tab';
  var SCROLL_KEY = 'eva-tab-scroll';

  var activeTab = 'dashboard';
  var snapshot = null; // { settings, rolls, lastBatch, headers }
  var booted = false;

  /* =========================================================================
     بند ۱ نسخهٔ ۱٫۷ — ماندگاری موقعیت اسکرول هر زبانه
     ========================================================================= */

  var scrollPos = {};
  try {
    var spRaw = localStorage.getItem(SCROLL_KEY);
    if (spRaw) {
      var spParsed = JSON.parse(spRaw);
      if (spParsed && typeof spParsed === 'object') scrollPos = spParsed;
    }
  } catch (e) {
    /* دادهٔ خراب — از موقعیت‌های خالی شروع */
  }

  var restoreState = null; // { tab, target, attempts, timer }
  var scrollPersistTimer = null;

  function persistScrollNow() {
    try {
      localStorage.setItem(SCROLL_KEY, JSON.stringify(scrollPos));
    } catch (e) {
      /* سهمیهٔ پر یا حالت خصوصی — نادیده گرفته می‌شود */
    }
  }

  function schedulePersistScroll() {
    if (scrollPersistTimer) return;
    scrollPersistTimer = setTimeout(function () {
      scrollPersistTimer = null;
      persistScrollNow();
    }, 300);
  }

  function cancelRestore() {
    if (restoreState && restoreState.timer) clearTimeout(restoreState.timer);
    restoreState = null;
  }

  function attemptRestore() {
    var st = restoreState;
    if (!st) return;
    var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(st.target, max)); // بدون behavior → پرش آنی، بدون انیمیشن
    if (window.scrollY >= st.target - 1) {
      // موفقیت — مقدار رسیده‌شده ذخیره می‌شود
      restoreState = null;
      scrollPos[st.tab] = window.scrollY;
      return;
    }
    if (++st.attempts >= 60) {
      // ناکامی — مقدار ذخیره‌شده دست‌نخورده می‌ماند (بازنویسی با 0 نه)
      restoreState = null;
      return;
    }
    /* محتوا هنوز کوتاه‌تر است (بارگذاری داده/نمودار) — فاصله‌های فزاینده:
       ۲۰ تلاش ۵۰ms → ۲۰ تلاش ۱۵۰ms → باقی ۴۰۰ms (تا ~۱۲ ثانیه) */
    var delay = st.attempts < 20 ? 50 : st.attempts < 40 ? 150 : 400;
    st.timer = setTimeout(attemptRestore, delay);
  }

  function beginRestore(tab, target) {
    cancelRestore();
    var t = Math.max(0, Math.floor(Number(target) || 0));
    restoreState = { tab: tab, target: t, attempts: 0, timer: null };
    attemptRestore();
  }

  /* ذخیرهٔ پیوستهٔ موقعیت زبانهٔ فعال هنگام اسکرول کاربر */
  window.addEventListener(
    'scroll',
    function () {
      if (restoreState) return; // اسکرول برنامه‌ای در حین بازیابی — ذخیره نکن
      scrollPos[activeTab] = window.scrollY;
      schedulePersistScroll();
    },
    { passive: true }
  );

  /* لغو بازیابی در جریان با اولین تعامل کاربر */
  ['wheel', 'touchmove', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () {
      cancelRestore();
    }, { passive: true });
  });

  /* ذخیرهٔ نهایی هنگام ترک/بستن صفحه */
  window.addEventListener('pagehide', function () {
    if (scrollPersistTimer) {
      clearTimeout(scrollPersistTimer);
      scrollPersistTimer = null;
    }
    persistScrollNow();
  });

  /* =========================================================================
     اسنپ‌شات داده
     ========================================================================= */

  function loadSnapshot() {
    return Promise.all([Store.getAllRolls(), Store.getLastBatch()]).then(function (results) {
      var rolls = results[0];
      var lastBatch = results[1];
      snapshot = {
        settings: Store.getSettings(),
        rolls: rolls,
        lastBatch: lastBatch,
        headers: lastBatch ? EVA.parseJsonArray(lastBatch.headers) : [],
      };
      return snapshot;
    });
  }

  /* =========================================================================
     زبانه‌ها
     ========================================================================= */

  function activateTab(tab) {
    if (TABS.indexOf(tab) === -1) tab = 'dashboard';
    if (tab !== activeTab) {
      /* ذخیرهٔ موقعیت زبانهٔ در حال ترک — مگر بازیابی برای همان زبانه در جریان
         باشد (در آن صورت هدفِ ذخیره‌شده معتبرتر از موقعیت میانی فعلی است) */
      if (!restoreState || restoreState.tab !== activeTab) {
        scrollPos[activeTab] = window.scrollY;
      }
    }
    cancelRestore();
    activeTab = tab;
    localStorage.setItem(TAB_KEY, tab);

    TABS.forEach(function (t) {
      var btn = document.getElementById('tab-' + t);
      var sec = document.getElementById('view-' + t);
      var on = t === tab;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.setAttribute('tabindex', on ? '0' : '-1');
      sec.hidden = !on;
    });

    renderActiveView();
    /* بند ۱ نسخهٔ ۱٫۷ — بازگشت یک‌نفسی به موقعیت ذخیره‌شدهٔ این زبانه
       (بدون اسکرول نرم؛ برای زبانهٔ تازه ۰ = بالای صفحه) */
    beginRestore(tab, scrollPos[tab] || 0);
  }

  function renderActiveView() {
    if (!snapshot) return;
    var sec = document.getElementById('view-' + activeTab);
    var view = EvaViews[activeTab];
    if (view) view.render(sec, snapshot);
  }

  /** بازرندر نمای فعلی با همان اسنپ‌شات (بدون خواندن مجدد داده) */
  function rerender() {
    renderActiveView();
  }

  /** خواندن مجدد داده از IndexedDB + بازرندر نمای فعال + بج سربرگ */
  function refreshAll() {
    return loadSnapshot().then(function () {
      renderHeader();
      renderActiveView();
    });
  }

  /** ناوبری برنامه‌ای بین زبانه‌ها */
  function navigate(tab) {
    activateTab(tab);
  }

  /* =========================================================================
     سربرگ و پاصفحه
     ========================================================================= */

  function renderHeader() {
    var side = document.getElementById('header-side');
    if (snapshot.lastBatch) {
      var li = snapshot.lastBatch;
      side.innerHTML =
        '<span class="badge badge-secondary header-badge" title="آخرین ورود: ' + UI.esc(li.fileName) + ' — ' + Fmt.faDateTime(li.importedAt) + '">' +
        UI.icon('file-spreadsheet', 14) +
        '<span class="truncate" style="max-width:180px">' + UI.esc(li.fileName) + '</span>' +
        '<span style="opacity:.7">·</span><span style="opacity:.7">' + Fmt.faInt(li.totalRows) + ' سطر</span>' +
        '</span>';
    } else {
      side.innerHTML =
        '<span class="badge badge-outline header-badge"><span class="txt-amber">' + UI.icon('alert-triangle', 14) + '</span>داده‌ای وارد نشده است</span>';
    }
    UI.hydrateIcons(side);
  }

  function renderFooter() {
    document.getElementById('footer-version').textContent =
      'سامانه مانیتورینگ رول‌های EVA — نسخهٔ ' + Fmt.toFaDigits(EVA.APP_VERSION).replace('.', '٫') + ' (آفلاین)';
  }

  /* =========================================================================
     راه‌اندازی
     ========================================================================= */

  function showFatal(message) {
    var main = document.getElementById('main');
    main.innerHTML =
      '<div class="alert alert-destructive" role="alert">' + UI.icon('alert-circle', 18) +
      '<div class="alert-body"><p class="alert-title">خطا در راه‌اندازی پایگاه دادهٔ مرورگر</p>' +
      '<p style="line-height:1.9">' + UI.esc(message) + '</p>' +
      '<p class="text-xs txt-muted">برای استفادهٔ آفلاین، مرورگر باید IndexedDB را برای فایل‌های محلی فعال کرده باشد (کروم/اج/فایرفاکس پشتیبانی می‌کنند). اگر فایل را مستقیم باز کرده‌اید و مشکل ادامه داشت، صفحه را از طریق آدرس serv شده باز کنید.</p>' +
      '</div></div>';
    UI.hydrateIcons(main);
  }

  function boot() {
    if (booted) return;
    booted = true;

    // آیکون سربرگ و پاصفحه
    document.getElementById('brand-icon').innerHTML = UI.icon('factory', 22);
    UI.hydrateIcons(document.body);
    renderFooter();

    // اسکلت بارگذاری تا آماده‌شدن داده
    var initialTab = localStorage.getItem(TAB_KEY);
    if (TABS.indexOf(initialTab) === -1) initialTab = 'dashboard';
    activeTab = initialTab;
    document.getElementById('view-' + initialTab).innerHTML = UI.skeletonHtml(6);

    // رویدادهای زبانه‌ها
    document.querySelectorAll('#tabs-bar .tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activateTab(btn.getAttribute('data-tab'));
      });
    });

    // ناوبری از طریق رویداد سفارشی (Empty State ها)
    window.addEventListener('eva:navigate', function (e) {
      if (typeof e.detail === 'string' && TABS.indexOf(e.detail) !== -1) {
        // ناوبری از Empty State — شروع تازه از بالای صفحه
        scrollPos[e.detail] = 0;
        activateTab(e.detail);
      }
    });

    Store.ready()
      .then(loadSnapshot)
      .then(function () {
        renderHeader();
        activateTab(activeTab);
      })
      .catch(function (e) {
        console.error('[app] خطای راه‌اندازی:', e);
        showFatal((e && e.message) || 'خطای ناشناخته هنگام بازکردن پایگاه دادهٔ مرورگر.');
      });

    // بازترسیم نمودارها پس از آماده‌شدن کامل فونت وزیرمتن
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (window.EvaCharts) EvaCharts.redrawAll();
      });
    }
  }

  /* ---------------- انتشار سراسری ---------------- */
  window.App = {
    navigate: navigate,
    rerender: rerender,
    refreshAll: refreshAll,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
