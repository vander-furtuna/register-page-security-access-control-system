"use client";

import { TableIcon, BarChart3Icon } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, XAxis, type BarShapeProps } from "recharts";

import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { HourBucket } from "@/lib/access-logs";
import { cn } from "@/lib/utils";

/**
 * Acessos por hora, empilhado (liberado embaixo, negado em cima). Segue o dataviz:
 * colunas de até 24px, ponta arredondada de 4px só no topo da pilha, 2px de vão na cor do
 * fundo entre os segmentos, eixo recessivo, tooltip por coluna, legenda com totais e uma
 * tabela equivalente (as cores ficam abaixo de 3:1 contra o fundo).
 */
const config = {
  allowed: { label: "Liberados", color: "var(--chart-allowed)" },
  denied: { label: "Negados", color: "var(--chart-denied)" },
} satisfies ChartConfig;

const GAP = 2;
const RADIUS = 4;

/** Retângulo com só os cantos de cima arredondados (a base fica reta na linha de base). */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function Segment(props: BarShapeProps & { segment: "allowed" | "denied" }) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
    fill,
    segment,
  } = props as BarShapeProps & {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload: HourBucket;
    fill?: string;
    segment: "allowed" | "denied";
  };
  if (height <= 0) return null;
  const isTop = segment === "denied" || payload.denied === 0;
  // o negado fica em cima do liberado: o vão sai da base dele
  const gap = segment === "denied" && payload.allowed > 0 ? GAP : 0;
  const h = Math.max(height - gap, 0);
  if (h === 0) return null;
  return isTop ? (
    <path d={topRounded(x, y, width, h, RADIUS)} fill={fill} />
  ) : (
    <rect x={x} y={y} width={width} height={h} fill={fill} />
  );
}

type AccessChartProps = {
  buckets: HourBucket[];
  /** Hora atual ("14") destacada no eixo quando o período é hoje. */
  currentHour?: string;
  className?: string;
};

export function AccessChart({ buckets, currentHour, className }: AccessChartProps) {
  const [asTable, setAsTable] = useState(false);
  const totals = buckets.reduce(
    (acc, b) => ({ allowed: acc.allowed + b.allowed, denied: acc.denied + b.denied }),
    {
      allowed: 0,
      denied: 0,
    },
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {asTable ? (
        <div className="relative max-h-56 overflow-auto rounded-md border border-line">
          <table className="w-full text-body">
            <caption className="sr-only">Acessos por hora</caption>
            <thead className="sticky top-0 bg-surface-sunken">
              <tr>
                {["Hora", "Liberados", "Negados"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="h-9 px-4 text-left text-overline font-semibold tracking-[0.08em] text-ink-muted uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buckets
                .filter((b) => b.allowed + b.denied > 0)
                .map((b) => (
                  <tr key={b.hour} className="border-t border-line">
                    <th
                      scope="row"
                      className="px-4 py-1.5 text-left font-mono text-label font-normal text-ink"
                    >
                      {b.hour}h
                    </th>
                    <td className="px-4 font-mono text-label text-ink">{b.allowed}</td>
                    <td className="px-4 font-mono text-label text-ink">{b.denied}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ChartContainer
          config={config}
          className="aspect-auto h-[200px] w-full"
          role="img"
          aria-label={`Acessos por hora: ${totals.allowed} liberados e ${totals.denied} negados. Use "Ver tabela" para os números de cada hora.`}
        >
          <BarChart data={buckets} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="12%">
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              interval={0}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={Number(y) + 12}
                  textAnchor="middle"
                  className={cn(
                    "fill-ink-subtle font-mono text-[11px]",
                    payload.value === currentHour && "fill-ink font-semibold",
                  )}
                >
                  {payload.value}
                </text>
              )}
            />
            <ChartTooltip
              cursor={{ fill: "var(--surface-hover)" }}
              content={<ChartTooltipContent labelFormatter={(hour) => `${hour}h`} indicator="dot" />}
            />
            <Bar
              dataKey="allowed"
              stackId="a"
              fill="var(--color-allowed)"
              maxBarSize={24}
              shape={(props: BarShapeProps) => <Segment {...props} segment="allowed" />}
              isAnimationActive={false}
            />
            <Bar
              dataKey="denied"
              stackId="a"
              fill="var(--color-denied)"
              maxBarSize={24}
              shape={(props: BarShapeProps) => <Segment {...props} segment="denied" />}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-label text-ink-muted" aria-label="Legenda">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-chart-allowed" />
            Liberados ({totals.allowed})
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-chart-denied" />
            Negados ({totals.denied})
          </li>
        </ul>
        <Button variant="ghost" size="sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? <BarChart3Icon aria-hidden="true" /> : <TableIcon aria-hidden="true" />}
          {asTable ? "Ver gráfico" : "Ver tabela"}
        </Button>
      </div>
    </div>
  );
}
