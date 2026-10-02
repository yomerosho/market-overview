// Synthetic daily charts for the swing-setup drills, scripted from the
// author's setup library: breakout + retest, 20 EMA pullback, bull flag,
// 50 SMA reclaim, the failed breakout, and the range that should be left
// alone. Each one comes with its levels, a decision bar and the answer.

import type { Candle, Level, SwingScenario } from "./types";

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

const DAY = 86400;
const START = Date.UTC(2024, 0, 1) / 1000;

export type SwingChart = {
  candles: Candle[];
  levels: Level[];
  reveal: number;
  expected: "long" | "short" | "skip";
};

type Step = [close: number, vol: number];

export function generateSwing(seed: number, scenario: SwingScenario): SwingChart {
  const rnd = mulberry32(seed);
  const n = (a: number, b: number) => a + rnd() * (b - a);
  const steps: Step[] = [];
  const levels: Level[] = [];
  let reveal = 0;
  let expected: SwingChart["expected"] = "skip";

  // helpers
  const base = 100;
  const avgVol = 100;
  const trend = (from: number, to: number, bars: number, vol = avgVol, wobble = 0.6) => {
    for (let i = 1; i <= bars; i++) {
      const t = i / bars;
      steps.push([from + (to - from) * t + n(-wobble, wobble), vol * n(0.7, 1.3)]);
    }
  };
  // a trend made of legs so it has real higher highs / higher lows
  const legged = (from: number, to: number, legs: number, barsPerLeg: number, vol = avgVol) => {
    let p = from;
    const total = to - from;
    for (let l = 0; l < legs; l++) {
      const up = p + (total / legs) * 1.5;
      trend(p, up, barsPerLeg, vol);
      const back = up - (total / legs) * 0.5;
      trend(up, back, Math.max(2, Math.floor(barsPerLeg / 2)), vol * 0.8);
      p = back;
    }
  };
  const range = (lo: number, hi: number, bars: number, vol = avgVol) => {
    let up = rnd() < 0.5;
    while (bars > 0) {
      const len = Math.min(bars, 4 + Math.floor(rnd() * 4));
      const target = up ? hi + n(-0.4, 0.3) : lo + n(-0.3, 0.4);
      const from = steps.length ? steps[steps.length - 1][0] : (lo + hi) / 2;
      trend(from, target, len, vol * 0.9, 0.3);
      bars -= len;
      up = !up;
    }
  };
  const last = () => steps[steps.length - 1][0];

  // Every chart starts with a quiet lead-in so the 50 SMA exists by the
  // time the setup forms.
  range(base - 5, base - 1, 18, avgVol * 0.8);

  switch (scenario) {
    case "breakout-retest":
    case "failed-breakout": {
      const R = base + 5;
      range(base - 4, R, 36);
      levels.push({ label: "Resistance", price: R, color: "#ef4444", style: "solid" });
      steps.push([R + 2.2, avgVol * 2.4]); // breakout close on volume
      if (scenario === "breakout-retest") {
        trend(R + 2.2, R + 0.4, 5, avgVol * 0.6, 0.3); // retest, selling volume contracts
        steps.push([R + 1.8, avgVol * 1.3]); // bullish retest candle
        reveal = steps.length;
        expected = "long";
        trend(R + 1.8, R + 9, 14, avgVol * 1.1);
      } else {
        steps.push([R - 1.8, avgVol * 2.0]); // large reversal candle back through the level
        reveal = steps.length;
        expected = "skip";
        trend(R - 1.8, base - 2, 14, avgVol);
      }
      break;
    }
    case "ema-pullback": {
      legged(last(), base + 22, 4, 7);
      const hi = last();
      trend(hi, hi - 4.5, 6, avgVol * 0.55, 0.3); // pullback on declining volume, lands near the 20 EMA
      steps.push([hi - 2.6, avgVol * 1.4]); // bullish reversal candle, closes near its high
      reveal = steps.length;
      expected = "long";
      trend(hi - 2.6, hi + 7, 14, avgVol * 1.1);
      break;
    }
    case "bull-flag": {
      range(base - 3, base + 2, 14);
      const from = last();
      trend(from, from + 12, 6, avgVol * 2.0, 0.4); // impulse on volume
      const top = last();
      levels.push({ label: "Flag top", price: top + 0.6, color: "#38bdf8", style: "dashed" });
      // tight consolidation, higher lows, declining volume
      let p = top;
      for (let i = 0; i < 8; i++) {
        p = top - 2.2 + i * 0.22 + n(-0.5, 0.5);
        steps.push([p, avgVol * (0.9 - i * 0.07)]);
      }
      steps.push([top + 1.8, avgVol * 1.9]); // breakout, strong close
      reveal = steps.length;
      expected = "long";
      trend(top + 1.8, top + 10, 14, avgVol * 1.1);
      break;
    }
    case "sma50-reclaim": {
      trend(last(), base + 14, 10, avgVol); // a run-up to fall from
      trend(base + 14, base - 8, 26, avgVol * 1.1); // the downtrend
      range(base - 10, base - 6, 20, avgVol * 0.7); // the base
      const b = last();
      steps.push([b + 4.5, avgVol * 1.9]); // reclaim bar through the 50 SMA on volume
      trend(b + 4.5, b + 2.4, 4, avgVol * 0.6, 0.3); // pullback, holds
      steps.push([b + 5.4, avgVol * 1.5]); // higher low confirmed, short-term resistance broken
      reveal = steps.length;
      expected = "long";
      trend(b + 5.4, b + 14, 14, avgVol * 1.1);
      break;
    }
    case "range": {
      range(base - 3.5, base + 3.5, 44, avgVol * 0.8);
      levels.push(
        { label: "Resistance", price: base + 3.5, color: "#ef4444", style: "solid" },
        { label: "Support", price: base - 3.5, color: "#22c55e", style: "solid" },
      );
      reveal = steps.length;
      expected = "skip";
      range(base - 3.5, base + 3.5, 14, avgVol * 0.8);
      break;
    }
  }

  const candles: Candle[] = [];
  for (let i = 0; i < steps.length; i++) {
    const [close, vol] = steps[i];
    const open = i === 0 ? close - 0.3 : candles[i - 1].close + n(-0.2, 0.2);
    let hi = Math.max(open, close) + rnd() * 0.7;
    let lo = Math.min(open, close) - rnd() * 0.7;
    // the reversal / confirmation candle closes near its high (or low)
    if (i === reveal - 1 && expected === "long") hi = Math.max(open, close) + 0.1;
    if (i === reveal - 1 && expected === "skip" && scenario === "failed-breakout") lo = Math.min(open, close) - 0.1;
    candles.push({ time: START + i * DAY, open: r(open), high: r(hi), low: r(lo), close: r(close), volume: Math.round(vol) });
  }
  return { candles, levels, reveal, expected };
}

function r(x: number) {
  return Math.round(x * 100) / 100;
}
