import Link from "next/link";

function Section({ id, step, title, intro, children }: { id: string; step: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex items-baseline gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
          {step}
        </span>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {intro && <p className="mt-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">{intro}</p>}
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}

function Callout({ tone, title, children }: { tone: "rule" | "warn" | "calm"; title: string; children: React.ReactNode }) {
  const styles = {
    rule: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
    warn: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
    calm: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40",
  }[tone];
  const label = { rule: "RULE", warn: "IF THIS HAPPENS", calm: "REMEMBER" }[tone];
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <p className="text-[11px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      <div className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</div>
    </div>
  );
}

const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:decoration-emerald-700 dark:hover:text-emerald-300">
    {children}
  </Link>
);

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="text-xs font-bold tracking-widest text-zinc-400 dark:text-zinc-500">THE METHOD</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">How to use this site</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          This app is not a to-do list. It is an implementation of <em>The 12 Week Year</em> (Brian P. Moran &amp;
          Michael Lennington) — a system built on one idea:{" "}
          <strong className="text-zinc-900 dark:text-zinc-100">a year is no longer 12 months. It&apos;s 12 weeks.</strong>{" "}
          Most people don&apos;t fail from lack of knowledge; they fail from lack of <em>execution</em>. Annual goals
          hide the deadline far enough away that every day feels skippable. Compressing the year to 12 weeks puts the
          deadline close enough that every day counts — and gives you four fresh starts a year.
        </p>
      </header>

      <div className="mt-10 space-y-12">
        <Section
          id="setup"
          step="1"
          title="One-time setup (before week 1)"
          intro="Do these four things once, in order. They take about an hour and carry the whole cycle."
        >
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <L href="/vision">Write your vision</L> — long-term (5–15 years), then 3-year, then why{" "}
              <em>this</em> cycle matters. Start with <strong>what if</strong>, not how. A vision that isn&apos;t
              personal, isn&apos;t linked to daily actions, or is too small won&apos;t survive the valley.
            </li>
            <li>
              <L href="/plan">Create your 12-Week Plan</L> — up to <strong>3 goals</strong> (the vital few), each with
              a required <em>why</em> and a measurable lag target (180 → 170 lbs, $0 → $1,000). Then add tactics:
              verb-first, countable actions like &ldquo;Perform 30-min strength training 3×/week&rdquo;, due every
              week or in specific weeks.
            </li>
            <li>
              <L href="/model-week">Design your model week</L> — a 3-hour strategic block (your most important work,
              once a week, uninterrupted), daily 30–60 min buffer blocks for email/admin, a 3h+ breakout block fully
              away from work, plus the planning slot and your WAM slot.
            </li>
            <li>
              <L href="/plan">Make the commitment</L> — count the costs honestly (comfort, weekends, sleeping in),
              then write &ldquo;I choose to…&rdquo;. Commitment means acting on the promise regardless of how you
              feel — and in this system, promises only span 12 weeks. That&apos;s what makes going all-in possible.
            </li>
          </ol>
          <Callout tone="rule" title="Max 3 active goals per cycle.">
            The vital few. A fourth goal doesn&apos;t add results — it dilutes the first three. The app blocks it on
            purpose.
          </Callout>
        </Section>

        <Section
          id="rhythm"
          step="2"
          title="The rhythm: daily, weekly, cycle"
          intro="The whole system runs on three loops. If you only remember one thing: the weekly loop on Monday is the heartbeat — never skip it."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs font-bold tracking-widest text-emerald-700 dark:text-emerald-400">DAILY · ~5 MIN</p>
              <p className="mt-1 font-semibold">Open Today</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Check off today&apos;s tactic actions</li>
                <li>• Read the daily principle</li>
                <li>• Watch the projected score move</li>
              </ul>
              <p className="mt-3 text-sm">
                <L href="/today">Go to Today →</L>
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs font-bold tracking-widest text-emerald-700 dark:text-emerald-400">WEEKLY · ~20 MIN, MONDAY</p>
              <p className="mt-1 font-semibold">Close → Plan → Report</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• <L href="/week">Close last week</L>: final score, lag values, one-line reflection</li>
                <li>• Plan this week: items generated fresh — place them on days</li>
                <li>• <L href="/wam">WAM report</L>: blockers, what worked, export as Markdown</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs font-bold tracking-widest text-emerald-700 dark:text-emerald-400">WEEK 13 · ~2 H</p>
              <p className="mt-1 font-semibold">Celebrate, review, reload</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Celebrate first — wins before analysis</li>
                <li>• Grade results, quality of life, disciplines</li>
                <li>• Archive the year, carry the vital few forward</li>
              </ul>
              <p className="mt-3 text-sm">
                <L href="/review">Go to Review →</L>
              </p>
            </div>
          </div>
          <Callout tone="calm" title="Closing a week is final — by design.">
            Closed weeks are immutable. The score becomes history you can&apos;t edit, which is exactly what makes it
            honest. There is no partial credit and no extra credit: the score measures{" "}
            <strong>achievements, not effort or intentions</strong>.
          </Callout>
        </Section>

        <Section id="score" step="3" title="Keep score without flinching">
          <p>
            Every week the app computes one number:{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              completions ÷ tactics due, benchmarked at 85%.
            </strong>{" "}
            85%+ and you will very nearly always hit your goals. The number isn&apos;t a judgment — it&apos;s a
            mirror, and the discomfort you feel looking at it is <em>productive tension</em>: the fuel of correction.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Callout tone="rule" title="Score ≥ 85% but the lag isn't moving?">
              That&apos;s a <strong>strategy problem</strong> — change the tactics, not the effort. You&apos;re
              executing a plan that doesn&apos;t produce the result.
            </Callout>
            <Callout tone="warn" title="Score below 65%?">
              That&apos;s an <strong>execution problem</strong> — the plan is too big. Shrink it to what you will
              actually do. Two consecutive weeks below 65: cut tactics down to the vital few and restart the week
              honest.
            </Callout>
          </div>
          <p>
            Watch both kinds of numbers on <L href="/measures">Measures</L>: <strong>lag</strong> indicators are the
            results (weight, revenue) — you can&apos;t manage them directly. <strong>Lead</strong> indicators are the
            activities you control (workouts, outreach) — log those weekly, and the lag follows.
          </p>
        </Section>

        <Section
          id="valley"
          step="4"
          title="Expect the valley (weeks 3–6)"
          intro="Change follows a predictable emotional curve: uninformed optimism → informed pessimism → the valley of despair → informed optimism → success. The valley is where most people quit — usually around weeks 3 to 6, when progress is invisible and the costs are real."
        >
          <Callout tone="warn" title="If you feel like quitting in weeks 3–6, you're on schedule.">
            The app will show you a valley banner and resurface your vision and your why. Don&apos;t renegotiate the
            plan at the bottom of the valley — rely on your commitment and the Monday rhythm, not your feelings.
            &ldquo;Learning to do the things you need to do, regardless of how you feel, is a core discipline for
            success.&rdquo;
          </Callout>
          <p>
            Missed a week? Close it honestly anyway. The 0% is a data point, not a verdict — and the diagnosis tells
            you which lever to pull (strategy vs execution). Never edit history to feel better; the whole system
            depends on the record being true.
          </p>
        </Section>

        <Section id="reload" step="5" title="Week 13: close the year, open the next">
          <p>
            When week 13 arrives, <L href="/review">the Review wizard</L> runs in six steps: celebrate first (most
            people skip straight to the next grind — don&apos;t), grade each goal, rate your quality of life across
            six areas (life balance is an illusion — aim for <em>intentional imbalance</em> and rebalance each cycle),
            rate how you executed the five disciplines, write your breakthroughs, then archive the year and carry the
            vital few goals into the next one. Archived cycles keep their scores, review, and vision snapshot forever
            — browse them under <L href="/history">History</L>.
          </p>
        </Section>

        <Section id="data" step="6" title="Your data is yours">
          <p>
            Everything lives in one local file (<code className="rounded bg-zinc-100 px-1 py-0.5 text-sm dark:bg-zinc-800">data/app.db</code>).
            Closing a week writes an automatic checkpoint (newest 5 kept). For a manual backup use{" "}
            <L href="/settings">Settings → Download backup</L>; importing replaces everything but always snapshots
            first. No cloud, no accounts, no telemetry — copy the file and you&apos;re migrated.
          </p>
        </Section>
      </div>

      <footer className="mt-14 rounded-xl border border-zinc-200 p-5 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <p>
          <strong className="text-zinc-900 dark:text-zinc-100">Where this comes from.</strong> This site implements
          the system from <em>The 12 Week Year: Get More Done in 12 Weeks than Others Do in 12 Months</em> by Brian P.
          Moran &amp; Michael Lennington. The app is a companion, not a replacement —{" "}
          <a
            href="https://12weekyear.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800 dark:text-emerald-400"
          >
            buy the book
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
