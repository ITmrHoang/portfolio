import { useState, useEffect, useCallback, useRef } from 'react';

const EMOJI_SETS = {
  easy: ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼'],
  medium: ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🦁'],
  hard: ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🦁', '🐧', '🦄', '🐝', '🦋'],
};

type Difficulty = keyof typeof EMOJI_SETS;

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createCards(difficulty: Difficulty): Card[] {
  const emojis = EMOJI_SETS[difficulty];
  const pairs = [...emojis, ...emojis];
  return shuffle(pairs).map((emoji, i) => ({
    id: i,
    emoji,
    isFlipped: false,
    isMatched: false,
  }));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const gridCols: Record<Difficulty, number> = {
  easy: 4,
  medium: 4,
  hard: 6,
};

export default function MemoryGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<Card[]>(() => createCards('easy'));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [bestScores, setBestScores] = useState<Record<Difficulty, number | null>>({
    easy: null,
    medium: null,
    hard: null,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (isPlaying && !isComplete) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isComplete]);

  // Check completion
  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      setIsComplete(true);
      setIsPlaying(false);
      // Save best score
      setBestScores(prev => {
        const current = prev[difficulty];
        if (current === null || moves < current) {
          return { ...prev, [difficulty]: moves };
        }
        return prev;
      });
    }
  }, [cards, difficulty, moves]);

  const handleCardClick = useCallback((id: number) => {
    if (flipped.length >= 2) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;

    if (!isPlaying) setIsPlaying(true);

    const newCards = cards.map(c =>
      c.id === id ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = newFlipped;
      const first = newCards.find(c => c.id === firstId)!;
      const second = newCards.find(c => c.id === secondId)!;

      if (first.emoji === second.emoji) {
        // Match!
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === secondId
                ? { ...c, isMatched: true }
                : c
            )
          );
          setFlipped([]);
        }, 400);
      } else {
        // No match — flip back
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlipped([]);
        }, 800);
      }
    }
  }, [cards, flipped, isPlaying]);

  const resetGame = (diff?: Difficulty) => {
    const d = diff || difficulty;
    setDifficulty(d);
    setCards(createCards(d));
    setFlipped([]);
    setMoves(0);
    setTime(0);
    setIsPlaying(false);
    setIsComplete(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cols = gridCols[difficulty];

  return (
    <div style={{
      maxWidth: difficulty === 'hard' ? '560px' : '440px',
      margin: '0 auto',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes cardFlip {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }
        @keyframes matchPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-50px) rotate(360deg); opacity: 0; }
        }
      `}</style>

      <h2 style={{
        fontSize: '1.75rem',
        fontWeight: 800,
        textAlign: 'center',
        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '1rem',
      }}>
        🧠 Memory Game
      </h2>

      {/* Difficulty selector */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
        {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
          <button
            key={d}
            onClick={() => resetGame(d)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              border: difficulty === d ? '2px solid #f59e0b' : '2px solid #e5e7eb',
              background: difficulty === d
                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                : '#fff',
              color: difficulty === d ? '#fff' : '#6b7280',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {d === 'easy' ? '🟢 Dễ (6)' : d === 'medium' ? '🟡 Vừa (8)' : '🔴 Khó (12)'}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1.5rem',
        marginBottom: '1rem',
        padding: '0.625rem 1rem',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Bước đi
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#374151' }}>{moves}</div>
        </div>
        <div style={{ width: '1px', background: '#e5e7eb' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Thời gian
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#374151' }}>{formatTime(time)}</div>
        </div>
        <div style={{ width: '1px', background: '#e5e7eb' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Kỷ lục
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
            {bestScores[difficulty] !== null ? `${bestScores[difficulty]}` : '—'}
          </div>
        </div>
      </div>

      {/* Complete message */}
      {isComplete && (
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          borderRadius: '12px',
          border: '2px solid #f59e0b',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎉</div>
          <div style={{ fontWeight: 700, color: '#92400e' }}>
            Tuyệt vời! Hoàn thành trong {moves} bước ({formatTime(time)})
          </div>
        </div>
      )}

      {/* Card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '8px',
        padding: '12px',
        background: 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #e0e7ff 100%)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(245, 158, 11, 0.12)',
        marginBottom: '1.25rem',
      }}>
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isFlipped || card.isMatched || flipped.length >= 2}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: difficulty === 'hard' ? '1.5rem' : '2rem',
              borderRadius: '12px',
              cursor: card.isFlipped || card.isMatched ? 'default' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: card.isMatched
                ? 'linear-gradient(135deg, #bbf7d0, #86efac)'
                : card.isFlipped
                  ? '#fff'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: card.isMatched
                ? '2px solid #22c55e'
                : card.isFlipped
                  ? '2px solid #c7d2fe'
                  : '2px solid transparent',
              boxShadow: card.isMatched
                ? '0 0 12px rgba(34, 197, 94, 0.3)'
                : card.isFlipped
                  ? '0 4px 12px rgba(0,0,0,0.08)'
                  : '0 2px 8px rgba(99,102,241,0.25)',
              transform: card.isFlipped || card.isMatched ? 'rotateY(0deg)' : 'rotateY(0deg)',
              animation: card.isMatched ? 'matchPulse 0.5s ease' : 'none',
              color: card.isFlipped || card.isMatched ? 'inherit' : 'transparent',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              if (!card.isFlipped && !card.isMatched && flipped.length < 2) {
                (e.currentTarget).style.transform = 'scale(1.08)';
                (e.currentTarget).style.boxShadow = '0 6px 16px rgba(99,102,241,0.35)';
              }
            }}
            onMouseLeave={(e) => {
              if (!card.isFlipped && !card.isMatched) {
                (e.currentTarget).style.transform = 'scale(1)';
                (e.currentTarget).style.boxShadow = '0 2px 8px rgba(99,102,241,0.25)';
              }
            }}
          >
            {card.isFlipped || card.isMatched ? card.emoji : '?'}
          </button>
        ))}
      </div>

      {/* Reset button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => resetGame()}
          style={{
            padding: '0.625rem 2rem',
            borderRadius: '999px',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.45)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'translateY(0)';
            (e.target as HTMLElement).style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.35)';
          }}
        >
          🔄 Chơi lại
        </button>
      </div>
    </div>
  );
}
