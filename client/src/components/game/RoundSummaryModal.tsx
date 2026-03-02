import React from 'react';
import { RoundResult } from '@oh-hell/shared';

interface Props {
  roundNumber: number;
  results: RoundResult[];
  onContinue: () => void;
}

export function RoundSummaryModal({ roundNumber, results, onContinue }: Props) {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginBottom: '1rem', color: '#1e3a5f' }}>Round {roundNumber} Complete</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={thStyle}>Player</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Bid</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Taken</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const hitBid = r.bid === r.tricksTaken;
              return (
                <tr
                  key={r.playerId}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: hitBid ? '#f0fdf4' : '#fff7f7',
                  }}
                >
                  <td style={tdStyle}>{r.username}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{r.bid}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{r.tricksTaken}</td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: 'right',
                      fontWeight: 'bold',
                      color: r.roundScore > 0 ? '#16a34a' : r.roundScore < 0 ? '#dc2626' : '#6b7280',
                    }}
                  >
                    {r.roundScore > 0 ? `+${r.roundScore}` : r.roundScore}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          onClick={onContinue}
          style={{
            width: '100%',
            padding: '0.625rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          Next Round
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '10px',
  padding: '2rem',
  maxWidth: '480px',
  width: '100%',
  margin: '1rem',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const thStyle: React.CSSProperties = {
  padding: '0.5rem',
  textAlign: 'left',
  fontWeight: 'bold',
  color: '#374151',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem',
  color: '#374151',
};
