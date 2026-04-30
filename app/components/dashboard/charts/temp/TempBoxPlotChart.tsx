"use client";

import {
  CartesianGrid,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  Line
} from "recharts";

type TempPointWithStd = {
  tMs?: number;
  avg?: number | null;
  min?: number | null;
  max?: number | null;
  std?: number | null;
};

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

const BoxPlotShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { min, max, avg, std } = payload;

  if (min == null || max == null || avg == null) return null;

  // Calculamos a caixa baseada no desvio padrão real (std).
  // Se não houver std guardado, a gente usa 0.5 de fallback só por segurança.
  const actualStd = (std && Number.isFinite(std)) ? std : 0.5;

  // Garantindo que a caixa não ultrapasse o min/max absolutos
  const boxTopVal = Math.min(max, avg + actualStd);
  const boxBotVal = Math.max(min, avg - actualStd);

  const yInterval = max - min;

  // Função que mapeia a Temperatura(valor) pra posição Y(pixel)
  const mapY = (val: number) => {
    if (yInterval === 0) return y;
    // O 'y' do props é a coordenada da MÁXIMA da barra (SVG cresce pra baixo).
    // O 'height' do props é o total do min até o max.
    return y + ((max - val) / yInterval) * height;
  };

  const maxY = mapY(max);       // O topo extremo real
  const boxTopY = mapY(boxTopVal); // Topo da "caixa" (max 5 graus da média)
  const avgY = mapY(avg);       // A média real
  const boxBotY = mapY(boxBotVal); // Fundo da "caixa" (max 5 graus da média)
  const minY = mapY(min);       // O fundo extremo real

  const boxW = Math.max(4, Math.min(width * 0.8, 16));
  const bx = x + (width - boxW) / 2;
  const cx = x + width / 2;

  const boxH = Math.max(2, boxBotY - boxTopY);

  return (
    <g>
      {/* Corpo da caixa: (média ± 5) - Sem cantos arredondados, cor mais visível */}
      <rect
        x={bx} y={boxTopY} width={boxW} height={boxH}
        fill="rgba(33, 137, 177, 0.65)"
        stroke="rgb(33, 137, 177)"
        strokeWidth={1.2}
      />
      {/* Linha horizontal demarcar onde fica a média */}
      <line
        x1={bx} y1={avgY} x2={bx + boxW} y2={avgY}
        stroke="rgb(40, 160, 60)"
        strokeWidth={3}
        strokeLinecap="square"
      />

      {/* Wick (Pavio) Superior: SÓ APARECE SE A MÁXIMA PASSAR DA CAIXA (> avg + 5) */}
      {max > boxTopVal && (
        <line x1={cx} y1={maxY} x2={cx} y2={boxTopY} stroke="rgb(33, 137, 177)" strokeWidth={2} opacity={0.5} />
      )}

      {/* Wick (Pavio) Inferior: SÓ APARECE SE A MÍNIMA FOR MENOR QUE A CAIXA (< avg - 5) */}
      {min < boxBotVal && (
        <line x1={cx} y1={boxBotY} x2={cx} y2={minY} stroke="rgb(33, 137, 177)" strokeWidth={2} opacity={0.5} />
      )}
    </g>
  );
};

export function TempBoxPlotChart({
  points,
  bucket,
  height = 260,
}: {
  points: TempPointWithStd[];
  bucket: Bucket;
  height?: number;
}) {
  const formatX =
    bucket === "1mo"
      ? (v: number) => formatMonth(Number(v))
      : bucket === "1d"
        ? (v: number) => formatDay(Number(v))
        : (v: number) => formatTime(Number(v));

  const dataList = points.map(p => ({
    ...p,
    amplitude: [p.min, p.max]
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={dataList} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="tMs" tickFormatter={formatX} minTickGap={24} />
          <YAxis width={30} domain={['dataMin - 5', 'dataMax + 1']} />
          <Tooltip
            labelFormatter={(v) => formatX(Number(v))}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-slate-200 p-2 shadow-sm text-sm">
                    <p className="font-semibold text-slate-700 mb-1">{formatX(Number(label))}</p>
                    <p className="text-red-500">Máx: {data.max?.toFixed(1)} °C</p>
                    <p className="text-green-600 font-semibold">Méd: {data.avg?.toFixed(1)} °C</p>
                    <p className="text-blue-500">Mín: {data.min?.toFixed(1)} °C</p>
                    {data.std != null && (
                      <p className="text-slate-500 text-xs mt-1 border-t border-slate-100 pt-1">
                        Desvio Padrão (σ): ±{data.std.toFixed(2)} °C
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Line dataKey="max" stroke="none" isAnimationActive={false} dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }} />
          <Line dataKey="avg" stroke="none" isAnimationActive={false} dot={{ fill: '#ffffff', r: 2, strokeWidth: 1, stroke: '#ccc' }} />
          <Line dataKey="min" stroke="none" isAnimationActive={false} dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} />

          <Bar
            dataKey="amplitude"
            shape={<BoxPlotShape />}
            isAnimationActive={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
