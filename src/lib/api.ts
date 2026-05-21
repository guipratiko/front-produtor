const TOKEN_KEY = "uai-produtor-token";
const DEFAULT_API = "http://localhost:3350";
const FETCH_TIMEOUT_MS = 12_000;

function secureForPage(url: string): string {
  if (typeof window === "undefined") return url;
  if (window.location.protocol !== "https:") return url;
  return url.replace(/^http:\/\//, "https://").replace(/^ws:\/\//, "wss://");
}

export function getApiUrl(): string {
  const envUrl = (process.env.NEXT_PUBLIC_PRODUTOR_API_URL ?? DEFAULT_API).replace(/\/$/, "");
  if (typeof window === "undefined") return envUrl;
  try {
    const api = new URL(envUrl);
    const apiIsLocal = api.hostname === "localhost" || api.hostname === "127.0.0.1";
    const pageHost = window.location.hostname;
    const pageIsLocal = pageHost === "localhost" || pageHost === "127.0.0.1";
    if (apiIsLocal && !pageIsLocal) {
      api.hostname = pageHost;
      api.port = "3350";
      return secureForPage(api.origin);
    }
  } catch {
    /* */
  }
  return secureForPage(envUrl);
}

export function getWsUrl(): string {
  const env = process.env.NEXT_PUBLIC_PRODUTOR_WS_URL;
  const base =
    env?.replace(/\/$/, "") ??
    `${getApiUrl().replace(/^https/, "wss").replace(/^http/, "ws")}/ws`;
  return secureForPage(base);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new ApiError(res.status, body.error ?? "Erro na requisição");
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export type ProducerEvent = {
  id: string;
  title: string;
  slug: string;
  date: string;
  time: string;
  venue: string;
};

export type EventStats = {
  eventId: string;
  eventTitle: string;
  total: number;
  checkedIn: number;
  pending: number;
  sold: number;
  courtesy: number;
  grossSales: number;
  buyerFees: number;
  platformFee: number;
  platformFeePercent: number;
  myCourtesyIssued: number;
  myCourtesyBatches: number;
  myCourtesyTotal: number;
  updatedAt: string;
};
