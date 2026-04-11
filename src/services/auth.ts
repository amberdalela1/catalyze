import { api, setAuthToken, setRefreshToken, clearTokens, setRememberMe } from './api';

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  role?: 'user' | 'admin';
  organizationId?: number;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function loginWithEmail(email: string, password: string, rememberMe = false): Promise<AuthResponse> {
  setRememberMe(rememberMe);
  const data = await api.post<AuthResponse>('/auth/login', { email, password, rememberMe });
  await setAuthToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  return data;
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/signup', { name, email, password });
  await setAuthToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  return data;
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/google', { idToken });
  await setAuthToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  return data;
}

export async function loginWithApple(identityToken: string): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/apple', { identityToken });
  await setAuthToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  return data;
}

export async function requestPhoneOTP(phone: string): Promise<{ message: string }> {
  return api.post('/auth/phone/request', { phone });
}

export async function verifyPhoneOTP(phone: string, code: string): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/phone/verify', { phone, code });
  await setAuthToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  return api.get<User>('/auth/me');
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } catch {
    // Ignore logout API errors
  }
  await clearTokens();
}
