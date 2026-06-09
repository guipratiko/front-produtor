"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { useProducer } from "@/context/ProducerContext";
import { useStatsWebSocket } from "@/hooks/useStatsWebSocket";
import { AttendanceScopeView } from "@/components/attendance/AttendanceSections";

type Tab = "sale" | "all";

export default function RelatoriosPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, producer, selectedEventId, setSelectedEventId } = useProducer();
  const { stats, connected } = useStatsWebSocket(selectedEventId);
  const [tab, setTab] = useState<Tab>("sale");

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated, router]);

  if (!isReady || !producer) {
    return <div className="flex min-h-dvh items-center justify-center text-brand-100">Carregando...</div>;
  }

  const attendance = stats?.attendance;
  const scope = attendance ? (tab === "sale" ? attendance.sale : attendance.all) : null;

  return (
    <div className="min-h-dvh pb-10">
      <header className="border-b border-brand-800 bg-brand-950/95 px-4 py-3">
        <div className="mx-auto max-w-6xl">
          <Link href="/painel" className="inline-flex items-center gap-1 text-sm text-brand-300">
            <ArrowLeft className="h-4 w-4" />
            Painel
          </Link>
          <div className="mt-2 flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-white">Comparecimento</h1>
            {connected ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Wifi className="h-3.5 w-3.5" /> ao vivo
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <WifiOff className="h-3.5 w-3.5" /> reconectando
              </span>
            )}
          </div>
          <p className="text-xs text-brand-300">
            Validações no check-in — atualização em tempo real
          </p>
          {producer.events.length > 0 && (
            <select
              value={selectedEventId ?? ""}
              onChange={(e) => setSelectedEventId(e.target.value || null)}
              className="mt-3 w-full rounded-lg border border-brand-700 bg-brand-900 px-3 py-2 text-sm text-white lg:max-w-md"
            >
              {producer.events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 lg:max-w-6xl">
        {!attendance || !scope ? (
          <p className="text-center text-sm text-brand-300">Conectando relatório...</p>
        ) : (
          <>
            <div className="flex gap-2 lg:max-w-md">
              <button
                type="button"
                onClick={() => setTab("sale")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                  tab === "sale" ? "bg-brand-500 text-white" : "bg-brand-900 text-brand-200"
                }`}
              >
                Vendas
              </button>
              <button
                type="button"
                onClick={() => setTab("all")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                  tab === "all" ? "bg-brand-500 text-white" : "bg-brand-900 text-brand-200"
                }`}
              >
                Todos emitidos
              </button>
            </div>

            <div className="mt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
              <AttendanceScopeView scope={scope} />

              <div className="mt-8 lg:mt-0">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-300">
                  Cortesias (destaque)
                </h2>
                <AttendanceScopeView scope={attendance.courtesy} variant="courtesy" />
              </div>
            </div>

            <p className="mt-6 text-center text-[10px] text-brand-400 lg:mt-8">
              Atualizado{" "}
              {new Date(attendance.updatedAt).toLocaleTimeString("pt-BR")}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
