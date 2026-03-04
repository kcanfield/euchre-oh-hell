import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onSwitch: () => void;
}

export function LoginForm({ onSwitch }: Props) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      const serverMsg = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
      setError(serverMsg ?? (err instanceof Error ? err.message : 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h2 style={{ marginBottom: '1rem' }}>Sign In</h2>
      {error && <p style={{ color: 'red', marginBottom: '0.5rem' }}>{error}</p>}
      <div style={fieldStyle}>
        <label style={labelStyle}>Username</label>
        <input
          style={inputStyle}
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          autoComplete="username"
        />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Password</label>
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button type="submit" disabled={isLoading} style={primaryButtonStyle}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
        <button type="button" onClick={onSwitch} style={secondaryButtonStyle}>
          Create account
        </button>
      </div>
    </form>
  );
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '320px',
  margin: '0 auto',
  padding: '2rem',
  border: '1px solid #ccc',
  borderRadius: '8px',
  background: '#fff',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '0.75rem',
};

const labelStyle: React.CSSProperties = {
  marginBottom: '0.25rem',
  fontWeight: 'bold',
  fontSize: '0.875rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '1rem',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'transparent',
  color: '#2563eb',
  border: '1px solid #2563eb',
  borderRadius: '4px',
  cursor: 'pointer',
};
