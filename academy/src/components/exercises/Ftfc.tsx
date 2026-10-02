"use client";

import { useState } from "react";
import Feedback from "./Feedback";
import type { FtfcExercise } from "@/lib/types";

/** The FTFC panel from the author's chart: five timeframes, an arrow each. */
export function FtfcPanel({ frames }: { frames: FtfcExercise["frames"] }) {
  const ups = frames.filter((f) => f.up).length;
  const agree = Math.max(ups, frames.length - ups);
  return (
    <div className="mx-auto w-40 rounded-lg border border-zinc-700 bg-zinc-900 text-sm">
      <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-1.5">
        <span className="font-semibold">FTFC</span>
        <span className={`rounded px-1.5 text-xs font-bold ${agree === 5 ? "bg-emerald-700" : "bg-red-800"}`}>
          {agree}/5
        </span>
      </div>
      {frames.map((f) => (
        <div key={f.tf} className="flex items-center justify-between px-3 py-1.5">
          <span className="font-mono text-zinc-300">{f.tf}</span>
          <span className={f.up ? "text-emerald-400" : "text-red-400"}>{f.up ? "▲" : "▼"}</span>
        </div>
      ))}
    </div>
  );
}

type Props = { ex: FtfcExercise; onAnswer: (correct: boolean) => void; onNext: () => void };

export default function Ftfc({ ex, onAnswer, onNext }: Props) {
  const ups = ex.frames.filter((f) => f.up).length;
  const choices =
    ex.ask === "bias"
      ? ["Full continuity, bullish", "Full continuity, bearish", "Partial: be careful, safer targets"]
      : ["5/5", "4/5", "3/5", "2/5 or worse"];
  const answer =
    ex.ask === "bias"
      ? ups === 5 ? 0 : ups === 0 ? 1 : 2
      : (() => {
          const weekly = ex.frames.find((f) => f.tf === "1W")?.up;
          const agree = ex.frames.filter((f) => f.up === weekly).length;
          return agree >= 5 ? 0 : agree === 4 ? 1 : agree === 3 ? 2 : 3;
        })();

  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = picked === answer;

  return (
    <div className="flex flex-col gap-4 pb-40">
      <h2 className="text-lg font-semibold">{ex.prompt}</h2>
      <FtfcPanel frames={ex.frames} />
      <div className="flex flex-col gap-2">
        {choices.map((c, i) => {
          let cls = "border-zinc-700 bg-zinc-900";
          if (checked && i === answer) cls = "border-emerald-500 bg-emerald-950";
          else if (checked && i === picked) cls = "border-red-500 bg-red-950";
          else if (picked === i) cls = "border-sky-500 bg-sky-950";
          return (
            <button key={i} disabled={checked} onClick={() => setPicked(i)} className={`rounded-xl border-2 px-4 py-3 text-left ${cls}`}>
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
