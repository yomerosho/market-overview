"use client";

import { useMemo } from "react";
import Candles, { type Marker } from "@/components/Candles";
import { resolveChart } from "@/lib/charts";
import type { ChartSpec, Level } from "@/lib/types";

/** Renders whatever chart a spec describes, daily or intraday. */
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
  const chart = useMemo(() => resolveChart(spec), [spec]);
  const allLevels = useMemo(() => [...chart.levels, ...(levels ?? [])], [chart.levels, levels]);
  return (
    <Candles
      candles={chart.candles}
      levels={allLevels}
      overlays={chart.overlays}
      boxes={chart.boxes}
      intraday={chart.intraday}
      markers={markers}
      onTap={onTap}
    />
  );
}
