import { FRENTES_DO_FIT } from '@/lib/prospecting/fit';
import { rotuloDoServico, servicoDisponivel } from '@/lib/catalogo';
import type { CompanyFit, FitFront } from '@/types/receita';
import type { Service } from '@/types/service';
import type { ServiceLine } from '@/types/serviceLine';

/**
 * Fit pelo catálogo (US-0047). As notas continuam calculadas pelas quatro regras do código
 * (`companyFit`, ADR-0042/0055) e, na Base, pela VPS; o catálogo diz quais serviços mostram cada
 * regra e com que nome. Serviço sem regra, desativado ou em linha desativada não aparece.
 */

export interface ServicoDoFit {
  serviceId: string;
  frente: FitFront;
  /** "Linha › Serviço", como o cartão "Fit com a Origami" mostra (Victor, 25/11/2026). */
  rotulo: string;
  /** Nome do serviço; com a linha quando outro serviço mostrado tem o mesmo nome (filtros da Base). */
  nome: string;
}

/** Uma regra usada por algum serviço, com o nome dos serviços que a usam (filtros e colunas). */
export interface GrupoDeFit {
  frente: FitFront;
  rotulo: string;
  rotuloCurto: string;
}

const SEPARADOR_DO_GRUPO = ' · ';

export function servicosDoFit(services: readonly Service[], lines: readonly ServiceLine[]): ServicoDoFit[] {
  const comRegra = services.filter((s) => s.regraDeFit && servicoDisponivel(s, lines));
  const repetido = (s: Service) => comRegra.filter((o) => o.name === s.name).length > 1;
  return comRegra
    .map((s) => ({
      serviceId: s.id,
      frente: s.regraDeFit as FitFront,
      rotulo: rotuloDoServico(s, lines),
      nome: repetido(s) ? rotuloDoServico(s, lines) : s.name,
    }))
    .sort((a, b) => FRENTES_DO_FIT.indexOf(a.frente) - FRENTES_DO_FIT.indexOf(b.frente) || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

export function gruposDeFit(servicos: readonly ServicoDoFit[]): GrupoDeFit[] {
  return FRENTES_DO_FIT.flatMap((frente) => {
    const nomes = servicos.filter((s) => s.frente === frente).map((s) => s.nome);
    if (nomes.length === 0) return [];
    const rotuloCurto = nomes.length === 1 ? nomes[0] : `${nomes[0]} +${nomes.length - 1}`;
    return [{ frente, rotulo: nomes.join(SEPARADOR_DO_GRUPO), rotuloCurto }];
  });
}

/** As notas da empresa, uma por serviço do catálogo com regra (dois serviços na mesma regra repetem a nota). */
export function fitsDoCatalogo(fits: CompanyFit[] | null, servicos: readonly ServicoDoFit[]): CompanyFit[] | null {
  if (!fits) return null;
  return servicos.flatMap((servico) => {
    const fit = fits.find((f) => f.frente === servico.frente);
    return fit ? [{ ...fit, rotulo: servico.rotulo, serviceId: servico.serviceId }] : [];
  });
}

/** Regra salva num filtro que nenhum serviço usa mais vira "sem filtro" (US-0047, cenário 5). */
export const regraValida = (frente: FitFront | null, grupos: readonly GrupoDeFit[]): FitFront | null =>
  frente && grupos.some((g) => g.frente === frente) ? frente : null;

export const rotuloDoGrupo = (frente: FitFront, grupos: readonly GrupoDeFit[]): string =>
  grupos.find((g) => g.frente === frente)?.rotulo ?? '';

/** Linha de serviço ativa com algum serviço que tem fit, e as regras que esses serviços usam. */
export interface LinhaDoFit {
  id: string;
  nome: string;
  frentes: FitFront[];
}

/** As linhas do fit, na ordem do catálogo (Em qualificação mostra o fit por linha, US-0047). */
export function linhasDoFit(services: readonly Service[], lines: readonly ServiceLine[]): LinhaDoFit[] {
  const servicos = services.filter((s) => s.regraDeFit && servicoDisponivel(s, lines));
  return lines.flatMap((line) => {
    const frentes = [...new Set(servicos.filter((s) => s.serviceLineId === line.id).map((s) => s.regraDeFit as FitFront))];
    return frentes.length ? [{ id: line.id, nome: line.name, frentes }] : [];
  });
}

/** A nota da linha: a maior entre as regras dos serviços dela; nula sem os dados da Receita. */
export function notaDaLinha(fits: CompanyFit[] | null, linha: LinhaDoFit): number | null {
  const notas = (fits ?? []).filter((f) => linha.frentes.includes(f.frente)).map((f) => f.nota);
  return notas.length ? Math.max(...notas) : null;
}

export const notasPorLinha = (fits: CompanyFit[] | null, linhas: readonly LinhaDoFit[]): Record<string, number | null> =>
  Object.fromEntries(linhas.map((linha) => [linha.id, notaDaLinha(fits, linha)]));

/** Linha salva num filtro que não está mais entre as linhas do fit vira "sem filtro". */
export const linhaValida = (id: string | null, linhas: readonly LinhaDoFit[]): string | null =>
  id && linhas.some((l) => l.id === id) ? id : null;
