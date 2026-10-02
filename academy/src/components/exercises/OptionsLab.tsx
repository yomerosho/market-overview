"use client";

import { useState } from "react";
import Feedback from "./Feedback";
import { moneyness, payoffAtExpiry, price } from "@/lib/options";
import type { LabGoal, OptionsLabExercise } from "@/lib/types";

const S = 100; // the stock is always at $100 in the lab
const IV = 0.3;

type Props = { ex: OptionsLabExercise; onAnswer: (correct: boolean) => void; onNext: () => void };

function meets(goal: LabGoal, side: "call" | "put", K: number, dte: number) {
  const { premium, delta } = price(side, S, K, dte, IV);
  switch (goal.metric) {
    case "delta":
      return Math.abs(delta) >= goal.min && Math.abs(delta) <= goal.max;
    case "moneyness":
      return moneyness(side, S, K) === goal.value;
    case "dte":
      return dte <= goal.max;
    case "premium":
      return premium <= goal.max;
  }
}

export default function OptionsLab({ ex, onAnswer, onNext }: Props) {
  const [K, setK] = useState(100);
  const [dte, setDte] = useState(30);
  const [checked, setChecked] = useState(false);
  const { premium, delta, theta } = price(ex.side, S, K, dte, IV);
  const correct = meets(ex.goal, ex.side, K, dte);
  const m = K === S ? "atm" : moneyness(ex.side, S, K);

  return (
    <div className="flex flex-col gap-4 pb-40">
      <h2 className="text-lg font-semibold">{ex.prompt}</h2>
      <div className="rounded-xl bg-zinc-900 p-4 text-sm">
        <div className="mb-3 flex justify-between text-zinc-400">
          <span>Stock: ${S.toFixed(2)}</span>
          <span>{ex.side === "call" ? "Call" : "Put"}</span>
        </div>
        <label className="block">
          <div className="flex justify-between">
            <span>Strike</span>
            <span className="font-mono">
              ${K} <span className={m === "itm" ? "text-emerald-400" : "text-zinc-500"}>{m.toUpperCase()}</span>
            </span>
          </div>
          <input type="range" min={80} max={120} step={1} value={K} disabled={checked} onChange={(e) => setK(+e.target.value)} className="w-full accent-emerald-500" />
        </label>
        <label className="mt-3 block">
          <div className="flex justify-between">
            <span>Days to expiry</span>
            <span className="font-mono">{dte === 0 ? "0 (0DTE)" : dte}</span>
          </div>
          <input type="range" min={0} max={90} step={1} value={dte} disabled={checked} onChange={(e) => setDte(+e.target.value)} className="w-full accent-emerald-500" />
        </label>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Premium" value={`$${premium.toFixed(2)}`} />
          <Stat label="Delta" value={delta.toFixed(2)} />
          <Stat label="Theta / day" value={`${theta.toFixed(2)}`} />
        </div>
      </div>
      <Payoff side={ex.side} K={K} paid={premium} />
      {!checked && (
        <button
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-2">
      <div className="font-mono text-base font-bold">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}

/** Profit/loss at expiry across stock prices, as a small SVG. */
function Payoff({ side, K, paid }: { side: "call" | "put"; K: number; paid: number }) {
  const W = 320, H = 120, pad = 8;
  const xs = Array.from({ length: 41 }, (_, i) => 80 + i);
  const ys = xs.map((s) => payoffAtExpiry(side, K, paid, s));
  const yMin = Math.min(...ys, -paid - 1), yMax = Math.max(...ys, 1);
  const x = (s: number) => pad + ((s - 80) / 40) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - yMin) / (yMax - yMin)) * (H - 2 * pad);
  const d = xs.map((s, i) => `${i ? "L" : "M"}${x(s).toFixed(1)},${y(ys[i]).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-zinc-900">
      <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke="#52525b" strokeDasharray="3 3" />
      <line x1={x(S)} x2={x(S)} y1={pad} y2={H - pad} stroke="#3f3f46" />
      <path d={d} fill="none" stroke="#22c55e" strokeWidth="2.5" />
      <text x={x(S) + 4} y={pad + 10} fill="#9ca3af" fontSize="10">stock now</text>
      <text x={pad} y={y(0) - 3} fill="#9ca3af" fontSize="10">break-even line · P&L at expiry</text>
    </svg>
  );
}
