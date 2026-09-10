import { useId } from 'react';
import '@/landing/crane.css';
import type { OrigamiCraneProps } from '@/types/landing';

/**
 * Tsuru de origami em SVG, só com tokens do tema: facetas em `--primary` e
 * `--primary-deep`, vincos em `--background`. Decorativo (quem o acompanha sempre tem o
 * texto ao lado), por isso `aria-hidden`.
 *
 * **O desenho é articulado, e é isso que o deixa vivo (PUL-252).** As duas asas, o pescoço e
 * a cauda são grupos próprios, cada um girando em torno da junta que teria no papel dobrado
 * — as asas na quilha, o pescoço no ombro, a cauda na base. O `state` escolhe a animação, e
 * ela vive em `crane.css`, ao lado deste arquivo.
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

const crease = {
  fill: 'none',
  stroke: CREASE,
  strokeOpacity: 0.35,
  strokeWidth: 1,
  strokeLinejoin: 'round',
} as const;

export function OrigamiCrane(props: OrigamiCraneProps) {
  const { className = '', state } = props;
  const blurId = `crane-blur-${useId()}`;
  return (
    <svg
      viewBox="0 0 320 240"
      aria-hidden="true"
      focusable="false"
      className={`crane ${className}`}
      data-crane-state={state}
    >
      <defs>
        <filter id={blurId} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
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
            <polygon points="160,118 262,34 185,130" fill={DEEP} fillOpacity="0.9" />
            <polygon points="185,130 262,34 210,143" fill={DEEP} fillOpacity="0.7" />
            <polyline points="262,34 185,130" {...crease} />
          </g>

          {/* Cauda: contrapeso do voo, dobra na base do corpo. */}
          <g className="crane__tail">
            <polygon points="218,147 292,96 218,153" fill={LIGHT} fillOpacity="0.75" />
            <polyline points="292,96 218,150" {...crease} />
          </g>

          {/* Corpo: as duas faces e a quilha. Não é grupo articulado — é o que as outras
              partes dobram em relação a. */}
          <polygon points="160,118 224,150 160,182" fill={DEEP} />
          <polygon points="96,150 160,118 160,182" fill={LIGHT} fillOpacity="0.95" />
          <polyline points="160,118 160,182" {...crease} />

          {/* Pescoço com espessura na ponta e cabeça dobrada, presa à ponta. Dobra no ombro. */}
          <g className="crane__neck">
            <polygon points="100,148 38,78 46,86 104,154" fill={LIGHT} fillOpacity="0.9" />
            <polygon points="38,78 46,86 12,94" fill={LIGHT} />
            <polyline points="42,82 102,151" {...crease} />
          </g>

          {/* Asa da frente: por cima do corpo, e em contrafase com a de trás. */}
          <g className="crane__wing-front">
            <polygon points="110,143 58,34 135,130" fill={LIGHT} />
            <polygon points="135,130 58,34 160,118" fill={LIGHT} fillOpacity="0.8" />
            <polyline points="58,34 135,130" {...crease} />
          </g>
        </g>
      </g>
    </svg>
  );
}
