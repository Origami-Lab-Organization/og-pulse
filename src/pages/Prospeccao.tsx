import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscardProspectDialog } from '@/components/prospeccao/DiscardProspectDialog';
import { ProspectDetailDialog } from '@/components/prospeccao/ProspectDetailDialog';
import { ProspectFilterButton } from '@/components/prospeccao/ProspectFilterButton';
import { ProspectFormDialog } from '@/components/prospeccao/ProspectFormDialog';
import { ProspectKanbanBoard } from '@/components/prospeccao/ProspectKanbanBoard';
import { ProspectMetrics } from '@/components/prospeccao/ProspectMetrics';
import { ProspectWonDialog } from '@/components/prospeccao/ProspectWonDialog';
import { useProspects } from '@/hooks/useProspects';
import { contactsInConversationByCompany } from '@/lib/prospecting/companyStatus';
import {
  applyProspectFilter,
  countActiveFilters,
  FILTRO_VAZIO,
  type ProspectFilter,
} from '@/lib/prospecting/filters';
import { PROSPECT_BOARD_STAGES, type ProspectWithCompany } from '@/types/prospect';

/**
 * Prospecção — o quadro comercial de ponta a ponta (28/09/2026): do primeiro toque ao
 * fechamento. O contato sai do trabalho de dois jeitos só, Ganho ou Perda, e os dois são
 * colunas do quadro — a aba de encerrados deixou de existir.
 *
 * O quadro abre primeiro: com a lista diária removida (17/09/2026), é por ele que a pessoa
 * encontra o que precisa de ação — a data de vencimento fica no card.
 */
export default function Prospeccao() {
  const { data: todos = [], isLoading } = useProspects();

  const [novoAberto, setNovoAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<ProspectWithCompany | null>(null);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [ganhando, setGanhando] = useState<ProspectWithCompany | null>(null);
  const [filtro, setFiltro] = useState<ProspectFilter>(FILTRO_VAZIO);
  // Tabs controladas só para saber em qual aba o filtro faz sentido.
  const [aba, setAba] = useState('pipeline');

  // O quadro inteiro: o trabalho em aberto e os dois desfechos, Ganho e Perda (28/09/2026).
  const noFunil = useMemo(
    () => todos.filter((p) => PROSPECT_BOARD_STAGES.includes(p.stage)),
    [todos],
  );
  // Sobre TODOS os contatos, inclusive convertidos: quem já virou oportunidade ocupa a empresa.
  const emConversaPorEmpresa = useMemo(() => contactsInConversationByCompany(todos), [todos]);
  const noFunilFiltrado = useMemo(() => applyProspectFilter(noFunil, filtro), [noFunil, filtro]);
  const filtrando = countActiveFilters(filtro) > 0;

  // O detalhe precisa refletir a linha recém-invalidada, não a cópia do clique.
  const selecionadoAtual = useMemo(
    () => (selecionado ? todos.find((p) => p.id === selecionado.id) ?? selecionado : null),
    [selecionado, todos],
  );

  return (
    <AppLayout
      title="Prospecção"
      description="Do primeiro contato ao fechamento: cada contato termina em Ganho ou Perda"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Prospecção' }]}
      actions={
        <Button onClick={() => setNovoAberto(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Novo contato
        </Button>
      }
    >
      <Tabs value={aba} onValueChange={setAba} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
          </TabsList>

          {/* Só no Pipeline: nas outras abas o filtro não age sobre nada, e um controle
              visível que não muda a tela é pior que controle ausente. */}
          {aba === 'pipeline' && (
            <div className="flex flex-wrap items-center gap-2">
              {filtrando && (
                <p className="text-sm text-muted-foreground">
                  {noFunilFiltrado.length} de {noFunil.length}{' '}
                  {noFunil.length === 1 ? 'contato' : 'contatos'}
                </p>
              )}
              <ProspectFilterButton filtro={filtro} onChange={setFiltro} />
            </div>
          )}
        </div>

        <TabsContent value="pipeline" className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ProspectKanbanBoard
              prospects={noFunilFiltrado}
              emConversaPorEmpresa={emConversaPorEmpresa}
              onOpen={setSelecionado}
            />
          )}
        </TabsContent>

        <TabsContent value="metricas">
          <ProspectMetrics prospects={todos} onOpenProspect={setSelecionado} />
        </TabsContent>
      </Tabs>

      <ProspectFormDialog open={novoAberto} onOpenChange={setNovoAberto} />

      <ProspectDetailDialog
        prospect={selecionadoAtual}
        open={!!selecionado}
        onOpenChange={(aberto) => !aberto && setSelecionado(null)}
        onDiscard={setDescartando}
        onWin={setGanhando}
      />

      <DiscardProspectDialog
        prospect={descartando}
        open={!!descartando}
        onOpenChange={(aberto) => !aberto && setDescartando(null)}
      />

      <ProspectWonDialog
        prospect={ganhando}
        open={!!ganhando}
        onOpenChange={(aberto) => !aberto && setGanhando(null)}
      />
    </AppLayout>
  );
}
