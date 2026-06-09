"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, LogOut, Gift, Layers, Tag, UserPlus, Wifi, WifiOff } from "lucide-react";
import { useProducer } from "@/context/ProducerContext";
import { useStatsWebSocket } from "@/hooks/useStatsWebSocket";
import { SalesPeriodChart } from "@/components/sales/SalesPeriodChart";

function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PainelPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, producer, selectedEventId, setSelectedEventId, logout } =
    useProducer();
  const { stats, connected } = useStatsWebSocket(selectedEventId);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated, router]);

  if (!isReady || !producer) {
    return <div className="flex min-h-dvh items-center justify-center text-brand-100">Carregando...</div>;
  }

  const event = producer.events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-dvh pb-8">
      <header className="border-b border-brand-800 bg-brand-950/95 px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-brand-300">{producer.name}</p>
            <h1 className="truncate text-lg font-bold text-white">Painel do produtor</h1>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Wifi className="h-3.5 w-3.5" /> ao vivo
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <WifiOff className="h-3.5 w-3.5" /> reconectando
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="rounded-lg p-2 text-brand-200 hover:bg-brand-800"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl">
          {producer.events.length > 1 && (
            <select
              value={selectedEventId ?? ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-brand-700 bg-brand-900 px-3 py-2 text-sm text-white lg:max-w-md"
            >
              {producer.events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          )}
          {event && <p className="mt-1 truncate text-xs text-brand-300">{event.venue}</p>}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 lg:max-w-6xl">
        {stats ? (
          <>
            <h2 className="text-sm font-semibold text-brand-200 lg:text-base">{stats.eventTitle}</h2>

            <div className="mt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 xl:gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <StatCard label="Emitidos" value={String(stats.total)} />
                  <StatCard label="Validados" value={String(stats.checkedIn)} highlight />
                  <StatCard label="Pendentes" value={String(stats.pending)} />
                  <StatCard label="Vendidos" value={String(stats.sold)} />
                  <StatCard label="Cortesias" value={String(stats.courtesy)} />
                  <StatCard label="Suas cortesias" value={String(stats.myCourtesyIssued)} />
                </div>
                <section className="rounded-2xl border border-brand-700 bg-brand-900/50 p-4">
                  <h3 className="text-sm font-bold text-white">Financeiro (relatório)</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-brand-300">Bilheteria vendida</dt>
                      <dd>{formatMoney(stats.grossSales)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-brand-300">Taxas ao comprador</dt>
                      <dd>{formatMoney(stats.buyerFees)}</dd>
                    </div>
                    <div className="flex justify-between font-semibold text-amber-200">
                      <dt>Comissão Uai ({stats.platformFeePercent}%)</dt>
                      <dd>{formatMoney(stats.platformFee)}</dd>
                    </div>
                    {(stats.couponDiscounts ?? 0) > 0 && (
                      <div className="flex justify-between text-rose-300">
                        <dt>Descontos (cupons)</dt>
                        <dd>−{formatMoney(stats.couponDiscounts ?? 0)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-brand-700 pt-2 font-bold text-emerald-300">
                      <dt>Repasse estimado</dt>
                      <dd>{formatMoney(stats.producerNet ?? stats.grossSales - stats.platformFee)}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              {stats.salesByDay && stats.salesByMonth && (
                <div className="mt-6 grid gap-4 lg:mt-0 lg:grid-cols-2 lg:gap-4">
                  <SalesPeriodChart
                    title="Vendas por dia"
                    subtitle="Últimos 30 dias · data do pagamento"
                    rows={stats.salesByDay}
                  />
                  <SalesPeriodChart
                    title="Vendas por mês"
                    subtitle="Últimos 12 meses · bilheteria do evento"
                    rows={stats.salesByMonth}
                  />
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-[10px] text-brand-400 lg:mt-6">
              Atualizado {new Date(stats.updatedAt).toLocaleTimeString("pt-BR")}
            </p>
          </>
        ) : (
          <p className="text-center text-brand-300">Conectando métricas...</p>
        )}

        <div className="mt-8 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/relatorios"
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-600 bg-brand-900/60 py-3.5 font-semibold text-white"
          >
            <BarChart3 className="h-5 w-5" />
            Comparecimento
          </Link>
          <Link
            href="/lotes"
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-600 bg-brand-900/60 py-3.5 font-semibold text-white"
          >
            <Layers className="h-5 w-5" />
            Virada de lotes
          </Link>
          <Link
            href="/cupons"
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-600 bg-brand-900/60 py-3.5 font-semibold text-white"
          >
            <Tag className="h-5 w-5" />
            Cupons de desconto
          </Link>
          <Link
            href="/comissarios"
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-600 bg-brand-900/60 py-3.5 font-semibold text-white"
          >
            <UserPlus className="h-5 w-5" />
            Comissários
          </Link>
          <Link
            href="/cortesia"
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 font-semibold text-white"
          >
            <Gift className="h-5 w-5" />
            Cortesias e envio em massa
          </Link>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight ? "border-emerald-500/50 bg-emerald-950/40" : "border-brand-700 bg-brand-950/60"}`}
    >
      <p className="text-[10px] uppercase tracking-wide text-brand-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
