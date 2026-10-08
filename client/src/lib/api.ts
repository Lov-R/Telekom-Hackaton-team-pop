const BASE: string = import.meta.env.VITE_API_BASE ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    /** Parsed JSON body, for endpoints that return data with an error status (e.g. a rejected proof). */
    public body: unknown = null,
  ) {
    super(message);
  }
}

/** Fired when the session is missing or expired; the app falls back to the login screen. */
export const UNAUTHORIZED_EVENT = 'relai:unauthorized';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // 'include' so the session cookie also travels when VITE_API_BASE points at another origin (Capacitor).
    res = await fetch(`${BASE}/api${path}`, { credentials: 'include', ...init });
  } catch {
    throw new ApiError(0, 'network', 'Nema veze sa serverom. Provjeri je li server pokrenut.');
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, err?.code ?? 'error', err?.message ?? 'Došlo je do greške.', body);
  }
  return body as T;
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, jsonInit('POST', body)),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, jsonInit('PATCH', body)),
  del: <T = void>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File | null, field = 'file'): Promise<T> => {
    const form = new FormData();
    if (file) form.append(field, file);
    return request<T>(path, { method: 'POST', body: form });
  },
};

export const fileUrl = (documentId: string): string => `${BASE}/api/documents/${documentId}/file`;
