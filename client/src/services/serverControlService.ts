import axios from 'axios';

const API_GW_URL = import.meta.env.VITE_API_GATEWAY_URL ?? '';

export type ServerStatus = 'running' | 'stopped' | 'pending' | 'stopping' | 'unknown';

export const serverControlService = {
  async getStatus(): Promise<ServerStatus> {
    try {
      const res = await axios.get<{ state: ServerStatus }>(`${API_GW_URL}/status`);
      return res.data.state;
    } catch {
      return 'unknown';
    }
  },
  async startServer(): Promise<void> {
    await axios.post(`${API_GW_URL}/start`);
  },
  async stopServer(): Promise<void> {
    await axios.post(`${API_GW_URL}/stop`);
  },
};
