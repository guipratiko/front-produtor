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
  validFrom: string | null;
  validUntil: string | null;
  discountPercent: number;
  maxUses: number;
  usedCount: number;
  maxUsesPerBuyer: number;
  discountTicketTierIds: string[];
  discountTicketTierNames: string[];
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
  validFrom: "",
  validUntil: "",
  discountPercent: "0",
  maxUses: "50",
  maxUsesPerBuyer: "4",
  discountTicketTierIds: [] as string[],
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

  const loadTickets = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const ticketsRes = await api<{ tickets: TicketOption[] }>(
        `/producer/events/${selectedEventId}/tickets`,
      );
      setTickets(ticketsRes.tickets);
      if (ticketsRes.tickets[0]) {
        setForm((prev) =>
          prev.courtesyTicketTierId
            ? prev
            : { ...prev, courtesyTicketTierId: ticketsRes.tickets[0].id },
        );
      }
    } catch {
      setTickets([]);
    }
  }, [selectedEventId]);

  const load = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const commRes = await api<{ commissioners: CommissionerRow[] }>(
        `/producer/events/${selectedEventId}/commissioners`,
      );
      setCommissioners(commRes.commissioners);
    } catch {
      setCommissioners([]);
    } finally {
      setLoading(false);
    }
    await loadTickets();
  }, [selectedEventId, loadTickets]);

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

  const toggleDiscountTier = (id: string) => {
    setForm((prev) => ({
      ...prev,
      discountTicketTierIds: prev.discountTicketTierIds.includes(id)
        ? prev.discountTicketTierIds.filter((x) => x !== id)
        : [...prev.discountTicketTierIds, id],
    }));
  };

  const selectAllDiscountTiers = () => {
    setForm((prev) => ({
      ...prev,
      discountTicketTierIds: tickets.map((t) => t.id),
    }));
  };

  const hasDiscount = Number(form.discountPercent) > 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    if (hasDiscount && form.discountTicketTierIds.length === 0) {
      setError("Selecione ao menos um tipo de ingresso para o desconto");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api(`/producer/events/${selectedEventId}/commissioners`, {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          validFrom: form.validFrom || null,
          validUntil: form.validUntil || null,
          discountPercent: Number(form.discountPercent),
          maxUses: hasDiscount ? Number(form.maxUses) : undefined,
          maxUsesPerBuyer: hasDiscount ? Number(form.maxUsesPerBuyer) : undefined,
          discountTicketTierIds: hasDiscount ? form.discountTicketTierIds : [],
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
        <div className="mx-auto max-w-lg">
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
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-white">Válido de (opcional)</label>
                <input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-white">Válido até (opcional)</label>
                <input
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-white">
                Desconto no link (0% = só rastreio)
              </label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
              />
            </div>

            {hasDiscount && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-white">Usos do desconto</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={form.maxUses}
                      onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-white">Limite por comprador</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={form.maxUsesPerBuyer}
                      onChange={(e) =>
                        setForm({ ...form, maxUsesPerBuyer: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-950 px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <fieldset>
                  <div className="flex items-center justify-between">
                    <legend className="text-sm font-semibold text-white">
                      Tipos com desconto
                    </legend>
                    <button
                      type="button"
                      onClick={selectAllDiscountTiers}
                      className="text-xs text-brand-300 underline"
                    >
                      Selecionar todos
                    </button>
                  </div>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                    {tickets.length === 0 ? (
                      <li className="p-2 text-sm text-brand-400">Nenhum lote ativo à venda.</li>
                    ) : (
                      tickets.map((t) => (
                        <li key={t.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm text-brand-100 hover:bg-brand-900">
                            <input
                              type="checkbox"
                              checked={form.discountTicketTierIds.includes(t.id)}
                              onChange={() => toggleDiscountTier(t.id)}
                            />
                            {t.name} — R$ {t.price.toFixed(2)}
                          </label>
                        </li>
                      ))
                    )}
                  </ul>
                </fieldset>
              </>
            )}

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
                  className="mt-1 w-full rounded-xl border border-brand-700 bg-brand-900 px-3 py-2.5 text-sm text-white"
                >
                  {tickets.length === 0 ? (
                    <option value="">Nenhum lote ativo à venda</option>
                  ) : (
                    tickets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — R$ {t.price.toFixed(2)}
                      </option>
                    ))
                  )}
                </select>
                {tickets.length === 0 && (
                  <p className="mt-1 text-xs text-amber-400">
                    Ative um lote à venda em Virada de lotes para emitir cortesia.
                  </p>
                )}
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
                  {row.discountPercent > 0
                    ? `Desconto ${row.discountPercent}% · ${row.usedCount}/${row.maxUses} usos`
                    : "Sem desconto (só rastreio)"}
                </p>
                {row.discountPercent > 0 && row.discountTicketTierNames.length > 0 && (
                  <p className="mt-1 text-xs text-brand-400">
                    Em: {row.discountTicketTierNames.join(", ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-brand-400">
                  {courtesyLabel(row.courtesyMode, row.courtesyGoal)}
                  {row.courtesyIssuedAt ? " · cortesia emitida" : ""}
                </p>
                {(row.validFrom || row.validUntil) && (
                  <p className="mt-1 text-xs text-brand-400">
                    {row.validFrom
                      ? `De ${new Date(row.validFrom).toLocaleString("pt-BR")}`
                      : ""}
                    {row.validFrom && row.validUntil ? " · " : ""}
                    {row.validUntil
                      ? `Até ${new Date(row.validUntil).toLocaleString("pt-BR")}`
                      : ""}
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
