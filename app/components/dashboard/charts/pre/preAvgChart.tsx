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

import { PrePoint } from "@/lib/series/pre";

const PRESSURE_PADDING = 2;

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

export function PreAvgChart({
    points,
    bucket,
    height = 260,
}: {
    points: PrePoint[];
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
                        domain={[
                            (dataMin: number) => Math.floor(dataMin - PRESSURE_PADDING),
                            (dataMax: number) => Math.ceil(dataMax + PRESSURE_PADDING),
                        ]}
                        allowDecimals
                        tickCount={6}
                        width={30}
                    />
                    <Tooltip
                        labelFormatter={(v) => formatX(Number(v))}
                        formatter={(value) => {
                            if (typeof value === "number") return [`${value.toFixed(1)} hPa`, "Média"];
                            return [value, "Média"];
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="avg"
                        name="Pressão (hPa)"
                        stroke="#a78bfa"
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