"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { useProducer } from "@/context/ProducerContext";

export default function LoginPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, login } = useProducer();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) router.replace("/painel");
  }, [isReady, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) router.push("/painel");
    else setError(result.error ?? "Falha no login");
  };

  if (!isReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-brand-100">
        Conectando...
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Painel do produtor</h1>
          <p className="mt-2 text-sm text-brand-100">Métricas, cortesias e envio em massa</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-100">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-brand-700 bg-brand-950 px-4 py-3 text-white outline-none focus:border-brand-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-100">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-brand-700 bg-brand-950 px-4 py-3 text-white outline-none focus:border-brand-500"
              required
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-200">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-3.5 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
