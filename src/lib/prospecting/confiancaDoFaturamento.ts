import type { BaseDoFaturamento, ConfiancaDoFaturamento, NivelDeConfianca, RegistroDoFaturamento, SeloDoInformado } from '@/types/filtrosReceita';
import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { calibracaoDoSetor, ERRO_ALVO, MINIMO_DE_CASOS } from './fatorDoSetor';
import MODELO from './modeloDeFaturamento.json';

/**
 * Selo de confiança do faturamento estimado (US-0018): quanto dá para confiar no valor.
 *
 * - **Alta:** RAIS (ou funcionários do time) num setor calibrado com erro mediano até 1,5 vez.
 * - **Média:** RAIS num setor sem calibração própria, ou capital social sem RAIS.
 * - **Baixa:** modelo de empresas parecidas, ou só o piso do porte.
 *
 * O faturamento apurado ou estimado pelo time leva o selo verde, com quem informou e quando
 * (revisão do Victor, 23/11/2026). O "calculado" é a estimativa da base gravada ao mover: leva o
 * selo da base.
 */

const ROTULO: Record<NivelDeConfianca, string> = {
  alta: 'confiança alta',
  media: 'confiança média',
  baixa: 'confiança baixa',
};

const vezes = (n: number) => (Math.trunc(n * 10) / 10).toLocaleString('pt-BR');
const ERRO_DO_MODELO = vezes((MODELO as { erro_mediano?: number }).erro_mediano ?? 0);

const selo = (nivel: NivelDeConfianca, motivo: string): ConfiancaDoFaturamento => ({ nivel, rotulo: ROTULO[nivel], motivo });

function pelaRais(cnae: string): ConfiancaDoFaturamento {
  const s = calibracaoDoSetor(cnae);
  if (s && s.erro_mediano_depois <= ERRO_ALVO) {
    return selo('alta', `Funcionários × receita por pessoa, num ${s.nome} calibrado com ${s.casos} casos do time: erro típico de ${vezes(s.erro_mediano_depois)} ${s.erro_mediano_depois < 2 ? 'vez' : 'vezes'}.`);
  }
  if (s) return selo('media', `Funcionários × receita por pessoa, num ${s.nome} calibrado com ${s.casos} casos do time, mas com erro típico ainda de ${vezes(s.erro_mediano_depois)} vezes.`);
  return selo('media', `Funcionários × receita por pessoa, mas o setor ainda não tem ${MINIMO_DE_CASOS} casos com faturamento informado pelo time para calibrar a conta.`);
}

const POR_BASE: Record<BaseDoFaturamento, (cnae: string) => ConfiancaDoFaturamento> = {
  rais: pelaRais,
  capital: () => selo('media', 'Sem funcionários na RAIS: pelo capital social, que diz o tamanho da empresa, mas erra mais que os funcionários.'),
  modelo: () => selo('baixa', `Sem funcionários na RAIS: previsto por empresas parecidas, com erro típico de ${ERRO_DO_MODELO} vezes.`),
  piso: () => selo('baixa', 'Só o porte: a Receita garante faturamento acima de R$ 4,8 mi, sem dizer quanto.'),
};

export function confiancaDoFaturamento(cnae: string, base: BaseDoFaturamento): ConfiancaDoFaturamento {
  return POR_BASE[base](cnae);
}

// ---------- informado pelo time ----------

const COMO: Record<NonNullable<RegistroDoFaturamento['base']>, string> = {
  apurado: 'Apurado',
  estimado: 'Estimado',
  calculado: 'Calculado pela base ao mover para qualificação',
};

/** "23/11/2026 às 14:32", no fuso de quem vê. */
export function dataEHora(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function quem(id: string | null, nomeDe: (id: string) => string | undefined): string {
  if (!id) return 'um processo automático';
  return nomeDe(id) ?? 'alguém que não está mais no time';
}

const SEM_HISTORICO = 'Informado antes de 23/11/2026, quando o Pulse passou a registrar quem informou e quando.';

/** "Apurado por Victor Couto em 23/11/2026 às 14:32" (US-0018). */
export function autoriaDoFaturamento(r: RegistroDoFaturamento | undefined, nomeDe: (id: string) => string | undefined): string {
  if (!r?.base) return SEM_HISTORICO;
  return `${COMO[r.base]} por ${quem(r.informado_por, nomeDe)} em ${dataEHora(r.informado_em)}.`;
}

/** O selo do faturamento apurado ou estimado pelo time: verde, com quem informou e quando. */
export function confiancaDoInformado(autoria: string): ConfiancaDoFaturamento {
  return { nivel: 'alta', rotulo: 'informado pelo time', motivo: autoria };
}

/**
 * O selo do faturamento que está na empresa da Prospecção: verde com a autoria quando o time
 * apurou ou estimou; no "calculado", o selo da estimativa da base, e a autoria à parte.
 */
export function seloDoInformado(empresa: EmpresaReceita, nomeDe: (id: string) => string | undefined): SeloDoInformado {
  const autoria = autoriaDoFaturamento(empresa.faturamento_historico?.[0], nomeDe);
  if (empresa.faturamento_informado_base !== 'calculado') return { confianca: confiancaDoInformado(autoria), autoria: null };
  const daBase = empresa.faturamento_base ? confiancaDoFaturamento(empresa.cnae_principal, empresa.faturamento_base) : null;
  return { confianca: daBase, autoria };
}
