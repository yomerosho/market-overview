"use client";

import { useMemo } from "react";
import Candles, { type Marker } from "@/components/Candles";
import { generateChart } from "@/lib/chart-gen";
import type { ChartSpec, Level } from "@/lib/types";

/** Renders a generated chart from a spec. */
export default function ChartFor({
  spec,
  levels,
  markers,
  onTap,
}: {
  spec: ChartSpec;
  levels?: Level[];
  markers?: Marker[];
  onTap?: (i: number) => void;
}) {
  const chart = useMemo(() => generateChart(spec), [spec]);
  return <Candles candles={chart.candles} levels={levels} markers={markers} onTap={onTap} />;
}
