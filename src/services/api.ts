const API_URL = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

// Remember Me: when true (default on native), tokens persist in localStorage/Preferences.
// When false, tokens use sessionStorage and are cleared when the tab closes.
export function setRememberMe(value: boolean): void {
  if (value) {
    localStorage.setItem('remember_me', '1');
  } else {
    localStorage.removeItem('remember_me');
  }
}

function getRememberMe(): boolean {
  return localStorage.getItem('remember_me') === '1';
}

async function getAuthToken(): Promise<string | null> {
  const { isNative } = await import('../utils/platform');
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'auth_token' });
    return value;
  }
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

export async function setAuthToken(token: string): Promise<void> {
  const { isNative } = await import('../utils/platform');
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'auth_token', value: token });
  } else if (getRememberMe()) {
    localStorage.setItem('auth_token', token);
  } else {
    sessionStorage.setItem('auth_token', token);
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  const { isNative } = await import('../utils/platform');
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'refresh_token', value: token });
  } else if (getRememberMe()) {
    localStorage.setItem('refresh_token', token);
  } else {
    sessionStorage.setItem('refresh_token', token);
  }
}

export async function clearTokens(): Promise<void> {
  const { isNative } = await import('../utils/platform');
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key: 'auth_token' });
    await Preferences.remove({ key: 'refresh_token' });
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
    localStorage.removeItem('remember_me');
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) => apiRequest<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body: unknown) => apiRequest<T>(endpoint, { method: 'PUT', body }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
