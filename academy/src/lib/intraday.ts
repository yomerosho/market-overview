// Synthetic 5-minute session charts for the 0DTE drills: premarket, the
// open, a 15-minute opening range, and a scripted outcome. Times are
// written as if the chart's clock were Central time.

import type { Box, Candle, IntradayScenario, Level } from "./types";

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

export const PREMARKET_BARS = 18; // 08:00 .. 09:25
const SESSION_BARS = 13; // 09:30 .. 10:30
const ORB_BARS = 3; // 09:30, 09:35, 09:40
const BAR = 300;
const DAY_START = Date.UTC(2024, 0, 3, 8, 0) / 1000; // "08:00"

export type IntradayChart = {
  candles: Candle[];
  levels: Level[];
  boxes: Box[];
  /** Session VWAP from the open, one point per session bar. */
  vwap: { time: number; value: number }[];
  /** Bars revealed before the student decides. */
  reveal: number;
  expected: "long" | "short" | "skip";
};

export function generateIntraday(seed: number, scenario: IntradayScenario): IntradayChart {
  const rnd = mulberry32(seed);
  // A reversal starts life as a failed break in the opposite direction.
  const reversal = scenario.startsWith("reversal");
  const up = scenario.endsWith("-up") || scenario === "reversal-short";
  const dir = up ? 1 : -1;

  // Yesterday's range frames the day. Premarket drifts inside it.
  const pdh = 104 + rnd() * 2;
  const pdl = 96 - rnd() * 2;
  const closes: number[] = [];
  const vols: number[] = [];
  let price = 100 + (rnd() - 0.5) * 2;
  for (let i = 0; i < PREMARKET_BARS; i++) {
    price += (rnd() - 0.5) * 0.5;
    price = Math.min(pdh - 0.8, Math.max(pdl + 0.8, price));
    closes.push(price);
    vols.push(80 + rnd() * 60);
  }
  const pmh = Math.max(...closes) + 0.3;
  const pml = Math.min(...closes) - 0.3;

  // Scripted session, as a list of [target close, volume] per bar.
  const steps: [number, number][] = [];
  const openDrive = scenario.startsWith("open-drive");
  const cont = scenario.startsWith("continuation");
  const failed = scenario.startsWith("failed") || reversal;
  const beyondPm = up ? pmh + 0.6 : pml - 0.6;
  const insidePm = up ? pmh - 0.8 : pml + 0.8;
  const pd = up ? pdh : pdl;

  if (openDrive) {
    // First candle already closes through the premarket level, then runs.
    steps.push([beyondPm + dir * 0.3, 900]);
    for (let i = 1; i < SESSION_BARS; i++) {
      const t = i / (SESSION_BARS - 1);
      steps.push([beyondPm + (pd - beyondPm) * Math.min(1, t * 1.3) - dir * 0.15, 500 - i * 25]);
    }
  } else if (scenario === "chop") {
    for (let i = 0; i < SESSION_BARS; i++) steps.push([price + (rnd() - 0.5) * 1.2, 300 - i * 10]);
  } else {
    // ORB: three bars that stay inside the premarket range. Tall enough that
    // "the other side of the box" is a real target for the reversal trade.
    for (let i = 0; i < ORB_BARS; i++) steps.push([insidePm + (i === 1 ? -dir : dir) * (0.4 + rnd() * 0.4), 600 - i * 80]);
    if (cont) {
      // Break the ORB and close beyond PMH/PML on real volume, then continue.
      steps.push([beyondPm, 800]);
      steps.push([beyondPm + dir * 0.4, 700]);
      for (let i = ORB_BARS + 2; i < SESSION_BARS; i++) {
        const t = (i - ORB_BARS - 1) / (SESSION_BARS - ORB_BARS - 2);
        steps.push([beyondPm + (pd - beyondPm) * t - dir * 0.2, 450 - i * 15]);
      }
    } else if (failed) {
      // Poke through on thin volume, close back inside, then reverse. In the
      // reversal scenario the bar after the poke is a full engulfing candle
      // on volume; the trade runs to the far side of the opening range.
      const pokeClose = insidePm + dir * 1.0; // just past the box edge
      const engulfClose = insidePm - dir * 0.2; // back inside, swallowing the poke body
      steps.push([pokeClose, 180]);
      steps.push([reversal ? engulfClose : insidePm + dir * 0.5, reversal ? 650 : 160]);
      const farSide = insidePm - dir * 1.1; // the other side of the box, and a bit through
      for (let i = ORB_BARS + 2; i < SESSION_BARS; i++) {
        const t = (i - ORB_BARS - 1) / (SESSION_BARS - ORB_BARS - 2);
        const from = reversal ? engulfClose : insidePm + dir * 0.5;
        steps.push([from + (farSide - from) * Math.min(1, t * 1.4) + (rnd() - 0.5) * 0.15, 300 + i * 10]);
      }
    }
  }

  // Build candles. Wicks: the failed scenario's poke bar gets a long wick
  // through the level so it *looks* like a breakout at first.
  const candles: Candle[] = [];
  const all = [...closes.map((c, i) => [c, vols[i]] as [number, number]), ...steps];
  for (let i = 0; i < all.length; i++) {
    const [close, vol] = all[i];
    const open = i === 0 ? close - 0.1 : candles[i - 1].close;
    let hi = Math.max(open, close) + rnd() * 0.25;
    let lo = Math.min(open, close) - rnd() * 0.25;
    if (failed && i === PREMARKET_BARS + ORB_BARS) {
      if (up) hi = Math.max(hi, pmh + 0.3);
      else lo = Math.min(lo, pml - 0.3);
    }
    candles.push({
      time: DAY_START + i * BAR,
      open: r(open),
      high: r(hi),
      low: r(lo),
      close: r(close),
      volume: Math.round(vol * (0.85 + rnd() * 0.3)),
    });
  }

  // Same colours as the author's own chart: yellow dashed yesterday's range,
  // blue dashed premarket range, a translucent box for the opening range.
  const orb = candles.slice(PREMARKET_BARS, PREMARKET_BARS + ORB_BARS);
  const levels: Level[] = [
    { label: "PDH", price: r(pdh), color: "#eab308", style: "dashed" },
    { label: "PDL", price: r(pdl), color: "#eab308", style: "dashed" },
    { label: "PMH", price: r(pmh), color: "#3b82f6", style: "dashed" },
    { label: "PML", price: r(pml), color: "#3b82f6", style: "dashed" },
  ];
  const boxes: Box[] = openDrive
    ? []
    : [
        {
          from: PREMARKET_BARS,
          to: PREMARKET_BARS + ORB_BARS - 1,
          top: Math.max(...orb.map((c) => c.high)),
          bottom: Math.min(...orb.map((c) => c.low)),
          color: "#22c55e",
          label: "ORB",
        },
      ];

  const vwap: { time: number; value: number }[] = [];
  let pv = 0;
  let v = 0;
  for (let i = PREMARKET_BARS; i < candles.length; i++) {
    const c = candles[i];
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * (c.volume ?? 1);
    v += c.volume ?? 1;
    vwap.push({ time: c.time, value: r(pv / v) });
  }

  const expected = openDrive || cont ? (up ? "long" : "short") : reversal ? (up ? "short" : "long") : "skip";
  // Decide after the first candle (open drive), after the engulfing candle
  // (reversal), or after the first 5-min close following the ORB.
  const reveal = PREMARKET_BARS + (openDrive ? 1 : reversal ? ORB_BARS + 2 : ORB_BARS + 1);
  return { candles, levels, boxes, vwap, reveal, expected };
}

function r(n: number) {
  return Math.round(n * 100) / 100;
}
