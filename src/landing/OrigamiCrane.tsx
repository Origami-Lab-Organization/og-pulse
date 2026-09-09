import type { OrigamiCraneProps } from '@/types/landing';

/**
 * Tsuru de origami em SVG, só com tokens do tema: facetas em `--primary` e
 * `--primary-deep`, vincos em `--background`. Decorativo (a página já tem o texto),
 * por isso `aria-hidden`. Flutua com `data-motion="on"` (ver `.lp-crane` em landing.css).
 */

const LIGHT = 'hsl(var(--primary))';
const DEEP = 'hsl(var(--primary-deep))';
const CREASE = 'hsl(var(--background))';

export function OrigamiCrane(props: OrigamiCraneProps) {
  const { className = '' } = props;
  return (
    <svg viewBox="0 0 320 240" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <filter id="lp-crane-blur" x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <ellipse className="lp-crane__shadow" cx="160" cy="216" rx="92" ry="8" fill={DEEP} fillOpacity="0.55" filter="url(#lp-crane-blur)" />
      <g transform="rotate(-6 160 140)">
        <g className="lp-crane__body">
          {/* asa de trás */}
          <polygon points="160,118 262,34 185,130" fill={DEEP} fillOpacity="0.9" />
          <polygon points="185,130 262,34 210,143" fill={DEEP} fillOpacity="0.7" />
          {/* cauda */}
          <polygon points="218,147 292,96 218,153" fill={LIGHT} fillOpacity="0.75" />
          {/* corpo: face de trás e face da frente */}
          <polygon points="160,118 224,150 160,182" fill={DEEP} />
          <polygon points="96,150 160,118 160,182" fill={LIGHT} fillOpacity="0.95" />
          {/* pescoço (com espessura na ponta) e cabeça dobrada para baixo, presa à ponta */}
          <polygon points="100,148 38,78 46,86 104,154" fill={LIGHT} fillOpacity="0.9" />
          <polygon points="38,78 46,86 12,94" fill={LIGHT} />
          {/* asa da frente */}
          <polygon points="110,143 58,34 135,130" fill={LIGHT} />
          <polygon points="135,130 58,34 160,118" fill={LIGHT} fillOpacity="0.8" />
          {/* vincos */}
          <g fill="none" stroke={CREASE} strokeOpacity="0.35" strokeWidth="1" strokeLinejoin="round">
            <polyline points="58,34 135,130" />
            <polyline points="262,34 185,130" />
            <polyline points="160,118 160,182" />
            <polyline points="42,82 102,151" />
            <polyline points="292,96 218,150" />
          </g>
        </g>
      </g>
    </svg>
  );
}
