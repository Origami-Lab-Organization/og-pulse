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
import { ProspectFormDialog } from '@/components/prospeccao/ProspectFormDialog';
import { ProspectKanbanBoard } from '@/components/prospeccao/ProspectKanbanBoard';
import { ProspectMetrics } from '@/components/prospeccao/ProspectMetrics';
import { ProspectTodayList } from '@/components/prospeccao/ProspectTodayList';
import { useProspects, useTodayProspects } from '@/hooks/useProspects';
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
 * A aba padrão é "Atividades de hoje" de propósito: é a única coisa que a planilha não
 * fazia e a razão de o módulo existir. O Kanban é consulta; a lista de hoje é o trabalho.
 */
export default function Prospeccao() {
  const { data: todos = [], isLoading } = useProspects();
  const { data: deHoje = [], isLoading: carregandoHoje } = useTodayProspects();

  const [novoAberto, setNovoAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<ProspectWithCompany | null>(null);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [convertendo, setConvertendo] = useState<ProspectWithCompany | null>(null);

  const noFunil = useMemo(
    () => todos.filter((p) => PROSPECT_FUNNEL_STAGES.includes(p.stage)),
    [todos],
  );
  const encerrados = useMemo(() => todos.filter((p) => isProspectClosed(p.stage)), [todos]);

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
      <Tabs defaultValue="hoje" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hoje">
            Atividades de hoje
            {deHoje.length > 0 && (
              <Badge variant="secondary" className="ml-2">{deHoje.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="encerrados">Encerrados</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje">
          <ProspectTodayList
            prospects={deHoje}
            isLoading={carregandoHoje}
            onOpen={setSelecionado}
          />
        </TabsContent>

        <TabsContent value="pipeline">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ProspectKanbanBoard prospects={noFunil} onOpen={setSelecionado} />
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
