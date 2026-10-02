"use client";

// Candlestick chart wrapper around TradingView Lightweight Charts.
// Handles tap-to-select on candles, swing markers, horizontal levels,
// line overlays (moving averages) and a volume histogram.

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { Overlay } from "@/lib/charts";
import type { Candle, Level } from "@/lib/types";

export type Marker = { index: number; kind: "high" | "low"; color: string; text?: string };

type Props = {
  candles: Candle[];
  levels?: Level[];
  markers?: Marker[];
  overlays?: Overlay[];
  /** Show clock times on the axis (intraday) instead of dates. */
  intraday?: boolean;
  onTap?: (index: number) => void;
  height?: number;
};

export default function Candles({
  candles,
  levels,
  markers,
  overlays,
  intraday = false,
  onTap,
  height = 260,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);
  const overlayRef = useRef<ISeriesApi<"Line">[]>([]);
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        attributionLogo: true,
      },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      rightPriceScale: { borderColor: "#374151", scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: {
        borderColor: "#374151",
        timeVisible: intraday,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
      crosshair: { mode: CrosshairMode.Hidden },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);

    chartRef.current = chart;
    seriesRef.current = series;
    volumeRef.current = volume;
    markersRef.current = createSeriesMarkers(series, []);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
      markersRef.current = null;
      linesRef.current = [];
      overlayRef.current = [];
    };
  }, [height, intraday]);

  // Data, levels and overlays update in place; recreating the chart per bar
  // (the replay drill adds one every 120ms) is slow and flickers.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    const volume = volumeRef.current;
    if (!series || !chart || !volume) return;

    series.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    volume.setData(
      candles
        .filter((c) => c.volume != null)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume as number,
          color: c.close >= c.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
        })),
    );

    for (const line of linesRef.current) series.removePriceLine(line);
    linesRef.current = (levels ?? []).map((lv) =>
      series.createPriceLine({
        price: lv.price,
        color: lv.color ?? "#eab308",
        lineWidth: 2,
        lineStyle: 2,
        title: lv.label,
        axisLabelVisible: true,
      }),
    );

    for (const s of overlayRef.current) chart.removeSeries(s);
    overlayRef.current = (overlays ?? []).map((o) => {
      const s = chart.addSeries(LineSeries, {
        color: o.color,
        lineWidth: 2,
        lastValueVisible: true,
        priceLineVisible: false,
        title: o.label,
      });
      s.setData(o.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      return s;
    });

    chart.timeScale().fitContent();
  }, [candles, levels, overlays]);

  useEffect(() => {
    const plugin = markersRef.current;
    if (!plugin) return;
    const ms: SeriesMarker<Time>[] = (markers ?? [])
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((m) => ({
        time: candles[m.index].time as UTCTimestamp,
        position: m.kind === "high" ? "aboveBar" : "belowBar",
        color: m.color,
        shape: "circle",
        text: m.text,
        size: 1.5,
      }));
    plugin.setMarkers(ms);
  }, [markers, candles]);

  // Taps are handled here rather than with chart.subscribeClick: the chart
  // treats two quick taps as a double-click and drops the second one, which
  // on a phone means every other candle a student marks goes missing.
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    downAt.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const chart = chartRef.current;
    const el = containerRef.current;
    const start = downAt.current;
    downAt.current = null;
    if (!chart || !el || !start || !onTapRef.current) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return; // a drag, not a tap
    const x = e.clientX - el.getBoundingClientRect().left;
    if (x > chart.timeScale().width()) return; // on the price axis
    const logical = chart.timeScale().coordinateToLogical(x);
    if (logical == null) return;
    const idx = Math.round(logical);
    if (idx >= 0 && idx < candles.length) onTapRef.current(idx);
  };

  return (
    <div
      ref={containerRef}
      className={`w-full select-none ${onTap ? "cursor-pointer" : ""}`}
      style={{ height, touchAction: "manipulation" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    />
  );
}
