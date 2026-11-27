import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useHideValues } from '@/contexts/HideValuesContext';
import { useDecidirProposta, useInsightsDaEmpresa } from '@/hooks/useInsightsDaEmpresa';
import { reaisCurtos } from '@/lib/prospecting/empresasReceita';
import { CONFIANCA_DO_TIME } from '@/lib/prospecting/funcionarios.constants';
import { ESTADO_DA_PROPOSTA, TIPO_DE_PROPOSTA, type TipoDeProposta } from '@/lib/prospecting/insights.constants';
import type { PropostaDePorte, PropsDaPropostaNoPorte } from '@/types/insights';
import { LinkDaFonte } from './PecasDosInsights';

const rotuloDaConfianca = (valor: string) => CONFIANCA_DO_TIME.find((c) => c.valor === valor)?.rotulo.toLowerCase() ?? valor;

function faixaDaProposta(proposta: PropostaDePorte): string {
  const { tipo, de, ate } = proposta;
  const texto = tipo === TIPO_DE_PROPOSTA.FATURAMENTO ? reaisCurtos : (v: number) => v.toLocaleString('pt-BR');
  return de === ate ? texto(de) : `${texto(de)} a ${texto(ate)}`;
}

function Proposta(props: PropsDaPropostaNoPorte) {
  const { companyId, proposta } = props;
  const { can } = useAuth();
  const decidir = useDecidirProposta(companyId);
  useHideValues(); // re-renderiza quando o olho de ocultar valores muda
  return (
    <div className="mt-1.5 grid gap-1.5 rounded-lg bg-accent-subtle px-2.5 py-2 text-[12px]">
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
        <span className="font-semibold tabular-nums">{faixaDaProposta(proposta)}</span>
        <span className="text-muted-foreground">· confiança {rotuloDaConfianca(proposta.confianca)} ·</span>
        <LinkDaFonte fonte={{ url: proposta.fonte }} />
      </span>
      {can('prospeccao:editar') && (
        <span className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={decidir.isPending} onClick={() => decidir.mutate({ proposta, aceitar: false })}>Recusar</Button>
          <Button size="sm" className="h-7 px-2.5 text-xs" disabled={decidir.isPending} onClick={() => decidir.mutate({ proposta, aceitar: true })}>Aceitar</Button>
        </span>
      )}
    </div>
  );
}

/**
 * A faixa que a IA propõe para o número do cartão Porte (US-0057): só a mais recente do tipo, e só
 * enquanto ninguém decidiu. Aceita, vira a faixa informada pelo time (US-0056).
 */
export function PropostaNoPorte({ companyId, tipo }: { companyId: string; tipo: TipoDeProposta }) {
  const { propostas } = useInsightsDaEmpresa(companyId);
  const ultima = propostas.find((p) => p.tipo === tipo);
  if (ultima?.estado !== ESTADO_DA_PROPOSTA.PROPOSTA) return null;
  return <Proposta companyId={companyId} proposta={ultima} />;
}
