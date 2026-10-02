"use client";

import { useState } from "react";
import ChartFor from "./ChartFor";
import Feedback from "./Feedback";
import type { ChoiceExercise } from "@/lib/types";

type Props = { ex: ChoiceExercise; onAnswer: (correct: boolean) => void; onNext: () => void };

export default function Choice({ ex, onAnswer, onNext }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = picked === ex.answer;

  return (
    <div className="flex flex-col gap-4 pb-40">
      <h2 className="text-lg font-semibold">{ex.prompt}</h2>
      {ex.chart && <ChartFor spec={ex.chart} levels={ex.levels} />}
      <div className="flex flex-col gap-2">
        {ex.choices.map((c, i) => {
          let cls = "border-zinc-700 bg-zinc-900";
          if (checked && i === ex.answer) cls = "border-emerald-500 bg-emerald-950";
          else if (checked && i === picked) cls = "border-red-500 bg-red-950";
          else if (picked === i) cls = "border-sky-500 bg-sky-950";
          return (
            <button
              key={i}
              disabled={checked}
              onClick={() => setPicked(i)}
              className={`rounded-xl border-2 px-4 py-3 text-left text-base transition ${cls}`}
            >
              {c}
            </button>
          );
        })}
      </div>
      {!checked && (
        <button
          disabled={picked === null}
          onClick={() => {
            setChecked(true);
            onAnswer(correct);
          }}
          className="btn-primary"
        >
          Check
        </button>
      )}
      {checked && <Feedback correct={correct} explain={ex.explain} onNext={onNext} />}
    </div>
  );
}
