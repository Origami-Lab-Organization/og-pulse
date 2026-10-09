import { Briefcase, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectBudget, useProspectProject } from '@/hooks/useProspectDeal';
import { formatCurrency } from '@/lib/formatters';
import { prospectValueSource, resolveProspectValue, type ProspectValueSource } from '@/lib/prospecting/value';
import type { ProspectStage, ProspectWithCompany } from '@/types/prospect';
import type { ProspectBudgetLite, ProspectProjectLite } from '@/types/prospectDeal';
import { BotaoEditar, CartaoDaFicha, LinhaDeDado } from './FichaDaOportunidade';

const ETAPA_GANHO: ProspectStage = 'ganho';

interface ProspectDealCardProps {
  prospect: ProspectWithCompany;
  editando: boolean;
  rascunho: Record<string, string>;
  definir: (campo: string) => (valor: string) => void;
  podeEditar: boolean;
  onEditar: () => void;
  onCriarProjeto: () => void;
}

/**
 * O negócio da oportunidade (29/09/2026): valor, observações, orçamento e o projeto do Ganho.
 *
 * O valor segue a regra única (`resolveProspectValue`, ADR-0017) e diz de onde veio — quem lê
 * "R$ 48 mil" precisa saber se é o vendido, o orçado ou um palpite.
 */
export function ProspectDealCard(props: ProspectDealCardProps) {
  const { prospect, editando, podeEditar, onEditar } = props;
  return (
    <CartaoDaFicha titulo="Negócio" acao={podeEditar && !editando && <BotaoEditar onClick={onEditar} />}>
      <div className="space-y-3">
        {editando ? <EdicaoDoNegocio {...props} /> : <LeituraDoNegocio {...props} />}
        <OrcamentoDaOportunidade prospect={prospect} />
        <ProjetoDaOportunidade {...props} />
      </div>
    </CartaoDaFicha>
  );
}

function EdicaoDoNegocio({ rascunho, definir }: ProspectDealCardProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="negocio-valor" className="text-xs text-muted-foreground">Valor estimado</Label>
        <CurrencyInput
          id="negocio-valor"
          value={Number(rascunho.estimated_value || 0)}
          onValueChange={(v) => definir('estimated_value')(String(v))}
          showPrefix
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="negocio-notas" className="text-xs text-muted-foreground">Observações</Label>
        <Textarea
          id="negocio-notas"
          rows={4}
          maxLength={10000}
          value={rascunho.notes ?? ''}
          onChange={(e) => definir('notes')(e.target.value)}
        />
      </div>
    </div>
  );
}

const STATUS_DO_VALOR: Record<ProspectValueSource, string> = {
  vendido: 'Vendido',
  orcamento: 'Orçado',
  estimado: 'Estimado',
};

function LeituraDoNegocio({ prospect }: ProspectDealCardProps) {
  const { data: orcamento } = useProspectBudget(prospect.id);
  const comOrcamento = { ...prospect, budget: orcamento ?? null };
  const valor = resolveProspectValue(comOrcamento);
  return (
    <div className="space-y-3">
      <dl className="space-y-2">
        <LinhaDeDado termo="Valor">{valor > 0 ? formatCurrency(valor) : null}</LinhaDeDado>
        {valor > 0 && <LinhaDeDado termo="Status do valor">{STATUS_DO_VALOR[prospectValueSource(comOrcamento)]}</LinhaDeDado>}
      </dl>
      {prospect.notes && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Observações</p>
          <p className="whitespace-pre-line break-words text-sm">{prospect.notes}</p>
        </div>
      )}
    </div>
  );
}

/** Orçamento: abrir o vinculado ou criar a partir da oportunidade. Invisível sem `orcamento:ler`. */
function OrcamentoDaOportunidade({ prospect }: { prospect: ProspectWithCompany }) {
  const { can } = useAuth();
  const consulta = useProspectBudget(prospect.id);
  if (!can('orcamento:ler')) return null;
  return (
    <ConteudoDoOrcamento
      prospectId={prospect.id}
      orcamento={consulta.data ?? null}
      carregando={consulta.isLoading}
      erro={consulta.isError}
      podeCriar={can('orcamento:editar')}
    />
  );
}

function ConteudoDoOrcamento(props: {
  prospectId: string;
  orcamento: ProspectBudgetLite | null;
  carregando: boolean;
  erro: boolean;
  podeCriar: boolean;
}) {
  const { prospectId, orcamento, carregando, erro, podeCriar } = props;
  if (carregando) return <Skeleton className="h-9 w-full" />;
  if (erro) return <p className="text-xs text-destructive">Não foi possível carregar o orçamento.</p>;
  if (orcamento) {
    return (
      <Button variant="outline" size="sm" className="h-9 w-full justify-start text-xs font-normal" asChild>
        <Link to={`/budgets/${orcamento.id}`}>
          <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Orçamento {orcamento.budget_number} · {formatCurrency(orcamento.final_total)}</span>
        </Link>
      </Button>
    );
  }
  if (!podeCriar) return null;
  return (
    <Button variant="outline" size="sm" className="h-9 w-full border-dashed text-xs font-normal" asChild>
      <Link to={`/budgets/new?prospectId=${prospectId}`}>
        <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Criar orçamento
      </Link>
    </Button>
  );
}

/** Projeto: só no Ganho. Abre o criado ou oferece criar (o "Fechar negócio" de antes). */
function ProjetoDaOportunidade({ prospect, onCriarProjeto }: ProspectDealCardProps) {
  const { can } = useAuth();
  const ganho = prospect.stage === ETAPA_GANHO;
  const consulta = useProspectProject(ganho ? prospect.id : null);
  if (!ganho) return null;
  return (
    <ConteudoDoProjeto
      projeto={consulta.data ?? null}
      carregando={consulta.isLoading}
      podeCriar={can('projeto:editar')}
      onCriar={onCriarProjeto}
    />
  );
}

function ConteudoDoProjeto(props: {
  projeto: ProspectProjectLite | null;
  carregando: boolean;
  podeCriar: boolean;
  onCriar: () => void;
}) {
  const { projeto, carregando, podeCriar, onCriar } = props;
  if (carregando) return <Skeleton className="h-9 w-full" />;
  if (projeto) {
    return (
      <Button variant="outline" size="sm" className="h-9 w-full justify-start text-xs font-normal" asChild>
        <Link to={`/projects/${projeto.id}`}>
          <Briefcase className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Projeto {projeto.name}</span>
        </Link>
      </Button>
    );
  }
  if (!podeCriar) return <p className="text-xs text-muted-foreground">Nenhum projeto criado ainda.</p>;
  return (
    <Button size="sm" className="h-9 w-full text-xs" onClick={onCriar}>
      <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      Criar projeto
    </Button>
  );
}
