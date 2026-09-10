import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrigamiCrane } from '@/landing/OrigamiCrane';
import { useTour } from '@/hooks/useTour';
import type { TourStep } from '@/types/tour';

/**
 * O tour guiado que apresenta a casa na primeira entrada (PUL-251).
 *
 * **Escurece a tela e conduz.** É a diferença em relação ao guia de primeiros passos, que
 * fica no canto e espera ser chamado: aqui a pessoa acabou de entrar, não tem o que fazer
 * ainda, e conduzir é o favor certo. Depois de dois minutos ela sai com o mapa.
 *
 * **O buraco do holofote é buraco, mas o overlay do tour bloqueia.** Diferente do
 * `Spotlight` do guia: lá a pessoa está trabalhando e precisa clicar no alvo; aqui ela está
 * sendo apresentada, e clicar no meio da apresentação só atrapalharia. Então o overlay
 * intercepta, e sair é Esc, "Pular" ou concluir.
 *
 * **Passo sem alvo visível não desaparece.** Vira card centralizado com o texto alternativo.
 * O projete.app filtra o passo quando o seletor não existe, e foi assim que a copy do passo
 * "Indicadores" sumiu de vez quando o painel foi reescrito — ninguém notou porque não quebra
 * nada. Aqui a regra é o contrário: o passo se explica com palavras.
 */

const CARD_WIDTH = 340;
const CARD_HEIGHT = 210;
const GAP = 12;
const EDGE = 16;

interface Position {
  top: number;
  left: number;
}

function visibleRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return rect;
}

function findRect(selectors: readonly string[]): DOMRect | null {
  for (const selector of selectors) {
    const rect = visibleRect(selector);
    if (rect) return rect;
  }
  return null;
}

/**
 * O card ao lado do alvo, e não em cima: o menu lateral é estreito e alto, então cobrir o
 * alvo com o próprio card seria esconder o que está sendo apresentado.
 */
function placeCard(rect: DOMRect): Position {
  const clamp = (value: number, max: number) => Math.min(Math.max(value, EDGE), max - EDGE);
  const spaceRight = window.innerWidth - rect.right;
  const left =
    spaceRight > CARD_WIDTH + GAP
      ? rect.right + GAP
      : clamp(rect.left - CARD_WIDTH - GAP, window.innerWidth - CARD_WIDTH);
  const top = clamp(rect.top + rect.height / 2 - CARD_HEIGHT / 2, window.innerHeight - CARD_HEIGHT);
  return { top, left };
}

function Shades(props: { rect: DOMRect }) {
  const { rect } = props;
  const top = Math.max(0, rect.top - 6);
  const left = Math.max(0, rect.left - 6);
  const right = rect.right + 6;
  const bottom = rect.bottom + 6;
  const shade = 'fixed bg-foreground/60';
  return (
    <>
      <div className={shade} style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className={shade} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className={shade} style={{ top, left: 0, width: left, height: bottom - top }} />
      <div className={shade} style={{ top, left: right, right: 0, height: bottom - top }} />
      <div
        className="fixed rounded-md ring-2 ring-primary"
        style={{ top, left, width: right - left, height: bottom - top }}
      />
    </>
  );
}

function Dots(props: { total: number; index: number }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: props.total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-3 rounded-full ${i <= props.index ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

interface CardProps {
  step: TourStep;
  index: number;
  total: number;
  position: Position | null;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

function TourCard(props: CardProps) {
  const { step, index, total, position, onBack, onNext, onSkip } = props;
  const isLast = index === total - 1;
  const isFirst = index === 0;
  const centered = !position;
  const body = position || !step.fallback ? step.body : step.fallback;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className={`pointer-events-auto rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg ${
        centered ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : 'fixed'
      }`}
      style={centered ? { width: `min(${CARD_WIDTH}px, calc(100vw - 2rem))` } : { ...position, width: CARD_WIDTH }}
    >
      <div className="flex items-start justify-between gap-2">
        <Dots total={total} index={index} />
        <Button
          size="icon"
          variant="ghost"
          className="-mr-1 -mt-1 h-6 w-6"
          onClick={onSkip}
          aria-label="Pular o tour"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-2 flex items-start gap-3">
        <OrigamiCrane className="h-11 w-14 shrink-0 motion-safe:animate-crane-float" />
        <div className="min-w-0">
          <p id="tour-title" className="text-sm font-semibold text-foreground">
            {step.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {index + 1} de {total}
        </span>
        <div className="flex gap-2">
          {!isFirst && (
            <Button size="sm" variant="ghost" onClick={onBack}>
              Voltar
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLast ? 'Começar a usar' : 'Avançar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GuidedTour() {
  const { steps, shouldOpen, complete } = useTour();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // `open` é estado próprio para o tour não reabrir enquanto a gravação de "já vi" está em
  // vôo. Reabrir volta ao primeiro passo: quem pediu para rever quer rever inteiro.
  useEffect(() => {
    if (!shouldOpen) return;
    setIndex(0);
    setOpen(true);
  }, [shouldOpen]);

  const step = steps[index];

  useLayoutEffect(() => {
    if (!open || !step) return;
    const measure = () => setRect(findRect(step.selectors));
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step]);

  const finish = useCallback(() => {
    setOpen(false);
    complete();
  }, [complete]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= steps.length - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, finish]);

  const goBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(); // harness-ok: KeyboardEvent.key e API do DOM
      if (e.key === 'ArrowRight') goNext(); // harness-ok: KeyboardEvent.key e API do DOM
      if (e.key === 'ArrowLeft') goBack(); // harness-ok: KeyboardEvent.key e API do DOM
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish, goNext, goBack]);

  if (!open || !step) return null;

  return createPortal(
    // O overlay intercepta o clique de propósito: durante a apresentação, clicar na tela
    // atrás só tiraria a pessoa do lugar. Sair é Esc, "Pular" ou concluir.
    <div className="fixed inset-0 z-[60]">
      {rect ? <Shades rect={rect} /> : <div className="fixed inset-0 bg-foreground/60" />}
      <TourCard
        step={step}
        index={index}
        total={steps.length}
        position={rect ? placeCard(rect) : null}
        onBack={goBack}
        onNext={goNext}
        onSkip={finish}
      />
    </div>,
    document.body,
  );
}
