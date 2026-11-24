import { useState, type ReactNode } from 'react';
import { nomeDoRamo, ramosDosSetores, SETORES } from '@/lib/prospecting/cnae';
import {
  alternar,
  alternarAtalho,
  atalhoLigado,
  ATALHOS_DE_EXCLUSAO,
  incluirAtividades,
  TipoDeAtividade,
  tirarAtividades,
  TODOS_OS_RAMOS,
} from '@/lib/prospecting/filtrosReceita';
import { ModoDaAtividade, type FiltroDeAtividade, type Opcao } from '@/types/filtrosReceita';
import { cn } from '@/lib/utils';
import { CampoCnae } from '../receita/CampoCnae';
import { CHIP, CHIP_LIVRE, CHIP_MARCADO, Lista } from './BlocosDeFiltro';

/**
 * Setor, ramo e CNAE com "Incluir | Tirar" dentro do próprio grupo (US-0041, revisto em
 * 24/11/2026). Tirar vale só pela atividade principal; o que é tirado sai da inclusão e
 * vice-versa. Serve à Base e à aba Em qualificação (US-0042).
 */

const OPCOES_DE_SETOR: ReadonlyArray<Opcao<string>> = SETORES.map((s) => ({ valor: s.letra, rotulo: s.nome }));
const OPCOES_DE_RAMO: ReadonlyArray<Opcao<string>> = TODOS_OS_RAMOS.map((d) => ({ valor: d, rotulo: `${d} · ${nomeDoRamo(d) ?? ''}` }));
const MODOS: ReadonlyArray<Opcao<ModoDaAtividade>> = [
  { valor: ModoDaAtividade.Incluir, rotulo: 'Incluir' },
  { valor: ModoDaAtividade.Tirar, rotulo: 'Tirar' },
];

/** Abre em "Tirar" se só há tirados; senão, em "Incluir". */
function useModo(incluidos: readonly string[], tirados: readonly string[]) {
  return useState(incluidos.length === 0 && tirados.length > 0 ? ModoDaAtividade.Tirar : ModoDaAtividade.Incluir);
}

function SeletorDeModo({ rotulo, modo, onModo }: { rotulo: string; modo: ModoDaAtividade; onModo: (m: ModoDaAtividade) => void }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="inline-flex self-start rounded-md border p-0.5">
      {MODOS.map((m) => (
        <button
          key={m.valor}
          type="button"
          role="radio"
          aria-checked={m.valor === modo}
          onClick={() => onModo(m.valor)}
          className={cn(
            'rounded px-2.5 py-0.5 text-[12.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            m.valor === modo ? 'bg-accent-subtle font-semibold text-success-emphasis' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {m.rotulo}
        </button>
      ))}
    </div>
  );
}

const DICA_DE_TIRAR = 'Sai quem tem essa atividade como principal.';

interface AtividadeProps<F extends FiltroDeAtividade> {
  filtros: F;
  onChange: (f: F) => void;
}

export function SetorIncluirTirar<F extends FiltroDeAtividade>({ filtros: f, onChange }: AtividadeProps<F>) {
  const [modo, setModo] = useModo(f.setores, f.semSetores);
  const tirando = modo === ModoDaAtividade.Tirar;
  return (
    <>
      <SeletorDeModo rotulo="Incluir ou tirar setores" modo={modo} onModo={setModo} />
      {tirando && <p className="text-[11.5px] text-muted-foreground">{DICA_DE_TIRAR}</p>}
      <Lista
        rotulo={tirando ? 'Tirar setor' : 'Setor'}
        opcoes={OPCOES_DE_SETOR}
        marcados={tirando ? f.semSetores : f.setores}
        onAlternar={(v) =>
          onChange(tirando ? tirarAtividades(f, TipoDeAtividade.Setor, alternar(f.semSetores, v)) : incluirAtividades(f, TipoDeAtividade.Setor, alternar(f.setores, v)))
        }
      />
    </>
  );
}

function AtalhosDeExclusao<F extends FiltroDeAtividade>({ filtros: f, onChange }: AtividadeProps<F>) {
  return (
    <div role="group" aria-label="Atalhos para tirar" className="flex flex-wrap gap-1.5">
      {ATALHOS_DE_EXCLUSAO.map((a) => {
        const ligado = atalhoLigado(f, a);
        return (
          <button key={a.id} type="button" aria-pressed={ligado} onClick={() => onChange(alternarAtalho(f, a))} className={cn(CHIP, ligado ? CHIP_MARCADO : CHIP_LIVRE)}>
            {a.rotulo}
          </button>
        );
      })}
    </div>
  );
}

/** Para incluir, os ramos dos setores incluídos; para tirar, todos os ramos, com os atalhos. */
export function RamoIncluirTirar<F extends FiltroDeAtividade>({ filtros: f, onChange }: AtividadeProps<F>) {
  const [modo, setModo] = useModo(f.ramos, f.semRamos);
  const doSetor = ramosDosSetores(f.setores).map((d) => ({ valor: d, rotulo: nomeDoRamo(d) ?? d }));
  return (
    <>
      <SeletorDeModo rotulo="Incluir ou tirar ramos" modo={modo} onModo={setModo} />
      {modo === ModoDaAtividade.Tirar ? (
        <>
          <AtalhosDeExclusao filtros={f} onChange={onChange} />
          <p className="text-[11.5px] text-muted-foreground">{DICA_DE_TIRAR}</p>
          <Lista rotulo="Tirar ramo" opcoes={OPCOES_DE_RAMO} marcados={f.semRamos} onAlternar={(v) => onChange(tirarAtividades(f, TipoDeAtividade.Ramo, alternar(f.semRamos, v)))} />
        </>
      ) : doSetor.length ? (
        <Lista rotulo="Ramo" opcoes={doSetor} marcados={f.ramos} onAlternar={(v) => onChange(incluirAtividades(f, TipoDeAtividade.Ramo, alternar(f.ramos, v)))} />
      ) : (
        <p className="text-xs text-muted-foreground">Inclua um setor para escolher o ramo, ou use "Tirar".</p>
      )}
    </>
  );
}

/** `extra`: o que só vale para a inclusão (na Base, "Incluir atividade secundária"). */
export function CnaeIncluirTirar<F extends FiltroDeAtividade>({ filtros: f, onChange, extra }: AtividadeProps<F> & { extra?: ReactNode }) {
  const [modo, setModo] = useModo(f.cnaes, f.semCnaes);
  const tirando = modo === ModoDaAtividade.Tirar;
  return (
    <>
      <SeletorDeModo rotulo="Incluir ou tirar CNAEs" modo={modo} onModo={setModo} />
      {tirando && <p className="text-[11.5px] text-muted-foreground">{DICA_DE_TIRAR}</p>}
      <CampoCnae
        valores={tirando ? f.semCnaes : f.cnaes}
        onChange={(v) => onChange(tirando ? tirarAtividades(f, TipoDeAtividade.Cnae, v) : incluirAtividades(f, TipoDeAtividade.Cnae, v))}
      />
      {!tirando && extra}
    </>
  );
}
