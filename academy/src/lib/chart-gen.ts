// Deterministic synthetic price charts with a known structure, so every
// drill has a known answer and students can't look up "what happened next".

import type { Candle, ChartSpec, Structure } from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type GeneratedChart = {
  candles: Candle[];
  structure: Structure;
  swingHighs: number[]; // candle indices
  swingLows: number[];
};

const DAY = 86400;
const BASE_TIME = Date.UTC(2024, 0, 1) / 1000;

/**
 * Build the chart as a series of legs. A bull trend alternates an up-leg with
 * a smaller pullback, so each turn is a higher high or a higher low. A bear
 * trend is the mirror. A range alternates between roughly the same two levels.
 */
export function generateChart(spec: ChartSpec): GeneratedChart {
  const rnd = mulberry32(spec.seed);
  const bars = spec.bars ?? 60;
  const { structure } = spec;

  // Each leg: a target price and a bar count. Record turn indices as we go.
  const path: number[] = [];
  const turns: { index: number; kind: "high" | "low" }[] = [];
  let price = 100;
  let up = structure !== "bear"; // first leg direction
  if (structure === "range" && rnd() < 0.5) up = false;
  const rangeTop = 106;
  const rangeBot = 94;

  while (path.length < bars) {
    const len = 4 + Math.floor(rnd() * 5); // 4..8 bars per leg
    let target: number;
    if (structure === "range") {
      target = up ? rangeTop + (rnd() - 0.5) * 1.5 : rangeBot + (rnd() - 0.5) * 1.5;
    } else {
      const impulse = 6 + rnd() * 5; // 6..11
      const pullback = impulse * (0.35 + rnd() * 0.3); // 35%..65% retrace
      const withTrend = structure === "bull" ? up : !up;
      const size = withTrend ? impulse : pullback;
      target = price + (up ? size : -size);
    }
    const start = price;
    for (let i = 1; i <= len && path.length < bars; i++) {
      // ease toward target with a little wobble
      const t = i / len;
      const eased = t * t * (3 - 2 * t);
      path.push(start + (target - start) * eased + (rnd() - 0.5) * 0.8);
    }
    price = target;
    if (path.length < bars) {
      turns.push({ index: path.length - 1, kind: up ? "high" : "low" });
    }
    up = !up;
  }

  // Candles from the path: open near previous close, close on the path,
  // wicks a little beyond.
  const candles: Candle[] = [];
  for (let i = 0; i < path.length; i++) {
    const close = path[i];
    const open = i === 0 ? close - 0.3 : candles[i - 1].close + (rnd() - 0.5) * 0.4;
    const hi = Math.max(open, close) + rnd() * 0.9;
    const lo = Math.min(open, close) - rnd() * 0.9;
    candles.push({
      time: BASE_TIME + i * DAY,
      open: round(open),
      high: round(hi),
      low: round(lo),
      close: round(close),
    });
  }

  // Noise can shift the true extreme a bar or two from the intended turn,
  // so snap each turn to the actual extreme in a small window.
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  for (const turn of turns) {
    const lo = Math.max(0, turn.index - 2);
    const hi = Math.min(candles.length - 1, turn.index + 2);
    let best = turn.index;
    for (let i = lo; i <= hi; i++) {
      if (turn.kind === "high" && candles[i].high > candles[best].high) best = i;
      if (turn.kind === "low" && candles[i].low < candles[best].low) best = i;
    }
    (turn.kind === "high" ? swingHighs : swingLows).push(best);
  }

  return { candles, structure, swingHighs, swingLows };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
