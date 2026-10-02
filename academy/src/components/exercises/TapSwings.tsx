"use client";

import { useMemo, useState } from "react";
import ChartFor from "./ChartFor";
import Feedback from "./Feedback";
import { generateChart } from "@/lib/chart-gen";
import type { TapSwingsExercise } from "@/lib/types";
import type { Marker } from "@/components/Candles";

const TOLERANCE = 2; // taps within two bars of the true swing count (thumbs are wide)

type Props = { ex: TapSwingsExercise; onAnswer: (correct: boolean) => void; onNext: () => void };

export default function TapSwings({ ex, onAnswer, onNext }: Props) {
  const gen = useMemo(() => generateChart(ex.chart), [ex.chart]);
  const answers = ex.target === "highs" ? gen.swingHighs : gen.swingLows;
  const kind: "high" | "low" = ex.target === "highs" ? "high" : "low";

  const [taps, setTaps] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);

  const toggle = (i: number) => {
    if (checked) return;
    setTaps((t) => (t.includes(i) ? t.filter((x) => x !== i) : [...t, i]));
  };

  const near = (i: number, set: number[]) => set.some((a) => Math.abs(a - i) <= TOLERANCE);
  const hits = answers.filter((a) => near(a, taps));
  const misses = answers.filter((a) => !near(a, taps));
  const extras = taps.filter((t) => !near(t, answers));
  const correct = checked && misses.length === 0 && extras.length === 0;

  const markers: Marker[] = checked
    ? [
        ...hits.map((index) => ({ index, kind, color: "#22c55e" })),
        ...misses.map((index) => ({ index, kind, color: "#eab308", text: "missed" })),
        ...extras.map((index) => ({ index, kind, color: "#ef4444", text: "x" })),
      ]
    : taps.map((index) => ({ index, kind, color: "#60a5fa" }));

  return (
    <div className="flex flex-col gap-4 pb-40">
      <h2 className="text-lg font-semibold">{ex.prompt}</h2>
      <p className="text-sm text-zinc-400">Tap a candle to mark it. Tap again to unmark.</p>
      <ChartFor spec={ex.chart} markers={markers} onTap={toggle} />
      <div className="text-sm text-zinc-400">
        {taps.length} marked{checked ? ` · ${hits.length}/${answers.length} found` : ""}
      </div>
      {!checked && (
        <button
          disabled={taps.length === 0}
          onClick={() => {
            setChecked(true);
            onAnswer(misses.length === 0 && extras.length === 0);
          }}
          className="btn-primary"
        >
          Check
        </button>
      )}
      {checked && (
        <Feedback
          correct={correct}
          explain={
            correct
              ? ex.explain
              : `${ex.explain} Yellow = one you missed, red = not a swing ${kind}.`
          }
          onNext={onNext}
        />
      )}
    </div>
  );
}
