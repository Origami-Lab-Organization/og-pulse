import { useEffect, useRef, type ReactNode } from 'react';
import { Flag, Globe, NotebookPen, ShieldCheck, Target, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SECAO_DA_EMPRESA, type SecaoDaEmpresa } from '@/lib/prospecting/faseDaEmpresa.constants';
import { useEdicaoDaEmpresa } from './edicaoDaEmpresa';
import { ErroNaAba } from './ErroNaAba';

const ABAS: ReadonlyArray<{ id: SecaoDaEmpresa; rotulo: string; icone: typeof Target }> = [
  { id: SECAO_DA_EMPRESA.QUALIFICACAO, rotulo: 'Qualificação', icone: Target },
  { id: SECAO_DA_EMPRESA.PESSOAS, rotulo: 'Pessoas', icone: Users },
  { id: SECAO_DA_EMPRESA.CANAIS, rotulo: 'Canais', icone: Globe },
  { id: SECAO_DA_EMPRESA.RISCOS, rotulo: 'Riscos', icone: ShieldCheck },
  { id: SECAO_DA_EMPRESA.HISTORICO, rotulo: 'Histórico', icone: Flag },
  { id: SECAO_DA_EMPRESA.ESTUDO, rotulo: 'Estudo da conta', icone: NotebookPen },
];

/** O mesmo sublinhado das abas do projeto. */
const ABA =
  'relative gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary-deep data-[state=active]:bg-transparent data-[state=active]:text-primary-deep data-[state=active]:shadow-none';

/**
 * As seções da página da empresa em abas, uma por vez (26/11/2026). Só o conteúdo da aba rola;
 * trocar de aba volta ao topo dela.
 */
export function AbasDaEmpresa(props: { secoes: Partial<Record<SecaoDaEmpresa, ReactNode>> }) {
  const { secoes } = props;
  const { aba, mostrar } = useEdicaoDaEmpresa();
  const area = useRef<HTMLDivElement>(null);
  const abas = ABAS.filter((a) => secoes[a.id]);
  // Em chaves: o Chrome recente devolve uma Promise do scrollTo, e o React a trataria como limpeza.
  useEffect(() => {
    area.current?.scrollTo({ top: 0 });
  }, [aba]);
  return (
    <Tabs value={aba} onValueChange={(v) => mostrar(v as SecaoDaEmpresa)} className="flex min-h-0 flex-1 flex-col">
      <div className="overflow-x-auto border-b">
        <TabsList className="inline-flex h-auto w-max items-stretch gap-1 rounded-none bg-transparent p-0 text-muted-foreground">
          {abas.map(({ id, rotulo, icone: Icone }) => (
            <TabsTrigger key={id} value={id} className={ABA}>
              <Icone className="h-4 w-4" aria-hidden="true" />
              {rotulo}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div ref={area} className="min-h-0 flex-1 pb-28 pt-4 md:overflow-y-auto">
        {abas.map(({ id }) => <TabsContent key={id} value={id} className="mt-0"><ErroNaAba>{secoes[id]}</ErroNaAba></TabsContent>)}
      </div>
    </Tabs>
  );
}
