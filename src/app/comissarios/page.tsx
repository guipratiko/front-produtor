"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Plus, Trash2 } from "lucide-react";
import { useProducer } from "@/context/ProducerContext";
import { api } from "@/lib/api";

type TicketOption = { id: string; name: string; price: number };

type CommissionerRow = {
  id: string;
  code: string;
  active: boolean;
  validUntil: string | null;
  courtesyMode: "none" | "immediate" | "on_goal";
  courtesyGoal: number | null;
  courtesyTicketTierId: string | null;
  courtesyIssuedAt: string | null;
  userEmail: string;
  userName: string;
  link: string;
  ordersCount: number;
  ticketsSold: number;
  revenue: number;
};

const emptyForm = {
  email: "",
  validUntil: "",
  courtesyMode: "none" as "none" | "immediate" | "on_goal",
  courtesyGoal: "3",
  courtesyTicketTierId: "",
};

function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function courtesyLabel(mode: CommissionerRow["courtesyMode"], goal: number | null) {
  if (mode === "immediate") return "Cortesia ao cadastrar";
  if (mode === "on_goal") return `Cortesia após ${goal ?? "?"} vendas`;
  return "Sem cortesia";
}

export default function ComissariosPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, producer, selectedEventId, setSelectedEventId } = useProducer();
  const [commissioners, setCommissioners] = useState<CommissionerRow[]>([]);
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const [commRes, ticketsRes] = await Promise.all([
        api<{ commissioners: CommissionerRow[] }>(
          `/producer/events/${selectedEventId}/commissioners`,
        ),
        api<{ tickets: TicketOption[] }>(`/producer/events/${selectedEventId}/tickets`),
      ]);
      setCommissioners(commRes.commissioners);
      setTickets(ticketsRes.tickets);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && selectedEventId) {
      setForm(emptyForm);
      void load();
    }
  }, [isAuthenticated, selectedEventId, load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setError(null);
    setSaving(true);
    try {
      await api(`/producer/events/${selectedEventId}/commissioners`, {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          validUntil: form.validUntil || null,
          courtesyMode: form.courtesyMode,
          courtesyGoal:
            form.courtesyMode === "on_goal" ? Number(form.courtesyGoal) : null,
          courtesyTicketTierId:
            form.courtesyMode !== "none" ? form.courtesyTicketTierId || null : null,
        }),
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar comissário");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: CommissionerRow) => {
    if (!selectedEventId) return;
    await api(`/producer/events/${selectedEventId}/commissioners/${row.id}`, {
      method: "PUT",
      body: JSON.stringify({ active: !row.active }),
    });
    await load();
  };

  const handleDelete = async (row: CommissionerRow) => {
    if (!selectedEventId) return;
    if (!confirm(`Remover comissário ${row.userName}?`)) return;
    await api(`/producer/events/${selectedEventId}/commissioners/${row.id}`, {
      method: "DELETE",
    });
    await load();
  };

  const copyLink = async (row: CommissionerRow) => {
    try {
      await navigator.clipboard.writeText(row.link);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Não foi possível copiar o link");
    }
  };

  return (
    <div className="min-h-dvh pb-8">
      <header className="border-b border-brand-800 bg-brand-950/95 px-4 py-3">
        <Link href="/painel" className="inline-flex items-center gap-1 text-sm text-brand-300">
          <ArrowLeft className="h-4 w-4" />
          Painel
        </Link>
        <h1 className="mt-2 text-lg font-bold text-white">Comissários</h1>
        <p className="text-xs text-brand-300">
          Link exclusivo por pessoa — vendas confirmadas são atribuídas ao comissário
        </p>
        {producer && producer.events.length > 0 && (
          <select
            value={selectedEventId ?? ""}
            onChange={(e) => setSelectedEventId(e.target.value || null)}
            className="mt-3 w-full rounded-lg border border-brand-700 bg-brand-900 px-3 py-2 text-sm text-white"
          >
            {producer.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        )}
      </header>

      <main className="px-4 py-6">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white"
        >
          <Plus className="h-5 w-5" />
          Novo comissário
        </button>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mt-4 space-y-4 rounded-xl border border-brand-700 bg-brand-900/50 p-4"
          >
            <div>
              <label className="text-sm font-semibold text-white">E-mail do cliente Uai Tickets</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
                placeholder="comissario@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Validade do link (opcional)</label>
              <input
                type="datetime-local"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Cortesia (opcional)</label>
              <select
                value={form.courtesyMode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    courtesyMode: e.target.value as typeof form.courtesyMode,
                  })
                }
                className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
              >
                <option value="none">Sem cortesia</option>
                <option value="immediate">Emitir ao cadastrar</option>
                <option value="on_goal">Emitir ao atingir meta de vendas</option>
              </select>
            </div>

            {form.courtesyMode === "on_goal" && (
              <div>
                <label className="text-sm font-semibold text-white">Meta de vendas</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.courtesyGoal}
                  onChange={(e) => setForm({ ...form, courtesyGoal: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
                />
              </div>
            )}

            {form.courtesyMode !== "none" && (
              <div>
                <label className="text-sm font-semibold text-white">Tipo de ingresso (cortesia)</label>
                <select
                  required
                  value={form.courtesyTicketTierId}
                  onChange={(e) =>
                    setForm({ ...form, courtesyTicketTierId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
                >
                  <option value="">Selecione</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — R$ {t.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Cadastrar e gerar link"}
            </button>
          </form>
        )}

        <section className="mt-6 space-y-3">
          {loading ? (
            <p className="text-center text-sm text-brand-300">Carregando...</p>
          ) : commissioners.length === 0 ? (
            <p className="rounded-xl border border-brand-800 bg-brand-900/40 p-6 text-center text-sm text-brand-300">
              Nenhum comissário cadastrado para este evento.
            </p>
          ) : (
            commissioners.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-brand-700 bg-brand-900/50 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{row.userName}</p>
                    <p className="truncate text-xs text-brand-300">{row.userEmail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      row.active ? "bg-emerald-900/60 text-emerald-300" : "bg-brand-800 text-brand-400"
                    }`}
                  >
                    {row.active ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-brand-950/80 p-2">
                    <dt className="text-brand-400">Vendas</dt>
                    <dd className="font-bold text-white">{row.ordersCount}</dd>
                  </div>
                  <div className="rounded-lg bg-brand-950/80 p-2">
                    <dt className="text-brand-400">Ingressos</dt>
                    <dd className="font-bold text-white">{row.ticketsSold}</dd>
                  </div>
                  <div className="rounded-lg bg-brand-950/80 p-2">
                    <dt className="text-brand-400">Bilheteria</dt>
                    <dd className="font-bold text-white">{formatMoney(row.revenue)}</dd>
                  </div>
                </dl>

                <p className="mt-3 text-xs text-brand-400">
                  {courtesyLabel(row.courtesyMode, row.courtesyGoal)}
                  {row.courtesyIssuedAt ? " · cortesia emitida" : ""}
                </p>
                {row.validUntil && (
                  <p className="mt-1 text-xs text-brand-400">
                    Válido até {new Date(row.validUntil).toLocaleString("pt-BR")}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copyLink(row)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-brand-600 py-2 text-xs font-semibold text-brand-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === row.id ? "Copiado!" : "Copiar link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(row)}
                    className="rounded-lg border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-100"
                  >
                    {row.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(row)}
                    className="rounded-lg border border-red-900/60 px-3 py-2 text-red-400"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
