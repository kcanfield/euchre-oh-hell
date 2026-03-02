import React from 'react';
import { PlayerScore } from '@oh-hell/shared';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';

interface Props {
  scores: PlayerScore[];
  winnerId: string;
  players: Array<{ playerId: string; username: string }>;
}

export function GameOverScreen({ scores, winnerId, players }: Props) {
  const navigate = useNavigate();
  const { dispatch } = useGame();

  const sortedScores = [...scores].sort((a, b) => b.totalScore - a.totalScore);
  const winner = players.find(p => p.playerId === winnerId);

  const handleBackToLobby = () => {
    dispatch({ type: 'CLEAR_GAME' });
    navigate('/');
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginBottom: '0.5rem', color: '#1e3a5f', textAlign: 'center' }}>
          Game Over!
        </h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem', fontSize: '1.125rem' }}>
          Winner: <strong style={{ color: '#16a34a', fontSize: '1.25rem' }}>{winner?.username ?? 'Unknown'}</strong>
        </p>

        <h2 style={{ marginBottom: '0.75rem', fontSize: '1rem', color: '#374151' }}>Final Scores</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Player</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.map((ps, idx) => (
              <tr
                key={ps.playerId}
                style={{
                  borderBottom: '1px solid #f3f4f6',
                  background: ps.playerId === winnerId ? '#f0fdf4' : 'transparent',
                  fontWeight: ps.playerId === winnerId ? 'bold' : 'normal',
                }}
              >
                <td style={tdStyle}>{idx + 1}</td>
                <td style={tdStyle}>
                  {ps.playerId === winnerId && <span style={{ marginRight: '0.5rem' }}>*</span>}
                  {ps.username}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{ps.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={handleBackToLobby}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f0f4f8',
  padding: '1rem',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  padding: '2.5rem',
  maxWidth: '480px',
  width: '100%',
  boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
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
