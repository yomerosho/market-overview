// Synthetic 5-minute session charts for the 0DTE drills: premarket, the
// open, a 15-minute opening range, and a scripted outcome. Times are
// written as if the chart's clock were Central time.

import type { Candle, IntradayScenario, Level } from "./types";

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
  /** Bars revealed before the student decides. */
  reveal: number;
  expected: "long" | "short" | "skip";
};

export function generateIntraday(seed: number, scenario: IntradayScenario): IntradayChart {
  const rnd = mulberry32(seed);
  const up = scenario.endsWith("-up");
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
  const failed = scenario.startsWith("failed");
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
    // ORB: three bars that stay inside the premarket range.
    for (let i = 0; i < ORB_BARS; i++) steps.push([insidePm + (rnd() - 0.5) * 0.8, 600 - i * 80]);
    if (cont) {
      // Break the ORB and close beyond PMH/PML on real volume, then continue.
      steps.push([beyondPm, 800]);
      steps.push([beyondPm + dir * 0.4, 700]);
      for (let i = ORB_BARS + 2; i < SESSION_BARS; i++) {
        const t = (i - ORB_BARS - 1) / (SESSION_BARS - ORB_BARS - 2);
        steps.push([beyondPm + (pd - beyondPm) * t - dir * 0.2, 450 - i * 15]);
      }
    } else if (failed) {
      // Poke through on thin volume, close back inside, then reverse.
      steps.push([insidePm + dir * 0.5, 180]);
      steps.push([insidePm - dir * 0.3, 160]);
      for (let i = ORB_BARS + 2; i < SESSION_BARS; i++) {
        const t = (i - ORB_BARS - 1) / (SESSION_BARS - ORB_BARS - 2);
        const opposite = up ? pml : pmh;
        steps.push([insidePm + (opposite - insidePm) * t, 300 + i * 10]);
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
      if (up) hi = pmh + 0.5;
      else lo = pml - 0.5;
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

  const orb = candles.slice(PREMARKET_BARS, PREMARKET_BARS + ORB_BARS);
  const levels: Level[] = [
    { label: "PDH", price: r(pdh), color: "#a855f7" },
    { label: "PDL", price: r(pdl), color: "#a855f7" },
    { label: "PMH", price: r(pmh), color: "#f59e0b" },
    { label: "PML", price: r(pml), color: "#f59e0b" },
  ];
  if (!openDrive) {
    levels.push(
      { label: "ORB high", price: Math.max(...orb.map((c) => c.high)), color: "#38bdf8" },
      { label: "ORB low", price: Math.min(...orb.map((c) => c.low)), color: "#38bdf8" },
    );
  }

  const expected = openDrive || cont ? (up ? "long" : "short") : "skip";
  // Decide after the first candle (open drive) or after the first 5-min
  // close following the ORB (everything else).
  const reveal = PREMARKET_BARS + (openDrive ? 1 : ORB_BARS + 1);
  return { candles, levels, reveal, expected };
}

function r(n: number) {
  return Math.round(n * 100) / 100;
}
