"use client";

import * as React from "react";
import * as echarts from "echarts";
import { useTheme } from "next-themes";

/**
 * Charts, drawn with Apache ECharts the way the lakehouse console draws its
 * dashboard tiles (same wrapper shape, axis ink, tooltip and grid).
 *
 * Colour: one series wears the brand blue; magnitude uses the blue ramp of
 * the design tokens (--chart-1..5, light to dark); series that are different
 * things take SERIES in fixed order. "Not answered / not scored" is absence,
 * so it is grey, not a hue.
 */
const BLUE = { light: "#1d6fb8", dark: "#5cb6f9" };
const RAMP = ["#a5d8fb", "#56b0f2", "#2f8fdc", "#1d6fb8", "#17578f"];
export const SERIES = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function useInk() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = !mounted || resolvedTheme !== "light";
  return {
    dark,
    blue: dark ? BLUE.dark : BLUE.light,
    text: dark ? "#a1a1aa" : "#71717a",
    strong: dark ? "#fafafa" : "#18181b",
    split: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    none: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)",
    surface: dark ? "#1c2227" : "#ffffff",
    tooltip: {
      backgroundColor: dark ? "#18181b" : "#ffffff",
      borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
      textStyle: { color: dark ? "#fafafa" : "#18181b", fontSize: 12 },
    },
  };
}

function EChart({ option, height, onPick }: { option: echarts.EChartsOption; height: number; onPick?: (name: string) => void }) {
  const el = React.useRef<HTMLDivElement>(null);
  const chart = React.useRef<echarts.ECharts | null>(null);
  // Kept in a ref so the click handler sees the latest callback without re-creating the chart.
  const pick = React.useRef(onPick);
  React.useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  React.useEffect(() => {
    if (!el.current) return;
    const c = echarts.init(el.current, undefined, { renderer: "canvas" });
    chart.current = c;
    c.on("click", (p) => {
      const name = (p as { name?: string }).name;
      if (name) pick.current?.(name);
    });
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  React.useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);

  return <div ref={el} style={{ width: "100%", height, cursor: onPick ? "pointer" : undefined }} />;
}

const GRID = { left: 8, right: 24, top: 12, bottom: 8, containLabel: true };
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export type Datum = { name: string; value: number | null; note?: string };

/** Ranked horizontal bars, one series. `max` fixes the scale (e.g. 5 for maturity, 100 for percent). */
export function HBar({
  data,
  unit = "",
  max,
  labelWidth = 28,
  height,
  onPick,
  selected,
}: {
  data: Datum[];
  unit?: string;
  max?: number;
  labelWidth?: number;
  height?: number;
  /** Click a bar: called with its name. */
  onPick?: (name: string) => void;
  /** Name of the bar to keep at full strength; the others recede. */
  selected?: string | null;
}) {
  const ink = useInk();
  const option = React.useMemo<echarts.EChartsOption>(() => {
    const rows = [...data].reverse();
    return {
      grid: GRID,
      tooltip: {
        ...ink.tooltip,
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (p: unknown) => {
          const i = (p as { dataIndex: number }[])[0].dataIndex;
          const d = rows[i];
          return `${d.name}<br/><b>${d.value == null ? "belum ada" : d.value.toLocaleString("id-ID") + unit}</b>${d.note ? `<br/>${d.note}` : ""}`;
        },
      },
      xAxis: { type: "value", max, axisLabel: { color: ink.text, fontSize: 11 }, splitLine: { lineStyle: { color: ink.split } } },
      yAxis: {
        type: "category",
        data: rows.map((d) => d.name),
        axisLabel: { color: ink.text, fontSize: 11, formatter: (v: string) => short(v, labelWidth) },
        axisLine: { lineStyle: { color: ink.split } },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: rows.map((d) => ({ value: d.value, itemStyle: { opacity: selected && d.name !== selected ? 0.3 : 1 } })),
          barMaxWidth: 14,
          itemStyle: { color: ink.blue, borderRadius: [0, 4, 4, 0] },
          label: { show: rows.length <= 24, position: "right", color: ink.text, fontSize: 11, formatter: (p) => (p.value == null ? "" : `${(p.value as number).toLocaleString("id-ID")}${unit}`) },
        },
      ],
    };
  }, [data, unit, max, labelWidth, ink, selected]);
  return <EChart option={option} height={height ?? Math.max(160, data.length * 24 + 40)} onPick={onPick} />;
}

/** Horizontal stacked bars. The last series can be marked as "absence" and is drawn grey. */
export function StackedHBar({
  categories,
  series,
  labelWidth = 34,
  absentLast = false,
}: {
  categories: string[];
  series: { name: string; data: number[] }[];
  labelWidth?: number;
  absentLast?: boolean;
}) {
  const ink = useInk();
  const option = React.useMemo<echarts.EChartsOption>(() => {
    const cats = [...categories].reverse();
    return {
      grid: { ...GRID, top: 34 },
      legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: ink.text, fontSize: 11 } },
      tooltip: { ...ink.tooltip, trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "value", minInterval: 1, axisLabel: { color: ink.text, fontSize: 11 }, splitLine: { lineStyle: { color: ink.split } } },
      yAxis: {
        type: "category",
        data: cats,
        axisLabel: { color: ink.text, fontSize: 11, formatter: (v: string) => short(v, labelWidth) },
        axisLine: { lineStyle: { color: ink.split } },
        axisTick: { show: false },
      },
      series: series.map((s, i) => ({
        name: s.name,
        type: "bar",
        stack: "a",
        barMaxWidth: 14,
        data: [...s.data].reverse(),
        itemStyle: {
          color: absentLast && i === series.length - 1 ? ink.none : i === 0 ? ink.blue : SERIES[i % SERIES.length],
          borderColor: ink.surface,
          borderWidth: 1,
        },
      })),
    };
  }, [categories, series, labelWidth, absentLast, ink]);
  return <EChart option={option} height={Math.max(180, categories.length * 22 + 70)} />;
}

/** Radar of the seven aspect indices on the 1-5 maturity scale. Unscored aspects sit at the centre. */
export function Radar({ axes, values, height = 320 }: { axes: string[]; values: (number | null)[]; height?: number }) {
  const ink = useInk();
  const option = React.useMemo<echarts.EChartsOption>(
    () => ({
      tooltip: { ...ink.tooltip },
      radar: {
        indicator: axes.map((name) => ({ name, max: 5, min: 1 })),
        radius: "54%",
        splitNumber: 5,
        axisName: { color: ink.text, fontSize: 11, lineHeight: 13, formatter: (v?: string) => (v ?? "").replace(/(.{8,}?)\s/, "$1\n") },
        splitLine: { lineStyle: { color: ink.split } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: ink.split } },
      },
      series: [
        {
          type: "radar",
          data: [{ value: values.map((v) => v ?? 1), name: "Indeks aspek" }],
          symbolSize: 8,
          lineStyle: { width: 2, color: ink.blue },
          itemStyle: { color: ink.blue, borderColor: ink.surface, borderWidth: 2 },
          areaStyle: { color: ink.blue, opacity: 0.18 },
        },
      ],
    }),
    [axes, values, ink],
  );
  return <EChart option={option} height={height} />;
}

/** Share of answered questions per row (OPD) and column (theme). Sequential: one hue, light to dark. */
export function Heatmap({
  rows,
  cols,
  cells,
  unit = "%",
  max = 100,
  empty = "tidak ada pertanyaan",
  labelWidth = 34,
  showValues = false,
}: {
  rows: string[];
  cols: string[];
  cells: [number, number, number | null][];
  unit?: string;
  max?: number;
  empty?: string;
  labelWidth?: number;
  showValues?: boolean;
}) {
  const ink = useInk();
  const option = React.useMemo<echarts.EChartsOption>(() => {
    const ys = [...rows].reverse();
    return {
      grid: { left: 8, right: 16, top: 28, bottom: 44, containLabel: true },
      tooltip: {
        ...ink.tooltip,
        formatter: (p: unknown) => {
          const { value } = p as { value: [number, number, number | null] };
          return `${ys[value[1]]}<br/>${cols[value[0]]}: <b>${value[2] == null ? empty : value[2] + unit}</b>`;
        },
      },
      xAxis: { type: "category", data: cols, position: "top", axisLabel: { color: ink.text, fontSize: 11 }, axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false } },
      yAxis: { type: "category", data: ys, axisLabel: { color: ink.text, fontSize: 11, formatter: (v: string) => short(v, labelWidth) }, axisLine: { show: false }, axisTick: { show: false } },
      visualMap: {
        min: 0,
        max,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemWidth: 10,
        itemHeight: 140,
        text: [`${max}${unit}`, `0${unit}`],
        textStyle: { color: ink.text, fontSize: 11 },
        inRange: { color: ink.dark ? [...RAMP].reverse() : RAMP },
      },
      series: [
        {
          type: "heatmap",
          data: cells.filter((c) => c[2] != null).map(([x, y, v]) => [x, rows.length - 1 - y, v]),
          itemStyle: { borderColor: ink.surface, borderWidth: 2, borderRadius: 3 },
          label: { show: showValues, color: ink.strong, fontSize: 11, textBorderColor: ink.surface, textBorderWidth: 2 },
          emphasis: { itemStyle: { borderColor: ink.strong, borderWidth: 1 } },
        },
      ],
    };
  }, [rows, cols, cells, unit, max, empty, labelWidth, showValues, ink]);
  return <EChart option={option} height={Math.max(220, rows.length * 20 + 90)} />;
}

/** A chart for an arbitrary query result (AI Tubaba): bars for a few rows, a line for a time-like axis. */
export function AutoChart({ labels, values, name, line }: { labels: string[]; values: number[]; name: string; line: boolean }) {
  const ink = useInk();
  const option = React.useMemo<echarts.EChartsOption>(
    () => ({
      grid: { ...GRID, bottom: 12 },
      tooltip: { ...ink.tooltip, trigger: "axis", axisPointer: { type: line ? "line" : "shadow" } },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { color: ink.text, fontSize: 11, interval: labels.length > 14 ? "auto" : 0, rotate: labels.length > 8 ? 30 : 0, formatter: (v: string) => short(v, 18) },
        axisLine: { lineStyle: { color: ink.split } },
        axisTick: { show: false },
      },
      yAxis: { type: "value", axisLabel: { color: ink.text, fontSize: 11 }, splitLine: { lineStyle: { color: ink.split } } },
      series: [
        line
          ? { name, type: "line", data: values, symbolSize: 8, lineStyle: { width: 2, color: ink.blue }, itemStyle: { color: ink.blue } }
          : { name, type: "bar", data: values, barMaxWidth: 28, itemStyle: { color: ink.blue, borderRadius: [4, 4, 0, 0] } },
      ],
    }),
    [labels, values, name, line, ink],
  );
  return <EChart option={option} height={280} />;
}

/** The index on its 1-5 scale, with the predicate bands of Tabel 4 as the track. */
export function Gauge({ value, label, height = 220 }: { value: number | null; label: string; height?: number }) {
  const ink = useInk();
  const option = React.useMemo<echarts.EChartsOption>(
    () => ({
      series: [
        {
          type: "gauge",
          min: 1,
          max: 5,
          startAngle: 200,
          endAngle: -20,
          radius: "96%",
          center: ["50%", "62%"],
          splitNumber: 4,
          progress: { show: value != null, width: 14, roundCap: true, itemStyle: { color: ink.blue } },
          axisLine: { roundCap: true, lineStyle: { width: 14, color: [[1, ink.none]] } },
          axisTick: { show: false },
          splitLine: { distance: -22, length: 6, lineStyle: { color: ink.text, width: 1 } },
          axisLabel: { distance: -34, color: ink.text, fontSize: 11 },
          pointer: { show: false },
          anchor: { show: false },
          title: { offsetCenter: [0, "22%"], color: ink.text, fontSize: 12 },
          detail: {
            offsetCenter: [0, "-8%"],
            valueAnimation: true,
            color: ink.strong,
            fontSize: 40,
            fontWeight: 600,
            formatter: (v: number) => (value == null ? "–" : v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
          },
          data: [{ value: value ?? 1, name: label }],
        },
      ],
    }),
    [value, label, ink],
  );
  return <EChart option={option} height={height} />;
}

/**
 * Stacked bars of states (met / partly / to check / missing). These are
 * status colours, used here because the segments ARE states; the legend
 * names each one.
 */
export function StatusStack({ categories, series, labelWidth = 30 }: { categories: string[]; series: { name: string; tone: "good" | "warning" | "none" | "serious"; data: number[] }[]; labelWidth?: number }) {
  const ink = useInk();
  const option = React.useMemo<echarts.EChartsOption>(() => {
    const tone = { good: ink.dark ? "#2dd4bf" : "#0d9488", warning: ink.dark ? "#fbbf24" : "#d97706", serious: ink.dark ? "#f87171" : "#dc2626", none: ink.dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)" };
    return {
      grid: { ...GRID, top: 34 },
      legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: ink.text, fontSize: 11 } },
      tooltip: { ...ink.tooltip, trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "value", minInterval: 1, axisLabel: { color: ink.text, fontSize: 11 }, splitLine: { lineStyle: { color: ink.split } } },
      yAxis: {
        type: "category",
        data: [...categories].reverse(),
        axisLabel: { color: ink.text, fontSize: 11, formatter: (v: string) => short(v, labelWidth) },
        axisLine: { lineStyle: { color: ink.split } },
        axisTick: { show: false },
      },
      series: series.map((s) => ({
        name: s.name,
        type: "bar",
        stack: "a",
        barMaxWidth: 16,
        data: [...s.data].reverse(),
        itemStyle: { color: tone[s.tone], borderColor: ink.surface, borderWidth: 1 },
      })),
    };
  }, [categories, series, labelWidth, ink]);
  return <EChart option={option} height={Math.max(200, categories.length * 30 + 70)} />;
}
