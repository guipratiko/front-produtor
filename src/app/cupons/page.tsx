"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Tag, Plus, Trash2 } from "lucide-react";
import { useProducer } from "@/context/ProducerContext";
import { api } from "@/lib/api";

type TicketOption = { id: string; name: string; price: number };

type CouponRow = {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  maxUses: number;
  usedCount: number;
  maxUsesPerBuyer: number;
  validFrom: string | null;
  validUntil: string | null;
  ticketTierIds: string[];
  ticketTierNames: string[];
};

const emptyForm = {
  code: "",
  discountPercent: "10",
  maxUses: "50",
  maxUsesPerBuyer: "4",
  validFrom: "",
  validUntil: "",
  ticketTierIds: [] as string[],
};

export default function CuponsPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, selectedEventId } = useProducer();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const [couponsRes, ticketsRes] = await Promise.all([
        api<{ coupons: CouponRow[] }>(`/events/${selectedEventId}/coupons`),
        api<{ tickets: TicketOption[] }>(`/events/${selectedEventId}/tickets`),
      ]);
      setCoupons(couponsRes.coupons);
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
    if (isAuthenticated && selectedEventId) void load();
  }, [isAuthenticated, selectedEventId, load]);

  const toggleTier = (id: string) => {
    setForm((prev) => ({
      ...prev,
      ticketTierIds: prev.ticketTierIds.includes(id)
        ? prev.ticketTierIds.filter((x) => x !== id)
        : [...prev.ticketTierIds, id],
    }));
  };

  const selectAllTiers = () => {
    setForm((prev) => ({
      ...prev,
      ticketTierIds: tickets.map((t) => t.id),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setError(null);
    setSaving(true);
    try {
      await api(`/events/${selectedEventId}/coupons`, {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          discountPercent: Number(form.discountPercent),
          maxUses: Number(form.maxUses),
          maxUsesPerBuyer: Number(form.maxUsesPerBuyer),
          validFrom: form.validFrom || null,
          validUntil: form.validUntil || null,
          ticketTierIds: form.ticketTierIds,
        }),
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cupom");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: CouponRow) => {
    if (!selectedEventId) return;
    await api(`/events/${selectedEventId}/coupons/${coupon.id}`, {
      method: "PUT",
      body: JSON.stringify({ active: !coupon.active }),
    });
    await load();
  };

  const handleDelete = async (coupon: CouponRow) => {
    if (!selectedEventId) return;
    if (!window.confirm(`Excluir cupom ${coupon.code}?`)) return;
    await api(`/events/${selectedEventId}/coupons/${coupon.id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="min-h-dvh pb-8">
      <header className="border-b border-brand-800 bg-brand-950/95 px-4 py-3">
        <Link href="/painel" className="inline-flex items-center gap-1 text-sm text-brand-300">
          <ArrowLeft className="h-4 w-4" /> Painel
        </Link>
        <h1 className="mt-2 text-lg font-bold text-white">Cupons de desconto</h1>
        <p className="text-xs text-brand-300">Até 20% — desconto sai do seu repasse</p>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {loading ? (
          <p className="text-brand-300">Carregando...</p>
        ) : (
          <>
            {!showForm ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-semibold text-white"
              >
                <Plus className="h-5 w-5" /> Novo cupom
              </button>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-brand-700 bg-brand-950/60 p-4">
                <h2 className="font-semibold text-white">Novo cupom</h2>
                <label className="block text-sm text-brand-200">
                  Código
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    required
                    className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-900 px-3 py-2 text-white"
                    placeholder="VERAO20"
                  />
                </label>
                <label className="block text-sm text-brand-200">
                  Desconto (%)
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={0.5}
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                    required
                    className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-900 px-3 py-2 text-white"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm text-brand-200">
                    Quantidade total
                    <input
                      type="number"
                      min={1}
                      value={form.maxUses}
                      onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                      required
                      className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-900 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block text-sm text-brand-200">
                    Limite por e-mail/CPF
                    <input
                      type="number"
                      min={1}
                      value={form.maxUsesPerBuyer}
                      onChange={(e) => setForm({ ...form, maxUsesPerBuyer: e.target.value })}
                      required
                      className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-900 px-3 py-2 text-white"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm text-brand-200">
                    Válido de (opcional)
                    <input
                      type="datetime-local"
                      value={form.validFrom}
                      onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-900 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block text-sm text-brand-200">
                    Válido até (opcional)
                    <input
                      type="datetime-local"
                      value={form.validUntil}
                      onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-brand-700 bg-brand-900 px-3 py-2 text-white"
                    />
                  </label>
                </div>
                <fieldset>
                  <div className="flex items-center justify-between">
                    <legend className="text-sm font-semibold text-white">Tipos de ingresso</legend>
                    <button type="button" onClick={selectAllTiers} className="text-xs text-brand-300 underline">
                      Selecionar todos
                    </button>
                  </div>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {tickets.map((t) => (
                      <li key={t.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm text-brand-100 hover:bg-brand-900">
                          <input
                            type="checkbox"
                            checked={form.ticketTierIds.includes(t.id)}
                            onChange={() => toggleTier(t.id)}
                          />
                          {t.name} — R$ {t.price.toFixed(2)}
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || form.ticketTierIds.length === 0}
                    className="flex-1 rounded-lg bg-brand-500 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Criar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setError(null);
                    }}
                    className="rounded-lg border border-brand-600 px-4 py-2 text-brand-200"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <ul className="mt-6 space-y-3">
              {coupons.length === 0 ? (
                <li className="text-center text-brand-400">
                  <Tag className="mx-auto h-10 w-10 opacity-40" />
                  <p className="mt-2">Nenhum cupom cadastrado.</p>
                </li>
              ) : (
                coupons.map((c) => (
                  <li key={c.id} className="rounded-xl border border-brand-700 bg-brand-950/60 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-bold text-white">{c.code}</p>
                        <p className="text-sm text-brand-300">
                          {c.discountPercent}% · {c.usedCount}/{c.maxUses} usos · máx {c.maxUsesPerBuyer}/comprador
                        </p>
                        <p className="mt-1 text-xs text-brand-400">{c.ticketTierNames.join(", ")}</p>
                        {!c.active && (
                          <span className="mt-2 inline-block rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-200">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => toggleActive(c)}
                          className="text-xs text-brand-300 underline"
                        >
                          {c.active ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="text-red-400"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
