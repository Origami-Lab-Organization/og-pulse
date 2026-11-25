import { ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  alternar,
  CAPITAIS,
  DIVIDA_QUALQUER,
  DIVIDAS,
  FATURAMENTOS,
  FUNCIONARIOS,
  IDADES,
  NATUREZAS,
  rotuloDaDistancia,
  temFiltroDeAtividade,
  UFS,
} from '@/lib/prospecting/filtrosReceita';
import type { FiltrosReceita, Opcao } from '@/types/filtrosReceita';
import { RELACOES_DA_ORIGAMI } from '@/lib/prospecting/relacao';
import { cn } from '@/lib/utils';
import { resumo, resumoDoCnae, resumoDoRamo, resumoDoSetor, rotulosDe } from '@/lib/prospecting/resumoDosFiltros';
import { Caixa, Chips, EscolhaUnica, Grupo, Lista } from '../filtros/BlocosDeFiltro';
import { DistanciaDeFormiga } from '../filtros/DistanciaDeFormiga';
import { GrupoDoFitPorServico } from '../filtros/GrupoDoFitPorServico';
import { CnaeIncluirTirar, RamoIncluirTirar, SetorIncluirTirar } from '../filtros/AtividadeIncluirTirar';

interface PainelDeFiltrosProps {
  filtros: FiltrosReceita;
  onChange: (filtros: FiltrosReceita) => void;
  onLimpar: () => void;
  onRecolher: () => void;
  /** Dentro da gaveta do celular (US-0004): sem borda própria, rolando dentro dela. */
  emGaveta?: boolean;
}

const OPCOES_DE_UF: ReadonlyArray<Opcao<string>> = UFS.map((uf) => ({ valor: uf, rotulo: uf }));

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
  const distancia = f.distanciaMaxima > 0 ? rotuloDaDistancia(f.distanciaMaxima) : '';
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
        {/* No computador, quem abre e recolhe é o ícone de filtros da barra (18/11/2026); na gaveta do
            celular o ícone fica por baixo, então o painel tem o próprio botão de fechar. */}
        {emGaveta && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRecolher} aria-label="Fechar filtros" title="Fechar filtros">
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <GrupoDoFitPorServico servicoDoFit={f.servicoDoFit} fitMinimo={f.fitMinimo} onChange={mudar} />
      <Grupo titulo="Relação com a Origami" resumo={resumo(rotulosDe(RELACOES_DA_ORIGAMI, f.relacoes))}>
        <Lista rotulo="Relação com a Origami" opcoes={RELACOES_DA_ORIGAMI} marcados={f.relacoes} onAlternar={(v) => mudar({ relacoes: alternar(f.relacoes, v) })} />
      </Grupo>
      {/* US-0041: incluir ou tirar, dentro de cada grupo; tirar vale só pela atividade principal. */}
      <Grupo titulo="Setor" resumo={resumoDoSetor(f)}>
        <SetorIncluirTirar filtros={f} onChange={onChange} />
      </Grupo>
      <Grupo titulo="Ramo" resumo={resumoDoRamo(f)}>
        <RamoIncluirTirar filtros={f} onChange={onChange} />
      </Grupo>
      <Grupo titulo="CNAE" resumo={resumoDoCnaeDaBase(f)}>
        <CnaeIncluirTirar
          filtros={f}
          onChange={onChange}
          extra={<Caixa rotulo="Incluir atividade secundária" marcada={f.secundaria} desativada={!temFiltroDeAtividade(f)} onChange={(secundaria) => mudar({ secundaria })} />}
        />
      </Grupo>
      <Grupo titulo="Estado" resumo={resumo(f.ufs)}>
        <Chips rotulo="Estado" opcoes={OPCOES_DE_UF} marcados={f.ufs} onAlternar={(v) => mudar({ ufs: alternar(f.ufs, v) })} />
      </Grupo>
      <Grupo titulo="Distância de Formiga" resumo={distancia}>
        <DistanciaDeFormiga valor={f.distanciaMaxima} onMudar={(distanciaMaxima) => mudar({ distanciaMaxima })} />
      </Grupo>
      <Grupo titulo="Funcionários" resumo={resumo(rotulosDe(FUNCIONARIOS, f.funcionarios))}>
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

/** O CNAE da Base, mais "com secundária" quando ela vale. */
function resumoDoCnaeDaBase(f: FiltrosReceita): string {
  const secundaria = f.secundaria && temFiltroDeAtividade(f) ? 'com secundária' : '';
  return [resumoDoCnae(f), secundaria].filter(Boolean).join(' · ');
}

