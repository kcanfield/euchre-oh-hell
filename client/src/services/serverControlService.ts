import axios from 'axios';

const API_GW_URL = import.meta.env.VITE_API_GATEWAY_URL ?? '';
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// True when no API Gateway is configured (i.e. local dev)
const isLocalDev = !API_GW_URL || API_GW_URL.includes('placeholder');

export type ServerStatus = 'running' | 'stopped' | 'pending' | 'stopping' | 'unknown';

export const serverControlService = {
  async getStatus(): Promise<ServerStatus> {
    if (isLocalDev) {
      try {
        await axios.get(`${API_URL}/api/status`);
        return 'running';
      } catch {
        return 'unknown';
      }
    }
    try {
      const res = await axios.get<{ state: ServerStatus }>(`${API_GW_URL}/status`);
      return res.data.state;
    } catch {
      return 'unknown';
    }
  },
  async startServer(): Promise<void> {
    if (isLocalDev) return; // server is already running locally
    await axios.post(`${API_GW_URL}/start`);
  },
  async stopServer(): Promise<void> {
    if (isLocalDev) return;
    await axios.post(`${API_GW_URL}/stop`);
  },
};
