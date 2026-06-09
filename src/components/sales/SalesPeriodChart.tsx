"use client";

import type { SalesPeriodRow } from "@/lib/api";

function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SalesPeriodChart({
  title,
  rows,
  subtitle,
}: {
  title: string;
  rows: SalesPeriodRow[];
  subtitle?: string;
}) {
  const maxTickets = Math.max(...rows.map((r) => r.tickets), 1);

  return (
    <section className="rounded-2xl border border-brand-700 bg-brand-900/50 p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {subtitle && <p className="mt-1 text-[10px] text-brand-400">{subtitle}</p>}
      {rows.every((r) => r.tickets === 0) ? (
        <p className="mt-4 text-xs text-brand-400">Nenhuma venda no período</p>
      ) : (
        <div className="mt-4 flex h-40 items-end gap-0.5 overflow-x-auto pb-1">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex min-w-[18px] flex-1 flex-col items-center gap-1"
              title={`${row.label}: ${row.tickets} ingresso(s) · ${formatMoney(row.revenue)}`}
            >
              <div
                className="w-full min-w-[10px] rounded-t bg-brand-500"
                style={{
                  height: `${Math.max(6, (row.tickets / maxTickets) * 100)}%`,
                  minHeight: row.tickets > 0 ? "8px" : "2px",
                }}
              />
              <span className="max-w-full truncate text-[8px] text-brand-400">{row.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
