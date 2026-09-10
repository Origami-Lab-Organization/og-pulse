import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrigamiCrane } from '@/landing/OrigamiCrane';
import { useOwnerGuide } from '@/hooks/useOwnerGuide';
import { Spotlight } from './Spotlight';
import type { OwnerGuideState, OwnerGuideStep } from '@/types/ownerGuide';
import { CraneState } from '@/types/landing';

/**
 * O tsuru que guia quem acabou de criar a empresa (PUL-250).
 *
 * **Por que um acompanhante e não um tour de sete telas.** Cada passo só fecha quando o dado
 * existe de verdade (ver `src/lib/ownerGuide.ts`), e cadastrar pessoa, cliente, serviço e
 * projeto não acontece em cinco minutos. Um tour linear prenderia a pessoa numa sequência
 * que ela não consegue terminar de uma vez. Então o guia fica no canto, oferece UM passo por
 * vez, recolhe, e fecha sozinho quando a casa está montada.
 *
 * **O holofote é sob demanda.** "Me mostra onde" acende o alvo na tela real. Não acende
 * sozinho porque escurecer a tela de alguém que está trabalhando é interromper, não ajudar.
 *
 * Se a âncora não estiver na tela — menu recolhido, mobile, ou um refactor que renomeou o
 * atributo — o passo mostra o caminho por escrito em vez de desaparecer. Foi o defeito que
 * matou metade do `OnboardingModal`: alvo ausente, passo invisível, ninguém notou.
 */

const CRANE_SIZE = 'h-12 w-16 shrink-0';
/** Tempo do giro de comemoração; precisa casar com `crane-celebrate` em `crane.css`. */
const CELEBRATION_MS = 950;

/**
 * Comemora quando o número de passos concluídos SOBE (PUL-252).
 *
 * Reage à subida e não a qualquer mudança porque o progresso é derivado do dado real: apagar
 * um cliente faz um passo reabrir, e comemorar uma regressão seria constrangedor. Também
 * não comemora na primeira leitura, senão quem já tem passos feitos abriria o app com o
 * tsuru girando sem ter feito nada agora.
 */
function useCelebration(doneCount: number): CraneState {
  const [state, setState] = useState<CraneState>(CraneState.RESTING);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = doneCount;
    if (before === null || doneCount <= before) return;
    setState(CraneState.CELEBRATING);
    const back = setTimeout(() => setState(CraneState.RESTING), CELEBRATION_MS);
    return () => clearTimeout(back);
  }, [doneCount]);

  return state;
}

function Progress(props: { state: OwnerGuideState }) {
  const { doneCount, total } = props.state;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full ${i < doneCount ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {doneCount} de {total}
      </span>
    </div>
  );
}

/** A lista completa, quando a pessoa quer ver onde está na trilha. */
function StepList(props: { state: OwnerGuideState }) {
  return (
    <ul className="mt-3 space-y-1.5 border-t pt-3">
      {props.state.steps.map(({ step, done, current }) => (
        <li key={step.id} className="flex items-start gap-2 text-xs">
          {done ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${current ? 'bg-primary' : 'bg-muted'}`}
              aria-hidden="true"
            />
          )}
          <span className={done ? 'text-muted-foreground line-through' : 'text-foreground'}>
            {step.title}
          </span>
          {done && <span className="sr-only">concluído</span>}
        </li>
      ))}
    </ul>
  );
}

function CurrentStep(props: {
  step: OwnerGuideStep;
  targetMissing: boolean;
  onShow: () => void;
  onGo: () => void;
  showing: boolean;
}) {
  const { step, targetMissing, onShow, onGo, showing } = props;
  return (
    <>
      <p className="text-sm font-semibold text-foreground">{step.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {targetMissing ? step.fallback : step.why}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onGo}>
          {step.cta}
        </Button>
        {!targetMissing && (
          <Button size="sm" variant="ghost" onClick={onShow} aria-pressed={showing}>
            <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {showing ? 'Ocultar' : 'Me mostra onde'}
          </Button>
        )}
      </div>
    </>
  );
}

export function OwnerGuide() {
  const navigate = useNavigate();
  const { state, visible, dismiss } = useOwnerGuide();
  const craneState = useCelebration(state.doneCount);
  const [open, setOpen] = useState(true);
  const [showing, setShowing] = useState(false);
  const [targetMissing, setTargetMissing] = useState(false);

  const step = state.nextStep;

  // Trocou de passo: recolhe o holofote, senão ele fica aceso no alvo antigo.
  useEffect(() => {
    setShowing(false);
  }, [step?.id]);

  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      // harness-ok: 'Escape' e a API do DOM (KeyboardEvent.key), nao valor categorico do dominio.
      if (e.key === 'Escape') setShowing(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showing]);

  const handleRect = useCallback((rect: DOMRect | null) => {
    setTargetMissing(!rect);
  }, []);

  if (!visible || !step) return null;

  return (
    <>
      {showing && <Spotlight selectors={step.selectors} stepKey={step.id} onRectChange={handleRect} />}
      <aside
        aria-label="Primeiros passos"
        className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border bg-card p-3 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <OrigamiCrane state={craneState} className={CRANE_SIZE} />
          <div className="min-w-0 flex-1">
            <Progress state={state} />
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Recolher primeiros passos' : 'Abrir primeiros passos'}
            >
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={dismiss}
              aria-label="Dispensar o guia de primeiros passos"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {open && (
          <div className="mt-2">
            <CurrentStep
              step={step}
              targetMissing={targetMissing}
              showing={showing}
              onShow={() => setShowing((v) => !v)}
              onGo={() => {
                setShowing(false);
                navigate(step.route);
              }}
            />
            <StepList state={state} />
            <p className="mt-3 text-[11px] text-muted-foreground">
              Sua empresa já nasceu com centros de custo, uma linha de serviço, os encargos do Simples Nacional e os
              feriados do ano. Falta o que só você sabe.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
