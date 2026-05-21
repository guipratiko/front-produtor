"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { useProducer } from "@/context/ProducerContext";
import { api } from "@/lib/api";

type LotRow = {
  id: string;
  name: string;
  price: number;
  available: number;
  sortOrder: number;
  status: "scheduled" | "active" | "closed";
  activateAt: string | null;
  maxSales: number | null;
  soldCount: number;
  countCourtesyInCap: boolean;
};

const statusLabel: Record<LotRow["status"], string> = {
  active: "À venda",
  scheduled: "Agendado",
  closed: "Encerrado",
};

export default function LotesPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, selectedEventId } = useProducer();
  const [lots, setLots] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    price: "",
    activateAt: "",
    maxSales: "",
    countCourtesyInCap: false,
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated, router]);

  const loadLots = () => {
    if (!selectedEventId) return;
    setLoading(true);
    api<{ lots: LotRow[] }>(`/producer/events/${selectedEventId}/lots`)
      .then((d) => setLots(d.lots))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLots();
  }, [selectedEventId]);

  const startEdit = (lot: LotRow) => {
    if (lot.status === "closed") return;
    setEditingId(lot.id);
    setForm({
      price: String(lot.price),
      activateAt: lot.activateAt ? lot.activateAt.slice(0, 16) : "",
      maxSales: lot.maxSales != null ? String(lot.maxSales) : "",
      countCourtesyInCap: lot.countCourtesyInCap,
    });
    setMessage(null);
  };

  const saveLot = async (lotId: string) => {
    if (!selectedEventId) return;
    setMessage(null);
    try {
      await api(`/producer/events/${selectedEventId}/lots/${lotId}`, {
        method: "PUT",
        body: JSON.stringify({
          price: Number(form.price),
          activateAt: form.activateAt ? new Date(form.activateAt).toISOString() : null,
          maxSales: form.maxSales ? Number(form.maxSales) : null,
          countCourtesyInCap: form.countCourtesyInCap,
        }),
      });
      setEditingId(null);
      setMessage("Lote atualizado.");
      loadLots();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const cancelLot = async (lotId: string) => {
    if (!selectedEventId || !confirm("Cancelar este lote futuro?")) return;
    try {
      await api(`/producer/events/${selectedEventId}/lots/${lotId}/cancel`, {
        method: "POST",
      });
      setMessage("Lote cancelado.");
      loadLots();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="min-h-dvh pb-10">
      <header className="flex items-center gap-3 border-b border-brand-800 px-4 py-3">
        <Link href="/painel" className="rounded-lg p-2 text-brand-200 hover:bg-brand-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-white">Virada de lotes</h1>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <p className="text-xs text-brand-300">
          O lote ativo vira automaticamente quando atingir a quantidade vendida (e cortesias, se
          marcado) <strong>ou</strong> a data configurada — o que ocorrer primeiro. O preço de cada
          lote deve ser maior que o anterior. Estoque usa o <em>available</em> cadastrado no admin.
        </p>

        {loading ? (
          <p className="text-brand-200">Carregando...</p>
        ) : (
          <ul className="space-y-3">
            {lots.map((lot) => (
              <li
                key={lot.id}
                className={`rounded-xl border p-4 ${
                  lot.status === "active"
                    ? "border-emerald-500/50 bg-emerald-950/30"
                    : "border-brand-700 bg-brand-950/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{lot.name}</p>
                    <p className="text-sm text-brand-200">
                      R$ {lot.price.toFixed(2)} · {lot.available} no estoque
                    </p>
                    <span
                      className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        lot.status === "active"
                          ? "bg-emerald-600 text-white"
                          : lot.status === "scheduled"
                            ? "bg-amber-600/80 text-white"
                            : "bg-slate-600 text-slate-200"
                      }`}
                    >
                      {statusLabel[lot.status]}
                    </span>
                  </div>
                  <Layers className="h-5 w-5 shrink-0 text-brand-400" />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-brand-300">
                  <div>
                    <dt>Vendidos (contagem)</dt>
                    <dd className="font-semibold text-white">
                      {lot.soldCount}
                      {lot.maxSales != null ? ` / ${lot.maxSales}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Virada por data</dt>
                    <dd className="text-white">
                      {lot.activateAt
                        ? new Date(lot.activateAt).toLocaleString("pt-BR")
                        : "—"}
                    </dd>
                  </div>
                </dl>

                {lot.status !== "closed" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(lot)}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Configurar
                    </button>
                    {lot.status === "scheduled" && (
                      <button
                        type="button"
                        onClick={() => cancelLot(lot.id)}
                        className="rounded-lg border border-red-500/50 px-3 py-1.5 text-xs text-red-300"
                      >
                        Cancelar lote
                      </button>
                    )}
                  </div>
                )}

                {editingId === lot.id && (
                  <div className="mt-4 space-y-3 border-t border-brand-700 pt-4">
                    <label className="block text-xs text-brand-300">
                      Preço (R$)
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-white"
                      />
                    </label>
                    <label className="block text-xs text-brand-300">
                      Virar nesta data (opcional)
                      <input
                        type="datetime-local"
                        value={form.activateAt}
                        onChange={(e) => setForm({ ...form, activateAt: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-white"
                      />
                    </label>
                    <label className="block text-xs text-brand-300">
                      Virar após quantidade (opcional)
                      <input
                        type="number"
                        min={1}
                        value={form.maxSales}
                        onChange={(e) => setForm({ ...form, maxSales: e.target.value })}
                        placeholder="Ex.: 100"
                        className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-white"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-brand-200">
                      <input
                        type="checkbox"
                        checked={form.countCourtesyInCap}
                        onChange={(e) =>
                          setForm({ ...form, countCourtesyInCap: e.target.checked })
                        }
                      />
                      Contar cortesias na quantidade para virada
                    </label>
                    <button
                      type="button"
                      onClick={() => saveLot(lot.id)}
                      className="w-full rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white"
                    >
                      Salvar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {message && (
          <p className="rounded-lg bg-brand-900 px-3 py-2 text-sm text-brand-100">{message}</p>
        )}
      </main>
    </div>
  );
}
