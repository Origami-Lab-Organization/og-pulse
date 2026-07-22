import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TourStepConfig {
  title: string;
  description: string;
  /** Descrição usada quando o elemento-alvo não é encontrado na tela. */
  fallbackDescription: string;
  /** Encontra o elemento-alvo no DOM (null = sem alvo → card centralizado). */
  findTarget: () => HTMLElement | null;
  /** Só libera "Avançar" depois que o alvo recebe foco de verdade. */
  requireFocus?: boolean;
  /** Roda depois que o elemento é localizado e o scroll terminou. */
  onEnter?: (el: HTMLElement) => void;
}

interface TimesheetOnboardingProps {
  open: boolean;
  onDismiss: () => void;
}

const CARD_WIDTH = 320;
const GAP = 12;
const VIEWPORT_PADDING = 12;

function findSuggestedCell(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-tour-suggested-cell]');
}

export function TimesheetOnboarding({ open, onDismiss }: TimesheetOnboardingProps) {
  const [stage, setStage] = useState<'intro' | number>('intro');
  const capturedCellRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      setStage('intro');
      capturedCellRef.current = null;
    }
  }, [open]);

  // Memoizado: precisa manter a MESMA referência entre re-renders do grid
  // (ex.: a cada tecla digitada em qualquer célula), senão o efeito do
  // TourOverlay reinicia o passo atual (refoca, rola a tela) a cada render.
  const steps: TourStepConfig[] = useMemo(
    () => [
    {
      title: 'Aceite a semana sugerida com um clique',
      description:
        'O botão "Aceitar semana sugerida" preenche automaticamente as horas planejadas da semana toda, sem sobrescrever o que você já lançou.',
      fallbackDescription:
        'O botão "Aceitar semana sugerida", no topo da grade, preenche automaticamente as horas planejadas da semana toda.',
      findTarget: () => document.querySelector<HTMLElement>('[data-tour="accept-suggested-week"]'),
    },
    {
      title: 'Sugestões em cada célula vazia',
      description:
        'Células tracejadas mostram uma sugestão de horas. Clique numa delas para ver a dica — pressione Enter para aceitar o valor sugerido.',
      fallbackDescription:
        'Sempre que houver uma célula vazia planejada, ela aparece tracejada com uma sugestão. Foque nela e pressione Enter para aceitar o valor.',
      findTarget: () => {
        const el = findSuggestedCell();
        if (el) capturedCellRef.current = el;
        return el;
      },
      requireFocus: true,
    },
    {
      title: 'Ajuste fino com as setinhas',
      description:
        'Com a célula focada ou o mouse sobre ela, use as setinhas no canto direito para somar ou subtrair 1 hora por clique.',
      fallbackDescription:
        'Ao focar ou passar o mouse sobre qualquer célula, aparecem setinhas para somar ou subtrair 1 hora por clique.',
      findTarget: () => capturedCellRef.current ?? findSuggestedCell(),
      onEnter: (el) => {
        (el as HTMLInputElement).focus?.();
      },
    },
    {
      title: 'Atividades internas ficam recolhidas',
      description:
        'Essa seção já começa fechada para deixar a tela mais limpa. Clique na seta para expandir quando precisar lançar horas nela.',
      fallbackDescription:
        'Quando você tiver atividades internas (ex.: administrativo, comercial), a seção aparece recolhida por padrão para simplificar a tela.',
      findTarget: () => document.querySelector<HTMLElement>('[data-tour="activities-toggle"]'),
    },
    ],
    []
  );

  const totalSteps = steps.length;
  const stepIndex = typeof stage === 'number' ? stage : -1;

  const handleStartTour = () => setStage(0);
  const handleClose = onDismiss;
  const handleBack = () => setStage((s) => (typeof s === 'number' && s > 0 ? s - 1 : s));
  const handleNext = () => {
    if (typeof stage !== 'number') return;
    if (stage + 1 >= totalSteps) {
      onDismiss();
    } else {
      setStage(stage + 1);
    }
  };

  if (!open) return null;

  if (stage === 'intro') {
    return (
      <Dialog open onOpenChange={(next) => !next && onDismiss()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--success-subtle))]">
              <Sparkles className="h-5 w-5 text-[hsl(var(--success-emphasis))]" />
            </div>
            <DialogTitle>A timesheet foi atualizada</DialogTitle>
            <DialogDescription>
              Deixamos o lançamento de horas mais rápido: sugestões automáticas, atalhos de teclado e uma tela mais
              enxuta. Quer ver como funciona?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose}>
              Pular
            </Button>
            <Button onClick={handleStartTour}>Ver como funciona</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <TourOverlay
      step={steps[stepIndex]}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onBack={stepIndex > 0 ? handleBack : undefined}
      onNext={handleNext}
      onSkip={handleClose}
    />
  );
}

interface TourOverlayProps {
  step: TourStepConfig;
  stepIndex: number;
  totalSteps: number;
  onBack?: () => void;
  onNext: () => void;
  onSkip: () => void;
}

function TourOverlay({ step, stepIndex, totalSteps, onBack, onNext, onSkip }: TourOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [canAdvance, setCanAdvance] = useState(!step.requireFocus);

  useEffect(() => {
    let cancelled = false;
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let el: HTMLElement | null = null;
    let focusHandler: (() => void) | null = null;

    setCanAdvance(!step.requireFocus);
    setRect(null);
    setTargetMissing(false);

    const recompute = () => {
      if (!el || cancelled) return;
      setRect(el.getBoundingClientRect());
    };

    el = step.findTarget();
    if (!el) {
      setTargetMissing(true);
      setCanAdvance(true);
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    scrollTimer = setTimeout(() => {
      if (cancelled || !el) return;
      recompute();
      step.onEnter?.(el);
    }, 320);

    if (step.requireFocus) {
      focusHandler = () => setCanAdvance(true);
      el.addEventListener('focus', focusHandler);
      if (document.activeElement === el) setCanAdvance(true);
    }

    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);

    return () => {
      cancelled = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
      if (el && focusHandler) el.removeEventListener('focus', focusHandler);
    };
  }, [step]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSkip]);

  const description = targetMissing ? step.fallbackDescription : step.description;
  const nextDisabled = !targetMissing && step.requireFocus && !canAdvance;
  const isLast = stepIndex === totalSteps - 1;

  const card = (
    <div
      className="animate-in fade-in-0 zoom-in-95 pointer-events-auto w-[320px] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-3"
      style={
        rect
          ? (() => {
              const estimatedHeight = 190;
              const spaceBelow = window.innerHeight - rect.bottom;
              const placeAbove = spaceBelow < estimatedHeight + GAP && rect.top > estimatedHeight + GAP;
              const top = placeAbove ? rect.top - GAP - estimatedHeight : rect.bottom + GAP;
              const left = Math.min(
                Math.max(rect.left + rect.width / 2 - CARD_WIDTH / 2, VIEWPORT_PADDING),
                window.innerWidth - CARD_WIDTH - VIEWPORT_PADDING
              );
              return { position: 'fixed', top, left };
            })()
          : undefined
      }
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 w-4 rounded-full transition-colors',
                i === stepIndex ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onSkip}
          aria-label="Fechar onboarding"
          className="rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <h3 className="mb-1 text-sm font-semibold text-foreground">{step.title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          Pular tour
        </button>
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 gap-1 px-2 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
          )}
          <Button size="sm" onClick={onNext} disabled={nextDisabled} className="h-8 gap-1 px-3 text-xs">
            {isLast ? 'Concluir' : 'Avançar'}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {rect ? (
        <>
          <div
            className="pointer-events-auto fixed bg-[hsl(var(--foreground)/0.55)] transition-all duration-200"
            style={{ top: 0, left: 0, right: 0, height: Math.max(rect.top - 4, 0) }}
          />
          <div
            className="pointer-events-auto fixed bg-[hsl(var(--foreground)/0.55)] transition-all duration-200"
            style={{ top: rect.bottom + 4, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className="pointer-events-auto fixed bg-[hsl(var(--foreground)/0.55)] transition-all duration-200"
            style={{ top: rect.top - 4, left: 0, width: Math.max(rect.left - 4, 0), height: rect.height + 8 }}
          />
          <div
            className="pointer-events-auto fixed bg-[hsl(var(--foreground)/0.55)] transition-all duration-200"
            style={{ top: rect.top - 4, left: rect.right + 4, right: 0, height: rect.height + 8 }}
          />
          <div
            className="pointer-events-none fixed rounded-lg ring-2 ring-primary transition-all duration-200"
            style={{
              top: rect.top - 4,
              left: rect.left - 4,
              width: rect.width + 8,
              height: rect.height + 8,
              boxShadow: '0 0 0 4px hsl(var(--primary)/0.18)',
            }}
          />
        </>
      ) : (
        <div className="pointer-events-auto fixed inset-0 flex items-center justify-center bg-[hsl(var(--foreground)/0.55)]">
          {card}
        </div>
      )}
      {rect && card}
    </div>,
    document.body
  );
}
