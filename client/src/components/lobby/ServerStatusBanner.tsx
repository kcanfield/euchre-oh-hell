import React from 'react';
import { useServerStatus } from '../../hooks/useServerStatus';

const isLocalDev = !import.meta.env.VITE_API_GATEWAY_URL ||
  (import.meta.env.VITE_API_GATEWAY_URL as string).includes('placeholder');

export function ServerStatusBanner() {
  const { status, isLoading, isStarting, startServer } = useServerStatus();

  if (isLoading) {
    return (
      <div style={bannerStyle('#d1d5db', '#374151')}>
        Checking server status...
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div style={bannerStyle('#d1fae5', '#065f46')}>
        Server is online and ready.
      </div>
    );
  }

  if (status === 'pending' || isStarting) {
    return (
      <div style={bannerStyle('#fef3c7', '#92400e')}>
        Server is starting up, please wait...
      </div>
    );
  }

  if (status === 'stopping') {
    return (
      <div style={bannerStyle('#fef3c7', '#92400e')}>
        Server is stopping.
      </div>
    );
  }

  // stopped or unknown
  return (
    <div style={{ ...bannerStyle('#fee2e2', '#991b1b'), display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span>
        {status === 'stopped'
          ? 'Game server is offline.'
          : 'Server status unknown.'}
      </span>
      {!isLocalDev && (
        <button
          onClick={startServer}
          disabled={isStarting}
          style={{
            padding: '0.25rem 0.75rem',
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Start Server
        </button>
      )}
    </div>
  );
}

function bannerStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: '0.75rem 1rem',
    background: bg,
    color,
    borderRadius: '6px',
    marginBottom: '1rem',
    fontWeight: 500,
  };
}
