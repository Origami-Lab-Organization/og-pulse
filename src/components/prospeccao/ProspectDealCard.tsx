import { Briefcase, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectBudget, useProspectProject } from '@/hooks/useProspectDeal';
import { formatCurrency } from '@/lib/formatters';
import { resolveProspectValue } from '@/lib/prospecting/value';
import type { ProspectStage, ProspectWithCompany } from '@/types/prospect';
import type { ProspectBudgetLite, ProspectProjectLite } from '@/types/prospectDeal';

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
 * O negócio do contato (29/09/2026): o que era da Oportunidade — valor, observações,
 * orçamento e o projeto do Ganho. O concorrente saiu em 30/09/2026.
 *
 * O valor exibido segue a regra única (`resolveProspectValue`, ADR-0017) e diz de onde veio:
 * quem lê "R$ 48 mil" precisa saber se é o vendido, o orçado ou um palpite.
 */
export function ProspectDealCard(props: ProspectDealCardProps) {
  const { prospect, editando, podeEditar, onEditar } = props;
  return (
    <section className="rounded-lg border bg-card p-3" aria-label="Negócio">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Negócio</h3>
        {podeEditar && !editando && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEditar}>
            Editar
          </Button>
        )}
      </header>
      {editando ? <EdicaoDoNegocio {...props} /> : <LeituraDoNegocio {...props} />}
      <Separator className="my-3" />
      <OrcamentoDoContato prospect={prospect} />
      <ProjetoDoContato {...props} />
    </section>
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

function LeituraDoNegocio({ prospect }: ProspectDealCardProps) {
  const { data: orcamento } = useProspectBudget(prospect.id);
  const valor = resolveProspectValue({ ...prospect, budget: orcamento ?? null });
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor</p>
        <p className="text-sm font-medium">{valor > 0 ? formatCurrency(valor) : '—'}</p>
        {valor > 0 && <p className="text-xs text-muted-foreground">{origemDoValor(prospect, orcamento)}</p>}
      </div>
      {prospect.notes && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Observações</p>
          <p className="whitespace-pre-line break-words text-sm">{prospect.notes}</p>
        </div>
      )}
    </div>
  );
}

function origemDoValor(prospect: ProspectWithCompany, orcamento?: ProspectBudgetLite | null): string {
  if (prospect.stage === ETAPA_GANHO && prospect.won_value != null) return 'Valor vendido';
  if (orcamento && orcamento.final_total > 0) return `Do orçamento ${orcamento.budget_number}`;
  return 'Estimado';
}

const botaoPequeno = 'h-7 px-2 text-xs font-normal';

function Rotulo({ children }: { children: string }) {
  return <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{children}</p>;
}

/** Orçamento: abrir o vinculado ou criar a partir do contato. Invisível sem `orcamento:ler`. */
function OrcamentoDoContato({ prospect }: { prospect: ProspectWithCompany }) {
  const { can } = useAuth();
  const consulta = useProspectBudget(prospect.id);
  if (!can('orcamento:ler')) return null;
  return (
    <div className="space-y-1">
      <Rotulo>Orçamento</Rotulo>
      <ConteudoDoOrcamento
        prospectId={prospect.id}
        orcamento={consulta.data ?? null}
        carregando={consulta.isLoading}
        erro={consulta.isError}
        podeCriar={can('orcamento:editar')}
      />
    </div>
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
  if (carregando) return <Skeleton className="h-7 w-40" />;
  if (erro) return <p className="text-xs text-destructive">Não foi possível carregar o orçamento.</p>;
  if (orcamento) {
    return (
      <Button variant="outline" size="sm" className={botaoPequeno} asChild>
        <Link to={`/budgets/${orcamento.id}`}>
          <FileText className="mr-1 h-3 w-3" aria-hidden="true" />
          {orcamento.budget_number} · {formatCurrency(orcamento.final_total)}
        </Link>
      </Button>
    );
  }
  if (!podeCriar) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <Button variant="outline" size="sm" className={botaoPequeno} asChild>
      <Link to={`/budgets/new?prospectId=${prospectId}`}>
        <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
        Criar orçamento
      </Link>
    </Button>
  );
}

/** Projeto: só no Ganho. Abre o criado ou oferece criar (o "Fechar negócio" de antes). */
function ProjetoDoContato({ prospect, onCriarProjeto }: ProspectDealCardProps) {
  const { can } = useAuth();
  const ganho = prospect.stage === ETAPA_GANHO;
  const consulta = useProspectProject(ganho ? prospect.id : null);
  if (!ganho) return null;
  return (
    <div className="mt-3 space-y-1">
      <Rotulo>Projeto</Rotulo>
      <ConteudoDoProjeto
        projeto={consulta.data ?? null}
        carregando={consulta.isLoading}
        podeCriar={can('projeto:editar')}
        onCriar={onCriarProjeto}
      />
    </div>
  );
}

function ConteudoDoProjeto(props: {
  projeto: ProspectProjectLite | null;
  carregando: boolean;
  podeCriar: boolean;
  onCriar: () => void;
}) {
  const { projeto, carregando, podeCriar, onCriar } = props;
  if (carregando) return <Skeleton className="h-7 w-40" />;
  if (projeto) {
    return (
      <Button variant="outline" size="sm" className={botaoPequeno} asChild>
        <Link to={`/projects/${projeto.id}`}>
          <Briefcase className="mr-1 h-3 w-3" aria-hidden="true" />
          {projeto.name}
        </Link>
      </Button>
    );
  }
  if (!podeCriar) return <p className="text-sm text-muted-foreground">Nenhum projeto criado ainda.</p>;
  return (
    <Button size="sm" className="h-7 px-2 text-xs" onClick={onCriar}>
      <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
      Criar projeto
    </Button>
  );
}
