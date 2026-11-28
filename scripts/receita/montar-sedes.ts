/**
 * Monta scripts/receita/sedes-municipais.json (US-0015): latitude e longitude da sede de cada
 * município, pela UF e pelo nome como a Receita escreve. `npx vite-node scripts/receita/montar-sedes.ts`.
 *
 * Fonte: IBGE, Localidades do Brasil 2022 (sede municipal; Brasília como capital federal;
 * Fernando de Noronha como distrito estadual). A Receita grafa 18 municípios pelo nome antigo:
 * eles entram por NOMES_ANTIGOS, conferidos à mão contra o IBGE (anexo da US-0015).
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { chaveDoMunicipio } from './distancia';
import { NOMES_ANTIGOS } from './nomesAntigos';

const DESTINO = new URL('./sedes-municipais.json', import.meta.url);
const LOCALIDADES = 'https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/Localidades_Brasil_gpkg.zip';


const SEDE = `SELECT CD_MUN AS codigo, SIGLA_UF AS uf, NM_MUN AS nome, LAT_LOCALIDADE AS lat, LONG_LOCALIDADE AS lon
  FROM BR_localidades_2022
  WHERE SCT_LOCALIDADE IN ('Sede Municipal', 'Capital Federal')
     OR CT_LOCALIDADE = 'Distrito Estadual de Fernando de Noronha'`;

type Sede = { codigo: string; uf: string; nome: string; lat: number; lon: number };

async function baixarLocalidades(): Promise<string> {
  const pasta = mkdtempSync(join(tmpdir(), 'localidades-'));
  const zip = join(pasta, 'localidades.zip');
  const resposta = await fetch(LOCALIDADES);
  if (!resposta.ok) throw new Error(`IBGE: ${resposta.status}`);
  writeFileSync(zip, Buffer.from(await resposta.arrayBuffer()));
  if (spawnSync('unzip', ['-q', '-o', zip, '-d', pasta]).status !== 0) throw new Error('não deu para descompactar');
  return join(pasta, 'BR_localidades_2022.gpkg');
}

const quatroCasas = (v: number) => Math.round(v * 1e4) / 1e4;

async function main() {
  const banco = new DatabaseSync(await baixarLocalidades(), { readOnly: true });
  const sedes = banco.prepare(SEDE).all() as Sede[];
  const porCodigo = new Map(sedes.map((s) => [s.codigo, s]));
  const coordenadas: Record<string, [number, number]> = {};
  for (const s of sedes) coordenadas[chaveDoMunicipio(s.uf, s.nome)] = [quatroCasas(s.lat), quatroCasas(s.lon)];
  for (const [chave, codigo] of Object.entries(NOMES_ANTIGOS)) {
    const s = porCodigo.get(codigo);
    if (!s) throw new Error(`código ${codigo} sem sede no IBGE`);
    coordenadas[chave] = [quatroCasas(s.lat), quatroCasas(s.lon)];
  }
  const formiga = coordenadas[chaveDoMunicipio('MG', 'Formiga')];
  writeFileSync(DESTINO, `${JSON.stringify({
    fonte: 'IBGE, Localidades do Brasil 2022: sede municipal (latitude e longitude, 4 casas)',
    montado_em: new Date().toISOString().slice(0, 10),
    formiga,
    sedes: coordenadas,
  })}\n`);
  console.log(`${sedes.length} sedes; ${Object.keys(coordenadas).length} chaves (com nomes antigos); Formiga`, formiga);
}

main().catch((erro: Error) => {
  console.error(`Falhou: ${erro.message}`);
  process.exit(1);
});
