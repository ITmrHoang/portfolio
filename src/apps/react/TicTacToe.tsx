import { useState, useCallback } from 'react';

type Player = 'X' | 'O' | null;
type Board = Player[];
type GameMode = 'pvp' | 'ai';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

function calculateWinner(board: Board): { winner: Player; line: number[] } | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

function minimax(board: Board, isMaximizing: boolean): number {
  const result = calculateWinner(board);
  if (result?.winner === 'O') return 10;
  if (result?.winner === 'X') return -10;
  if (board.every(cell => cell !== null)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function getBestMove(board: Board): number {
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

// Styles as objects for React
const styles = {
  container: {
    maxWidth: '440px',
    margin: '0 auto',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  } as React.CSSProperties,
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    textAlign: 'center' as const,
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '1rem',
  } as React.CSSProperties,
  modeSelector: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    marginBottom: '1.25rem',
  } as React.CSSProperties,
  scoreBoard: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginBottom: '1.25rem',
  } as React.CSSProperties,
  scoreItem: (color: string) => ({
    textAlign: 'center' as const,
    padding: '0.5rem 1.25rem',
    borderRadius: '12px',
    background: `${color}10`,
    border: `2px solid ${color}30`,
    minWidth: '80px',
  }) as React.CSSProperties,
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    padding: '12px',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
    marginBottom: '1.25rem',
  } as React.CSSProperties,
  status: {
    textAlign: 'center' as const,
    fontSize: '1.1rem',
    fontWeight: 600,
    padding: '0.75rem',
    borderRadius: '12px',
    marginBottom: '1rem',
  } as React.CSSProperties,
};

function ModeButton({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1.25rem',
        borderRadius: '999px',
        border: active ? '2px solid #6366f1' : '2px solid #e5e7eb',
        background: active
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : '#fff',
        color: active ? '#fff' : '#6b7280',
        fontWeight: 600,
        fontSize: '0.85rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}

function Cell({ value, onClick, isWinning, disabled }: {
  value: Player;
  onClick: () => void;
  isWinning: boolean;
  disabled: boolean;
}) {
  const cellStyle: React.CSSProperties = {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    fontWeight: 800,
    borderRadius: '12px',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    background: isWinning
      ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
      : value
        ? '#fff'
        : 'rgba(255,255,255,0.7)',
    border: isWinning ? '2px solid #f59e0b' : '2px solid transparent',
    boxShadow: isWinning
      ? '0 0 20px rgba(245, 158, 11, 0.4)'
      : value
        ? '0 2px 8px rgba(0,0,0,0.06)'
        : 'none',
    color: value === 'X' ? '#6366f1' : value === 'O' ? '#ec4899' : 'transparent',
    transform: value ? 'scale(1)' : 'scale(0.95)',
    animation: value ? 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
  };

  return (
    <button
      style={cellStyle}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled && !value) {
          (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.95)';
          (e.target as HTMLElement).style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !value) {
          (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.7)';
          (e.target as HTMLElement).style.transform = 'scale(0.95)';
        }
      }}
    >
      {value || '·'}
    </button>
  );
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [mode, setMode] = useState<GameMode>('pvp');
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  const result = calculateWinner(board);
  const isDraw = !result && board.every(cell => cell !== null);

  const handleClick = useCallback((index: number) => {
    if (board[index] || result || isDraw) return;

    const newBoard = [...board];
    newBoard[index] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);

    // Check for winner/draw after this move
    const newResult = calculateWinner(newBoard);
    const newIsDraw = !newResult && newBoard.every(cell => cell !== null);

    if (newResult) {
      setScores(prev => ({
        ...prev,
        [newResult.winner!]: prev[newResult.winner!] + 1,
      }));
    } else if (newIsDraw) {
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
    }

    // AI move
    if (mode === 'ai' && !newResult && !newIsDraw && xIsNext) {
      setTimeout(() => {
        const aiMove = getBestMove([...newBoard]);
        if (aiMove >= 0) {
          const aiBoard = [...newBoard];
          aiBoard[aiMove] = 'O';
          setBoard(aiBoard);
          setXIsNext(true);

          const aiResult = calculateWinner(aiBoard);
          const aiDraw = !aiResult && aiBoard.every(cell => cell !== null);
          if (aiResult) {
            setScores(prev => ({
              ...prev,
              [aiResult.winner!]: prev[aiResult.winner!] + 1,
            }));
          } else if (aiDraw) {
            setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
          }
        }
      }, 400);
    }
  }, [board, xIsNext, result, isDraw, mode]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  const resetAll = () => {
    resetGame();
    setScores({ X: 0, O: 0, draws: 0 });
  };

  const changeMode = (newMode: GameMode) => {
    setMode(newMode);
    resetAll();
  };

  // Status message
  let statusText = '';
  let statusBg = '';
  if (result) {
    statusText = `🎉 ${result.winner} chiến thắng!`;
    statusBg = result.winner === 'X'
      ? 'linear-gradient(135deg, #eef2ff, #e0e7ff)'
      : 'linear-gradient(135deg, #fdf2f8, #fce7f3)';
  } else if (isDraw) {
    statusText = '🤝 Hòa!';
    statusBg = 'linear-gradient(135deg, #f9fafb, #f3f4f6)';
  } else {
    statusText = mode === 'ai' && !xIsNext
      ? '🤖 AI đang suy nghĩ...'
      : `Lượt của ${xIsNext ? '❌ X' : '⭕ O'}`;
    statusBg = '#fff';
  }

  return (
    <div style={styles.container}>
      {/* Inline keyframes */}
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <h2 style={styles.title}>🎮 Tic Tac Toe</h2>

      {/* Mode selector */}
      <div style={styles.modeSelector}>
        <ModeButton active={mode === 'pvp'} onClick={() => changeMode('pvp')}>
          👥 2 Người
        </ModeButton>
        <ModeButton active={mode === 'ai'} onClick={() => changeMode('ai')}>
          🤖 vs AI
        </ModeButton>
      </div>

      {/* Score board */}
      <div style={styles.scoreBoard}>
        <div style={styles.scoreItem('#6366f1')}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
            ❌ {mode === 'ai' ? 'Bạn' : 'X'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>
            {scores.X}
          </div>
        </div>
        <div style={styles.scoreItem('#9ca3af')}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>🤝 Hòa</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#9ca3af' }}>
            {scores.draws}
          </div>
        </div>
        <div style={styles.scoreItem('#ec4899')}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
            ⭕ {mode === 'ai' ? 'AI' : 'O'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ec4899' }}>
            {scores.O}
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{ ...styles.status, background: statusBg }}>
        {statusText}
      </div>

      {/* Board */}
      <div style={styles.board}>
        {board.map((cell, i) => (
          <Cell
            key={i}
            value={cell}
            onClick={() => handleClick(i)}
            isWinning={!!result && result.line.includes(i)}
            disabled={!!result || isDraw || (mode === 'ai' && !xIsNext)}
          />
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button
          onClick={resetGame}
          style={{
            padding: '0.625rem 1.5rem',
            borderRadius: '999px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.45)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'translateY(0)';
            (e.target as HTMLElement).style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.35)';
          }}
        >
          🔄 Ván mới
        </button>
        <button
          onClick={resetAll}
          style={{
            padding: '0.625rem 1.5rem',
            borderRadius: '999px',
            background: '#fff',
            color: '#6b7280',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: '2px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.borderColor = '#d1d5db';
            (e.target as HTMLElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.borderColor = '#e5e7eb';
            (e.target as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          🗑️ Reset điểm
        </button>
      </div>
    </div>
  );
}
