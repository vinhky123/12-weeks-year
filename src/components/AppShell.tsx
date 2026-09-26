import Link from "next/link";

const NAV: { href: string; label: string; phase: number }[] = [
  { href: "/", label: "Dashboard", phase: 1 },
  { href: "/today", label: "Today", phase: 1 },
  { href: "/plan", label: "12-Week Plan", phase: 1 },
  { href: "/week", label: "Weekly Plan", phase: 1 },
  { href: "/vision", label: "Vision", phase: 2 },
  { href: "/model-week", label: "Model Week", phase: 2 },
  { href: "/measures", label: "Measures", phase: 2 },
  { href: "/wam", label: "WAM", phase: 3 },
  { href: "/review", label: "Review", phase: 3 },
  { href: "/history", label: "History", phase: 3 },
  { href: "/settings", label: "Settings", phase: 4 },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100">
        <div className="border-b border-slate-800 px-5 py-5">
          <p className="text-sm font-bold tracking-wide">12 WEEK YEAR</p>
          <p className="mt-1 text-xs text-slate-400">A year is 12 weeks.</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <span>{item.label}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">P{item.phase}</span>
            </Link>
          ))}
        </nav>
        <p className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
          Local-first · your data stays in <code>data/app.db</code>
        </p>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
