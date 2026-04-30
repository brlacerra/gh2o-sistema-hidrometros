"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type Bucket = "5m" | "15m" | "30m" | "1h" | "1d" | "1mo";

type RainChartPoint = {
  tMs: number;
  mm?: number | null;
  mmAccum?: number | null;
  pulses?: number;
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTime(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDay(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

function formatMonth(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}

function addMonthsUtc(ms: number, months: number) {
  const d = new Date(ms);
  // usa UTC pra não ter surpresa com DST/local do browser
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const next = new Date(Date.UTC(year, month + months, 1, 0, 0, 0, 0));
  return next.getTime();
}

function fillMinMonthPoints(points: RainChartPoint[], minPoints: number): RainChartPoint[] {
  if (minPoints <= 0) return points;
  if (points.length === 0) return points;
  if (points.length >= minPoints) return points;

  // assume que points já estão em início do mês e ordenados
  const byT = new Map<number, RainChartPoint>();
  for (const p of points) byT.set(p.tMs, p);

  const start = points[0].tMs;
  const end = addMonthsUtc(start, minPoints - 1);

  const out: RainChartPoint[] = [];
  let acc = 0;

  for (let t = start, i = 0; i < minPoints; i++, t = addMonthsUtc(t, 1)) {
    const existing = byT.get(t);
    const mm = existing?.mm ?? null;
    if (mm != null) acc += mm;

    out.push({
      tMs: t,
      mm,
      mmAccum: mm == null ? null : acc,
      pulses: existing?.pulses,
    });
  }

  return out;
}


export function RainChart({
  points,
  bucket,
  height = 260,
  minPoints,
}: {
  points: RainChartPoint[];
  bucket: Bucket;
  height?: number | string;
  minPoints?: number;
}) {
  const data =
    bucket === "1mo" && typeof minPoints === "number"
      ? fillMinMonthPoints(points, minPoints)
      : points;

  const tickFormatter =
    bucket === "1mo"
      ? (v: number) => formatMonth(Number(v))
      : bucket === "1d"
        ? (v: number) => formatDay(Number(v))
        : (v: number) => formatTime(Number(v));

  const labelFormatter =
    bucket === "1mo"
      ? (v: number) => formatMonth(Number(v))
      : bucket === "1d"
        ? (v: number) => formatDay(Number(v))
        : (v: number) => formatTime(Number(v));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="tMs" tickFormatter={tickFormatter} minTickGap={24} />
          <YAxis yAxisId="left" width={30} />
          <YAxis
            yAxisId="right"
            orientation="right"
            width={20}
          />
          <Tooltip
            labelFormatter={(v) => labelFormatter(Number(v))}
            formatter={(value, name) => {
              if (typeof value === "number") return [value.toFixed(2), name];
              return [value, name];
            }}
          />
          <Bar yAxisId="left" dataKey="mm" name="Chuva (mm)" fill="rgb(33, 137, 177)" isAnimationActive />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="mmAccum"
            name="Acumulado período (mm)"
            stroke="rgb(69, 157, 82)"
            strokeWidth={2}
            dot={{ r: 1.5, stroke: "var(--color-gh2oblue)", fill: "var(--color-gh2oblue)" }}
            isAnimationActive
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: "20px" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}