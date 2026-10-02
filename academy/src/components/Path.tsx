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
                Stage {stage.number}
                {stage.premium && " · Premium"}
              </div>
              <div className="text-xl font-bold">{stage.title}</div>
              <div className="text-sm opacity-80">{stage.blurb}</div>
            </div>

            {lessons.length === 0 ? (
              <div className="mt-3 text-center text-sm text-zinc-500">Coming soon</div>
            ) : (
              <ol className="mt-4 flex flex-col items-center gap-4">
                {lessons.map((l, idx) => {
                  const r = progress.lessons[l.id];
                  const unlocked = isLessonUnlocked(l.id, progress.lessons);
                  const offset = ["", "translate-x-10", "translate-x-16", "translate-x-10", "", "-translate-x-10", "-translate-x-16", "-translate-x-10"][idx % 8];
                  let cls = "bg-zinc-800 text-zinc-500";
                  if (r?.passed) cls = "bg-emerald-500 text-zinc-950";
                  else if (unlocked) cls = "bg-sky-500 text-zinc-950 ring-4 ring-sky-500/30";
                  const node = (
                    <div className={`flex flex-col items-center gap-1 ${offset}`}>
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold shadow-lg ${cls}`}
                      >
                        {r?.passed ? "✓" : l.checkpoint ? "🏁" : unlocked ? "★" : "🔒"}
                      </div>
                      <div className="max-w-40 text-center text-xs text-zinc-300">{l.title}</div>
                    </div>
                  );
                  return (
                    <li key={l.id}>
                      {unlocked ? <Link href={`/lesson/${l.id}`}>{node}</Link> : node}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
