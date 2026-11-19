export class JiraWriteForbiddenError extends Error {
  readonly method: string;
  readonly url: string;

  constructor(method: string, url: string) {
    super(`Operación de escritura en Jira bloqueada (${method} ${url})`);
    this.name = 'JiraWriteForbiddenError';
    this.method = method;
    this.url = url;
  }
}

export interface HttpCall {
  method: string;
  url: string;
}

/**
 * Única salida HTTP hacia Jira. Cualquier método distinto de GET se registra y se rechaza
 * antes de tocar la red.
 */
export class ReadOnlyHttp {
  readonly calls: HttpCall[] = [];

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async request(method: string, url: string, headers: Record<string, string>): Promise<Response> {
    const normalized = method.toUpperCase();
    this.calls.push({ method: normalized, url });
    if (normalized !== 'GET') {
      throw new JiraWriteForbiddenError(normalized, url);
    }
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      throw new Error('Jira solo admite https, salvo localhost en pruebas');
    }
    if (!parsed.pathname.startsWith('/rest/')) {
      throw new Error(`Ruta Jira no permitida: ${parsed.pathname}`);
    }
    return this.fetchImpl(url, { method: 'GET', headers });
  }
}

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
