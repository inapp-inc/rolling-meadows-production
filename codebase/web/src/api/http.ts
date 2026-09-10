const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function correlationId(): string {
  return crypto.randomUUID();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'x-correlation-id': correlationId(),
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    const message =
      typeof body === 'object' && body && 'detail' in body
        ? typeof (body as { detail: unknown }).detail === 'string'
          ? String((body as { detail: string }).detail)
          : typeof (body as { detail: { message?: string } }).detail === 'object' &&
              (body as { detail: { message?: string } }).detail?.message
            ? String((body as { detail: { message: string } }).detail.message)
            : response.statusText
        : response.statusText;
    throw new ApiError(message, response.status, body);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response.blob() as Promise<T>;
}

export async function downloadFile(path: string, token: string, filename: string): Promise<void> {
  const blob = await apiRequest<Blob>(path, {}, token);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
