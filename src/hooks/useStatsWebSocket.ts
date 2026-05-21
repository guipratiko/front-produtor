"use client";

import { useEffect, useState } from "react";
import { getToken, getWsUrl, type EventStats } from "@/lib/api";

export function useStatsWebSocket(eventId: string | null) {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    const token = getToken();
    if (!token) return;

    const url = `${getWsUrl()}?token=${encodeURIComponent(token)}&eventId=${encodeURIComponent(eventId)}`;
    const ws = new WebSocket(url);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as { type: string; stats?: EventStats };
        if (msg.type === "stats" && msg.stats) setStats(msg.stats);
      } catch {
        /* */
      }
    };

    return () => ws.close();
  }, [eventId]);

  return { stats, connected };
}
