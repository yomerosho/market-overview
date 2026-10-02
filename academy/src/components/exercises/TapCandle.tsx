"use client";

import { useState } from "react";
import Feedback from "./Feedback";
import type { TapCandleExercise } from "@/lib/types";

type Part = TapCandleExercise["answer"];
type Props = { ex: TapCandleExercise; onAnswer: (correct: boolean) => void; onNext: () => void };

/** One big SVG candle with three tappable regions. */
export default function TapCandle({ ex, onAnswer, onNext }: Props) {
  const [picked, setPicked] = useState<Part | null>(null);
  const checked = picked !== null;
  const correct = picked === ex.answer;
  const color = ex.bullish ? "#22c55e" : "#ef4444";

  const fill = (part: Part) => {
    if (!checked) return "transparent";
    if (part === ex.answer) return "rgba(34,197,94,0.35)";
    if (part === picked) return "rgba(239,68,68,0.35)";
    return "transparent";
  };

  const pick = (p: Part) => {
    if (checked) return;
    setPicked(p);
    onAnswer(p === ex.answer);
  };

  return (
    <div className="flex flex-col gap-4 pb-40">
      <h2 className="text-lg font-semibold">{ex.prompt}</h2>
      <svg viewBox="0 0 200 320" className="mx-auto h-80 w-52">
        {/* labels */}
        <text x="150" y="34" fill="#9ca3af" fontSize="12">High</text>
        <text x="150" y={ex.bullish ? 110 : 94} fill="#9ca3af" fontSize="12">
          {ex.bullish ? "Close" : "Open"}
        </text>
        <text x="150" y={ex.bullish ? 236 : 220} fill="#9ca3af" fontSize="12">
          {ex.bullish ? "Open" : "Close"}
        </text>
        <text x="150" y="300" fill="#9ca3af" fontSize="12">Low</text>
        {/* wicks */}
        <line x1="100" y1="30" x2="100" y2="100" stroke={color} strokeWidth="4" />
        <line x1="100" y1="220" x2="100" y2="296" stroke={color} strokeWidth="4" />
        {/* body */}
        <rect x="70" y="100" width="60" height="120" fill={color} rx="3" />
        {/* hit regions (wide, so thumbs can hit the wicks) */}
        <rect x="55" y="20" width="90" height="80" fill={fill("upper-wick")} onClick={() => pick("upper-wick")} />
        <rect x="55" y="100" width="90" height="120" fill={fill("body")} onClick={() => pick("body")} />
        <rect x="55" y="220" width="90" height="86" fill={fill("lower-wick")} onClick={() => pick("lower-wick")} />
      </svg>
      {checked && <Feedback correct={correct} explain={ex.explain} onNext={onNext} />}
    </div>
  );
}
