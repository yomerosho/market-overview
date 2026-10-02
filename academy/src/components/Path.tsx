"use client";

// The Duolingo-style path: stages stacked top to bottom, lessons as nodes.

import Link from "next/link";
import { Hearts } from "./LessonPlayer";
import { STAGES, isLessonUnlocked } from "@/content/stages";
import { useProgress } from "@/lib/progress";

export default function Path() {
  const { progress } = useProgress();
  if (!progress) return null;

  return (
    <div className="mx-auto max-w-lg p-4 pb-24">
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="text-lg font-bold">Chart Academy</div>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="text-orange-400">🔥 {progress.streak}</span>
          <span className="text-amber-400">★ {progress.xp} XP</span>
          <Hearts n={progress.hearts} />
          <Link href="/profile" aria-label="Profile" className="text-zinc-400">
            ☰
          </Link>
        </div>
      </header>

      {STAGES.map((stage) => {
        const lessons = stage.units.flatMap((u) => u.lessons);
        const complete = lessons.length > 0 && lessons.every((l) => progress.lessons[l.id]?.passed);
        return (
          <section key={stage.id} className="mb-8">
            <div
              className={`rounded-2xl p-4 ${
                complete ? "bg-emerald-900" : stage.premium ? "bg-zinc-900" : "bg-sky-900"
              }`}
            >
              <div className="text-xs uppercase tracking-wide opacity-70">
                {stage.premium && "Premium"}
              </div>
              <div className="text-xl font-bold">{stage.title}</div>
              <div className="text-sm opacity-80">{stage.blurb}</div>
            </div>

            {stage.units.length === 0 ? (
              <div className="mt-3 text-center text-sm text-zinc-500">Coming soon</div>
            ) : (
              stage.units.map((unit) => {
                const unitDone = unit.lessons.every((l) => progress.lessons[l.id]?.passed);
                const unitOpen = isLessonUnlocked(unit.lessons[0].id, progress.lessons);
                return (
                  <div key={unit.id} className="mt-5">
                    <div className="mb-3 flex items-center gap-2 text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          unitDone ? "bg-emerald-500 text-zinc-950" : unitOpen ? "bg-sky-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        Day {unit.day}
                      </span>
                      <span className={unitOpen ? "text-zinc-200" : "text-zinc-500"}>{unit.title}</span>
                    </div>
                    <ol className="flex flex-col gap-2">
                      {unit.lessons.map((l) => {
                        const r = progress.lessons[l.id];
                        const unlocked = isLessonUnlocked(l.id, progress.lessons);
                        const generated = typeof l.exercises === "function";
                        let cls = "border-zinc-800 bg-zinc-900/60 text-zinc-500";
                        if (r?.passed) cls = "border-emerald-700 bg-emerald-950 text-zinc-100";
                        else if (unlocked) cls = "border-sky-600 bg-sky-950 text-zinc-100";
                        const node = (
                          <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${cls}`}>
                            <span className="w-6 text-center text-lg">
                              {r?.passed ? "✓" : l.checkpoint ? "🏁" : unlocked ? (generated ? "⟳" : "★") : "🔒"}
                            </span>
                            <span className="flex-1 text-sm">{l.title}</span>
                            <span className="text-xs text-zinc-500">{l.minutes ?? 4} min</span>
                          </div>
                        );
                        return <li key={l.id}>{unlocked ? <Link href={`/lesson/${l.id}`}>{node}</Link> : node}</li>;
                      })}
                    </ol>
                  </div>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}
