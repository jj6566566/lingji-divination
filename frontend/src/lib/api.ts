const BASE_URL = 'http://localhost:8080/api/v1';

const TOKEN_KEY = 'lingji_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = options?.method?.toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized — redirecting to login', null);
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorBody: unknown = null;

    try {
      errorBody = await response.json();
      if (
        errorBody &&
        typeof errorBody === 'object' &&
        'message' in (errorBody as Record<string, unknown>)
      ) {
        errorMessage = (errorBody as Record<string, unknown>).message as string;
      }
    } catch {
      // Response body is not JSON; fall back to status text.
      try {
        errorMessage = (await response.text()) || errorMessage;
      } catch {
        // Nothing readable in the body.
      }
    }

    throw new ApiError(response.status, errorMessage, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function sseFetch(path: string, body: unknown): Promise<Response> {
  const token = getToken();

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    removeToken();
    window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized — redirecting to login', null);
  }

  if (!response.ok) {
    let errorMessage = `SSE request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (
        errorBody &&
        typeof errorBody === 'object' &&
        'message' in (errorBody as Record<string, unknown>)
      ) {
        errorMessage = (errorBody as Record<string, unknown>).message as string;
      }
    } catch {
      // Fall back to status text.
    }

    throw new ApiError(response.status, errorMessage, null);
  }

  return response;
}

export { BASE_URL, getToken, setToken, removeToken, ApiError, apiFetch, sseFetch };
