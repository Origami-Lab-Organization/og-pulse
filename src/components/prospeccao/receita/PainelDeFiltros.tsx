import type { ReactNode } from 'react';
import { ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { nomeDoRamo, ramosDosSetores, SETORES } from '@/lib/prospecting/cnae';
import {
  alternar,
  CAPITAIS,
  comSetores,
  DIVIDAS,
  FUNCIONARIOS,
  IDADES,
  NATUREZAS,
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
}

const OPCOES_DE_SETOR: ReadonlyArray<Opcao<string>> = SETORES.map((s) => ({ valor: s.letra, rotulo: s.nome }));
const OPCOES_DE_UF: ReadonlyArray<Opcao<string>> = UFS.map((uf) => ({ valor: uf, rotulo: uf }));

/**
 * Filtros da base da Receita (US-0003), à direita da lista. Sem contagem por opção: só o
 * total da lista aparece (decisão de 16/11/2026). Dentro de um grupo, as opções somam; entre
 * grupos, valem todas juntas.
 */
export function PainelDeFiltros(props: PainelDeFiltrosProps) {
  const { filtros: f, onChange, onLimpar, onRecolher } = props;
  const mudar = (parcial: Partial<FiltrosReceita>) => onChange({ ...f, ...parcial });

  return (
    <aside aria-label="Filtros" className="overflow-hidden rounded-xl border bg-card lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <div className="sticky top-0 z-[1] flex items-center gap-1 border-b bg-card py-1.5 pl-3.5 pr-1.5">
        <span className="mr-auto text-sm font-semibold">Filtros</span>
        <Button variant="ghost" size="sm" className="h-7 text-[12.5px]" onClick={onLimpar}>Limpar</Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRecolher} aria-label="Recolher filtros" title="Recolher filtros">
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <Grupo titulo="Setor">
        <Chips rotulo="Setor" opcoes={OPCOES_DE_SETOR} marcados={f.setores} onAlternar={(v) => onChange(comSetores(f, alternar(f.setores, v)))} />
      </Grupo>
      <Grupo titulo="Ramo">
        <Ramos filtros={f} onAlternar={(v) => mudar({ ramos: alternar(f.ramos, v) })} />
      </Grupo>
      <Grupo titulo="CNAE">
        <CampoCnae valores={f.cnaes} onChange={(cnaes) => mudar({ cnaes })} />
        <Caixa
          rotulo="Incluir atividade secundária"
          marcada={f.secundaria}
          desativada={!temFiltroDeAtividade(f)}
          onChange={(secundaria) => mudar({ secundaria })}
        />
      </Grupo>
      <Grupo titulo="Idade da empresa">
        <Chips rotulo="Idade da empresa" opcoes={IDADES} marcados={f.idades} onAlternar={(v) => mudar({ idades: alternar(f.idades, v) })} />
      </Grupo>
      <Grupo titulo="Estado">
        <Chips rotulo="Estado" opcoes={OPCOES_DE_UF} marcados={f.ufs} onAlternar={(v) => mudar({ ufs: alternar(f.ufs, v) })} />
      </Grupo>
      <Grupo titulo="Funcionários (RAIS)">
        <Chips rotulo="Funcionários" opcoes={FUNCIONARIOS} marcados={f.funcionarios} onAlternar={(v) => mudar({ funcionarios: alternar(f.funcionarios, v) })} />
      </Grupo>
      <Grupo titulo="Capital social mínimo">
        <EscolhaUnica rotulo="Capital social mínimo" opcoes={CAPITAIS} valor={f.capitalMinimo} onEscolher={(capitalMinimo) => mudar({ capitalMinimo })} />
      </Grupo>
      <Grupo titulo="Natureza jurídica">
        <Chips rotulo="Natureza jurídica" opcoes={NATUREZAS} marcados={f.naturezas} onAlternar={(v) => mudar({ naturezas: alternar(f.naturezas, v) })} />
      </Grupo>
      <Grupo titulo="Dívida ativa">
        <EscolhaUnica rotulo="Dívida ativa" opcoes={DIVIDAS} valor={f.divida} onEscolher={(divida) => mudar({ divida })} />
      </Grupo>
      <Grupo titulo="Contato público">
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
  return <Chips rotulo="Ramo" opcoes={opcoes} marcados={filtros.ramos} onAlternar={onAlternar} />;
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b px-3.5 py-3 last:border-b-0">
      <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h3>
      {children}
    </section>
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
    <label className={cn('flex items-center gap-2 text-[13px]', desativada && 'text-muted-foreground')}>
      <Checkbox checked={marcada} disabled={desativada} onCheckedChange={(v) => onChange(v === true)} />
      {rotulo}
    </label>
  );
}
