import type { Session } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const SESSION_KEY = 'agunriders.session';

type ApiOptions = RequestInit & {
  skipAuth?: boolean;
};

export function getSession(): Session | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Session;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setSession(session: Session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('agunriders-session'));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('agunriders-session'));
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const session = getSession();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth && session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `রিকোয়েস্ট ব্যর্থ হয়েছে (${response.status})`;

    try {
      const payload = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message ?? message;
    } catch {
      // Keep the HTTP status message when the API returns no JSON body.
    }

    if (response.status === 401 && !options.skipAuth) {
      clearSession();
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function money(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function dateText(value?: string | null) {
  if (!value) {
    return 'সেট করা হয়নি';
  }

  return new Intl.DateTimeFormat('bn-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function routeText(tour?: { startLocation?: string | null; destination?: string | null } | null) {
  const start = tour?.startLocation?.trim();
  const destination = tour?.destination?.trim();

  if (start && destination) {
    return `${start} → ${destination}`;
  }

  return destination || start || 'সেট করা হয়নি';
}

export function estimatedTourBudget(
  tour?: {
    estimatedBudget?: string | number | null;
    members?: unknown[];
    _count?: { members?: number };
  } | null,
) {
  const perPerson = Number(tour?.estimatedBudget ?? 0);
  const memberCount = tour?.members?.length ?? tour?._count?.members ?? 0;

  return {
    perPerson,
    total: perPerson * memberCount,
    memberCount,
  };
}
