import { useEffect, useId, useState, type CSSProperties } from 'react';
import '@/landing/crane.css';
import { CraneGesture, CraneState, type OrigamiCraneProps } from '@/types/landing';

/**
 * Tsuru de origami em SVG, só com tokens do tema: facetas em `--primary` e
 * `--primary-deep`, vincos em `--background`, brilho de papel em `--primary-foreground`.
 * Decorativo (quem o acompanha sempre tem o texto ao lado), por isso `aria-hidden`.
 *
 * **O desenho é articulado, e é isso que o deixa vivo (PUL-252).** As duas asas, o pescoço e
 * a cauda são grupos próprios, cada um girando em torno da junta que teria no papel dobrado
 * — as asas na quilha, o pescoço no ombro, a cauda na base. O `state` escolhe a animação, e
 * ela vive em `crane.css`, ao lado deste arquivo.
 *
 * **Ele se dobra ao aparecer** (`entrance`). Cada faceta cresce a partir do vértice que
 * compartilha com a anterior, na ordem em que o papel seria dobrado: corpo, asas, pescoço,
 * cabeça, cauda. É a assinatura da casa, e é o que faz alguém parar para olhar.
 *
 * **Em repouso ele não fica parado.** A cada poucos segundos vira a cabeça ou dá uma batida
 * de asa. Personagem que repete o mesmo ciclo exato vira papel de parede em dez segundos;
 * o intervalo aleatório é o que mantém a atenção.
 *
 * Os vincos ficam DENTRO do grupo da parte que dobram. Vinco de asa que não acompanha a asa
 * denuncia o truque na primeira batida.
 *
 * Sem `state`, nada anima: é como a página 404 o usa, onde a flutuação vem de
 * `.lp-crane__body` em `landing.css` com `data-motion="on"`. As duas classes convivem no
 * mesmo grupo de propósito, para os dois usos não se atropelarem.
 */

const LIGHT = 'hsl(var(--primary))';
const DEEP = 'hsl(var(--primary-deep))';
const CREASE = 'hsl(var(--background))';
const GLOSS = 'hsl(var(--primary-foreground))';

/** Duração de um gesto; casa com `crane-look` e `crane-flap-once` em `crane.css`. */
const GESTURE_MS = 800;
const GESTURE_MIN_GAP_MS = 3200;
const GESTURE_MAX_GAP_MS = 8000;

const crease = {
  fill: 'none',
  stroke: CREASE,
  strokeOpacity: 0.35,
  strokeWidth: 1,
  strokeLinejoin: 'round',
} as const;

/**
 * Ordem e ponto de dobra de cada faceta. A origem é o vértice que a faceta compartilha com a
 * anterior: é de lá que ela "cresce" na entrada, como papel se abrindo.
 */
function fold(order: number, x: number, y: number): CSSProperties {
  return { ['--fold' as string]: order, transformOrigin: `${x}px ${y}px` };
}

function useIdleGestures(state: OrigamiCraneProps['state']): CraneGesture | undefined {
  const [gesture, setGesture] = useState<CraneGesture>();

  useEffect(() => {
    if (state !== CraneState.RESTING) {
      setGesture(undefined);
      return;
    }
    // Com movimento reduzido o CSS já não anima; poupar os timers é só higiene.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const gap = GESTURE_MIN_GAP_MS + Math.random() * (GESTURE_MAX_GAP_MS - GESTURE_MIN_GAP_MS);
      timer = setTimeout(() => {
        if (cancelled) return;
        setGesture(Math.random() < 0.6 ? CraneGesture.LOOK : CraneGesture.FLAP);
        timer = setTimeout(() => {
          if (cancelled) return;
          setGesture(undefined);
          schedule();
        }, GESTURE_MS);
      }, gap);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state]);

  return gesture;
}

export function OrigamiCrane(props: OrigamiCraneProps) {
  const { className = '', state, entrance = false } = props;
  const id = useId();
  const blurId = `crane-blur-${id}`;
  const glossId = `crane-gloss-${id}`;
  const gesture = useIdleGestures(state);

  return (
    <svg
      viewBox="0 0 320 240"
      aria-hidden="true"
      focusable="false"
      className={`crane ${className}`}
      data-crane-state={state}
      data-crane-gesture={gesture}
      data-crane-entrance={entrance || undefined}
    >
      <defs>
        <filter id={blurId} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        {/* Luz batendo na ponta da asa: papel tem brilho, plástico não. */}
        <linearGradient id={glossId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GLOSS} stopOpacity="0.32" />
          <stop offset="0.55" stopColor={GLOSS} stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse
        className="lp-crane__shadow crane__shadow"
        cx="160"
        cy="216"
        rx="92"
        ry="8"
        fill={DEEP}
        fillOpacity="0.55"
        filter={`url(#${blurId})`}
      />

      <g className="lp-crane__body crane__float">
        <g transform="rotate(-6 160 140)">
          {/* Asa de trás: gira na quilha, junto com o vinco dela. */}
          <g className="crane__wing-back">
            <polygon className="crane__facet" style={fold(2, 160, 118)} points="160,118 262,34 185,130" fill={DEEP} fillOpacity="0.9" />
            <polygon className="crane__facet" style={fold(3, 185, 130)} points="185,130 262,34 210,143" fill={DEEP} fillOpacity="0.7" />
            <polyline className="crane__facet" style={fold(3, 185, 130)} points="262,34 185,130" {...crease} />
          </g>

          {/* Cauda: contrapeso do voo, dobra na base do corpo. */}
          <g className="crane__tail">
            <polygon className="crane__facet" style={fold(8, 218, 150)} points="218,147 292,96 218,153" fill={LIGHT} fillOpacity="0.75" />
            <polyline className="crane__facet" style={fold(8, 218, 150)} points="292,96 218,150" {...crease} />
          </g>

          {/* Corpo: as duas faces e a quilha. Não é grupo articulado — é o que as outras
              partes dobram em relação a. É por onde a dobra de entrada começa. */}
          <polygon className="crane__facet" style={fold(0, 160, 150)} points="160,118 224,150 160,182" fill={DEEP} />
          <polygon className="crane__facet" style={fold(1, 160, 150)} points="96,150 160,118 160,182" fill={LIGHT} fillOpacity="0.95" />
          <polyline className="crane__facet" style={fold(1, 160, 150)} points="160,118 160,182" {...crease} />

          {/* Pescoço com espessura na ponta e cabeça dobrada, presa à ponta. Dobra no ombro. */}
          <g className="crane__neck">
            <polygon className="crane__facet" style={fold(6, 102, 151)} points="100,148 38,78 46,86 104,154" fill={LIGHT} fillOpacity="0.9" />
            <polygon className="crane__facet" style={fold(7, 42, 82)} points="38,78 46,86 12,94" fill={LIGHT} />
            <polyline className="crane__facet" style={fold(6, 102, 151)} points="42,82 102,151" {...crease} />
          </g>

          {/* Asa da frente: por cima do corpo, e em contrafase com a de trás. */}
          <g className="crane__wing-front">
            <polygon className="crane__facet" style={fold(4, 160, 118)} points="135,130 58,34 160,118" fill={LIGHT} fillOpacity="0.8" />
            <polygon className="crane__facet" style={fold(5, 135, 130)} points="110,143 58,34 135,130" fill={LIGHT} />
            <polygon className="crane__facet" style={fold(5, 135, 130)} points="110,143 58,34 135,130" fill={`url(#${glossId})`} />
            <polyline className="crane__facet" style={fold(5, 135, 130)} points="58,34 135,130" {...crease} />
          </g>
        </g>
      </g>
    </svg>
  );
}
