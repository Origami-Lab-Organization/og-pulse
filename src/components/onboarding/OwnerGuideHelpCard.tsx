import { Check, Eye, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrigamiCrane } from '@/landing/OrigamiCrane';
import { CraneState } from '@/types/landing';
import { useOwnerGuide } from '@/hooks/useOwnerGuide';
import type { OwnerGuideState } from '@/types/ownerGuide';

/**
 * A trilha de primeiros passos na Central de Ajuda (PUL-250).
 *
 * **Por que existe.** O dock do canto pode ser dispensado, e dispensar sem volta é
 * armadilha: a pessoa fecha na correria do primeiro dia e depois não tem como pedir a ajuda
 * de novo. Aqui é o caminho de volta, no lugar onde quem está perdido já vai procurar.
 *
 * Diferente do dock em três pontos, e cada um tem razão:
 *
 * - **mostra a trilha inteira**, não um passo por vez. Quem vem à Ajuda quer o mapa, não a
 *   próxima instrução;
 * - **conta mesmo com o guia dispensado** (`alwaysCount`), porque oferecer "trazer de volta"
 *   sem saber o que falta seria oferecer no escuro;
 * - **continua aparecendo depois de tudo pronto**, com o texto de conclusão. O dock some
 *   sozinho, e sem isto a trilha desapareceria sem nunca dizer que terminou.
 */

function StepRow(props: { title: string; why: string; done: boolean; current: boolean }) {
  const { title, why, done, current } = props;
  return (
    <li className="flex items-start gap-2.5">
      {done ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${current ? 'bg-primary' : 'bg-muted-foreground/40'}`}
          aria-hidden="true"
        />
      )}
      <div className="min-w-0">
        <p className={`text-sm ${done ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}`}>
          {title}
          {done && <span className="sr-only"> — concluído</span>}
        </p>
        {!done && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{why}</p>}
      </div>
    </li>
  );
}

function Header(props: { state: OwnerGuideState }) {
  const { doneCount, total, complete } = props.state;
  return (
    <div className="flex items-start gap-3">
      <OrigamiCrane state={CraneState.RESTING} className="h-12 w-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
          Primeiros passos
          {complete && <PartyPopper className="h-4 w-4 text-primary" aria-hidden="true" />}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {complete
            ? 'Sua empresa está montada. Custo e margem já leem o que você lança.'
            : `${doneCount} de ${total} concluídos. O que falta é o que só você sabe — sua empresa já nasceu com centros de custo, uma linha de serviço, os encargos do Simples Nacional e os feriados do ano.`}
        </p>
      </div>
    </div>
  );
}

export function OwnerGuideHelpCard() {
  const { state, isLoading, isOwner, dismissed, restore } = useOwnerGuide({ alwaysCount: true });

  // Quem não administra a empresa não tem o que fazer aqui: a RLS negaria os cadastros.
  if (!isOwner) return null;

  if (isLoading) {
    return (
      <section className="rounded-lg border bg-card p-4 shadow-card">
        <Skeleton className="h-5 w-40" />
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <Header state={state} />

      <ul className="mt-3 space-y-2.5 border-t pt-3">
        {state.steps.map(({ step, done, current }) => (
          <StepRow key={step.id} title={step.title} why={step.why} done={done} current={current} />
        ))}
      </ul>

      {!state.complete && dismissed && (
        <div className="mt-3 border-t pt-3">
          <Button size="sm" variant="outline" onClick={restore}>
            <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Mostrar o guia na tela de novo
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Volta a acompanhar você no canto, um passo por vez, e some quando a empresa estiver montada.
          </p>
        </div>
      )}
    </section>
  );
}
