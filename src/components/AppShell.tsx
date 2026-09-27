"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

const NAV_ITEMS: { href: string; key: string }[] = [
  { href: "/", key: "nav.dashboard" },
  { href: "/today", key: "nav.today" },
  { href: "/plan", key: "nav.plan" },
  { href: "/week", key: "nav.week" },
  { href: "/vision", key: "nav.vision" },
  { href: "/model-week", key: "nav.modelWeek" },
  { href: "/measures", key: "nav.measures" },
  { href: "/wam", key: "nav.wam" },
  { href: "/review", key: "nav.review" },
  { href: "/history", key: "nav.history" },
  { href: "/guide", key: "nav.guide" },
  { href: "/settings", key: "nav.settings" },
];

function ShellInner({ children }: { children: React.ReactNode }) {
  const { locale } = useSettings();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="no-print flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white text-zinc-900 transition-colors dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="border-b border-zinc-200 px-6 py-6 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-black text-white dark:bg-zinc-100 dark:text-zinc-900">
              12
            </span>
            <span className="text-sm font-bold tracking-tight">
              {locale === "vi" ? "NĂM 12 TUẦN" : "12 WEEK YEAR"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {locale === "vi" ? "Một năm là 12 tuần." : "A year is 12 weeks."}
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <span>{t(locale, item.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-4 text-[11px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          <p>
            {locale === "vi"
              ? "Dữ liệu cục bộ · Lưu trong "
              : "Local-first · Stored in "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              data/app.db
            </code>
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
      </main>
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
