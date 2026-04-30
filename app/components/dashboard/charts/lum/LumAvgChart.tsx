"use client";

import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Legend,
} from "recharts";

import { LumPoint } from "@/lib/series/lum";

type Bucket = "5m" | "15m" | "30m" | "1h" | "1d" | "1mo";

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

export function LumAvgChart({
  points,
  bucket,
  height = 260,
}: {
  points: LumPoint[];
  bucket: Bucket;
  height?: number;
}) {
  const formatX =
    bucket === "1mo"
      ? (v: number) => formatMonth(Number(v))
      : bucket === "1d"
        ? (v: number) => formatDay(Number(v))
        : (v: number) => formatTime(Number(v));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="tMs" tickFormatter={formatX} minTickGap={24} />
          <YAxis
            domain={["auto", "auto"]}
            width={30}
          />
          <Tooltip
            labelFormatter={(v) => formatX(Number(v))}
            formatter={(value) => {
              if (typeof value === "number") return [`${value.toFixed(1)} %`, "Média"];
              return [value, "Média"];
            }}
          />
          <Line
            type="monotone"
            dataKey="avg"
            name="Luminosidade (%)"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={true}
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: "20px" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}