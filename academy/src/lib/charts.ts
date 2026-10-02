// One entry point for "give me the chart this exercise wants", daily or
// intraday, with whatever levels and overlays the spec asks for.

import { generateChart } from "./chart-gen";
import { generateIntraday } from "./intraday";
import { generateSwing } from "./swing";
import type { Box, Candle, ChartSpec, Level } from "./types";

export type Overlay = { label: string; color: string; points: { time: number; value: number }[] };

export type ResolvedChart = {
  candles: Candle[];
  levels: Level[];
  boxes: Box[];
  overlays: Overlay[];
  swingHighs: number[];
  swingLows: number[];
  intraday: boolean;
  reveal: number;
  expected: "long" | "short" | "skip";
};

// One colour per period so the 20 EMA / 50 SMA look the same on every chart.
const MA_COLOR: Record<number, string> = { 9: "#facc15", 20: "#facc15", 21: "#fb923c", 50: "#f472b6", 100: "#60a5fa", 200: "#a78bfa" };
const maColor = (n: number) => MA_COLOR[n] ?? "#9ca3af";

export function resolveChart(spec: ChartSpec): ResolvedChart {
  if (spec.scenario) {
    const g = generateIntraday(spec.seed, spec.scenario);
    return {
      candles: g.candles,
      levels: spec.showLevels === false ? [] : g.levels,
      boxes: spec.showLevels === false ? [] : g.boxes,
      overlays: [{ label: "VWAP", color: "#e5e7eb", points: g.vwap }],
      swingHighs: [],
      swingLows: [],
      intraday: true,
      reveal: g.reveal,
      expected: g.expected,
    };
  }
  if (spec.swing) {
    const g = generateSwing(spec.seed, spec.swing);
    return {
      candles: g.candles,
      levels: spec.showLevels === false ? [] : g.levels,
      boxes: [],
      overlays: [
        { label: "20 EMA", color: maColor(20), points: ema(g.candles, 20) },
        { label: "50 SMA", color: maColor(50), points: sma(g.candles, 50) },
      ],
      swingHighs: [],
      swingLows: [],
      intraday: false,
      reveal: g.reveal,
      expected: g.expected,
    };
  }
  const g = generateChart(spec);
  const overlays = [
    ...(spec.emas ?? []).map((n) => ({ label: `${n} EMA`, color: maColor(n), points: ema(g.candles, n) })),
    ...(spec.mas ?? []).map((n) => ({ label: `${n} ${spec.emas ? "SMA" : "MA"}`, color: maColor(n), points: sma(g.candles, n) })),
  ];
  return {
    candles: g.candles,
    levels: [],
    boxes: [],
    overlays,
    swingHighs: g.swingHighs,
    swingLows: g.swingLows,
    intraday: false,
    reveal: Math.round(g.candles.length * 0.66),
    expected: g.structure === "bull" ? "long" : g.structure === "bear" ? "short" : "skip",
  };
}

function ema(candles: Candle[], n: number) {
  const out: { time: number; value: number }[] = [];
  const k = 2 / (n + 1);
  let e = 0;
  for (let i = 0; i < candles.length; i++) {
    e = i === 0 ? candles[i].close : candles[i].close * k + e * (1 - k);
    if (i >= n - 1) out.push({ time: candles[i].time, value: e });
  }
  return out;
}

function sma(candles: Candle[], n: number) {
  const out: { time: number; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= n) sum -= candles[i - n].close;
    if (i >= n - 1) out.push({ time: candles[i].time, value: sum / n });
  }
  return out;
}
