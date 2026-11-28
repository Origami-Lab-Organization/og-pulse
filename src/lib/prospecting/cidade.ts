import { emTitulo } from '@/lib/prospecting/empresasReceita';
import MUNICIPIOS from '@/lib/prospecting/nomesDosMunicipios.json';

/**
 * Nome da cidade como o IBGE escreve ("SAO PAULO", "Florianopolis" → "São Paulo", "Florianópolis").
 * A Receita grava sem acento e em maiúsculas, e o cadastro do cliente copia dela; o nome certo
 * vem daqui na hora de mostrar. A tabela guarda só os nomes que o emTitulo não acerta (acento,
 * apóstrofo, hífen); o resto, e a grafia antiga da Receita, sai pelo emTitulo.
 * Montada por scripts/receita/montar-nomes-dos-municipios.ts.
 */
const NOMES: Readonly<Record<string, string>> = MUNICIPIOS.nomes;

/** "Alta Floresta D'Oeste" e "ALTA FLORESTA D OESTE" viram a mesma chave. */
export const chaveDoMunicipio = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function nomeDaCidade(cidade: string | null | undefined, uf: string | null | undefined): string {
  if (!cidade?.trim()) return '';
  const oficial = uf ? NOMES[`${uf.trim().toUpperCase()}|${chaveDoMunicipio(cidade)}`] : undefined;
  return oficial ?? emTitulo(cidade);
}

/** "Formiga · MG": o formato da cidade em toda a Prospecção. */
export const cidadeEUf = (cidade: string | null | undefined, uf: string | null | undefined): string =>
  [nomeDaCidade(cidade, uf), uf?.trim().toUpperCase()].filter(Boolean).join(' · ');
