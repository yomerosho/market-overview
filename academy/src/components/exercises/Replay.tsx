"use client";

import { useEffect, useMemo, useState } from "react";
import Candles from "@/components/Candles";
import Feedback from "./Feedback";
import { generateChart } from "@/lib/chart-gen";
import type { ReplayExercise, Structure } from "@/lib/types";

type Action = "long" | "short" | "skip";
const EXPECTED: Record<Structure, Action> = { bull: "long", bear: "short", range: "skip" };
const LABEL: Record<Action, string> = { long: "Go long", short: "Go short", skip: "Skip it" };

type Props = { ex: ReplayExercise; onAnswer: (correct: boolean) => void; onNext: () => void };

export default function Replay({ ex, onAnswer, onNext }: Props) {
  const gen = useMemo(() => generateChart(ex.chart), [ex.chart]);
  const [shown, setShown] = useState(ex.reveal);
  const [picked, setPicked] = useState<Action | null>(null);
  const expected = EXPECTED[ex.chart.structure];
  const correct = picked === expected;
  const finished = shown >= gen.candles.length;

  // Once the student commits, play the hidden bars forward one at a time.
  useEffect(() => {
    if (picked === null || finished) return;
    const t = setTimeout(() => setShown((n) => n + 1), 120);
    return () => clearTimeout(t);
  }, [picked, shown, finished]);

  const visible = useMemo(() => gen.candles.slice(0, shown), [gen, shown]);
  const entry = gen.candles[ex.reveal - 1].close;
  const last = visible[visible.length - 1].close;
  const move = ((last - entry) / entry) * 100;
  const pnl = picked === "long" ? move : picked === "short" ? -move : 0;

  return (
    <div className="flex flex-col gap-4 pb-40">
      <h2 className="text-lg font-semibold">{ex.prompt}</h2>
      <Candles
        candles={visible}
        levels={picked ? [{ label: "entry", price: entry, color: "#60a5fa" }] : undefined}
      />
      {picked === null ? (
        <div className="grid grid-cols-3 gap-2">
          {(["long", "short", "skip"] as Action[]).map((a) => (
            <button
              key={a}
              onClick={() => {
                setPicked(a);
                onAnswer(a === expected);
              }}
              className={`rounded-xl border-2 px-2 py-3 font-semibold ${
                a === "long"
                  ? "border-emerald-600 bg-emerald-950"
                  : a === "short"
                    ? "border-red-600 bg-red-950"
                    : "border-zinc-600 bg-zinc-900"
              }`}
            >
              {LABEL[a]}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center text-sm text-zinc-300">
          You chose <b>{LABEL[picked]}</b>.{" "}
          {picked === "skip" ? (
            <>Price moved {move >= 0 ? "+" : ""}{move.toFixed(1)}% after.</>
          ) : (
            <span className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(1)}%
            </span>
          )}
          {!finished && <span className="text-zinc-500"> · playing…</span>}
        </div>
      )}
      {picked !== null && finished && (
        <Feedback correct={correct} explain={ex.explain} onNext={onNext} />
      )}
    </div>
  );
}
