import { useId, useState, type ReactNode } from 'react';
import { ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { nomeDoRamo, ramosDosSetores, SETORES } from '@/lib/prospecting/cnae';
import {
  alternar,
  CAPITAIS,
  comSetores,
  DIVIDA_QUALQUER,
  DIVIDAS,
  FATURAMENTOS,
  FUNCIONARIOS,
  IDADES,
  NATUREZAS,
  rotuloDoCnae,
  temFiltroDeAtividade,
  UFS,
} from '@/lib/prospecting/filtrosReceita';
import type { FiltrosReceita, Opcao } from '@/types/filtrosReceita';
import { cn } from '@/lib/utils';
import { CampoCnae } from './CampoCnae';

interface PainelDeFiltrosProps {
  filtros: FiltrosReceita;
  onChange: (filtros: FiltrosReceita) => void;
  onLimpar: () => void;
  onRecolher: () => void;
  /** Dentro da gaveta do celular (US-0004): sem borda própria, rolando dentro dela. */
  emGaveta?: boolean;
}

const OPCOES_DE_SETOR: ReadonlyArray<Opcao<string>> = SETORES.map((s) => ({ valor: s.letra, rotulo: s.nome }));
const OPCOES_DE_UF: ReadonlyArray<Opcao<string>> = UFS.map((uf) => ({ valor: uf, rotulo: uf }));

/** Os rótulos das opções marcadas, na ordem das opções. */
const rotulosDe = <T extends string | number>(opcoes: ReadonlyArray<Opcao<T>>, marcados: readonly T[]) =>
  opcoes.filter((o) => marcados.includes(o.valor)).map((o) => o.rotulo);

/** "Indústria de transformação +2": o que está marcado, para o título do grupo recolhido. */
function resumo(rotulos: string[]): string {
  if (!rotulos.length) return '';
  return rotulos.length === 1 ? rotulos[0] : `${rotulos[0]} +${rotulos.length - 1}`;
}

function resumoDaAtividade(f: FiltrosReceita): string {
  const cnaes = resumo(f.cnaes.map(rotuloDoCnae));
  return cnaes && f.secundaria ? `${cnaes} · com secundária` : cnaes;
}

function resumoDoContato(f: FiltrosReceita): string {
  return resumo([f.comEmail && 'E-mail', f.comTelefone && 'Telefone'].filter((v): v is string => !!v));
}

/**
 * Filtros da base da Receita (US-0003), à direita da lista. Sem contagem por opção: só o
 * total da lista aparece (decisão de 16/11/2026). Dentro de um grupo, as opções somam; entre
 * grupos, valem todas juntas. Cada grupo recolhe e mostra no título o que está marcado; só
 * os grupos com filtro começam abertos (18/11/2026).
 */
export function PainelDeFiltros(props: PainelDeFiltrosProps) {
  const { filtros: f, onChange, onLimpar, onRecolher, emGaveta = false } = props;
  const mudar = (parcial: Partial<FiltrosReceita>) => onChange({ ...f, ...parcial });
  const capital = f.capitalMinimo > 0 ? rotulosDe(CAPITAIS, [f.capitalMinimo]) : [];
  const divida = f.divida !== DIVIDA_QUALQUER ? rotulosDe(DIVIDAS, [f.divida]) : [];

  return (
    <aside
      aria-label="Filtros"
      className={cn(
        'bg-card',
        emGaveta ? 'min-h-0 flex-1 overflow-y-auto' : 'sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border',
      )}
    >
      <div className="sticky top-0 z-[1] flex items-center gap-1 border-b bg-card py-1.5 pl-3.5 pr-1.5">
        <span className="mr-auto text-sm font-semibold">Filtros</span>
        <Button variant="ghost" size="sm" className="h-7 text-[12.5px]" onClick={onLimpar}>Limpar</Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRecolher} aria-label="Recolher filtros" title="Recolher filtros">
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <Grupo titulo="Setor" resumo={resumo(rotulosDe(OPCOES_DE_SETOR, f.setores))}>
        <Lista rotulo="Setor" opcoes={OPCOES_DE_SETOR} marcados={f.setores} onAlternar={(v) => onChange(comSetores(f, alternar(f.setores, v)))} />
      </Grupo>
      <Grupo titulo="Ramo" resumo={resumo(f.ramos.map((r) => nomeDoRamo(r) ?? r))}>
        <Ramos filtros={f} onAlternar={(v) => mudar({ ramos: alternar(f.ramos, v) })} />
      </Grupo>
      <Grupo titulo="CNAE" resumo={resumoDaAtividade(f)}>
        <CampoCnae valores={f.cnaes} onChange={(cnaes) => mudar({ cnaes })} />
        <Caixa
          rotulo="Incluir atividade secundária"
          marcada={f.secundaria}
          desativada={!temFiltroDeAtividade(f)}
          onChange={(secundaria) => mudar({ secundaria })}
        />
      </Grupo>
      <Grupo titulo="Estado" resumo={resumo(f.ufs)}>
        <Chips rotulo="Estado" opcoes={OPCOES_DE_UF} marcados={f.ufs} onAlternar={(v) => mudar({ ufs: alternar(f.ufs, v) })} />
      </Grupo>
      <Grupo titulo="Funcionários (RAIS)" resumo={resumo(rotulosDe(FUNCIONARIOS, f.funcionarios))}>
        <Chips rotulo="Funcionários" opcoes={FUNCIONARIOS} marcados={f.funcionarios} onAlternar={(v) => mudar({ funcionarios: alternar(f.funcionarios, v) })} />
      </Grupo>
      <Grupo titulo="Faturamento estimado" resumo={resumo(rotulosDe(FATURAMENTOS, f.faturamentos))}>
        <Lista rotulo="Faturamento estimado" opcoes={FATURAMENTOS} marcados={f.faturamentos} onAlternar={(v) => mudar({ faturamentos: alternar(f.faturamentos, v) })} />
      </Grupo>
      <Grupo titulo="Capital social mínimo" resumo={resumo(capital)}>
        <EscolhaUnica rotulo="Capital social mínimo" opcoes={CAPITAIS} valor={f.capitalMinimo} onEscolher={(capitalMinimo) => mudar({ capitalMinimo })} />
      </Grupo>
      <Grupo titulo="Idade da empresa" resumo={resumo(rotulosDe(IDADES, f.idades))}>
        <Chips rotulo="Idade da empresa" opcoes={IDADES} marcados={f.idades} onAlternar={(v) => mudar({ idades: alternar(f.idades, v) })} />
      </Grupo>
      <Grupo titulo="Natureza jurídica" resumo={resumo(rotulosDe(NATUREZAS, f.naturezas))}>
        <Lista rotulo="Natureza jurídica" opcoes={NATUREZAS} marcados={f.naturezas} onAlternar={(v) => mudar({ naturezas: alternar(f.naturezas, v) })} />
      </Grupo>
      <Grupo titulo="Dívida ativa" resumo={resumo(divida)}>
        <EscolhaUnica rotulo="Dívida ativa" opcoes={DIVIDAS} valor={f.divida} onEscolher={(divida) => mudar({ divida })} />
      </Grupo>
      <Grupo titulo="Contato público" resumo={resumoDoContato(f)}>
        <Caixa rotulo="Tem e-mail" marcada={f.comEmail} onChange={(comEmail) => mudar({ comEmail })} />
        <Caixa rotulo="Tem telefone" marcada={f.comTelefone} onChange={(comTelefone) => mudar({ comTelefone })} />
      </Grupo>
    </aside>
  );
}

function Ramos({ filtros, onAlternar }: { filtros: FiltrosReceita; onAlternar: (divisao: string) => void }) {
  if (!filtros.setores.length) {
    return <p className="text-xs text-muted-foreground">Marque um setor para escolher o ramo.</p>;
  }
  const opcoes = ramosDosSetores(filtros.setores).map((d) => ({ valor: d, rotulo: nomeDoRamo(d) ?? d }));
  return <Lista rotulo="Ramo" opcoes={opcoes} marcados={filtros.ramos} onAlternar={onAlternar} />;
}

/** Grupo que abre e fecha; começa aberto só se já tem filtro marcado. */
function Grupo({ titulo, resumo: marcado, children }: { titulo: string; resumo: string; children: ReactNode }) {
  const [aberto, setAberto] = useState(!!marcado);
  const conteudo = useId();
  return (
    <section className="border-b last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={conteudo}
          onClick={() => setAberto((a) => !a)}
          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-90')} aria-hidden="true" />
          <span className="shrink-0 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</span>
          {marcado && <span className="ml-auto min-w-0 truncate text-[12px] font-medium text-success-emphasis">{marcado}</span>}
        </button>
      </h3>
      {aberto && <div id={conteudo} className="flex flex-col gap-2 px-3.5 pb-3">{children}</div>}
    </section>
  );
}

/** Opções longas: uma por linha, com caixa de marcar, rolando se passar de 16 rem. */
function Lista<T extends string>(props: { rotulo: string; opcoes: ReadonlyArray<Opcao<T>>; marcados: readonly T[]; onAlternar: (v: T) => void }) {
  const { rotulo, opcoes, marcados, onAlternar } = props;
  return (
    <div role="group" aria-label={rotulo} className="-mr-1.5 flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1.5">
      {opcoes.map((o) => (
        <Caixa key={o.valor} rotulo={o.rotulo} marcada={marcados.includes(o.valor)} onChange={() => onAlternar(o.valor)} />
      ))}
    </div>
  );
}

const CHIP = 'rounded-full border px-2.5 py-0.5 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const CHIP_MARCADO = 'border-primary bg-accent-subtle font-semibold text-success-emphasis';
const CHIP_LIVRE = 'border-input bg-card hover:bg-muted';

function Chips<T extends string>(props: { rotulo: string; opcoes: ReadonlyArray<Opcao<T>>; marcados: readonly T[]; onAlternar: (v: T) => void }) {
  const { rotulo, opcoes, marcados, onAlternar } = props;
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const marcado = marcados.includes(o.valor);
        return (
          <button key={o.valor} type="button" aria-pressed={marcado} onClick={() => onAlternar(o.valor)} className={cn(CHIP, marcado ? CHIP_MARCADO : CHIP_LIVRE)}>
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

function EscolhaUnica<T extends string | number>(props: { rotulo: string; opcoes: ReadonlyArray<Opcao<T>>; valor: T; onEscolher: (v: T) => void }) {
  const { rotulo, opcoes, valor, onEscolher } = props;
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={o.valor === valor}
          onClick={() => onEscolher(o.valor)}
          className={cn(CHIP, o.valor === valor ? CHIP_MARCADO : CHIP_LIVRE)}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

function Caixa(props: { rotulo: string; marcada: boolean; desativada?: boolean; onChange: (marcada: boolean) => void }) {
  const { rotulo, marcada, desativada, onChange } = props;
  return (
    <label className={cn('flex items-start gap-2 text-[13px] leading-snug', desativada && 'text-muted-foreground')}>
      <Checkbox className="mt-px shrink-0" checked={marcada} disabled={desativada} onCheckedChange={(v) => onChange(v === true)} />
      <span>{rotulo}</span>
    </label>
  );
}
