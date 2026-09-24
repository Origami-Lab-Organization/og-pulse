import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConvertProspectDialog } from '@/components/prospeccao/ConvertProspectDialog';
import { DiscardProspectDialog } from '@/components/prospeccao/DiscardProspectDialog';
import { ProspectDetailDialog } from '@/components/prospeccao/ProspectDetailDialog';
import { ProspectFilterButton } from '@/components/prospeccao/ProspectFilterButton';
import { ProspectFormDialog } from '@/components/prospeccao/ProspectFormDialog';
import { ProspectKanbanBoard } from '@/components/prospeccao/ProspectKanbanBoard';
import { ProspectMetrics } from '@/components/prospeccao/ProspectMetrics';
import { useProspects } from '@/hooks/useProspects';
import { contactsInConversationByCompany } from '@/lib/prospecting/companyStatus';
import {
  applyProspectFilter,
  countActiveFilters,
  FILTRO_VAZIO,
  type ProspectFilter,
} from '@/lib/prospecting/filters';
import {
  PROSPECT_FUNNEL_STAGES,
  getDiscardReasonLabel,
  getProspectStageColor,
  getProspectStageLabel,
  isProspectClosed,
  type ProspectWithCompany,
} from '@/types/prospect';

/**
 * Prospecção — pipeline frio, separado do comercial.
 *
 * O Pipeline abre primeiro: com a lista diária removida (17/09/2026), é pelo board que a
 * pessoa encontra o que precisa de ação — a data de vencimento fica no card.
 */
export default function Prospeccao() {
  const { data: todos = [], isLoading } = useProspects();

  const [novoAberto, setNovoAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<ProspectWithCompany | null>(null);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [convertendo, setConvertendo] = useState<ProspectWithCompany | null>(null);
  const [filtro, setFiltro] = useState<ProspectFilter>(FILTRO_VAZIO);
  // Tabs controladas só para saber em qual aba o filtro faz sentido.
  const [aba, setAba] = useState('pipeline');

  const noFunil = useMemo(
    () => todos.filter((p) => PROSPECT_FUNNEL_STAGES.includes(p.stage)),
    [todos],
  );
  const encerrados = useMemo(() => todos.filter((p) => isProspectClosed(p.stage)), [todos]);
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
      description="Pipeline frio: mede atenção conquistada, não receita"
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
            <TabsTrigger value="encerrados">Encerrados</TabsTrigger>
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

        <TabsContent value="encerrados">
          <TabelaDeEncerrados
            prospects={encerrados}
            isLoading={isLoading}
            onOpen={setSelecionado}
          />
        </TabsContent>

        <TabsContent value="metricas">
          <ProspectMetrics prospects={todos} />
        </TabsContent>
      </Tabs>

      <ProspectFormDialog open={novoAberto} onOpenChange={setNovoAberto} />

      <ProspectDetailDialog
        prospect={selecionadoAtual}
        open={!!selecionado}
        onOpenChange={(aberto) => !aberto && setSelecionado(null)}
        onDiscard={setDescartando}
        onConvert={setConvertendo}
      />

      <DiscardProspectDialog
        prospect={descartando}
        open={!!descartando}
        onOpenChange={(aberto) => !aberto && setDescartando(null)}
      />

      <ConvertProspectDialog
        prospect={convertendo}
        open={!!convertendo}
        onOpenChange={(aberto) => !aberto && setConvertendo(null)}
      />
    </AppLayout>
  );
}

function TabelaDeEncerrados({
  prospects,
  isLoading,
  onOpen,
}: {
  prospects: ProspectWithCompany[];
  isLoading: boolean;
  onOpen: (p: ProspectWithCompany) => void;
}) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (prospects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum contato encerrado ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contato</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Desfecho</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Atividades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => onOpen(p)}
              >
                <TableCell className="font-medium">{p.contact_name}</TableCell>
                <TableCell>{p.company?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={getProspectStageColor(p.stage)}>
                    {getProspectStageLabel(p.stage)}
                  </Badge>
                </TableCell>
                <TableCell>{p.stage === 'descartado' ? getDiscardReasonLabel(p.discard_reason) : '—'}</TableCell>
                <TableCell className="text-right">{p.activity_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
