import { useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  Clock,
  Globe,
  Instagram,
  Linkedin,
  MessagesSquare,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProspectActivities } from '@/hooks/useProspectActivities';
import { useProspectTasks } from '@/hooks/useProspectTasks';
import { useProspectCompanyByCnpj, useSaveCardCompany } from '@/hooks/useProspectCompanies';
import {
  useDeleteProspect,
  useProspects,
  useReopenProspect,
  useUpdateProspect,
  useUpdateProspectStage,
} from '@/hooks/useProspects';
import { formatCurrency } from '@/lib/formatters';
import { opportunitiesInProgressByCompany, otherOpportunitiesInProgress } from '@/lib/prospecting/companyStatus';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import { INTERACTION_CHANNELS, getChannelLabel } from '@/lib/interactionChannels';
import { iniciaisDe } from '@/lib/prospecting/iniciais';
import { formatCNPJ } from '@/lib/masks';
import { cn } from '@/lib/utils';
import {
  canWin,
  describeOpportunityContacts,
  FATURAMENTO_BASE_PADRAO,
  type FaturamentoBase,
  getDiscardReasonLabel,
  getProspectStageColor,
  getLeverLabel,
  getProspectStageLabel,
  isProspectReadOnly,
  isTaskOverdue,
  opportunityName,
  PROSPECT_LEVERS,
  previousStagesOf,
  type ProspectActivityWithOwner,
  type ProspectStage,
  type ProspectCompanyDB,
  type ProspectWithCompany,
  type ProspectTaskDB,
} from '@/types/prospect';
import { ProspectActivityTimeline } from './ProspectActivityTimeline';
import { ProspectAdvanceButton } from './ProspectAdvanceButton';
import { ProspectStageStepper } from './ProspectStageStepper';
import { RegisterMeetingDialog } from './RegisterMeetingDialog';
import { ProspectActivityComposer } from './ProspectActivityComposer';
import { ProspectTaskComposer } from './ProspectTaskComposer';
import { ProspectTaskTimeline } from './ProspectTaskTimeline';
import { ProspectDealCard } from './ProspectDealCard';
import { OpportunityContactsCard } from './OpportunityContactsCard';
import { CompanyReceitaCard } from './CompanyReceitaCard';
import { CnpjLookupField } from './CnpjLookupField';
import { useSaveCompanyReceita } from '@/hooks/useCompanyReceita';
import type { ReceitaSnapshot } from '@/types/receita';
import { useAuth } from '@/contexts/AuthContext';
import { ProspectProjectDialog } from './ProspectProjectDialog';
import { FaturamentoAnualField } from './FaturamentoAnualField';
import { descreverFaturamento } from '@/lib/prospecting/faturamento';

type Aba = 'registros' | 'tarefas';

interface ProspectDetailDialogProps {
  prospect: ProspectWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: (prospect: ProspectWithCompany) => void;
  /** Registrar ou corrigir o ganho — abre o diálogo de data e valor. */
  onWin: (prospect: ProspectWithCompany) => void;
}

/**
 * A ficha da oportunidade: informação de um lado, atividade do outro.
 *
 * A separação é o pedido central — quem abre precisa distinguir num relance o que é
 * cadastro do que é histórico. Desde 09/10/2026 a oportunidade é da empresa e leva o nome
 * dela; as pessoas entram em "Contatos", cada uma com o papel na decisão. Os campos da
 * empresa (anel, tier, CNPJ) valem para todas as oportunidades dela: editá-los aqui edita a
 * empresa, que é o que torna o cadastro reutilizável.
 */
export function ProspectDetailDialog({
  prospect,
  open,
  onOpenChange,
  onDiscard,
  onWin,
}: ProspectDetailDialogProps) {
  const { data: atividades = [], isLoading } = useProspectActivities(prospect?.id ?? null);
  const { data: tarefasDoContato = [] } = useProspectTasks(prospect?.id ?? null);
  const proximaTarefa = tarefasDoContato.find((t) => !t.done_at) ?? null;
  const { data: diretorio = [] } = useEmployeeDirectory(open);
  const atualizarOportunidade = useUpdateProspect();
  const salvarEmpresaDoCard = useSaveCardCompany();
  const reabrir = useReopenProspect();
  const moverEtapa = useUpdateProspectStage();
  const excluir = useDeleteProspect();
  const { can } = useAuth();

  // Oportunidade e empresa editam e salvam cada uma por si (02/10/2026): cada coluna, seu botão.
  const [editandoOportunidade, setEditandoOportunidade] = useState(false);
  const [editandoEmpresa, setEditandoEmpresa] = useState(false);
  const [reuniaoAberta, setReuniaoAberta] = useState(false);
  const [projetoAberto, setProjetoAberto] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  // Retrato achado pela busca de CNPJ na edição: gravado junto ao salvar a empresa.
  const [receitaDaEdicao, setReceitaDaEdicao] = useState<ReceitaSnapshot | null>(null);
  const gravarReceita = useSaveCompanyReceita();

  // Reinicia só ao abrir a ficha ou trocar de card. Depender do objeto `prospect` apagaria a
  // edição da empresa em andamento quando o salvar da oportunidade recarrega os dados.
  const prospectId = prospect?.id;
  useEffect(() => {
    if (!open || !prospectId) return;
    setEditandoOportunidade(false);
    setEditandoEmpresa(false);
    setReceitaDaEdicao(null);
  }, [open, prospectId]);

  if (!prospect) return null;

  const somenteLeitura = isProspectReadOnly(prospect);
  const empresa = prospect.company;
  const salvandoOportunidade = atualizarOportunidade.isPending;
  const salvandoEmpresa = salvarEmpresaDoCard.isPending || gravarReceita.isPending;
  const respostas = atividades.filter((a) => a.got_response).length;
  const ultima = atividades[0]?.activity_date ?? null;
  const responsavel = diretorio.find((p) => p.id === prospect.owner_id)?.nome ?? null;

  const salvarEmpresa = async () => {
    if (!empresa) return;
    // CNPJ de outra empresa já cadastrada: o card passa para ela, e a Receita vai junto.
    const destino = await salvarEmpresaDoCard.mutateAsync({ card: prospect, input: empresaDoRascunho(rascunho, empresa) });
    const cnpjDoRascunho = (rascunho.company_cnpj ?? '').replace(/\D/g, '');
    if (receitaDaEdicao && receitaDaEdicao.cnpj === cnpjDoRascunho) {
      await gravarReceita.mutateAsync({ companyId: destino.id, receita: receitaDaEdicao }).catch(() => undefined);
    }
    setEditandoEmpresa(false);
  };

  const salvarOportunidade = async () => {
    await atualizarOportunidade.mutateAsync({ id: prospect.id, updates: negocioDoRascunho(rascunho, prospect) });
    setEditandoOportunidade(false);
  };

  // Cancelar um lado desfaz só o rascunho dele: o que está sendo editado do outro fica.
  const cancelarEmpresa = () => {
    setRascunho((atual) => ({ ...atual, ...parteDoRascunho(rascunhoInicial(prospect), true) }));
    setReceitaDaEdicao(null);
    setEditandoEmpresa(false);
  };
  const cancelarOportunidade = () => {
    setRascunho((atual) => ({ ...atual, ...parteDoRascunho(rascunhoInicial(prospect), false) }));
    setEditandoOportunidade(false);
  };

  const definir = (campo: string) => (valor: string) =>
    setRascunho((atual) => ({ ...atual, [campo]: valor }));

  // A Receita só preenche o que está vazio: o que a pessoa escreveu vence.
  const aplicarReceita = (receita: ReceitaSnapshot) => {
    setReceitaDaEdicao(receita);
    setRascunho((atual) => ({
      ...atual,
      company_name: atual.company_name?.trim() ? atual.company_name : receita.nomeFantasia ?? receita.razaoSocial,
      company_segment: atual.company_segment?.trim() ? atual.company_segment : receita.segmento ?? '',
    }));
  };

  // Abrir a edição de um lado parte dos dados atuais dele, não de um rascunho antigo.
  const abrirOportunidade = () => {
    setRascunho((atual) => ({ ...atual, ...parteDoRascunho(rascunhoInicial(prospect), false) }));
    setEditandoOportunidade(true);
  };
  const abrirEmpresa = () => {
    setRascunho((atual) => ({ ...atual, ...parteDoRascunho(rascunhoInicial(prospect), true) }));
    setReceitaDaEdicao(null);
    setEditandoEmpresa(true);
  };

  const editando = editandoOportunidade || editandoEmpresa;
  const alternarEdicao = () => {
    if (editando) {
      cancelarOportunidade();
      cancelarEmpresa();
      return;
    }
    abrirOportunidade();
    abrirEmpresa();
  };
  const contatos = quantosContatos(prospect);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-w-7xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-4 border-b p-4 pr-24 text-left sm:pr-24">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {iniciaisDe(opportunityName(prospect))}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg leading-tight">{opportunityName(prospect)}</DialogTitle>
                <Badge variant="secondary" className={getProspectStageColor(prospect.stage)}>
                  {getProspectStageLabel(prospect.stage)}
                </Badge>
                {somenteLeitura && <Badge variant="outline">Somente leitura</Badge>}
              </div>

              <DialogDescription className="text-xs">
                {[
                  'Oportunidade',
                  `${contatos} ${contatos === 1 ? 'contato' : 'contatos'}`,
                  `${prospect.activity_count} ${prospect.activity_count === 1 ? 'atividade' : 'atividades'}`,
                  ultima ? `último em ${formatarData(ultima)}` : null,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </DialogDescription>

              <DesfechoDoContato prospect={prospect} onWin={() => onWin(prospect)} />
            </div>

            <AcoesDaOportunidade
              className="absolute right-12 top-3"
              prospect={prospect}
              somenteLeitura={somenteLeitura}
              editando={editando}
              onEditar={alternarEdicao}
              onGanhar={() => onWin(prospect)}
              onDescartar={() => onDiscard(prospect)}
              onReabrir={() => reabrir.mutate({ id: prospect.id })}
              onDesfazerGanho={() => moverEtapa.mutate({ id: prospect.id, stage: 'qualificado' })}
              onVoltar={(stage) => moverEtapa.mutate({ id: prospect.id, stage })}
              onExcluir={() => {
                excluir.mutate({ id: prospect.id });
                onOpenChange(false);
              }}
            />
          </div>

          <ProspectStageStepper stage={prospect.stage} />
        </DialogHeader>

        {/* Três colunas (02/10/2026): a oportunidade e quem participa dela à esquerda, o que
            aconteceu no centro e a empresa à direita. Abaixo de lg as três empilham na mesma
            ordem. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,320px)] lg:overflow-hidden">
          <section
            aria-label="Oportunidade"
            className="min-h-0 space-y-3 border-b bg-muted/20 p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r"
          >
            <Indicadores
              atividades={prospect.activity_count}
              respostas={respostas}
              proxima={proximaTarefa?.due_date ?? null}
            />

            <OpportunityContactsCard prospect={prospect} podeEditar={!somenteLeitura} />

            <CartaoDeConducao
              prospect={prospect}
              responsavel={responsavel}
              diretorio={diretorio}
              editando={editandoOportunidade}
              rascunho={rascunho}
              definir={definir}
              podeEditar={!somenteLeitura}
              onEditar={abrirOportunidade}
            />

            <ProspectDealCard
              prospect={prospect}
              editando={editandoOportunidade}
              rascunho={rascunho}
              definir={definir}
              podeEditar={!somenteLeitura}
              onEditar={abrirOportunidade}
              onCriarProjeto={() => setProjetoAberto(true)}
            />

            {editandoOportunidade && (
              <BotoesDeSalvar
                rotulo="Salvar oportunidade"
                salvando={salvandoOportunidade}
                onSalvar={salvarOportunidade}
                onCancelar={cancelarOportunidade}
              />
            )}
          </section>

          <PainelDeAtividade
            prospect={prospect}
            open={open}
            atividades={atividades}
            carregandoAtividades={isLoading}
            somenteLeitura={somenteLeitura}
            onPrompt={() => setReuniaoAberta(true)}
            onWin={() => onWin(prospect)}
          />

          <section
            aria-label="Empresa"
            className="min-h-0 space-y-3 border-t bg-muted/20 p-4 lg:overflow-y-auto lg:border-l lg:border-t-0"
          >
            <AvisoOutrasOportunidades prospect={prospect} diretorio={diretorio} />

            <CartaoEmpresa
              empresa={empresa}
              editando={editandoEmpresa}
              rascunho={rascunho}
              definir={definir}
              onReceita={aplicarReceita}
              receitaAchada={receitaDaEdicao}
              podeEditar={!somenteLeitura}
              onEditar={abrirEmpresa}
            />

            {editandoEmpresa && (
              <BotoesDeSalvar rotulo="Salvar empresa" salvando={salvandoEmpresa} onSalvar={salvarEmpresa} onCancelar={cancelarEmpresa} />
            )}

            {empresa && <CompanyReceitaCard empresa={empresa} podeEditar={can('prospeccao:editar')} />}
          </section>
        </div>

        <RegisterMeetingDialog
          prospect={prospect}
          open={reuniaoAberta}
          onOpenChange={setReuniaoAberta}
        />

        <ProspectProjectDialog prospect={prospect} open={projetoAberto} onOpenChange={setProjetoAberto} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * O centro do card: Registros (o que já aconteceu) e Tarefas (o que falta fazer).
 *
 * Registros não mostra contagem na aba (24/09/2026, Guilherme) — o total já está nos
 * indicadores. Tarefas mostra só as não concluídas, que é o que pede ação.
 */
function PainelDeAtividade({
  prospect,
  open,
  atividades,
  carregandoAtividades,
  somenteLeitura,
  onPrompt,
  onWin,
}: {
  prospect: ProspectWithCompany;
  open: boolean;
  atividades: ProspectActivityWithOwner[];
  carregandoAtividades: boolean;
  somenteLeitura: boolean;
  onPrompt: () => void;
  onWin: () => void;
}) {
  const { data: tarefas = [], isLoading: carregandoTarefas } = useProspectTasks(prospect.id);
  const [aba, setAba] = useState<Aba>('registros');

  // Só pelo id: o objeto do contato é recarregado a cada escrita e não pode tirar a
  // pessoa da aba em que ela está.
  useEffect(() => {
    if (open) setAba('registros');
  }, [open, prospect.id]);

  // Já vem ordenada por prazo (fetchProspectTasks): a primeira pendente é a mais urgente.
  const pendentes = tarefas.filter((t) => !t.done_at);
  const tarefasPendentes = pendentes.length;
  const tarefasVencidas = pendentes.filter((t) => isTaskOverdue(t)).length;

  return (
    <Tabs
      value={aba}
      onValueChange={(v) => setAba(v as Aba)}
      className="flex min-h-0 flex-col"
      aria-label="Atividade"
    >
      <div className="space-y-3 p-4">
        <ProximoPasso tarefa={pendentes[0] ?? null} encerrado={somenteLeitura} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="registros">Registros</TabsTrigger>
            <TabsTrigger value="tarefas" className="gap-2">
              Tarefas
              {tarefasPendentes > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(tarefasVencidas > 0 && 'bg-destructive/10 text-destructive')}
                  aria-label={
                    tarefasVencidas > 0
                      ? `${tarefasPendentes} não concluídas, ${tarefasVencidas} vencidas`
                      : `${tarefasPendentes} não concluídas`
                  }
                >
                  {tarefasPendentes}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          {!somenteLeitura && (
            <ProspectAdvanceButton
              prospect={prospect}
              onPrompt={onPrompt}
              onWin={onWin}
              size="sm"
            />
          )}
        </div>
      </div>

      <TabsContent value="registros" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <ProspectActivityTimeline
            prospect={prospect}
            activities={atividades}
            isLoading={carregandoAtividades}
            podeEditar={!somenteLeitura}
          />
        </div>

        {/* Fixa no rodapé, como um compositor: a escrita fica sempre alcançável,
            mesmo com a linha do tempo longa. */}
        {!somenteLeitura && (
          <div className="border-t p-4">
            <ProspectActivityComposer prospect={prospect} />
          </div>
        )}
      </TabsContent>

      <TabsContent value="tarefas" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <ProspectTaskTimeline
            tasks={tarefas}
            isLoading={carregandoTarefas}
            podeEditar={!somenteLeitura}
          />
        </div>

        {!somenteLeitura && (
          <div className="border-t p-4">
            <ProspectTaskComposer prospect={prospect} />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function AcoesDaOportunidade({
  className,
  prospect,
  somenteLeitura,
  editando,
  onEditar,
  onGanhar,
  onDescartar,
  onReabrir,
  onDesfazerGanho,
  onVoltar,
  onExcluir,
}: {
  className?: string;
  prospect: ProspectWithCompany;
  somenteLeitura: boolean;
  editando: boolean;
  onEditar: () => void;
  onGanhar: () => void;
  onDescartar: () => void;
  onReabrir: () => void;
  onDesfazerGanho: () => void;
  onVoltar: (stage: ProspectStage) => void;
  onExcluir: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('shrink-0', className)} aria-label="Ações da oportunidade">
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!somenteLeitura && (
          <DropdownMenuItem onSelect={onEditar}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            {editando ? 'Cancelar edição' : 'Editar'}
          </DropdownMenuItem>
        )}
        <ItensDeDesfecho
          prospect={prospect}
          somenteLeitura={somenteLeitura}
          onGanhar={onGanhar}
          onDescartar={onDescartar}
          onReabrir={onReabrir}
          onDesfazerGanho={onDesfazerGanho}
        />
        {!somenteLeitura && <ItensDeVolta stage={prospect.stage} onVoltar={onVoltar} />}
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onExcluir}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Excluir oportunidade
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Voltar o card para qualquer etapa anterior (01/10/2026). Move direto: é correção, e a
 * atividade registrada continua contando — só a etapa volta.
 */
function ItensDeVolta({ stage, onVoltar }: { stage: ProspectStage; onVoltar: (stage: ProspectStage) => void }) {
  const anteriores = previousStagesOf(stage);
  if (anteriores.length === 0) return null;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Voltar para…
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {anteriores.map((etapa) => (
          <DropdownMenuItem key={etapa} onSelect={() => onVoltar(etapa)}>
            {getProspectStageLabel(etapa)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

interface ItensDeDesfechoProps {
  prospect: ProspectWithCompany;
  somenteLeitura: boolean;
  onGanhar: () => void;
  onDescartar: () => void;
  onReabrir: () => void;
  onDesfazerGanho: () => void;
}

/** Ganho e Perda no menu: registrar, corrigir e desfazer — cada um só onde faz sentido. */
function ItensDeDesfecho(props: ItensDeDesfechoProps) {
  return (
    <>
      <ItensDeGanho {...props} />
      <ItensDePerda {...props} />
    </>
  );
}

function ItensDeGanho(props: ItensDeDesfechoProps) {
  const { prospect, onGanhar, onDesfazerGanho } = props;
  const ganho = prospect.stage === ETAPA_GANHO;
  if (!ganho && !canWin(prospect)) return null;
  return (
    <>
      <DropdownMenuItem onSelect={onGanhar}>
        <BadgeDollarSign className="mr-2 h-4 w-4" aria-hidden="true" />
        {ganho ? 'Editar ganho' : 'Registrar ganho'}
      </DropdownMenuItem>
      {ganho && (
        <DropdownMenuItem onSelect={onDesfazerGanho}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Desfazer ganho
        </DropdownMenuItem>
      )}
    </>
  );
}

function ItensDePerda(props: ItensDeDesfechoProps) {
  const { prospect, somenteLeitura, onDescartar, onReabrir } = props;
  if (PERDIDO.has(prospect.stage)) {
    return (
      <DropdownMenuItem onSelect={onReabrir}>
        <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
        Reabrir
      </DropdownMenuItem>
    );
  }
  if (somenteLeitura) return null;
  return (
    <DropdownMenuItem onSelect={onDescartar}>
      <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
      Registrar perda
    </DropdownMenuItem>
  );
}

const ETAPA_GANHO: ProspectWithCompany['stage'] = 'ganho';
/** Perda, e o "Sem resposta" das linhas antigas: os dois reabrem em "A abordar". */
const PERDIDO = new Set<ProspectWithCompany['stage']>(['descartado', 'sem_resposta']);

/** O desfecho por extenso no cabeçalho: quando e quanto vendemos, ou por que perdemos. */
function DesfechoDoContato({ prospect, onWin }: { prospect: ProspectWithCompany; onWin: () => void }) {
  if (PERDIDO.has(prospect.stage)) {
    return <p className="text-xs text-muted-foreground">Motivo da perda: {getDiscardReasonLabel(prospect.discard_reason)}</p>;
  }
  if (prospect.stage !== ETAPA_GANHO || !prospect.won_on) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Ganho em {formatarData(prospect.won_on)}
      {' · '}
      {prospect.won_value === null ? (
        <button type="button" onClick={onWin} className="font-medium text-warning-emphasis underline-offset-2 hover:underline">
          sem valor — registrar
        </button>
      ) : (
        <span className="font-medium text-foreground">{formatCurrency(prospect.won_value)}</span>
      )}
    </p>
  );
}

/**
 * A empresa tem OUTRA oportunidade no funil, de "Em cadência" em diante (09/10/2026).
 *
 * É o mesmo sinal do balão no card do quadro, aqui por extenso: quem abre a oportunidade
 * precisa saber, antes de registrar mais um toque, que a conta já está sendo trabalhada em
 * outra oportunidade — e com quem do time.
 */
function AvisoOutrasOportunidades({
  prospect,
  diretorio,
}: {
  prospect: ProspectWithCompany;
  diretorio: Array<{ id: string; nome: string }>;
}) {
  const { data: todos = [] } = useProspects();
  const outras = otherOpportunitiesInProgress(prospect, opportunitiesInProgressByCompany(todos));
  if (outras.length === 0) return null;

  const nomeDe = (id: string | null) => diretorio.find((p) => p.id === id)?.nome;

  return (
    <div role="note" className="flex items-start gap-2.5 rounded-lg border border-warning/20 bg-warning-subtle p-3">
      <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-warning-emphasis" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-warning-emphasis">Empresa com outra oportunidade em andamento</p>
        <p className="text-xs text-foreground/80">
          Esta empresa já está sendo trabalhada em outra oportunidade. Alinhe com quem conduz antes de um novo toque.
        </p>
        <ul className="space-y-0.5 text-xs text-foreground/80">
          {outras.map((o) => {
            const dono = nomeDe(o.owner_id);
            const pessoas = describeOpportunityContacts(o);
            return (
              <li key={o.id}>
                <span className="font-medium">{getProspectStageLabel(o.stage)}</span>
                {dono ? ` · com ${dono}` : ''}
                {pessoas ? ` · ${pessoas}` : ''}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * Os três números que respondem "como esta conversa vai indo" sem descer à linha do tempo.
 *
 * O terceiro é a PRÓXIMA data, não uma contagem de reuniões: reunião não é dado que o
 * módulo guarda, e exibir um contador que nada alimenta seria um número decorativo.
 */
function Indicadores({
  atividades,
  respostas,
  proxima,
}: {
  atividades: number;
  respostas: number;
  proxima: string | null;
}) {
  const itens = [
    { rotulo: 'Atividades', valor: String(atividades) },
    { rotulo: 'Respostas', valor: String(respostas) },
    { rotulo: 'Próx. tarefa', valor: proxima ? formatarDataCurta(proxima) : '—' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {itens.map((item) => (
        <div key={item.rotulo} className="rounded-lg border bg-card p-3">
          <p className="text-xl font-semibold leading-none">{item.valor}</p>
          <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {item.rotulo}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * A próxima tarefa pendente em destaque (28/09/2026). Antes era a data da cadência, que
 * avisava "venceu" sozinha; agora só avisa o que alguém do time se comprometeu a fazer.
 * Vermelho só quando a tarefa venceu — no prazo, é informação, não alerta.
 */
function ProximoPasso({ tarefa, encerrado }: { tarefa: ProspectTaskDB | null; encerrado: boolean }) {
  if (!tarefa || encerrado) return null;

  const dias = diasAte(tarefa.due_date);
  const vencida = dias < 0;

  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-lg border p-3',
        vencida ? 'border-destructive/30 bg-destructive/10' : 'bg-muted/40',
      )}
    >
      <Clock
        className={cn('mt-0.5 h-4 w-4 shrink-0', vencida ? 'text-destructive' : 'text-muted-foreground')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', vencida && 'text-destructive')}>Próxima tarefa: {tarefa.description}</p>
        <p className="text-xs text-muted-foreground">
          {vencida ? 'Venceu' : 'Vence'} em {formatarData(tarefa.due_date)} · {descreverPrazo(dias)}
        </p>
      </div>
    </div>
  );
}

function CartaoEmpresa({
  empresa,
  editando,
  rascunho,
  definir,
  podeEditar,
  onEditar,
  onReceita,
  receitaAchada,
}: {
  empresa?: ProspectCompanyDB | null;
  editando: boolean;
  rascunho: Record<string, string>;
  definir: (campo: string) => (valor: string) => void;
  podeEditar: boolean;
  onEditar: () => void;
  onReceita: (receita: ReceitaSnapshot) => void;
  receitaAchada: ReceitaSnapshot | null;
}) {
  const chips = [empresa?.segment, empresa?.ring && `Anel ${empresa.ring}`, empresa?.tier && `Tier ${empresa.tier}`]
    .filter(Boolean) as string[];

  return (
    <section className="rounded-lg border bg-card p-3">
      <CabecalhoDoCartao titulo="Empresa" podeEditar={podeEditar && !editando} onEditar={onEditar} />

      {editando ? (
        <div className="space-y-3">
          <Campo label="Nome" draft={rascunho.company_name} onChange={definir('company_name')} />
          <div className="space-y-1">
            <Label htmlFor="ficha-empresa-cnpj" className="text-xs text-muted-foreground">CNPJ</Label>
            <CnpjLookupField
              id="ficha-empresa-cnpj"
              value={rascunho.company_cnpj ?? ''}
              onChange={definir('company_cnpj')}
              onFound={onReceita}
            />
            {receitaAchada && (
              <p className="text-xs text-muted-foreground" role="status">
                Dados da Receita encontrados ({receitaAchada.socios.length} sócios): gravados ao salvar.
              </p>
            )}
            <AvisoDeCnpjCadastrado cnpj={rascunho.company_cnpj ?? ''} empresaId={empresa?.id} />
          </div>
          <Campo label="LinkedIn" draft={rascunho.company_linkedin} onChange={definir('company_linkedin')} />
          <Campo label="Instagram" draft={rascunho.company_instagram} onChange={definir('company_instagram')} />
          <Campo label="Site" draft={rascunho.company_website} onChange={definir('company_website')} />
          <Campo label="Segmento" draft={rascunho.company_segment} onChange={definir('company_segment')} />
          <Campo label="Anel" draft={rascunho.company_ring} onChange={definir('company_ring')} />
          <Campo label="Tier" draft={rascunho.company_tier} onChange={definir('company_tier')} />
          <div className="space-y-1">
            <Label htmlFor="ficha-empresa-faturamento" className="text-xs text-muted-foreground">Faturamento anual</Label>
            <FaturamentoAnualField
              id="ficha-empresa-faturamento"
              valor={Number(rascunho.company_faturamento) || 0}
              base={rascunho.company_faturamento_base as FaturamentoBase}
              onValorChange={(valor) => definir('company_faturamento')(String(valor))}
              onBaseChange={definir('company_faturamento_base')}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Os campos da empresa valem para todas as oportunidades e contatos dela.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium leading-snug">{empresa?.name ?? 'Empresa não informada'}</p>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <Badge key={chip} variant="secondary" className="font-normal">{chip}</Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <LinkExterno href={empresa?.website} icone={Globe} rotulo={textoDeSite(empresa?.website)} />
            <LinkExterno href={empresa?.linkedin_url} icone={Linkedin} rotulo="LinkedIn" />
            <LinkExterno href={urlDoInstagram(empresa?.instagram_url)} icone={Instagram} rotulo="Instagram" />
          </div>

          <Separator />

          <CampoOpcional
            label="CNPJ"
            valor={empresa?.cnpj ? formatCNPJ(empresa.cnpj) : null}
            acao="Adicionar CNPJ"
            podeEditar={podeEditar}
            onEditar={onEditar}
          />
          <CampoOpcional
            label="Faturamento anual"
            valor={descreverFaturamento(empresa)}
            acao="Adicionar faturamento"
            podeEditar={podeEditar}
            onEditar={onEditar}
          />
        </div>
      )}
    </section>
  );
}

/** Avisa antes de salvar que o CNPJ é de outra empresa — e que a oportunidade vai passar para ela. */
function AvisoDeCnpjCadastrado({ cnpj, empresaId }: { cnpj: string; empresaId?: string }) {
  const { data: cadastrada } = useProspectCompanyByCnpj(cnpj);
  if (!cadastrada || cadastrada.id === empresaId) return null;
  return (
    <p className="text-xs text-muted-foreground" role="status">
      Este CNPJ já é de <span className="font-medium text-foreground">{cadastrada.name}</span>. Ao salvar, a
      oportunidade passa para essa empresa.
    </p>
  );
}

/**
 * Quem conduz e por onde (09/10/2026): responsável, alavanca e canal principal. Eram a metade
 * de baixo do antigo cartão "Contato"; as pessoas foram para "Contatos", com papel.
 */
function CartaoDeConducao({
  prospect,
  responsavel,
  diretorio,
  editando,
  rascunho,
  definir,
  podeEditar,
  onEditar,
}: {
  prospect: ProspectWithCompany;
  responsavel: string | null;
  diretorio: Array<{ id: string; nome: string }>;
  editando: boolean;
  rascunho: Record<string, string>;
  definir: (campo: string) => (valor: string) => void;
  podeEditar: boolean;
  onEditar: () => void;
}) {
  return (
    <section className="rounded-lg border bg-card p-3">
      <CabecalhoDoCartao titulo="Condução" podeEditar={podeEditar && !editando} onEditar={onEditar} />

      {editando ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Responsável</Label>
            <Select value={rascunho.owner_id} onValueChange={definir('owner_id')}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {diretorio.map((pessoa) => (
                  <SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Alavanca / origem</Label>
            <Select value={rascunho.lever} onValueChange={definir('lever')}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {PROSPECT_LEVERS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Canal principal</Label>
            <Select value={rascunho.primary_channel} onValueChange={definir('primary_channel')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERACTION_CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <dl className="grid grid-cols-3 gap-2">
            <Resumo termo="Responsável" valor={responsavel} />
            <Resumo termo="Alavanca" valor={getLeverLabel(prospect.lever)} />
            <Resumo termo="Canal principal" valor={getChannelLabel(prospect.primary_channel)} />
          </dl>

          {prospect.first_touch_at && (
            <p className="text-xs text-muted-foreground">
              1º toque em {formatarData(prospect.first_touch_at)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

interface BotoesDeSalvarProps {
  rotulo: string;
  salvando: boolean;
  onSalvar: () => Promise<void>;
  onCancelar: () => void;
}

/** Salvar e cancelar ao pé da coluna que está sendo editada — cada lado grava só o que é dele. */
function BotoesDeSalvar(props: BotoesDeSalvarProps) {
  const { rotulo, salvando, onSalvar, onCancelar } = props;
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => onSalvar().catch(() => undefined)} disabled={salvando}>
        {salvando ? 'Salvando...' : rotulo}
      </Button>
      <Button size="sm" variant="outline" onClick={onCancelar} disabled={salvando}>
        Cancelar
      </Button>
    </div>
  );
}

/** Só os campos da empresa (`company_*`), ou só os da oportunidade. */
function parteDoRascunho(rascunho: Record<string, string>, daEmpresa: boolean): Record<string, string> {
  return Object.fromEntries(Object.entries(rascunho).filter(([campo]) => campo.startsWith('company_') === daEmpresa));
}

function CabecalhoDoCartao({
  titulo,
  podeEditar,
  onEditar,
}: {
  titulo: string;
  podeEditar: boolean;
  onEditar: () => void;
}) {
  return (
    <header className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {podeEditar && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEditar}>
          Editar
        </Button>
      )}
    </header>
  );
}

/**
 * Campo vazio não vira traço mudo: vira o convite para preencher.
 *
 * O botão não cria caminho novo de escrita — abre a mesma edição do cartão. É só o
 * atalho para o campo que está faltando, que é onde a pessoa já estava olhando.
 */
function CampoOpcional({
  label,
  valor,
  acao,
  podeEditar,
  onEditar,
}: {
  label: string;
  valor?: string | null;
  acao: string;
  podeEditar: boolean;
  onEditar: () => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {valor ? (
        <p className="break-words text-sm">{valor}</p>
      ) : podeEditar ? (
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-normal" onClick={onEditar}>
          <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
          {acao}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

function Resumo({ termo, valor }: { termo: string; valor?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{termo}</dt>
      <dd className="break-words text-sm leading-snug">{valor || '—'}</dd>
    </div>
  );
}

function LinkExterno({
  href,
  icone: Icone,
  rotulo,
}: {
  href?: string | null;
  icone: typeof Globe;
  rotulo: string;
}) {
  if (!href) return null;
  return (
    <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-normal" asChild>
      <a href={comProtocolo(href)} target="_blank" rel="noopener noreferrer">
        <Icone className="mr-1 h-3 w-3" aria-hidden="true" />
        {rotulo}
      </a>
    </Button>
  );
}

function Campo({
  label,
  draft,
  onChange,
}: {
  label: string;
  draft?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={draft ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function rascunhoInicial(prospect: ProspectWithCompany): Record<string, string> {
  const empresa = prospect.company;
  return {
    company_name: empresa?.name ?? '',
    company_cnpj: empresa?.cnpj ? formatCNPJ(empresa.cnpj) : '',
    company_linkedin: empresa?.linkedin_url ?? '',
    company_instagram: empresa?.instagram_url ?? '',
    company_website: empresa?.website ?? '',
    company_segment: empresa?.segment ?? '',
    company_ring: empresa?.ring ?? '',
    company_tier: empresa?.tier ?? '',
    company_faturamento: empresa?.faturamento_anual != null ? String(empresa.faturamento_anual) : '',
    company_faturamento_base: empresa?.faturamento_anual_base ?? FATURAMENTO_BASE_PADRAO,
    primary_channel: prospect.primary_channel,
    owner_id: prospect.owner_id ?? '',
    lever: prospect.lever ?? '',
    estimated_value: prospect.estimated_value != null ? String(prospect.estimated_value) : '',
    notes: prospect.notes ?? '',
  };
}

function empresaDoRascunho(rascunho: Record<string, string>, empresa: ProspectCompanyDB) {
  return {
    name: rascunho.company_name || empresa.name,
    cnpj: rascunho.company_cnpj || null,
    linkedin_url: rascunho.company_linkedin || null,
    instagram_url: rascunho.company_instagram || null,
    website: rascunho.company_website || null,
    segment: rascunho.company_segment || null,
    ring: rascunho.company_ring || null,
    tier: rascunho.company_tier || null,
    client_id: empresa.client_id,
    notes: empresa.notes,
    faturamento_anual: Number(rascunho.company_faturamento) || null,
    faturamento_anual_base: rascunho.company_faturamento_base as FaturamentoBase,
  };
}

/** O negócio: só desta oportunidade. */
function negocioDoRascunho(rascunho: Record<string, string>, prospect: ProspectWithCompany) {
  return {
    primary_channel: rascunho.primary_channel || prospect.primary_channel,
    owner_id: rascunho.owner_id || prospect.owner_id,
    lever: rascunho.lever || null,
    estimated_value: Number(rascunho.estimated_value) > 0 ? Number(rascunho.estimated_value) : null,
    notes: rascunho.notes.trim() || null,
  };
}

function comProtocolo(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Aceita o que as pessoas colam: "@perfil", "perfil" ou o link inteiro. Guardamos como foi
 * digitado; só o link de abertura é normalizado.
 */
function urlDoInstagram(valor?: string | null): string | null {
  const texto = valor?.trim();
  if (!texto) return null;
  if (/instagram\.com/i.test(texto)) return texto;
  return `https://instagram.com/${texto.replace(/^@/, '')}`;
}

function textoDeSite(url?: string | null): string {
  if (!url) return 'Site';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function quantosContatos(prospect: ProspectWithCompany): number {
  return prospect.contacts?.length ?? 0;
}

function diasAte(iso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

function descreverPrazo(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'há 1 dia';
  if (dias > 1) return `${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}
