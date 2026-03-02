import React from 'react';
import { PlayerScore } from '@oh-hell/shared';

interface Props {
  scores: PlayerScore[];
  currentRoundIndex: number;
}

export function ScoreBoard({ scores, currentRoundIndex }: Props) {
  const sortedScores = [...scores].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div style={containerStyle}>
      <h3 style={{ marginBottom: '0.75rem' }}>Score Board</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={thStyle}>Player</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
            {sortedScores[0]?.roundScores.map((_, i) => (
              <th
                key={i}
                style={{
                  ...thStyle,
                  textAlign: 'right',
                  color: i === currentRoundIndex ? '#2563eb' : '#9ca3af',
                }}
              >
                R{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedScores.map((ps, rank) => (
            <tr
              key={ps.playerId}
              style={{
                borderBottom: '1px solid #f3f4f6',
                background: rank === 0 ? '#f0fdf4' : 'transparent',
              }}
            >
              <td style={tdStyle}>
                {rank === 0 && <span style={{ marginRight: '0.25rem' }}>*</span>}
                {ps.username}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                {ps.totalScore}
              </td>
              {ps.roundScores.map((score, i) => (
                <td
                  key={i}
                  style={{
                    ...tdStyle,
                    textAlign: 'right',
                    color: score > 0 ? '#16a34a' : score < 0 ? '#dc2626' : '#9ca3af',
                  }}
                >
                  {score > 0 ? `+${score}` : score}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  padding: '1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  background: '#fff',
  overflowX: 'auto',
};

const thStyle: React.CSSProperties = {
  padding: '0.375rem 0.5rem',
  textAlign: 'left',
  fontWeight: 'bold',
  color: '#374151',
};

const tdStyle: React.CSSProperties = {
  padding: '0.375rem 0.5rem',
  color: '#374151',
};
