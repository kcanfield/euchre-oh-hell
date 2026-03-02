import { useState, useEffect, useCallback } from 'react';
import { serverControlService, ServerStatus } from '../services/serverControlService';

export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const refresh = useCallback(async () => {
    const s = await serverControlService.getStatus();
    setStatus(s);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [refresh]);

  const startServer = async () => {
    setIsStarting(true);
    await serverControlService.startServer();
    // Poll until running
    const poll = setInterval(async () => {
      const s = await serverControlService.getStatus();
      setStatus(s);
      if (s === 'running') {
        clearInterval(poll);
        setIsStarting(false);
      }
    }, 5000);
  };

  return { status, isLoading, isStarting, refresh, startServer };
}
