"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  Legend,
} from "recharts";

import { TempPoint } from "@/lib/series/temp";

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

export function TempAvgChart({
  points,
  bucket,
  height = 260,
}: {
  points: TempPoint[];
  bucket: Bucket;
  height?: number | string;
}) {
  const formatX =
    bucket === "1mo"
      ? (v: number) => formatMonth(Number(v))
      : bucket === "1d"
        ? (v: number) => formatDay(Number(v))
        : (v: number) => formatTime(Number(v));

  const gradientId = `tempStroke-${bucket}-${height}`;

  return (
    <div className="w-full min-w-0" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="rgb(69, 157, 82)" />
              <stop offset="100%" stopColor="rgb(33, 137, 177)" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="tMs" tickFormatter={formatX} minTickGap={24} />
          <YAxis width={30} />
          <Tooltip
            labelFormatter={(v) => formatX(Number(v))}
            formatter={(value) => {
              if (typeof value === "number") return [`${value.toFixed(1)} °C`, "Temperatura"];
              return [value, "Média"];
            }}
          />
          <Area
            type="monotone"
            dataKey="avg"
            name="Temperatura (°C)"
            stroke={`url(#${gradientId})`}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            isAnimationActive={true}
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: "20px" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
