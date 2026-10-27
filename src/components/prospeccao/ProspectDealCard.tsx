import type { ReactNode } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectBudget } from '@/hooks/useProspectDeal';
import { formatCurrency } from '@/lib/formatters';
import { getChannelLabel, INTERACTION_CHANNELS } from '@/lib/interactionChannels';
import { formatarData } from '@/lib/prospecting/prazos';
import { prospectValueSource, resolveProspectValue, type ProspectValueSource } from '@/lib/prospecting/value';
import { getLeverLabel, PROSPECT_LEVERS, type ProspectWithCompany } from '@/types/prospect';
import type { ProspectBudgetLite } from '@/types/prospectDeal';
import { BotaoEditar, CartaoDaFicha, LinhaDeDado } from './FichaDaOportunidade';

interface ProspectDealCardProps {
  prospect: ProspectWithCompany;
  /** Nome de quem conduz, já resolvido no diretório. */
  responsavel: string | null;
  diretorio: Array<{ id: string; nome: string }>;
  editando: boolean;
  rascunho: Record<string, string>;
  definir: (campo: string) => (valor: string) => void;
  podeEditar: boolean;
  onEditar: () => void;
  /** Salvar e cancelar da edição, dentro da própria seção. */
  rodape?: ReactNode;
}

/**
 * O negócio da oportunidade (29/09/2026): valor, quem conduz e por onde, observações e o
 * orçamento. Desde 27/10/2026 absorve o antigo cartão "Condução" — os dois editavam e salvavam
 * juntos — e o projeto do Ganho subiu para a faixa do desfecho, no topo da ficha.
 *
 * O valor segue a regra única (`resolveProspectValue`, ADR-0017) e diz de onde veio — quem lê
 * "R$ 48 mil" precisa saber se é o vendido, o orçado ou um palpite.
 */
export function ProspectDealCard(props: ProspectDealCardProps) {
  const { prospect, responsavel, editando, podeEditar, onEditar, rodape } = props;
  const { data: orcamento } = useProspectBudget(prospect.id);
  const comOrcamento = { ...prospect, budget: orcamento ?? null };
  const valor = resolveProspectValue(comOrcamento);
  const resumo = valor > 0 ? `${formatCurrency(valor)} ${STATUS_DO_VALOR[prospectValueSource(comOrcamento)]}` : responsavel;
  return (
    <CartaoDaFicha titulo="Negócio" resumo={resumo} acao={podeEditar && !editando && <BotaoEditar onClick={onEditar} />}>
      <div className="space-y-3">
        {editando ? <EdicaoDoNegocio {...props} /> : <LeituraDoNegocio {...props} />}
        {editando && rodape}
        <OrcamentoDaOportunidade prospect={prospect} />
      </div>
    </CartaoDaFicha>
  );
}

function EdicaoDoNegocio({ rascunho, definir, diretorio }: ProspectDealCardProps) {
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
      <CampoDeEscolha
        rotulo="Responsável"
        valor={rascunho.owner_id}
        onChange={definir('owner_id')}
        opcoes={diretorio.map((p) => ({ value: p.id, label: p.nome }))}
      />
      <CampoDeEscolha rotulo="Alavanca / origem" valor={rascunho.lever} onChange={definir('lever')} opcoes={PROSPECT_LEVERS} />
      <CampoDeEscolha
        rotulo="Canal principal"
        valor={rascunho.primary_channel}
        onChange={definir('primary_channel')}
        opcoes={INTERACTION_CHANNELS}
      />
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
  vendido: 'vendido',
  orcamento: 'orçado',
  estimado: 'estimado',
};

function LeituraDoNegocio({ prospect, responsavel }: ProspectDealCardProps) {
  const { data: orcamento } = useProspectBudget(prospect.id);
  const comOrcamento = { ...prospect, budget: orcamento ?? null };
  const valor = resolveProspectValue(comOrcamento);
  return (
    <div className="space-y-3">
      <dl className="space-y-2">
        <LinhaDeDado termo="Valor">
          {valor > 0 && (
            <>
              {formatCurrency(valor)}
              <span className="font-normal text-muted-foreground"> {STATUS_DO_VALOR[prospectValueSource(comOrcamento)]}</span>
            </>
          )}
        </LinhaDeDado>
        <LinhaDeDado termo="Responsável">{responsavel}</LinhaDeDado>
        <LinhaDeDado termo="Alavanca">{getLeverLabel(prospect.lever)}</LinhaDeDado>
        <LinhaDeDado termo="Canal principal">{getChannelLabel(prospect.primary_channel)}</LinhaDeDado>
        <LinhaDeDado termo="1º toque">{prospect.first_touch_at ? formatarData(prospect.first_touch_at) : null}</LinhaDeDado>
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

interface CampoDeEscolhaProps {
  rotulo: string;
  valor?: string;
  onChange: (valor: string) => void;
  opcoes: ReadonlyArray<{ value: string; label: string }>;
}

function CampoDeEscolha(props: CampoDeEscolhaProps) {
  const { rotulo, valor, onChange, opcoes } = props;
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      <Select value={valor} onValueChange={onChange}>
        <SelectTrigger aria-label={rotulo}><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
