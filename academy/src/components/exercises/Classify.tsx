"use client";

import { useState } from "react";
import ChartFor from "./ChartFor";
import Feedback from "./Feedback";
import type { ClassifyExercise, Structure } from "@/lib/types";

const OPTIONS: { value: Structure; label: string; hint: string }[] = [
  { value: "bull", label: "Bull trend", hint: "Higher highs, higher lows" },
  { value: "bear", label: "Bear trend", hint: "Lower highs, lower lows" },
  { value: "range", label: "No trend", hint: "Be careful" },
];

type Props = { ex: ClassifyExercise; onAnswer: (correct: boolean) => void; onNext: () => void };

export default function Classify({ ex, onAnswer, onNext }: Props) {
  const [picked, setPicked] = useState<Structure | null>(null);
  const checked = picked !== null;
  const correct = picked === ex.chart.structure;

  return (
    <div className="flex flex-col gap-4 pb-40">
      <h2 className="text-lg font-semibold">{ex.prompt}</h2>
      <ChartFor spec={ex.chart} />
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          let cls = "border-zinc-700 bg-zinc-900";
          if (checked && o.value === ex.chart.structure) cls = "border-emerald-500 bg-emerald-950";
          else if (checked && o.value === picked) cls = "border-red-500 bg-red-950";
          return (
            <button
              key={o.value}
              disabled={checked}
              onClick={() => {
                setPicked(o.value);
                onAnswer(o.value === ex.chart.structure);
              }}
              className={`rounded-xl border-2 px-2 py-3 text-center transition ${cls}`}
            >
              <div className="font-semibold">{o.label}</div>
              <div className="text-xs text-zinc-400">{o.hint}</div>
            </button>
          );
        })}
      </div>
      {checked && <Feedback correct={correct} explain={ex.explain} onNext={onNext} />}
    </div>
  );
}
