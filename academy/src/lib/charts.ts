// One entry point for "give me the chart this exercise wants", daily or
// intraday, with whatever levels and overlays the spec asks for.

import { generateChart } from "./chart-gen";
import { generateIntraday } from "./intraday";
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

const MA_COLORS = ["#facc15", "#fb923c", "#f472b6", "#60a5fa", "#a78bfa"];

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
  const g = generateChart(spec);
  const overlays = (spec.mas ?? []).map((n, i) => ({
    label: `${n} MA`,
    color: MA_COLORS[i % MA_COLORS.length],
    points: sma(g.candles, n),
  }));
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
