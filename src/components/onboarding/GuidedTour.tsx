import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrigamiCrane } from '@/landing/OrigamiCrane';
import { useTour } from '@/hooks/useTour';
import { PaperConfetti } from './PaperConfetti';
import type { TourStep } from '@/types/tour';
import { CraneState } from '@/types/landing';

/**
 * O tour guiado que apresenta a casa na primeira entrada (PUL-251, PUL-252).
 *
 * **Escurece a tela e conduz.** É a diferença em relação ao guia de primeiros passos, que
 * fica no canto e espera ser chamado: aqui a pessoa acabou de entrar, não tem o que fazer
 * ainda, e conduzir é o favor certo. Depois de dois minutos ela sai com o mapa.
 *
 * **O tsuru voa sozinho, em curva, e o card vai atrás.** Ele não é desenhado dentro do card:
 * é um elemento próprio que sai do lugar onde estava pousado e descreve um arco até o
 * próximo alvo, inclinando o corpo na tangente da trajetória (`offset-path` +
 * `offset-rotate`). O card desliza um pouco mais devagar e chega depois. A leitura vira "o
 * tsuru me levou até aqui e o card veio junto", e não "a caixa mudou de lugar".
 *
 * **Ele olha para onde vai.** O desenho tem a cabeça à esquerda; quando o voo é para a
 * direita o desenho é espelhado e a rotação segue a tangente (`auto`); para a esquerda a
 * rotação é `reverse`, que alinha o eixo -x com a direção e mantém o tsuru de pé. Sem isso
 * ele voaria de costas metade do tempo.
 *
 * **Passo sem alvo visível não desaparece.** Vira card centralizado com o texto alternativo.
 * O projete.app filtra o passo quando o seletor não existe, e foi assim que a copy do passo
 * "Indicadores" sumiu de vez quando o painel foi reescrito. Aqui o passo se explica.
 *
 * **O overlay bloqueia de propósito.** A pessoa está sendo apresentada; clicar no meio da
 * apresentação só a tiraria do lugar. Sair é Esc, "Pular" ou concluir.
 */

const CARD_WIDTH = 340;
const CARD_HEIGHT = 210;
const GAP = 12;
const EDGE = 16;
/** O tsuru chega antes do card: ele conduz, o card acompanha. */
const FLIGHT_MS = 560;
const CARD_GLIDE_MS = 720;
const CRANE_W = 88;
const CRANE_H = 70;
const CELEBRATION_MS = 950;

interface Point {
  x: number;
  y: number;
}

const Facing = { LEFT: 'left', RIGHT: 'right' } as const;
type Facing = (typeof Facing)[keyof typeof Facing];

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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Onde o card fica. Ao lado do alvo, não em cima: o menu lateral é estreito e alto, então
 * cobrir o alvo com o próprio card seria esconder o que está sendo apresentado. Sem alvo,
 * no centro — em números, não em `translate(-50%)`, porque o tsuru precisa saber onde
 * pousar e isso exige coordenada.
 */
function placeCard(rect: DOMRect | null): Point {
  if (!rect) {
    return {
      x: Math.max(EDGE, (window.innerWidth - CARD_WIDTH) / 2),
      y: Math.max(EDGE, (window.innerHeight - CARD_HEIGHT) / 2),
    };
  }
  const spaceRight = window.innerWidth - rect.right;
  const x =
    spaceRight > CARD_WIDTH + GAP
      ? rect.right + GAP
      : clamp(rect.left - CARD_WIDTH - GAP, EDGE, window.innerWidth - CARD_WIDTH - EDGE);
  const y = clamp(rect.top + rect.height / 2 - CARD_HEIGHT / 2, EDGE, window.innerHeight - CARD_HEIGHT - EDGE);
  return { x, y };
}

/** O poleiro: canto superior esquerdo do card, meio para fora. Em coordenadas do CENTRO do tsuru. */
function perchFor(card: Point): Point {
  return { x: card.x + 22, y: card.y - 6 };
}

/**
 * Arco de `from` até `to`, em coordenadas relativas ao ponto de chegada (o `offset-path` é
 * lido no espaço do próprio elemento, que já está posicionado em `to`). O ponto de controle
 * sobe proporcional à distância: voo curto é quase reto, voo longo faz barriga para cima,
 * que é como um pássaro atravessa uma sala.
 */
function arcPath(from: Point, to: Point): string {
  const sx = from.x - to.x;
  const sy = from.y - to.y;
  const lift = 70 + Math.min(Math.hypot(sx, sy) * 0.22, 180);
  const cx = sx / 2;
  const cy = sy / 2 - lift;
  return `path("M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} 0 0")`;
}

function Shades(props: { rect: DOMRect }) {
  const { rect } = props;
  const top = Math.max(0, rect.top - 6);
  const left = Math.max(0, rect.left - 6);
  const right = rect.right + 6;
  const bottom = rect.bottom + 6;
  const shade = 'fixed bg-foreground/60 motion-safe:transition-all motion-safe:duration-500';
  return (
    <>
      <div className={shade} style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className={shade} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className={shade} style={{ top, left: 0, width: left, height: bottom - top }} />
      <div className={shade} style={{ top, left: right, right: 0, height: bottom - top }} />
      <div
        className="fixed rounded-md ring-2 ring-primary motion-safe:transition-all motion-safe:duration-500"
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
          className={`h-1.5 w-3 rounded-full transition-colors ${i <= props.index ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

interface FlyingCraneProps {
  perch: Point;
  state: CraneState;
  /** Primeiro passo: dobra-se do papel em vez de chegar voando. */
  entrance: boolean;
}

/**
 * O tsuru como elemento próprio. Guarda o poleiro anterior e, quando o poleiro muda, voa
 * de um ao outro em arco. Duas fases separadas por um frame: primeiro coloca o caminho e
 * `offset-distance: 0%` sem transição; no frame seguinte liga a transição e manda para
 * `100%`. Sem a separação o navegador aplica os dois valores no mesmo estilo e não anima.
 */
function FlyingCrane(props: FlyingCraneProps) {
  const { perch, state, entrance } = props;
  const previous = useRef<Point | null>(null);
  const [flight, setFlight] = useState<CSSProperties>({});
  const [facing, setFacing] = useState<Facing>(Facing.RIGHT);
  const [flying, setFlying] = useState(false);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = perch;
    if (!from || (from.x === perch.x && from.y === perch.y)) return;

    const toRight = perch.x >= from.x;
    const path = arcPath(from, perch);
    const rotate = toRight ? 'auto' : 'reverse';
    setFacing(toRight ? Facing.RIGHT : Facing.LEFT);
    setFlying(true);
    setFlight({ offsetPath: path, offsetDistance: '0%', offsetRotate: rotate, transition: 'none' });

    let landing: ReturnType<typeof setTimeout>;
    const takeoff = requestAnimationFrame(() => {
      setFlight({
        offsetPath: path,
        offsetDistance: '100%',
        offsetRotate: rotate,
        transition: `offset-distance ${FLIGHT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      });
      landing = setTimeout(() => {
        setFlight({});
        setFlying(false);
        // Pousado, ele olha para o card, que está à direita do poleiro.
        setFacing(Facing.RIGHT);
      }, FLIGHT_MS);
    });
    return () => {
      cancelAnimationFrame(takeoff);
      clearTimeout(landing);
    };
  }, [perch]);

  const craneState = flying ? CraneState.FLYING : state;

  return (
    <div
      className="pointer-events-none fixed z-[61]"
      style={{
        left: perch.x - CRANE_W / 2,
        top: perch.y - CRANE_H / 2,
        width: CRANE_W,
        height: CRANE_H,
        ...flight,
      }}
    >
      {/* O desenho olha para a esquerda; espelhar é o que o faz olhar para onde voa. */}
      <div className="h-full w-full" style={{ transform: facing === Facing.RIGHT ? 'scaleX(-1)' : undefined }}>
        <OrigamiCrane
          state={craneState}
          entrance={entrance}
          className="h-full w-full drop-shadow-[0_10px_18px_hsl(var(--primary)/0.38)]"
        />
      </div>
    </div>
  );
}

interface CardProps {
  step: TourStep;
  index: number;
  total: number;
  position: Point;
  hasTarget: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

function TourCard(props: CardProps) {
  const { step, index, total, position, hasTarget, onBack, onNext, onSkip } = props;
  const isLast = index === total - 1;
  const isFirst = index === 0;
  const body = hasTarget || !step.fallback ? step.body : step.fallback;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="pointer-events-auto fixed rounded-xl border bg-popover p-4 pl-12 text-popover-foreground shadow-lg motion-safe:transition-[top,left] motion-safe:ease-out"
      style={{
        left: position.x,
        top: position.y,
        width: `min(${CARD_WIDTH}px, calc(100vw - 2rem))`,
        transitionDuration: `${CARD_GLIDE_MS}ms`,
      }}
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

      <div className="mt-2">
        <p id="tour-title" className="text-sm font-semibold text-foreground">
          {step.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
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
  const [celebrating, setCelebrating] = useState(false);

  // `open` é estado próprio para o tour não reabrir enquanto a gravação de "já vi" está em
  // vôo. Reabrir volta ao primeiro passo: quem pediu para rever quer rever inteiro.
  useEffect(() => {
    if (!shouldOpen) return;
    setIndex(0);
    setOpen(true);
  }, [shouldOpen]);

  const step = steps[index];
  const isLast = index === steps.length - 1;

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

  // O último passo é festa: confete e o tsuru dá o giro, uma vez, depois de pousar.
  useEffect(() => {
    if (!open || !isLast) {
      setCelebrating(false);
      return;
    }
    const start = setTimeout(() => setCelebrating(true), FLIGHT_MS);
    const stop = setTimeout(() => setCelebrating(false), FLIGHT_MS + CELEBRATION_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [open, isLast]);

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

  const position = placeCard(rect);

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {rect ? <Shades rect={rect} /> : <div className="fixed inset-0 bg-foreground/60" />}
      <TourCard
        step={step}
        index={index}
        total={steps.length}
        position={position}
        hasTarget={!!rect}
        onBack={goBack}
        onNext={goNext}
        onSkip={finish}
      />
      <FlyingCrane
        perch={perchFor(position)}
        state={celebrating ? CraneState.CELEBRATING : CraneState.RESTING}
        entrance={index === 0}
      />
      {isLast && <PaperConfetti />}
    </div>,
    document.body,
  );
}
