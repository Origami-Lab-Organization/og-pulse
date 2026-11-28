/**
 * Monta src/lib/prospecting/nomesDosMunicipios.json: o nome de cada município como o IBGE escreve,
 * só quando o emTitulo não chega nele (acento, apóstrofo, hífen). Chave: UF + nome sem acento,
 * em maiúsculas e só com letras e números, como `chaveDoMunicipio` em src/lib/prospecting/cidade.ts.
 * Os nomes antigos que a Receita ainda usa (NOMES_ANTIGOS) apontam para o nome atual do IBGE.
 * `npx vite-node scripts/receita/montar-nomes-dos-municipios.ts`.
 */
import { writeFileSync } from 'node:fs';
import { chaveDoMunicipio } from '../../src/lib/prospecting/cidade';
import { emTitulo } from '../../src/lib/prospecting/empresasReceita';
import { NOMES_ANTIGOS } from './nomesAntigos';

const FONTE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado';
const DESTINO = new URL('../../src/lib/prospecting/nomesDosMunicipios.json', import.meta.url);

interface Municipio { 'municipio-id': number; 'municipio-nome': string; 'UF-sigla': string }

/** "RJ|PARATI" → "Paraty": a grafia antiga da Receita mostra o nome atual. */
function nomesAntigos(municipios: Municipio[]): (readonly [string, string])[] {
  const porCodigo = new Map(municipios.map((m) => [String(m['municipio-id']), m['municipio-nome']]));
  return Object.entries(NOMES_ANTIGOS).map(([chave, codigo]) => {
    const nome = porCodigo.get(codigo);
    if (!nome) throw new Error(`Código ${codigo} (${chave}) não está no IBGE`);
    const [uf, municipio] = chave.split('|');
    return [`${uf}|${chaveDoMunicipio(municipio)}`, nome] as const;
  });
}

const resposta = await fetch(FONTE);
if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`);
const municipios = (await resposta.json()) as Municipio[];

const nomes = Object.fromEntries(
  municipios
    .map((m) => [`${m['UF-sigla']}|${chaveDoMunicipio(m['municipio-nome'])}`, m['municipio-nome']] as const)
    .filter(([chave, nome]) => emTitulo(chave.split('|')[1]) !== nome)
    .concat(nomesAntigos(municipios))
    .sort(([a], [b]) => a.localeCompare(b)),
);
const hoje = new Date().toLocaleDateString('pt-BR');
writeFileSync(DESTINO, JSON.stringify({ fonte: `IBGE, API de localidades (municípios), ${hoje}: só os nomes que o emTitulo não acerta`, nomes }));
console.log(`${municipios.length} municípios, ${Object.keys(nomes).length} com grafia própria`);
