import { companyFit } from '@/lib/prospecting/fit';
import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { faturamentoDaSugestao, sugerirTipoDeConta } from '@/lib/prospecting/tipoDeConta';
import type { CompanyFit, LinhaDaBaseParaFit, SinaisDoTamanho } from '@/types/receita';
import type { ProspectCompanyDB } from '@/types/prospect';

/**
 * Fit de uma empresa da base da Receita, pela regra da Prospecção (ADR-0042, ADR-0055), com o
 * que a Base sabe: CNAE principal e secundários, data de abertura, UF, funcionários da RAIS,
 * dívida ativa ajuizada, distância de Formiga e faturamento (US-0014). Regime tributário, site,
 * fomento e contratos com o governo ficam de fora até a empresa entrar no Pulse. A carga (fit
 * prévio e a nota de cada serviço) e a ficha (US-0007) usam esta mesma função.
 */
export function fitDaBase(linha: LinhaDaBaseParaFit, hoje: string): CompanyFit[] | null {
  const empresa = {
    receita_consultada_em: hoje,
    situacao_cadastral: 'Ativa',
    porte: 'DEMAIS',
    data_abertura: linha.abertura,
    regime_tributario: null,
    site_scan: null,
    receita: {
      cnaePrincipal: { codigo: linha.cnaePrincipal, descricao: '' },
      cnaesSecundarios: linha.secundarios.map((codigo) => ({ codigo, descricao: '' })),
      endereco: { uf: linha.uf },
    },
  } as unknown as ProspectCompanyDB;
  const tipo = sugerirTipoDeConta(linha.faturamento);
  const sinais: SinaisDoTamanho = {
    funcionarios: linha.funcionarios,
    funcionariosDoTime: linha.funcionariosDoTime ?? false,
    dividaAjuizada: linha.dividaAjuizada,
    distanciaKm: linha.distanciaKm,
    tipoConta: tipo,
    tipoPeloFaturamento: !!tipo,
    uf: linha.uf,
    regimeNaoConsultado: true,
  };
  return companyFit(empresa, null, sinais);
}

/** A linha da Base (com o que o time informou por cima) no formato do fit: a ficha usa. */
export function linhaParaFit(e: EmpresaReceita & { cnaes_secundarios?: readonly string[] | null }): LinhaDaBaseParaFit {
  return {
    cnaePrincipal: e.cnae_principal,
    secundarios: e.cnaes_secundarios ?? [],
    abertura: e.data_inicio_atividade,
    uf: e.uf,
    funcionarios: e.funcionarios,
    funcionariosDoTime: e.funcionarios_do_time ?? false,
    dividaAjuizada: e.divida_ajuizada == null ? null : Number(e.divida_ajuizada),
    distanciaKm: e.distancia_km,
    faturamento: faturamentoDaSugestao(e),
  };
}
