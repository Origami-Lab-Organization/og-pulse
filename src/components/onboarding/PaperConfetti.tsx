import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import './paper-confetti.css';

/**
 * Confete de papel dobrado (PUL-252). Quadrados e triângulos pequenos, nas cores da marca,
 * caindo com giro. Marca o fim do tour e a trilha completa.
 *
 * É papel de propósito, não bolinha nem estrela: é a matéria-prima da casa. E são poucas
 * peças, porque confete demais é festa de outra marca.
 *
 * Só tokens do tema: `--primary`, `--primary-deep`, `--success`. Sem cor literal.
 *
 * Nenhum `Math.random` no render: as peças são sorteadas uma vez no `useMemo`, senão cada
 * re-render redistribuiria o confete no meio da queda.
 */

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  spin: number;
  shape: 'square' | 'triangle';
  tone: 0 | 1 | 2;
}

const COUNT = 26;
const TONES = ['hsl(var(--primary))', 'hsl(var(--primary-deep))', 'hsl(var(--success))'] as const;

function sortPieces(): Piece[] {
  return Array.from({ length: COUNT }, (_, id) => ({
    id,
    left: 6 + Math.random() * 88,
    delay: Math.random() * 0.6,
    duration: 2.2 + Math.random() * 1.4,
    size: 7 + Math.random() * 7,
    spin: 360 + Math.random() * 540,
    shape: Math.random() < 0.5 ? 'square' : 'triangle',
    tone: Math.floor(Math.random() * 3) as 0 | 1 | 2,
  }));
}

export function PaperConfetti() {
  const pieces = useMemo(sortPieces, []);

  return createPortal(
    <div aria-hidden="true" className="paper-confetti pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`paper-confetti__piece paper-confetti__piece--${piece.shape}`}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ['--spin' as string]: `${piece.spin}deg`,
            ['--tone' as string]: TONES[piece.tone],
          }}
        />
      ))}
    </div>,
    document.body,
  );
}
