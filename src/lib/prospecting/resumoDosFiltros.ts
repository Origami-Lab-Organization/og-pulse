import { nomeDoRamo, SETORES } from './cnae';
import { atalhoLigado, ATALHOS_DE_EXCLUSAO, rotuloDoCnae } from './filtrosReceita';
import type { AtividadesTiradas, FiltroDeAtividade, Opcao } from '@/types/filtrosReceita';

/** Resumos dos painéis de filtro do Comercial (Base, US-0003; Em qualificação, US-0042). */

/** Os rótulos das opções marcadas, na ordem das opções. */
export const rotulosDe = <T extends string | number>(opcoes: ReadonlyArray<Opcao<T>>, marcados: readonly T[]) =>
  opcoes.filter((o) => marcados.includes(o.valor)).map((o) => o.rotulo);

/** "Indústria de transformação +2": o que está marcado, para o título do grupo recolhido. */
export function resumo(rotulos: string[]): string {
  if (!rotulos.length) return '';
  return rotulos.length === 1 ? rotulos[0] : `${rotulos[0]} +${rotulos.length - 1}`;
}

const NOME_DO_SETOR = new Map(SETORES.map((s) => [s.letra, s.nome]));

/** "Indústria · sem Agropecuária": o incluído e o tirado no título do grupo (US-0041). */
function incluidoETirado(incluidos: string[], tirados: string[]): string {
  return [resumo(incluidos), tirados.length ? `sem ${resumo(tirados)}` : ''].filter(Boolean).join(' · ');
}

const ligados = (f: AtividadesTiradas) => ATALHOS_DE_EXCLUSAO.filter((a) => atalhoLigado(f, a));
const cobertos = (f: AtividadesTiradas) => new Set(ligados(f).flatMap((a) => [...a.ramos, ...a.cnaes]));

export function resumoDoSetor(f: FiltroDeAtividade): string {
  const nome = (s: string) => NOME_DO_SETOR.get(s) ?? s;
  return incluidoETirado(f.setores.map(nome), f.semSetores.map(nome));
}

/** No ramo, o atalho ligado aparece pelo nome ("Sem holdings"), no lugar do que ele cobre. */
export function resumoDoRamo(f: FiltroDeAtividade): string {
  const fora = cobertos(f);
  const tirados = f.semRamos.filter((r) => !fora.has(r)).map((r) => `${r} (${nomeDoRamo(r) ?? 'ramo'})`);
  const base = incluidoETirado(f.ramos.map((r) => nomeDoRamo(r) ?? r), tirados);
  return [...ligados(f).map((a) => a.rotulo), base].filter(Boolean).join(' · ');
}

export function resumoDoCnae(f: FiltroDeAtividade): string {
  const fora = cobertos(f);
  return incluidoETirado(f.cnaes.map(rotuloDoCnae), f.semCnaes.filter((c) => !fora.has(c)).map(rotuloDoCnae));
}
