"use client";

import { useMemo } from "react";
import ChartFor from "./ChartFor";
import { resolveChart } from "@/lib/charts";
import type { TeachExercise } from "@/lib/types";

export default function Teach({ ex, onDone }: { ex: TeachExercise; onDone: () => void }) {
  // The swings lesson wants its example chart annotated.
  const markers = useMemo(() => {
    if (!ex.chart || ex.tag !== "trend") return undefined;
    const g = resolveChart(ex.chart);
    return g.swingLows.map((index) => ({ index, kind: "low" as const, color: "#60a5fa" }));
  }, [ex]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{ex.title}</h2>
      {ex.chart && <ChartFor spec={ex.chart} levels={ex.levels} markers={markers} />}
      {ex.body.map((p, i) => (
        <p key={i} className="text-base leading-relaxed text-zinc-200">
          {p}
        </p>
      ))}
      <button onClick={onDone} className="btn-primary mt-2">
        Got it
      </button>
    </div>
  );
}
