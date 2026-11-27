/**
 * Monta src/lib/prospecting/nomesDosMunicipios.json: o nome de cada município como o IBGE escreve,
 * só quando o emTitulo não chega nele (acento, apóstrofo, hífen). Chave: UF + nome sem acento,
 * em maiúsculas e só com letras e números, como `chaveDoMunicipio` em src/lib/prospecting/cidade.ts.
 * `npx vite-node scripts/receita/montar-nomes-dos-municipios.ts`.
 */
import { writeFileSync } from 'node:fs';
import { chaveDoMunicipio } from '../../src/lib/prospecting/cidade';
import { emTitulo } from '../../src/lib/prospecting/empresasReceita';

const FONTE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado';
const DESTINO = new URL('../../src/lib/prospecting/nomesDosMunicipios.json', import.meta.url);

interface Municipio { 'municipio-nome': string; 'UF-sigla': string }

const resposta = await fetch(FONTE);
if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`);
const municipios = (await resposta.json()) as Municipio[];

const nomes = Object.fromEntries(
  municipios
    .map((m) => [`${m['UF-sigla']}|${chaveDoMunicipio(m['municipio-nome'])}`, m['municipio-nome']] as const)
    .filter(([chave, nome]) => emTitulo(chave.split('|')[1]) !== nome)
    .sort(([a], [b]) => a.localeCompare(b)),
);
const hoje = new Date().toLocaleDateString('pt-BR');
writeFileSync(DESTINO, JSON.stringify({ fonte: `IBGE, API de localidades (municípios), ${hoje}: só os nomes que o emTitulo não acerta`, nomes }));
console.log(`${municipios.length} municípios, ${Object.keys(nomes).length} com grafia própria`);
