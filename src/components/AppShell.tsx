"use client";

import Link from "next/link";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

const NAV_ITEMS: { href: string; key: string; phase: number }[] = [
  { href: "/", key: "nav.dashboard", phase: 1 },
  { href: "/today", key: "nav.today", phase: 1 },
  { href: "/plan", key: "nav.plan", phase: 1 },
  { href: "/week", key: "nav.week", phase: 1 },
  { href: "/vision", key: "nav.vision", phase: 2 },
  { href: "/model-week", key: "nav.modelWeek", phase: 2 },
  { href: "/measures", key: "nav.measures", phase: 2 },
  { href: "/wam", key: "nav.wam", phase: 3 },
  { href: "/review", key: "nav.review", phase: 3 },
  { href: "/history", key: "nav.history", phase: 3 },
  { href: "/settings", key: "nav.settings", phase: 4 },
];

function ShellInner({ children }: { children: React.ReactNode }) {
  const { locale } = useSettings();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <aside className="no-print flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-800 px-5 py-5 dark:border-slate-800/80">
          <p className="text-sm font-bold tracking-wide">12 WEEK YEAR</p>
          <p className="mt-1 text-xs text-slate-400">A year is 12 weeks.</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white dark:hover:bg-slate-900"
            >
              <span>{t(locale, item.key)}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">P{item.phase}</span>
            </Link>
          ))}
        </nav>
        <p className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500 dark:border-slate-800/80">
          Local-first · your data stays in <code>data/app.db</code>
        </p>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10">{children}</div>
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
