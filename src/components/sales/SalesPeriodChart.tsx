"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { SalesPeriodRow } from "@/lib/api";
import { cn } from "@/lib/utils";

const SLICE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
  "#ef4444",
  "#84cc16",
];

type PeriodType = "day" | "month";

type PieSlice = SalesPeriodRow & {
  percent: number;
  startAngle: number;
  endAngle: number;
  color: string;
  children?: SalesPeriodRow[];
};

function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function formatPeriodDetail(key: string, periodType: PeriodType) {
  if (key === "__outros__") return "Outros períodos";
  if (periodType === "day") {
    return new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
) {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    return [
      `M ${cx} ${cy - outerR}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR}`,
      `L ${cx - 0.01} ${cy - innerR}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
      "Z",
    ].join(" ");
  }

  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = sweep > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function buildPieSlices(rows: SalesPeriodRow[], maxSlices: number): PieSlice[] {
  const active = rows.filter((r) => r.tickets > 0);
  if (active.length === 0) return [];

  const totalTickets = active.reduce((sum, r) => sum + r.tickets, 0);
  const sorted = [...active].sort((a, b) => b.tickets - a.tickets);

  let segments: (SalesPeriodRow & { children?: SalesPeriodRow[] })[] = sorted;
  if (sorted.length > maxSlices) {
    const top = sorted.slice(0, maxSlices - 1);
    const rest = sorted.slice(maxSlices - 1);
    segments = [
      ...top,
      {
        key: "__outros__",
        label: "Outros",
        tickets: rest.reduce((sum, r) => sum + r.tickets, 0),
        revenue: Math.round(rest.reduce((sum, r) => sum + r.revenue, 0) * 100) / 100,
        children: rest,
      },
    ];
  }

  let angle = 0;
  return segments.map((segment, index) => {
    const percent = totalTickets > 0 ? (segment.tickets / totalTickets) * 100 : 0;
    const sweep = (percent / 100) * 360;
    const slice: PieSlice = {
      ...segment,
      percent,
      startAngle: angle,
      endAngle: angle + sweep,
      color: SLICE_COLORS[index % SLICE_COLORS.length],
    };
    angle += sweep;
    return slice;
  });
}

function SliceDetail({
  slice,
  periodType,
  totalTickets,
  totalRevenue,
  onClose,
}: {
  slice: PieSlice;
  periodType: PeriodType;
  totalTickets: number;
  totalRevenue: number;
  onClose: () => void;
}) {
  const avgTicket = slice.tickets > 0 ? slice.revenue / slice.tickets : 0;
  const shareRevenue = totalRevenue > 0 ? (slice.revenue / totalRevenue) * 100 : 0;

  return (
    <div className="mt-4 rounded-xl border border-brand-600 bg-brand-950/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-brand-400">Detalhes</p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {formatPeriodDetail(slice.key, periodType)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-brand-300 hover:bg-brand-800 hover:text-white"
          aria-label="Fechar detalhes"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-brand-400">Ingressos</dt>
          <dd className="font-semibold text-white">{slice.tickets}</dd>
        </div>
        <div>
          <dt className="text-brand-400">Receita</dt>
          <dd className="font-semibold text-white">{formatMoney(slice.revenue)}</dd>
        </div>
        <div>
          <dt className="text-brand-400">Do total (ingressos)</dt>
          <dd className="font-semibold text-emerald-300">{formatPercent(slice.percent)}%</dd>
        </div>
        <div>
          <dt className="text-brand-400">Do total (receita)</dt>
          <dd className="font-semibold text-emerald-300">{formatPercent(shareRevenue)}%</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-brand-400">Ticket médio</dt>
          <dd className="font-semibold text-white">{formatMoney(avgTicket)}</dd>
        </div>
      </dl>

      {slice.children && slice.children.length > 0 && (
        <div className="mt-3 border-t border-brand-700 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">
            Períodos agrupados ({slice.children.length})
          </p>
          <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
            {slice.children.map((child) => (
              <li
                key={child.key}
                className="flex items-center justify-between gap-2 rounded-lg bg-brand-900/60 px-2 py-1.5 text-xs"
              >
                <span className="min-w-0 truncate text-brand-200">
                  {formatPeriodDetail(child.key, periodType)}
                </span>
                <span className="shrink-0 text-brand-300">
                  {child.tickets} · {formatMoney(child.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SalesPeriodChart({
  title,
  rows,
  subtitle,
  periodType = "day",
}: {
  title: string;
  rows: SalesPeriodRow[];
  subtitle?: string;
  periodType?: PeriodType;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const maxSlices = periodType === "day" ? 7 : 12;

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.tickets > 0);
    return {
      tickets: active.reduce((sum, r) => sum + r.tickets, 0),
      revenue: active.reduce((sum, r) => sum + r.revenue, 0),
    };
  }, [rows]);

  const slices = useMemo(() => buildPieSlices(rows, maxSlices), [rows, maxSlices]);
  const selectedSlice = slices.find((s) => s.key === selectedKey) ?? null;

  const toggleSlice = (key: string) => {
    setSelectedKey((current) => (current === key ? null : key));
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border border-brand-700 bg-brand-900/50 p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {subtitle && <p className="mt-1 text-[10px] text-brand-400">{subtitle}</p>}

      {rows.every((r) => r.tickets === 0) ? (
        <p className="mt-4 flex-1 text-xs text-brand-400">Nenhuma venda no período</p>
      ) : (
        <>
          <p className="mt-2 text-[10px] text-brand-500">Clique em uma fatia para ver detalhes</p>

          <div className="mt-3 flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative w-full max-w-[180px] shrink-0">
              <svg viewBox="0 0 100 100" className="w-full" role="img" aria-label={title}>
                {slices.map((slice) => {
                  const isSelected = selectedKey === slice.key;
                  const hasSelection = selectedKey !== null;
                  return (
                    <path
                      key={slice.key}
                      d={describeDonutSlice(50, 50, 42, 26, slice.startAngle, slice.endAngle)}
                      fill={slice.color}
                      stroke={isSelected ? "#fff" : "transparent"}
                      strokeWidth={isSelected ? 1.5 : 0}
                      opacity={hasSelection && !isSelected ? 0.45 : 1}
                      className="cursor-pointer transition-opacity"
                      onClick={() => toggleSlice(slice.key)}
                    />
                  );
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                {selectedSlice ? (
                  <>
                    <p className="text-[9px] uppercase tracking-wide text-brand-400">Selecionado</p>
                    <p className="text-sm font-bold text-white">{formatPercent(selectedSlice.percent)}%</p>
                    <p className="text-[10px] text-brand-300">{selectedSlice.tickets} ingressos</p>
                  </>
                ) : (
                  <>
                    <p className="text-[9px] uppercase tracking-wide text-brand-400">Total</p>
                    <p className="text-sm font-bold text-white">{totals.tickets}</p>
                    <p className="text-[10px] text-brand-300">ingressos</p>
                  </>
                )}
              </div>
            </div>

            <ul className="min-w-0 flex-1 space-y-1.5">
              {slices.map((slice) => {
                const isSelected = selectedKey === slice.key;
                return (
                  <li key={slice.key}>
                    <button
                      type="button"
                      onClick={() => toggleSlice(slice.key)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                        isSelected ? "bg-brand-800 ring-1 ring-brand-500" : "hover:bg-brand-800/60"
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-white">{slice.label}</span>
                      <span className="shrink-0 text-brand-300">{formatPercent(slice.percent)}%</span>
                      <span className="shrink-0 text-brand-400">{slice.tickets}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedSlice && (
            <SliceDetail
              slice={selectedSlice}
              periodType={periodType}
              totalTickets={totals.tickets}
              totalRevenue={totals.revenue}
              onClose={() => setSelectedKey(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
