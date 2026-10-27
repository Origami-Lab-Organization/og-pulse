import { useEffect, useState } from 'react';
import { MessagesSquare, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useSaveCompanyReceita } from '@/hooks/useCompanyReceita';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import { useProspectActivities } from '@/hooks/useProspectActivities';
import { useSaveCardCompany } from '@/hooks/useProspectCompanies';
import { useProspectFiles } from '@/hooks/useProspectFiles';
import {
  useDeleteProspect,
  useProspects,
  useReopenProspect,
  useUpdateProspect,
  useUpdateProspectStage,
} from '@/hooks/useProspects';
import { useProspectTasks } from '@/hooks/useProspectTasks';
import { formatCNPJ } from '@/lib/masks';
import { juntarArquivos } from '@/lib/prospecting/arquivos';
import { opportunitiesInProgressByCompany, otherOpportunitiesInProgress } from '@/lib/prospecting/companyStatus';
import { cn } from '@/lib/utils';
import {
  describeOpportunityContacts,
  FATURAMENTO_BASE_PADRAO,
  getProspectStageLabel,
  isProspectReadOnly,
  isTaskOverdue,
  type FaturamentoBase,
  type ProspectActivityWithOwner,
  type ProspectCompanyDB,
  type ProspectTaskDB,
  type ProspectWithCompany,
} from '@/types/prospect';
import type { ReceitaSnapshot } from '@/types/receita';
import { CompanyFitSection } from './CompanyFitSection';
import { CompanyReceitaCard } from './CompanyReceitaCard';
import { BotoesDeSalvar } from './FichaDaOportunidade';
import { OpportunityCompanyCard } from './OpportunityCompanyCard';
import { OpportunityContactsCard } from './OpportunityContactsCard';
import { OpportunityHeader } from './OpportunityHeader';
import { OpportunityNextTask } from './OpportunityNextTask';
import { ProspectActivityComposer } from './ProspectActivityComposer';
import { ProspectActivityTimeline } from './ProspectActivityTimeline';
import { ProspectDealCard } from './ProspectDealCard';
import { ProspectFilesList, ProspectFilesUploader } from './ProspectFilesPanel';
import { ProspectProjectDialog } from './ProspectProjectDialog';
import { ProspectTaskComposer } from './ProspectTaskComposer';
import { ProspectTaskTimeline } from './ProspectTaskTimeline';
import { RegisterMeetingDialog } from './RegisterMeetingDialog';

type Aba = 'registros' | 'tarefas' | 'arquivos';

interface ProspectDetailDialogProps {
  prospect: ProspectWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: (prospect: ProspectWithCompany) => void;
  /** Registrar ou corrigir o ganho — abre o diálogo de data e valor. */
  onWin: (prospect: ProspectWithCompany) => void;
}

/**
 * A ficha da oportunidade (27/10/2026): o que aconteceu ocupa o centro, largo; à direita, um
 * painel só com o Negócio, os Contatos e a Empresa, um embaixo do outro. Substituiu as três
 * colunas de 09/10/2026, em que a conversa ficava espremida entre contatos e empresa.
 *
 * A separação é o pedido central — quem abre precisa distinguir num relance o que é cadastro
 * do que é histórico. A oportunidade é da empresa e leva o nome dela; as pessoas entram em
 * "Contatos", cada uma com o papel na decisão. Os campos da empresa valem para todas as
 * oportunidades dela: editá-los aqui edita a empresa, que é o que torna o cadastro reutilizável.
 */
export function ProspectDetailDialog(props: ProspectDetailDialogProps) {
  const { prospect, open, onOpenChange } = props;
  if (!prospect) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[90vh] max-w-6xl flex-col gap-0 overflow-hidden p-0"
        // O foco vai para a ficha, não para o primeiro botão (o lápis do nome), que abria
        // destacado como se a pessoa tivesse ido até ele.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
        // Esc num campo de edição no lugar (o nome da oportunidade) cancela só a edição.
        onEscapeKeyDown={(e) => {
          if ((e.target as HTMLElement | null)?.closest?.('[data-esc-local]')) e.preventDefault();
        }}
      >
        <Ficha {...props} prospect={prospect} />
      </DialogContent>
    </Dialog>
  );
}

function Ficha(props: ProspectDetailDialogProps & { prospect: ProspectWithCompany }) {
  const { prospect, open, onOpenChange, onDiscard, onWin } = props;
  const { data: atividades = [], isLoading } = useProspectActivities(prospect.id);
  const { data: diretorio = [] } = useEmployeeDirectory(open);
  const edicao = useEdicaoDaFicha(prospect, open);
  const reabrir = useReopenProspect();
  const moverEtapa = useUpdateProspectStage();
  const excluir = useDeleteProspect();
  const { can } = useAuth();
  const [reuniaoAberta, setReuniaoAberta] = useState(false);
  const [projetoAberto, setProjetoAberto] = useState(false);
  const painel = usePainelLateral();

  const somenteLeitura = isProspectReadOnly(prospect);
  const responsavel = diretorio.find((p) => p.id === prospect.owner_id)?.nome ?? null;

  return (
    <>
      <OpportunityHeader
        prospect={prospect}
        atividades={atividades}
        responsavel={responsavel}
        somenteLeitura={somenteLeitura}
        editando={edicao.editando}
        onEditar={edicao.alternar}
        onGanhar={() => onWin(prospect)}
        onDescartar={() => onDiscard(prospect)}
        onRegistrarReuniao={() => setReuniaoAberta(true)}
        onReabrir={() => reabrir.mutate({ id: prospect.id })}
        onDesfazerGanho={() => moverEtapa.mutate({ id: prospect.id, stage: 'qualificado' })}
        onVoltar={(stage) => moverEtapa.mutate({ id: prospect.id, stage })}
        onExcluir={() => {
          excluir.mutate({ id: prospect.id });
          onOpenChange(false);
        }}
        onCriarProjeto={() => setProjetoAberto(true)}
      />

      {/* Duas colunas: abaixo de lg o painel desce para depois da conversa, e a ficha inteira rola.
          Recolhido, o painel vira um trilho fino e a conversa ocupa a largura. */}
      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:overflow-hidden',
          painel.aberto ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]' : 'lg:grid-cols-[minmax(0,1fr)_auto]',
        )}
      >
        <PainelDeAtividade
          prospect={prospect}
          open={open}
          atividades={atividades}
          carregandoAtividades={isLoading}
          somenteLeitura={somenteLeitura}
        />

        {!painel.aberto && <TrilhoDoPainel onAbrir={painel.abrir} />}
        {painel.aberto && (
          <aside
            aria-label="Negócio, contatos e empresa"
            className="min-h-0 border-t bg-card lg:overflow-y-auto lg:border-l lg:border-t-0"
          >
            <div className="flex items-center justify-between border-b py-1.5 pl-5 pr-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Detalhes</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Recolher o painel de detalhes"
                title="Recolher painel"
                onClick={painel.recolher}
              >
                <PanelRightClose className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <AvisoOutrasOportunidades prospect={prospect} diretorio={diretorio} />
            <ProspectDealCard
              prospect={prospect}
              responsavel={responsavel}
              diretorio={diretorio}
              editando={edicao.editandoOportunidade}
              rascunho={edicao.rascunho}
              definir={edicao.definir}
              podeEditar={!somenteLeitura}
              onEditar={edicao.abrirOportunidade}
              rodape={
                <BotoesDeSalvar
                  rotulo="Salvar negócio"
                  salvando={edicao.salvandoOportunidade}
                  onSalvar={edicao.salvarOportunidade}
                  onCancelar={edicao.cancelarOportunidade}
                />
              }
            />
            <OpportunityContactsCard prospect={prospect} podeEditar={!somenteLeitura} />
            <OpportunityCompanyCard
              empresa={prospect.company}
              editando={edicao.editandoEmpresa}
              rascunho={edicao.rascunho}
              definir={edicao.definir}
              onReceita={edicao.aplicarReceita}
              receitaAchada={edicao.receitaDaEdicao}
              podeEditar={!somenteLeitura}
              onEditar={edicao.abrirEmpresa}
              rodape={
                <BotoesDeSalvar
                  rotulo="Salvar empresa"
                  salvando={edicao.salvandoEmpresa}
                  onSalvar={edicao.salvarEmpresa}
                  onCancelar={edicao.cancelarEmpresa}
                />
              }
            />
            {prospect.company && (
              <>
                <CompanyFitSection empresa={prospect.company} fomento={prospect.company.fomento ?? null} emCartao />
                <CompanyReceitaCard empresa={prospect.company} podeEditar={can('prospeccao:editar')} compacto />
              </>
            )}
          </aside>
        )}
      </div>

      <RegisterMeetingDialog prospect={prospect} open={reuniaoAberta} onOpenChange={setReuniaoAberta} />
      <ProspectProjectDialog prospect={prospect} open={projetoAberto} onOpenChange={setProjetoAberto} />
    </>
  );
}

/** Recolhido, o painel fica só com o botão de abrir — um trilho na borda da ficha. */
function TrilhoDoPainel({ onAbrir }: { onAbrir: () => void }) {
  return (
    <div className="flex justify-end border-t bg-card p-2 lg:flex-col lg:justify-start lg:border-l lg:border-t-0">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Mostrar o painel de detalhes"
        title="Mostrar negócio, contatos e empresa"
        onClick={onAbrir}
      >
        <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

const CHAVE_DO_PAINEL_RECOLHIDO = 'pulse:ficha-oportunidade:painel-recolhido';

/** Preferência de quem olha, neste navegador: sem armazenamento, o painel abre. */
function lerPainelRecolhido(): boolean {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_DO_PAINEL_RECOLHIDO) ?? 'false') === true;
  } catch {
    return false;
  }
}

/**
 * O painel da direita recolhe inteiro (27/10/2026, pedido do Italo) e a escolha fica lembrada
 * neste navegador — quem prefere ler a conversa larga não precisa recolher a cada ficha.
 */
function usePainelLateral() {
  const [aberto, setAberto] = useState(() => !lerPainelRecolhido());
  const definir = (valor: boolean) => {
    setAberto(valor);
    try {
      localStorage.setItem(CHAVE_DO_PAINEL_RECOLHIDO, JSON.stringify(!valor));
    } catch {
      // Sem armazenamento (aba privada, bloqueio): a escolha vale só enquanto a ficha está aberta.
    }
  };
  return { aberto, abrir: () => definir(true), recolher: () => definir(false) };
}

/**
 * A edição da ficha: oportunidade e empresa editam e salvam cada uma por si (02/10/2026) —
 * cada coluna, seu botão; cancelar um lado desfaz só o rascunho dele.
 */
function useEdicaoDaFicha(prospect: ProspectWithCompany, open: boolean) {
  const atualizarOportunidade = useUpdateProspect();
  const salvarEmpresaDoCard = useSaveCardCompany();
  const gravarReceita = useSaveCompanyReceita();
  const [editandoOportunidade, setEditandoOportunidade] = useState(false);
  const [editandoEmpresa, setEditandoEmpresa] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  // Retrato achado pela busca de CNPJ na edição: gravado junto ao salvar a empresa.
  const [receitaDaEdicao, setReceitaDaEdicao] = useState<ReceitaSnapshot | null>(null);

  // Reinicia só ao abrir a ficha ou trocar de oportunidade. Depender do objeto `prospect`
  // apagaria a edição da empresa em andamento quando o salvar da oportunidade recarrega os dados.
  useEffect(() => {
    if (!open) return;
    setEditandoOportunidade(false);
    setEditandoEmpresa(false);
    setReceitaDaEdicao(null);
  }, [open, prospect.id]);

  const repor = (daEmpresa: boolean) =>
    setRascunho((atual) => ({ ...atual, ...parteDoRascunho(rascunhoInicial(prospect), daEmpresa) }));

  const abrirOportunidade = () => {
    repor(false);
    setEditandoOportunidade(true);
  };
  const cancelarOportunidade = () => {
    repor(false);
    setEditandoOportunidade(false);
  };
  const abrirEmpresa = () => {
    repor(true);
    setReceitaDaEdicao(null);
    setEditandoEmpresa(true);
  };
  const cancelarEmpresa = () => {
    repor(true);
    setReceitaDaEdicao(null);
    setEditandoEmpresa(false);
  };

  const salvarOportunidade = async () => {
    await atualizarOportunidade.mutateAsync({ id: prospect.id, updates: negocioDoRascunho(rascunho, prospect) });
    setEditandoOportunidade(false);
  };

  const salvarEmpresa = async () => {
    if (!prospect.company) return;
    // CNPJ de outra empresa já cadastrada: a oportunidade passa para ela, e a Receita vai junto.
    const destino = await salvarEmpresaDoCard.mutateAsync({ card: prospect, input: empresaDoRascunho(rascunho, prospect.company) });
    const cnpjDoRascunho = (rascunho.company_cnpj ?? '').replace(/\D/g, '');
    if (receitaDaEdicao && receitaDaEdicao.cnpj === cnpjDoRascunho) {
      await gravarReceita.mutateAsync({ companyId: destino.id, receita: receitaDaEdicao }).catch(() => undefined);
    }
    setEditandoEmpresa(false);
  };

  // A Receita só preenche o que está vazio: o que a pessoa escreveu vence.
  const aplicarReceita = (receita: ReceitaSnapshot) => {
    setReceitaDaEdicao(receita);
    setRascunho((atual) => ({
      ...atual,
      company_name: atual.company_name?.trim() ? atual.company_name : receita.nomeFantasia ?? receita.razaoSocial,
      company_segment: atual.company_segment?.trim() ? atual.company_segment : receita.segmento ?? '',
    }));
  };

  const editando = editandoOportunidade || editandoEmpresa;
  const alternar = () => {
    if (editando) {
      cancelarOportunidade();
      cancelarEmpresa();
      return;
    }
    abrirOportunidade();
    abrirEmpresa();
  };

  return {
    rascunho,
    definir: (campo: string) => (valor: string) => setRascunho((atual) => ({ ...atual, [campo]: valor })),
    receitaDaEdicao,
    editando,
    editandoOportunidade,
    editandoEmpresa,
    salvandoOportunidade: atualizarOportunidade.isPending,
    salvandoEmpresa: salvarEmpresaDoCard.isPending || gravarReceita.isPending,
    alternar,
    abrirOportunidade,
    cancelarOportunidade,
    salvarOportunidade,
    abrirEmpresa,
    cancelarEmpresa,
    salvarEmpresa,
    aplicarReceita,
  };
}

/** Abas sublinhadas (09/10/2026): mais leves que as "pílulas", e a contagem ao lado do nome. */
const GATILHO_DA_ABA =
  'gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 pt-1 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';

const CONTEUDO_DA_ABA = 'mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden';

/**
 * O centro da ficha: a próxima tarefa em destaque e, embaixo, Registros (o que já aconteceu),
 * Tarefas (o que falta fazer) e Arquivos (os anexos das atividades e os anexados direto).
 * Cada aba tem a sua caixa de escrita fixa no rodapé — sempre alcançável, com a lista longa.
 */
interface PainelDeAtividadeProps {
  prospect: ProspectWithCompany;
  open: boolean;
  atividades: ProspectActivityWithOwner[];
  carregandoAtividades: boolean;
  somenteLeitura: boolean;
}

function PainelDeAtividade(props: PainelDeAtividadeProps) {
  const { prospect, open, atividades, carregandoAtividades, somenteLeitura } = props;
  const { data: tarefas = [], isLoading: carregandoTarefas } = useProspectTasks(prospect.id);
  const arquivos = useArquivosDaOportunidade(prospect.id, atividades, carregandoAtividades);
  const [aba, setAba] = useState<Aba>('registros');

  // Só pelo id: o objeto é recarregado a cada escrita e não pode tirar a pessoa da aba.
  useEffect(() => {
    if (open) setAba('registros');
  }, [open, prospect.id]);

  // Já vem ordenada por prazo (fetchProspectTasks): a primeira pendente é a mais urgente.
  const pendentes = tarefas.filter((t) => !t.done_at);
  const proxima = somenteLeitura ? null : pendentes[0] ?? null;

  return (
    <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)} className="flex min-h-0 flex-col bg-card" aria-label="Atividade">
      <div className="space-y-4 px-5 pt-5">
        {proxima && <OpportunityNextTask tarefa={proxima} podeEditar={!somenteLeitura} />}
        <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="registros" className={GATILHO_DA_ABA}>
            Registros <Contagem n={atividades.length} />
          </TabsTrigger>
          <TabsTrigger value="tarefas" className={GATILHO_DA_ABA}>
            Tarefas <ContagemDeTarefas pendentes={pendentes} />
          </TabsTrigger>
          <TabsTrigger value="arquivos" className={GATILHO_DA_ABA}>
            Arquivos <Contagem n={arquivos.itens.length} />
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="registros" className={CONTEUDO_DA_ABA}>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ProspectActivityTimeline
            prospect={prospect}
            activities={atividades}
            isLoading={carregandoAtividades}
            podeEditar={!somenteLeitura}
          />
        </div>
        {!somenteLeitura && (
          <div className="border-t px-5 py-4">
            <ProspectActivityComposer prospect={prospect} />
          </div>
        )}
      </TabsContent>

      <TabsContent value="tarefas" className={CONTEUDO_DA_ABA}>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ProspectTaskTimeline tasks={tarefas} isLoading={carregandoTarefas} podeEditar={!somenteLeitura} />
        </div>
        {!somenteLeitura && (
          <div className="border-t px-5 py-4">
            <ProspectTaskComposer prospect={prospect} />
          </div>
        )}
      </TabsContent>

      <TabsContent value="arquivos" className={CONTEUDO_DA_ABA}>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ProspectFilesList itens={arquivos.itens} carregando={arquivos.carregando} podeEditar={!somenteLeitura} />
        </div>
        {!somenteLeitura && (
          <div className="border-t px-5 py-4">
            <ProspectFilesUploader prospectId={prospect.id} />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

/** Os arquivos da ficha e os das atividades, numa lista só (09/10/2026). */
function useArquivosDaOportunidade(
  prospectId: string,
  atividades: ProspectActivityWithOwner[],
  carregandoAtividades: boolean,
) {
  const { data: daFicha = [], isLoading } = useProspectFiles(prospectId);
  return { itens: juntarArquivos(daFicha, atividades), carregando: isLoading || carregandoAtividades };
}

/** Contagem discreta ao lado do nome da aba. */
function Contagem({ n }: { n: number }) {
  if (n === 0) return null;
  return <span className="text-xs font-normal text-muted-foreground tabular-nums">{n}</span>;
}

/** Quantas tarefas faltam, em vermelho quando alguma venceu. */
function ContagemDeTarefas({ pendentes }: { pendentes: ProspectTaskDB[] }) {
  if (pendentes.length === 0) return null;
  const vencidas = pendentes.filter((t) => isTaskOverdue(t)).length;
  const rotulo = vencidas > 0
    ? `${pendentes.length} não concluídas, ${vencidas} vencidas`
    : `${pendentes.length} não concluídas`;
  return (
    <span
      aria-label={rotulo}
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums',
        vencidas > 0 ? 'bg-destructive-subtle text-destructive' : 'bg-muted text-muted-foreground',
      )}
    >
      {pendentes.length}
    </span>
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
    <div role="note" className="m-4 mb-1 flex items-start gap-2.5 rounded-lg border border-warning/20 bg-warning-subtle p-3">
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
                {o.title && <span className="font-medium">{o.title} · </span>}
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

/** Só os campos da empresa (`company_*`), ou só os da oportunidade. */
function parteDoRascunho(rascunho: Record<string, string>, daEmpresa: boolean): Record<string, string> {
  return Object.fromEntries(Object.entries(rascunho).filter(([campo]) => campo.startsWith('company_') === daEmpresa));
}

/** Rascunho só tem texto: vazio no lugar de nulo, número e CNPJ já formatados. */
const comoTexto = (valor?: string | null) => valor ?? '';
const numeroComoTexto = (valor?: number | null) => (valor != null ? String(valor) : '');
const cnpjComoTexto = (cnpj?: string | null) => (cnpj ? formatCNPJ(cnpj) : '');
/** E na volta, texto vazio vira nulo. */
const ouNulo = (valor?: string) => valor || null;

function rascunhoInicial(prospect: ProspectWithCompany): Record<string, string> {
  const empresa = prospect.company;
  return {
    company_name: comoTexto(empresa?.name),
    company_cnpj: cnpjComoTexto(empresa?.cnpj),
    company_linkedin: comoTexto(empresa?.linkedin_url),
    company_instagram: comoTexto(empresa?.instagram_url),
    company_website: comoTexto(empresa?.website),
    company_segment: comoTexto(empresa?.segment),
    company_ring: comoTexto(empresa?.ring),
    company_tier: comoTexto(empresa?.tier),
    company_faturamento: numeroComoTexto(empresa?.faturamento_anual),
    company_faturamento_base: empresa?.faturamento_anual_base ?? FATURAMENTO_BASE_PADRAO,
    primary_channel: prospect.primary_channel,
    owner_id: comoTexto(prospect.owner_id),
    lever: comoTexto(prospect.lever),
    estimated_value: numeroComoTexto(prospect.estimated_value),
    notes: comoTexto(prospect.notes),
  };
}

function empresaDoRascunho(rascunho: Record<string, string>, empresa: ProspectCompanyDB) {
  return {
    name: rascunho.company_name || empresa.name,
    cnpj: ouNulo(rascunho.company_cnpj),
    linkedin_url: ouNulo(rascunho.company_linkedin),
    instagram_url: ouNulo(rascunho.company_instagram),
    website: ouNulo(rascunho.company_website),
    segment: ouNulo(rascunho.company_segment),
    ring: ouNulo(rascunho.company_ring),
    tier: ouNulo(rascunho.company_tier),
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
