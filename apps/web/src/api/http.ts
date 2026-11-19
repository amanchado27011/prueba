const TOKEN_KEY = 'gd_access_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function formatIssues(data: Record<string, unknown>): string | null {
  const issues = data.issues;
  if (!issues || typeof issues !== 'object') return null;
  const bag = issues as { formErrors?: unknown; fieldErrors?: Record<string, unknown> };
  const parts: string[] = [];
  if (Array.isArray(bag.formErrors)) parts.push(...bag.formErrors.filter((item) => typeof item === 'string'));
  if (bag.fieldErrors) {
    for (const [key, value] of Object.entries(bag.fieldErrors)) {
      if (Array.isArray(value) && value.length) parts.push(`${key}: ${value.join(', ')}`);
    }
  }
  return parts.length ? parts.join(' · ') : null;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (!response.ok) throw new Error(text.slice(0, 300) || response.statusText);
    }
  }
  if (!response.ok) {
    const record = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const zod = formatIssues(record);
    const message = zod || (typeof record.message === 'string' ? record.message : response.statusText);
    if (response.status === 401) setToken(null);
    throw new Error(message || 'Error');
  }
  return data as T;
}

export async function downloadFile(path: string, filename: string) {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text.slice(0, 300) || response.statusText);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
