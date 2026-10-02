"use client";

import Link from "next/link";
import { useProgress } from "@/lib/progress";
import { ALL_LESSONS } from "@/content/stages";

const LABELS: Record<string, string> = {
  axes: "Chart axes",
  timeframes: "Timeframes",
  "candle-anatomy": "Candle anatomy",
  "candle-patterns": "Wicks & patterns",
  trend: "Trends & swings",
  "support-resistance": "Support / resistance",
  rejection: "Rejections",
  trendlines: "Trendlines",
  retest: "Retests",
  targets: "Targets",
  risk: "Risk",
  news: "News",
  process: "Process & discipline",
  "options-basics": "Calls & puts",
  "strikes-expiry": "Strikes & expiry",
  greeks: "Greeks",
  routine: "Morning routine",
  bias: "Bias (MAs / FTFC)",
  "key-levels": "Key levels",
  orb: "ORB breakouts",
  clock: "Time of day",
  regime: "Market regime",
  "swing-setups": "Swing setups",
  "swing-entry": "Swing entries & invalidation",
  "swing-options": "Swing option selection",
};

export default function Profile() {
  const { progress, reset } = useProgress();
  if (!progress) return null;
  const passed = ALL_LESSONS.filter((l) => progress.lessons[l.id]?.passed).length;
  const mastery = Object.entries(progress.mastery).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your progress</h1>
        <Link href="/" className="text-zinc-400">
          ← Path
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="XP" value={progress.xp} />
        <Stat label="Streak" value={`${progress.streak}d`} />
        <Stat label="Lessons" value={`${passed}/${ALL_LESSONS.length}`} />
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Concept mastery</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Share of drills answered correctly. Weak concepts get served again in later lessons.
        </p>
        {mastery.length === 0 && <p className="text-sm text-zinc-500">Nothing yet. Start a lesson.</p>}
        <ul className="flex flex-col gap-2">
          {mastery.map(([tag, m]) => {
            const pct = m && m.attempted ? Math.round((100 * m.correct) / m.attempted) : 0;
            return (
              <li key={tag} className="text-sm">
                <div className="flex justify-between">
                  <span>{LABELS[tag] ?? tag}</span>
                  <span className="text-zinc-400">{pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <button
        onClick={() => {
          if (confirm("Reset all progress?")) reset();
        }}
        className="btn-danger"
      >
        Reset progress
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-zinc-900 p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}
