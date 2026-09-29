import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MIN_SAMPLE } from '@/lib/prospecting/periodMetrics';

const DEFINICOES: ReadonlyArray<{ termo: string; definicao: string }> = [
  {
    termo: 'Marco',
    definicao:
      'Conta a primeira vez que o contato chega a uma etapa ou a uma adiante. Quem pula de Respondeu para Reunião feita conta também em Agendada; quem fecha direto de Reunião feita conta também em Qualificada.',
  },
  { termo: 'Conversa', definicao: 'Primeira atividade com resposta do contato.' },
  { termo: 'Conta aberta e contato ativado', definicao: 'Recebeu o 1º toque dentro do período.' },
  {
    termo: 'Números do período e jornada dos ativados',
    definicao:
      'Os números do topo contam o que aconteceu no período. A jornada, as taxas e os canais seguem os contatos ativados no período e mostram até onde cada um chegou até hoje.',
  },
  { termo: 'Ganhos e perdas', definicao: 'Desfecho vigente. Um contato reaberto deixa de contar.' },
  {
    termo: 'Taxas e amostra pequena',
    definicao: `Sempre dividem contatos, nunca contas. Com menos de ${MIN_SAMPLE} na base, a taxa aparece em cinza.`,
  },
  {
    termo: 'Gargalo',
    definicao: `A passagem entre etapas com a menor taxa, entre as que têm ${MIN_SAMPLE} ou mais contatos na base e deixam passar menos da metade.`,
  },
  {
    termo: 'Safras',
    definicao:
      'Agrupam contatos pelo mês do 1º toque. Por mês, e não por semana, porque com um time pequeno a safra semanal raramente tem base.',
  },
  { termo: 'Tempo de ciclo', definicao: 'Mediana entre etapas, para que casos extremos não distorçam o número do time.' },
  {
    termo: 'Variações',
    definicao:
      'Comparam com o mesmo trecho do período anterior. Se o período anterior não tem registro nenhum, as variações ficam ocultas.',
  },
];

interface MethodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** As regras de contagem num lugar só — a tela fica com os números, e quem quer entender abre aqui. */
export function MethodSheet({ open, onOpenChange }: MethodSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Como contamos</SheetTitle>
          <SheetDescription>As regras por trás de cada número das métricas da Prospecção.</SheetDescription>
        </SheetHeader>
        <dl className="mt-6 flex flex-col gap-5">
          {DEFINICOES.map((d) => (
            <div key={d.termo} className="flex flex-col gap-1">
              <dt className="text-sm font-semibold">{d.termo}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground text-pretty">{d.definicao}</dd>
            </div>
          ))}
        </dl>
      </SheetContent>
    </Sheet>
  );
}
