"use client";

import type { AttendanceScope } from "@/lib/api";

function RateBar({
  label,
  total,
  checkedIn,
  rate,
  maxTotal,
  variant = "default",
}: {
  label: string;
  total: number;
  checkedIn: number;
  rate: number;
  maxTotal: number;
  variant?: "default" | "courtesy";
}) {
  const width = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const barClass =
    variant === "courtesy" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium text-white">{label}</span>
        <span className="shrink-0 text-xs text-brand-300">
          {checkedIn}/{total} · {rate}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-800">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.max(width, total > 0 ? 4 : 0)}%` }}
        />
      </div>
    </li>
  );
}

function HourBar({
  label,
  checkedIn,
  maxCount,
}: {
  label: string;
  checkedIn: number;
  maxCount: number;
}) {
  const width = maxCount > 0 ? (checkedIn / maxCount) * 100 : 0;
  return (
    <li>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-white">{label}</span>
        <span className="text-brand-300">{checkedIn}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-800">
        <div
          className="h-full rounded-full bg-violet-500"
          style={{ width: `${Math.max(width, checkedIn > 0 ? 4 : 0)}%` }}
        />
      </div>
    </li>
  );
}

function Section({
  title,
  rows,
  maxTotal,
  variant,
}: {
  title: string;
  rows: AttendanceScope["byTicketType"];
  maxTotal: number;
  variant?: "default" | "courtesy";
}) {
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-brand-700 bg-brand-900/40 p-4">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-2 text-xs text-brand-400">Sem dados</p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-brand-700 bg-brand-900/40 p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => (
          <RateBar key={row.label} {...row} maxTotal={maxTotal} variant={variant} />
        ))}
      </ul>
    </section>
  );
}

export function AttendanceScopeView({
  scope,
  variant = "default",
}: {
  scope: AttendanceScope;
  variant?: "default" | "courtesy";
}) {
  const maxType = Math.max(...scope.byTicketType.map((r) => r.total), 1);
  const maxLot = Math.max(...scope.byLot.map((r) => r.total), 1);
  const maxPay = Math.max(...scope.byPayment.map((r) => r.total), 1);
  const maxGender = Math.max(...scope.byGender.map((r) => r.total), 1);
  const maxCity = Math.max(...scope.byCity.map((r) => r.total), 1);
  const maxState = Math.max(...scope.byState.map((r) => r.total), 1);
  const maxHour = Math.max(...scope.byCheckInHour.map((r) => r.checkedIn), 1);

  const borderClass =
    variant === "courtesy" ? "border-amber-600/50 bg-amber-950/20" : "";

  return (
    <div className={`space-y-4 ${borderClass ? `rounded-2xl border p-4 ${borderClass}` : ""}`}>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-brand-950/80 p-2">
          <p className="text-brand-400">Emitidos</p>
          <p className="text-lg font-bold text-white">{scope.summary.total}</p>
        </div>
        <div className="rounded-lg bg-brand-950/80 p-2">
          <p className="text-brand-400">Validados</p>
          <p className="text-lg font-bold text-emerald-300">{scope.summary.checkedIn}</p>
        </div>
        <div className="rounded-lg bg-brand-950/80 p-2">
          <p className="text-brand-400">Comparecimento</p>
          <p className="text-lg font-bold text-white">{scope.summary.rate}%</p>
        </div>
      </div>

      <Section title="Por tipo de ingresso" rows={scope.byTicketType} maxTotal={maxType} variant={variant} />
      <Section title="Por lote" rows={scope.byLot} maxTotal={maxLot} variant={variant} />
      <Section title="Por meio de pagamento" rows={scope.byPayment} maxTotal={maxPay} variant={variant} />
      <Section title="Por gênero" rows={scope.byGender} maxTotal={maxGender} variant={variant} />
      <Section title="Por cidade (top 10)" rows={scope.byCity} maxTotal={maxCity} variant={variant} />
      <Section title="Por estado (top 10)" rows={scope.byState} maxTotal={maxState} variant={variant} />

      <section className="rounded-xl border border-brand-700 bg-brand-900/40 p-4">
        <h3 className="text-sm font-bold text-white">Validações por horário (30 min)</h3>
        {scope.byCheckInHour.length === 0 ? (
          <p className="mt-2 text-xs text-brand-400">Nenhuma validação registrada</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {scope.byCheckInHour.map((row) => (
              <HourBar key={row.label} {...row} maxCount={maxHour} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
