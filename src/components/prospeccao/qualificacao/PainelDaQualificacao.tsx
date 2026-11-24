import { useMemo } from 'react';
import { ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  alternar,
  FATURAMENTOS,
  MAIOR_NOTA,
  OPCOES_DE_FIT_MINIMO,
  OPCOES_DE_SERVICO_DO_FIT,
  rotuloDaDistancia,
} from '@/lib/prospecting/filtrosReceita';
import { BANTS_MINIMOS, chaveDaCidade, DIAS_NA_ETAPA, SEM } from '@/lib/prospecting/filtrosDaQualificacao';
import { resumo, resumoDoCnae, resumoDoRamo, resumoDoSetor, rotulosDe } from '@/lib/prospecting/resumoDosFiltros';
import { TIPOS_DE_CONTA } from '@/types/prospect';
import type { Opcao } from '@/types/filtrosReceita';
import type { FiltrosDaQualificacao, LinhaDaQualificacao } from '@/types/qualificacao';
import type { FitFront } from '@/types/receita';
import { Caixa, Chips, EscolhaUnica, Grupo, Lista } from '../filtros/BlocosDeFiltro';
import { DistanciaDeFormiga } from '../filtros/DistanciaDeFormiga';
import { CnaeIncluirTirar, RamoIncluirTirar, SetorIncluirTirar } from '../filtros/AtividadeIncluirTirar';

interface PainelDaQualificacaoProps {
  filtros: FiltrosDaQualificacao;
  /** Todas as linhas da aba: estados, cidades e responsáveis vêm delas. */
  linhas: LinhaDaQualificacao[];
  nomeDe: (id: string) => string | undefined;
  onChange: (filtros: FiltrosDaQualificacao) => void;
  onLimpar: () => void;
  onRecolher: () => void;
}

const OPCOES_DE_TIPO: ReadonlyArray<Opcao<string>> = [...TIPOS_DE_CONTA.map((t) => ({ valor: t.value, rotulo: t.label })), { valor: SEM, rotulo: 'Sem tipo' }];

/** Estados, cidades e responsáveis que existem na aba, em ordem alfabética. */
function useOpcoesDaLista(linhas: LinhaDaQualificacao[], nomeDe: (id: string) => string | undefined) {
  return useMemo(() => {
    const unicas = (pares: Array<[string, string]>) =>
      [...new Map(pares).entries()].map(([valor, rotulo]) => ({ valor, rotulo })).sort((a, b) => a.rotulo.localeCompare(b.rotulo));
    const ufs = unicas(linhas.filter((l) => l.uf).map((l) => [l.uf!, l.uf!]));
    const cidades = unicas(linhas.filter((l) => l.uf && l.cidade).map((l) => [chaveDaCidade(l.uf!, l.cidade!), `${l.cidade} · ${l.uf}`]));
    const pessoas = unicas(linhas.filter((l) => l.responsavel).map((l) => [l.responsavel!, nomeDe(l.responsavel!) ?? 'Pessoa sem nome']));
    return { ufs, cidades, responsaveis: [...pessoas, { valor: SEM, rotulo: 'Sem responsável' }] };
  }, [linhas, nomeDe]);
}

/** O que está valendo em cada grupo, para o título recolhido. */
function resumos(f: FiltrosDaQualificacao, opcoes: ReturnType<typeof useOpcoesDaLista>) {
  const fit = [
    f.servicoDoFit ? rotulosDe(OPCOES_DE_SERVICO_DO_FIT, [f.servicoDoFit])[0] : null,
    f.fitMinimo > 0 ? rotulosDe(OPCOES_DE_FIT_MINIMO, [f.fitMinimo])[0] : null,
  ];
  const bant = [f.bantMinimo > 0 ? rotulosDe(BANTS_MINIMOS, [f.bantMinimo])[0] : null, f.comPropostas ? 'com propostas da IA' : null];
  return {
    fit: resumo(fit.filter((t): t is string => !!t)),
    bant: resumo(bant.filter((t): t is string => !!t)),
    cidade: resumo(rotulosDe(opcoes.cidades, f.cidades)),
    responsavel: resumo(rotulosDe(opcoes.responsaveis, f.responsaveis)),
    dias: f.diasMinimos > 0 ? rotulosDe(DIAS_NA_ETAPA, [f.diasMinimos])[0] : '',
    distancia: f.distanciaMaxima > 0 ? rotuloDaDistancia(f.distanciaMaxima) : '',
  };
}

/**
 * Filtros da aba "Em qualificação" (US-0042), na gaveta: os mesmos blocos da Base, mais BANT,
 * cidade, responsável e tempo na etapa. Valem enquanto a pessoa marca.
 */
export function PainelDaQualificacao(props: PainelDaQualificacaoProps) {
  const { filtros: f, linhas, nomeDe, onChange, onLimpar, onRecolher } = props;
  const mudar = (parcial: Partial<FiltrosDaQualificacao>) => onChange({ ...f, ...parcial });
  const opcoes = useOpcoesDaLista(linhas, nomeDe);
  const r = resumos(f, opcoes);
  
  return (
    <aside aria-label="Filtros" className="min-h-0 flex-1 overflow-y-auto bg-card">
      <div className="sticky top-0 z-[1] flex items-center gap-1 border-b bg-card py-1.5 pl-3.5 pr-1.5">
        <span className="mr-auto text-sm font-semibold">Filtros</span>
        <Button variant="ghost" size="sm" className="h-7 text-[12.5px]" onClick={onLimpar}>Limpar</Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRecolher} aria-label="Fechar filtros" title="Fechar filtros">
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <Grupo titulo="Fit por serviço" resumo={r.fit}>
        <EscolhaUnica
          rotulo="Serviço do fit"
          opcoes={OPCOES_DE_SERVICO_DO_FIT}
          valor={f.servicoDoFit ?? MAIOR_NOTA}
          onEscolher={(v) => mudar({ servicoDoFit: v === MAIOR_NOTA ? null : (v as FitFront) })}
        />
        <EscolhaUnica rotulo="Fit mínimo" opcoes={OPCOES_DE_FIT_MINIMO} valor={f.fitMinimo} onEscolher={(fitMinimo) => mudar({ fitMinimo })} />
      </Grupo>
      <Grupo titulo="BANT" resumo={r.bant}>
        <EscolhaUnica rotulo="Nota mínima do BANT" opcoes={BANTS_MINIMOS} valor={f.bantMinimo} onEscolher={(bantMinimo) => mudar({ bantMinimo })} />
        <Caixa rotulo="Com propostas da IA esperando" marcada={f.comPropostas} onChange={(comPropostas) => mudar({ comPropostas })} />
      </Grupo>
      {/* US-0041: incluir ou tirar, dentro de cada grupo; tirar vale só pela atividade principal. */}
      <Grupo titulo="Setor" resumo={resumoDoSetor(f)}>
        <SetorIncluirTirar filtros={f} onChange={onChange} />
      </Grupo>
      <Grupo titulo="Ramo" resumo={resumoDoRamo(f)}>
        <RamoIncluirTirar filtros={f} onChange={onChange} />
      </Grupo>
      <Grupo titulo="CNAE" resumo={resumoDoCnae(f)}>
        <CnaeIncluirTirar filtros={f} onChange={onChange} />
      </Grupo>
      <Grupo titulo="Estado" resumo={resumo(f.ufs)}>
        <Chips rotulo="Estado" opcoes={opcoes.ufs} marcados={f.ufs} onAlternar={(v) => mudar({ ufs: alternar(f.ufs, v) })} />
      </Grupo>
      <Grupo titulo="Cidade" resumo={r.cidade}>
        <Lista rotulo="Cidade" opcoes={opcoes.cidades} marcados={f.cidades} onAlternar={(v) => mudar({ cidades: alternar(f.cidades, v) })} />
      </Grupo>
      <Grupo titulo="Distância de Formiga" resumo={r.distancia}>
        <DistanciaDeFormiga valor={f.distanciaMaxima} onMudar={(distanciaMaxima) => mudar({ distanciaMaxima })} />
      </Grupo>
      <Grupo titulo="Tipo de conta" resumo={resumo(rotulosDe(OPCOES_DE_TIPO, f.tiposDeConta))}>
        <Chips rotulo="Tipo de conta" opcoes={OPCOES_DE_TIPO} marcados={f.tiposDeConta} onAlternar={(v) => mudar({ tiposDeConta: alternar(f.tiposDeConta, v) })} />
      </Grupo>
      <Grupo titulo="Faturamento" resumo={resumo(rotulosDe(FATURAMENTOS, f.faturamentos))}>
        <Lista rotulo="Faturamento" opcoes={FATURAMENTOS} marcados={f.faturamentos} onAlternar={(v) => mudar({ faturamentos: alternar(f.faturamentos, v) })} />
      </Grupo>
      <Grupo titulo="Responsável" resumo={r.responsavel}>
        <Lista rotulo="Responsável" opcoes={opcoes.responsaveis} marcados={f.responsaveis} onAlternar={(v) => mudar({ responsaveis: alternar(f.responsaveis, v) })} />
      </Grupo>
      <Grupo titulo="Tempo em qualificação" resumo={r.dias}>
        <EscolhaUnica rotulo="Tempo em qualificação" opcoes={DIAS_NA_ETAPA} valor={f.diasMinimos} onEscolher={(diasMinimos) => mudar({ diasMinimos })} />
      </Grupo>
    </aside>
  );
}
