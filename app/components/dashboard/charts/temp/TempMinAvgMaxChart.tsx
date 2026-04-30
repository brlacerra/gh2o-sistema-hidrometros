"use client";

import {
  CartesianGrid,
  Line,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  BarChart,
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

export function TempMinAvgMaxChart({
  points,
  bucket,
  height = 260,
  chartType = "line",
}: {
  points: TempPoint[];
  bucket: Bucket;
  height?: number;
  chartType?: "line" | "bar";
}) {
  const formatX =
    bucket === "1mo"
      ? (v: number) => formatMonth(Number(v))
      : bucket === "1d"
        ? (v: number) => formatDay(Number(v))
        : (v: number) => formatTime(Number(v));

  if (chartType === "bar") {
    return (
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <BarChart data={points} margin={{ top: 10, right: 0, left: -10, bottom: 0 }} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="tMs" tickFormatter={formatX} minTickGap={24} />
            <YAxis width={30} />
            <Tooltip
              labelFormatter={(v) => formatX(Number(v))}
              formatter={(value, name) => {
                if (typeof value === "number") return [`${value.toFixed(1)} °C`, name];
                return [value, name];
              }}
            />
            <Bar
              dataKey="min"
              name="Mínima"
              fill="rgb(33, 137, 177)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="max"
              name="Máxima"
              fill="lightcoral"
              isAnimationActive={false}
            />
            <Bar
              dataKey="avg"
              name="Média"
              fill="rgb(69, 157, 82)"
              isAnimationActive={true}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: "20px" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="tMs" tickFormatter={formatX} minTickGap={24} />
          <YAxis
            label={{
              value: "Temperatura (°C)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            labelFormatter={(v) => formatX(Number(v))}
            formatter={(value, name) => {
              if (typeof value === "number") return [`${value.toFixed(1)} °C`, name];
              return [value, name];
            }}
          />
          <Line
            type="monotone"
            dataKey="min"
            name="Mínima"
            stroke="rgb(33, 137, 177)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="max"
            name="Máxima"
            stroke="#CD2626"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            name="Média"
            stroke="rgb(69, 157, 82)"
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