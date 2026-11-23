import { useId, useState } from 'react';
import { Check, ExternalLink, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useBant, useDecidirEvidenciaBant, useRegistrarEvidenciaBant } from '@/hooks/useBant';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { ESTADOS_BANT, LETRAS_BANT, motivoDePerdaSugerido, oQueFaltaParaQualificar, rotuloDoEstado } from '@/lib/prospecting/bant';
import { formatarData } from '@/lib/prospecting/prazos';
import { cn } from '@/lib/utils';
import { getDiscardReasonLabel, getProspectStageLabel, type ProspectWithCompany } from '@/types/prospect';
import type { EstadoBant, EvidenciaBantDB, LetraBant, LetraDoBant, OrigemEvidencia, SituacaoEvidencia } from '@/types/bant';
import { LetrasDoBant } from './LetrasDoBant';

interface BantNaOportunidadeProps {
  prospect: ProspectWithCompany;
  podeEditar: boolean;
  /** "Não atende" sugere a Perda com o motivo da lista fechada (sem registrar sozinha). */
  onSugerirPerda?: (motivo: string | null) => void;
}

const ESTADO_NAO_ATENDE: EstadoBant = 'nao_atende';
const ESTADO_CONFIRMADO: EstadoBant = 'confirmado';
const ACEITA = 'aceita' as const;
const RECUSADA = 'recusada' as const;
const PROPOSTA: SituacaoEvidencia = 'proposta';
const ORIGEM_IA: OrigemEvidencia = 'ia';

/**
 * O BANT da oportunidade (US-0022): as quatro letras com a evidência de cada uma, a nota e a
 * meta da etapa, e as propostas da IA (US-0024), que só contam depois que a pessoa aceita.
 */
export function BantNaOportunidade(props: BantNaOportunidadeProps) {
  const { prospect, podeEditar, onSugerirPerda } = props;
  const { bant, evidencias, isLoading } = useBant(prospect);
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando o BANT…</p>;
  const falta = oQueFaltaParaQualificar(bant);
  return (
    <section className="space-y-3" aria-label="BANT">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">BANT</h3>
        <LetrasDoBant bant={bant} />
      </div>
      <p className="text-xs text-muted-foreground">
        {bant.meta != null && `Meta em ${getProspectStageLabel(prospect.stage)}: ${bant.meta}. `}
        {falta ? `Para "Oportunidade qualificada": ${falta}` : 'Pronta para "Oportunidade qualificada".'}
      </p>
      {bant.propostas.length > 0 && <Propostas propostas={bant.propostas} podeEditar={podeEditar} />}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {LETRAS_BANT.map((l) => (
          <CartaoDaLetra
            key={l.letra}
            prospectId={prospect.id}
            letra={bant.letras[l.letra]}
            historico={evidencias.filter((e) => e.letra === l.letra)}
            podeEditar={podeEditar}
            onSugerirPerda={onSugerirPerda}
          />
        ))}
      </div>
    </section>
  );
}

/** US-0024: o que a IA trouxe, esperando a decisão da pessoa. */
function Propostas({ propostas, podeEditar }: { propostas: EvidenciaBantDB[]; podeEditar: boolean }) {
  const decidir = useDecidirEvidenciaBant();
  return (
    <div className="space-y-2 rounded-lg border border-info/40 bg-info-subtle/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-info-emphasis">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {propostas.length === 1 ? '1 proposta da IA' : `${propostas.length} propostas da IA`} · só contam depois que você aceita
      </p>
      <ul className="space-y-2">
        {propostas.map((p) => (
          <li key={p.id} className="rounded-md border bg-card p-2.5 text-[13px]">
            <p>
              <span className="font-semibold">{p.letra}</span> → {rotuloDoEstado(p.estado)}: {p.texto}
            </p>
            <Fonte fonte={p.fonte} />
            {podeEditar && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="h-7 px-2 text-xs" disabled={decidir.isPending} onClick={() => decidir.mutate({ id: p.id, situacao: ACEITA })}>
                  <Check className="mr-1 h-3 w-3" aria-hidden="true" /> Aceitar
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={decidir.isPending} onClick={() => decidir.mutate({ id: p.id, situacao: RECUSADA })}>
                  <X className="mr-1 h-3 w-3" aria-hidden="true" /> Recusar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ehLink = (fonte: string) => /^https?:\/\//i.test(fonte);

function Fonte({ fonte }: { fonte: string | null }) {
  if (!fonte) return null;
  if (!ehLink(fonte)) return <p className="mt-0.5 text-xs text-muted-foreground">Fonte: {fonte}</p>;
  return (
    <a href={fonte} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline">
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{fonte}</span>
    </a>
  );
}

const COR_DO_ESTADO: Record<EstadoBant, string> = {
  nao_sei: 'bg-muted text-muted-foreground',
  indicio: 'bg-success-subtle text-success-emphasis',
  confirmado: 'bg-success text-success-foreground',
  nao_atende: 'bg-destructive-subtle text-destructive-emphasis',
};

interface CartaoDaLetraProps {
  prospectId: string;
  letra: LetraDoBant;
  historico: EvidenciaBantDB[];
  podeEditar: boolean;
  onSugerirPerda?: (motivo: string | null) => void;
}

function CartaoDaLetra(props: CartaoDaLetraProps) {
  const { prospectId, letra, historico, podeEditar, onSugerirPerda } = props;
  const [editando, setEditando] = useState(false);
  const meta = LETRAS_BANT.find((l) => l.letra === letra.letra);
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{letra.letra} · {meta?.nome}</p>
          <p className="text-xs text-muted-foreground">{meta?.pergunta}</p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', COR_DO_ESTADO[letra.estado])}>{rotuloDoEstado(letra.estado)}</span>
      </div>
      <EvidenciaAtual letra={letra} />
      {editando ? (
        <NovaEvidencia prospectId={prospectId} letra={letra.letra} onFechar={() => setEditando(false)} onSugerirPerda={onSugerirPerda} />
      ) : (
        podeEditar && (
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditando(true)}>Atualizar</Button>
        )
      )}
      <Historico historico={historico} />
    </div>
  );
}

function EvidenciaAtual({ letra }: { letra: LetraDoBant }) {
  const { byId } = useEmployeeDirectoryMap();
  if (letra.evidencia) {
    const e = letra.evidencia;
    const quem = e.decidida_por ? byId.get(e.decidida_por)?.nome : null;
    const quando = formatarData((e.decidida_em ?? e.created_at).slice(0, 10));
    return (
      <div className="text-[13px]">
        <p>{e.texto}</p>
        <Fonte fonte={e.fonte} />
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {e.origem === ORIGEM_IA ? 'Proposta pela IA, aceita' : 'Marcado'}{quem ? ` por ${quem}` : ''} em {quando}
        </p>
      </div>
    );
  }
  if (letra.indicio) {
    return (
      <div className="text-[13px]">
        <p>{letra.indicio.texto}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">Do Pulse · {letra.indicio.fonte}</p>
      </div>
    );
  }
  return <p className="text-[13px] text-muted-foreground">Nada levantado ainda.</p>;
}

interface NovaEvidenciaProps {
  prospectId: string;
  letra: LetraBant;
  onFechar: () => void;
  onSugerirPerda?: (motivo: string | null) => void;
}

/** Estado, o que sabemos e a fonte; "Confirmado" pede a fonte (ex.: "reunião de 20/11"). */
function NovaEvidencia(props: NovaEvidenciaProps) {
  const { prospectId, letra, onFechar, onSugerirPerda } = props;
  const salvar = useRegistrarEvidenciaBant();
  const [estado, setEstado] = useState<EstadoBant>('indicio');
  const [texto, setTexto] = useState('');
  const [fonte, setFonte] = useState('');
  const ids = { texto: useId(), fonte: useId() };
  const faltaFonte = estado === ESTADO_CONFIRMADO && !fonte.trim();
  const pronto = !!texto.trim() && !faltaFonte;

  const confirmar = () =>
    salvar.mutate(
      { prospect_id: prospectId, letra, estado, texto, fonte },
      {
        onSuccess: () => {
          onFechar();
          if (estado === ESTADO_NAO_ATENDE) sugerirPerda(letra, onSugerirPerda);
        },
      },
    );

  return (
    <div className="space-y-2 rounded-md bg-muted/40 p-2.5">
      <div role="radiogroup" aria-label={`Estado de ${letra}`} className="flex flex-wrap gap-1">
        {ESTADOS_BANT.map((e) => (
          <button
            key={e.valor}
            type="button"
            role="radio"
            aria-checked={estado === e.valor}
            onClick={() => setEstado(e.valor)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              estado === e.valor ? cn('border-transparent font-medium', COR_DO_ESTADO[e.valor]) : 'bg-card hover:bg-muted',
            )}
          >
            {e.rotulo}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor={ids.texto} className="text-xs text-muted-foreground">O que sabemos</Label>
        <Textarea id={ids.texto} rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} className="text-[13px]" />
      </div>
      <div className="space-y-1">
        <Label htmlFor={ids.fonte} className="text-xs text-muted-foreground">Fonte {estado === ESTADO_CONFIRMADO ? '(obrigatória ao confirmar)' : '(link ou "reunião de 20/11")'}</Label>
        <Input id={ids.fonte} value={fonte} onChange={(e) => setFonte(e.target.value)} className="h-8 text-[13px]" aria-invalid={faltaFonte} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onFechar} disabled={salvar.isPending}>Cancelar</Button>
        <Button size="sm" onClick={confirmar} disabled={!pronto || salvar.isPending}>Salvar</Button>
      </div>
    </div>
  );
}

/** "Não atende" em B, N ou T sugere a Perda com o motivo certo; a pessoa decide. */
function sugerirPerda(letra: LetraBant, onSugerirPerda?: (motivo: string | null) => void) {
  const motivo = motivoDePerdaSugerido(letra);
  toast({
    title: `${letra} marcado como "Não atende"`,
    description: motivo ? `Se a conta não vai seguir, registre a Perda como "${getDiscardReasonLabel(motivo)}".` : 'Se a conta não vai seguir, registre a Perda.',
    action: onSugerirPerda ? (
      <ToastAction altText="Registrar a Perda" onClick={() => onSugerirPerda(motivo)}>Registrar Perda</ToastAction>
    ) : undefined,
  });
}

function Historico({ historico }: { historico: EvidenciaBantDB[] }) {
  const [aberto, setAberto] = useState(false);
  const decididas = historico.filter((e) => e.situacao !== PROPOSTA);
  if (decididas.length < 2) return null;
  return (
    <div>
      <button type="button" onClick={() => setAberto((a) => !a)} className="text-[11.5px] font-medium text-primary hover:underline">
        {aberto ? 'Esconder histórico' : `Ver histórico (${decididas.length})`}
      </button>
      {aberto && (
        <ul className="mt-1.5 space-y-1 border-l pl-2.5">
          {decididas.map((e) => (
            <li key={e.id} className={cn('text-[12px]', e.situacao === RECUSADA && 'text-muted-foreground line-through')}>
              {formatarData(e.created_at.slice(0, 10))} · {rotuloDoEstado(e.estado)} · {e.texto}
              {e.origem === ORIGEM_IA && ' (IA)'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
