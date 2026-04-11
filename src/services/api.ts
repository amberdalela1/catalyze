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

async function getRefreshToken(): Promise<string | null> {
  const { isNative } = await import('../utils/platform');
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'refresh_token' });
    return value;
  }
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      await setAuthToken(data.accessToken);
      await setRefreshToken(data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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

  // On 401, try refreshing the token and retry once
  if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await getAuthToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;

      const retryResponse = await fetch(`${API_URL}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${retryResponse.status}`);
      }

      return retryResponse.json();
    }
  }

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
  upload: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const newToken = await getAuthToken();
        if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers,
          body: formData,
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },
};
