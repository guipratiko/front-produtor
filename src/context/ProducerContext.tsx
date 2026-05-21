"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken, type ProducerEvent } from "@/lib/api";

type ProducerProfile = {
  id: string;
  email: string;
  name: string;
  events: ProducerEvent[];
};

type ProducerContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  producer: ProducerProfile | null;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const ProducerContext = createContext<ProducerContextValue | null>(null);

export function ProducerProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [producer, setProducer] = useState<ProducerProfile | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setProducer(null);
      return;
    }
    try {
      const data = await api<{ producer: ProducerProfile }>("/auth/me");
      setProducer(data.producer);
      if (data.producer.events.length > 0) {
        setSelectedEventId((prev) =>
          prev && data.producer.events.some((e) => e.id === prev)
            ? prev
            : data.producer.events[0].id,
        );
      }
    } catch {
      setToken(null);
      setProducer(null);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setProducer(null);
      setIsReady(true);
      return;
    }
    refresh().finally(() => setIsReady(true));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await api<{ token: string; producer: ProducerProfile }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setProducer(data.producer);
      if (data.producer.events.length > 0) {
        setSelectedEventId((prev) =>
          prev && data.producer.events.some((e) => e.id === prev)
            ? prev
            : data.producer.events[0].id,
        );
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Falha no login" };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setProducer(null);
    setSelectedEventId(null);
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      isAuthenticated: !!producer,
      producer,
      selectedEventId,
      setSelectedEventId,
      login,
      logout,
      refresh,
    }),
    [isReady, producer, selectedEventId, login, logout, refresh],
  );

  return <ProducerContext.Provider value={value}>{children}</ProducerContext.Provider>;
}

export function useProducer() {
  const ctx = useContext(ProducerContext);
  if (!ctx) throw new Error("useProducer must be used within ProducerProvider");
  return ctx;
}
