import { Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrigamiCrane } from '@/landing/OrigamiCrane';
import { useTour } from '@/hooks/useTour';

/**
 * Rever o tour de apresentação, na Central de Ajuda (PUL-251).
 *
 * **Separado do card de primeiros passos de propósito.** Ele nasceu lá dentro e estava
 * errado: aquele card só aparece para quem administra a empresa, então o Colaborador ficava
 * sem caminho de volta para um tour que é dele também. São públicos diferentes, logo são
 * componentes diferentes.
 *
 * A contagem de telas vem do tour já recortado pelo perfil, então o texto diz a verdade para
 * cada pessoa: o Colaborador lê um número menor que o do Admin, porque o tour dele é menor.
 */
export function TourRestartCard() {
  const { restart, steps, isLoading } = useTour();

  // Sem passo de tela no meio, não há tour para rever.
  if (isLoading || steps.length <= 2) return null;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <OrigamiCrane className="h-10 w-12 shrink-0 motion-safe:animate-crane-float" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">Tour de apresentação</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {steps.length} telas em dois minutos, com o tsuru mostrando para que serve cada uma. Você vê só as telas
            que o seu acesso alcança.
          </p>
          <Button size="sm" variant="outline" className="mt-2.5" onClick={restart}>
            <Route className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Rever o tour
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">Recomeça na próxima tela que você abrir.</p>
        </div>
      </div>
    </section>
  );
}
