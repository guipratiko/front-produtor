"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useProducer } from "@/context/ProducerContext";
import { api } from "@/lib/api";

type TicketTier = { id: string; name: string; available: number };

type CourtesyLog = {
  id: string;
  ticketName: string;
  quantity: number;
  createdAt: string;
};

export default function CortesiaPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, selectedEventId } = useProducer();
  const [password, setPassword] = useState("");
  const [ticketTierId, setTicketTierId] = useState("");
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [logs, setLogs] = useState<CourtesyLog[]>([]);
  const [holderName, setHolderName] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (!selectedEventId) return;
    api<{ tickets: TicketTier[] }>(`/producer/events/${selectedEventId}/tickets`).then((d) => {
      setTiers(d.tickets);
      if (d.tickets[0]) setTicketTierId(d.tickets[0].id);
    });
    api<{ logs: CourtesyLog[] }>(`/producer/events/${selectedEventId}/courtesy-logs`).then((d) =>
      setLogs(d.logs),
    );
  }, [selectedEventId]);

  const parseBulk = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.map((line) => {
      const [name, email] = line.split(/[,;]/).map((s) => s.trim());
      return { holderName: name, holderEmail: email };
    });
  };

  const handleSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await api<{ result: { issued: number; emailsSent: number } }>(
        `/producer/events/${selectedEventId}/courtesy`,
        {
          method: "POST",
          body: JSON.stringify({
            password,
            ticketTierId,
            holderName,
            holderEmail,
            sendEmail: true,
          }),
        },
      );
      setMessage(`Cortesia emitida. E-mails enviados: ${data.result.emailsSent}`);
      setHolderName("");
      setHolderEmail("");
      const logsData = await api<{ logs: CourtesyLog[] }>(
        `/producer/events/${selectedEventId}/courtesy-logs`,
      );
      setLogs(logsData.logs);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const handleBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const recipients = parseBulk();
    if (recipients.length === 0) {
      setMessage("Informe a lista (nome,email por linha)");
      return;
    }
    if (recipients.length > 100) {
      setMessage("Máximo 100 por lote");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const data = await api<{ result: { issued: number; emailsSent: number } }>(
        `/producer/events/${selectedEventId}/courtesy/bulk`,
        {
          method: "POST",
          body: JSON.stringify({
            password,
            ticketTierId,
            recipients,
            sendEmail: true,
          }),
        },
      );
      setMessage(
        `${data.result.issued} cortesias emitidas. E-mails: ${data.result.emailsSent}`,
      );
      setBulkText("");
      const logsData = await api<{ logs: CourtesyLog[] }>(
        `/producer/events/${selectedEventId}/courtesy-logs`,
      );
      setLogs(logsData.logs);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh pb-10">
      <header className="flex items-center gap-3 border-b border-brand-800 px-4 py-3">
        <Link href="/painel" className="rounded-lg p-2 text-brand-200 hover:bg-brand-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-white">Cortesias</h1>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <p className="text-xs text-brand-300">
          Confirme com sua senha de produtor. Cada emissão fica registrada no histórico.
        </p>

        <input
          type="password"
          placeholder="Sua senha de produtor"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-brand-700 bg-brand-950 px-4 py-3 text-white"
        />

        <select
          value={ticketTierId}
          onChange={(e) => setTicketTierId(e.target.value)}
          className="w-full rounded-xl border border-brand-700 bg-brand-900 px-3 py-2.5 text-sm text-white"
        >
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.available} disp.)
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("single")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${tab === "single" ? "bg-brand-500 text-white" : "bg-brand-900 text-brand-200"}`}
          >
            Uma cortesia
          </button>
          <button
            type="button"
            onClick={() => setTab("bulk")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${tab === "bulk" ? "bg-brand-500 text-white" : "bg-brand-900 text-brand-200"}`}
          >
            Em massa (máx. 100)
          </button>
        </div>

        {tab === "single" ? (
          <form onSubmit={handleSingle} className="space-y-3">
            <input
              placeholder="Nome do titular"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="w-full rounded-xl border border-brand-700 bg-brand-950 px-4 py-3 text-white"
              required
            />
            <input
              type="email"
              placeholder="E-mail"
              value={holderEmail}
              onChange={(e) => setHolderEmail(e.target.value)}
              className="w-full rounded-xl border border-brand-700 bg-brand-950 px-4 py-3 text-white"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Emitindo..." : "Emitir e enviar e-mail"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleBulk} className="space-y-3">
            <textarea
              placeholder={"Nome, email@exemplo.com\nOutro Nome, outro@email.com"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-brand-700 bg-brand-950 px-4 py-3 text-sm text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Processando..." : "Emitir lote e enviar e-mails"}
            </button>
          </form>
        )}

        {message && (
          <p className="rounded-lg bg-brand-900 px-3 py-2 text-sm text-brand-100">{message}</p>
        )}

        <section>
          <h2 className="text-sm font-bold text-white">Seu histórico de cortesias</h2>
          <ul className="mt-3 space-y-2">
            {logs.length === 0 ? (
              <li className="text-sm text-brand-400">Nenhuma cortesia emitida ainda.</li>
            ) : (
              logs.map((l) => (
                <li
                  key={l.id}
                  className="rounded-lg border border-brand-800 bg-brand-950/50 px-3 py-2 text-xs text-brand-200"
                >
                  {l.quantity}× {l.ticketName} —{" "}
                  {new Date(l.createdAt).toLocaleString("pt-BR")}
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
