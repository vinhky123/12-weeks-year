"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ModalDialog from "@/components/common/ModalDialog";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";

type NavItem = {
  href: string;
  en: string;
  vi: string;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/today", en: "Today", vi: "Hôm nay" },
  { href: "/week", en: "This Week", vi: "Tuần này" },
  { href: "/", en: "Cycle", vi: "Chu kỳ" },
];

const NAV_GROUPS: { en: string; vi: string; items: NavItem[] }[] = [
  {
    en: "Planning",
    vi: "Lập kế hoạch",
    items: [
      { href: "/plan", en: "12-Week Plan", vi: "Kế hoạch 12 tuần" },
      { href: "/vision", en: "Vision", vi: "Tầm nhìn" },
      { href: "/model-week", en: "Model Week", vi: "Tuần mẫu" },
      { href: "/measures", en: "Measures", vi: "Thước đo" },
    ],
  },
  {
    en: "Reflection",
    vi: "Nhìn lại",
    items: [
      { href: "/wam", en: "Weekly Accountability", vi: "Cam kết tuần" },
      { href: "/review", en: "Review", vi: "Đánh giá" },
      { href: "/history", en: "History", vi: "Lịch sử" },
    ],
  },
  {
    en: "Help",
    vi: "Trợ giúp",
    items: [
      { href: "/guide", en: "Guide", vi: "Hướng dẫn" },
      { href: "/settings", en: "Settings", vi: "Cài đặt" },
    ],
  },
];

function Brand({ compact = false }: { compact?: boolean }) {
  const { locale } = useSettings();

  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-black text-white dark:bg-teal-400 dark:text-zinc-950">
        12
      </span>
      <div className={compact ? "min-w-0" : undefined}>
        <div className="truncate text-sm font-bold tracking-tight">
          {locale === "vi" ? "NĂM 12 TUẦN" : "12 WEEK YEAR"}
        </div>
        {!compact && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {locale === "vi" ? "Một năm là 12 tuần." : "A year is 12 weeks."}
          </p>
        )}
      </div>
    </div>
  );
}

function NavLink({ item, onSelect }: { item: NavItem; onSelect?: () => void }) {
  const { locale } = useSettings();
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      onClick={onSelect}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-zinc-950 ${
        isActive
          ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {locale === "vi" ? item.vi : item.en}
    </Link>
  );
}

function FullNavigation({ onSelect }: { onSelect?: () => void }) {
  const { locale } = useSettings();

  return (
    <nav aria-label={locale === "vi" ? "Điều hướng chính" : "Main navigation"}>
      <div className="space-y-1">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} onSelect={onSelect} />
        ))}
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.en} className="mt-6">
          <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            {locale === "vi" ? group.vi : group.en}
          </h2>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { locale } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 dark:bg-teal-400 dark:text-zinc-950"
      >
        {locale === "vi" ? "Chuyển đến nội dung chính" : "Skip to main content"}
      </a>

      <header className="no-print border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Brand compact />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-zinc-950"
          >
            {locale === "vi" ? "Trình đơn" : "Menu"}
          </button>
        </div>
        <nav
          aria-label={locale === "vi" ? "Điểm đến chính" : "Primary destinations"}
          className="mt-3 grid grid-cols-3 gap-1"
        >
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </header>

      <div className="flex min-h-[calc(100vh-113px)] lg:min-h-screen">
        <aside className="no-print hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 lg:flex">
          <div className="border-b border-zinc-200 px-5 py-6 dark:border-zinc-800">
            <Brand />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-5">
            <FullNavigation />
          </div>
          <p className="border-t border-zinc-200 px-5 py-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {locale === "vi"
              ? "Dữ liệu của bạn được lưu trên thiết bị này."
              : "Your data stays on this device."}
          </p>
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6 md:py-8 xl:px-8 xl:py-10">
            {children}
          </div>
        </main>
      </div>

      <ModalDialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={locale === "vi" ? "Trình đơn" : "Menu"}
        className="max-w-md"
      >
        <FullNavigation onSelect={() => setMenuOpen(false)} />
        <p className="mt-6 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {locale === "vi"
            ? "Dữ liệu của bạn được lưu trên thiết bị này."
            : "Your data stays on this device."}
        </p>
      </ModalDialog>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ShellInner>{children}</ShellInner>
    </SettingsProvider>
  );
}
