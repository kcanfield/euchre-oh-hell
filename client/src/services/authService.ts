import axios from 'axios';
import { AuthRegisterRequest, AuthLoginRequest, AuthResponse } from '@oh-hell/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const api = axios.create({ baseURL: API_URL });

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  async register(data: AuthRegisterRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/api/auth/register', data);
    return res.data;
  },
  async login(data: AuthLoginRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/api/auth/login', data);
    return res.data;
  },
  async getMe(): Promise<{ playerId: string; username: string }> {
    const res = await api.get('/api/auth/me');
    return res.data;
  },
};
