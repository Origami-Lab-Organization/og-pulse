import { useFitDoCatalogo } from '@/hooks/useFitDoCatalogo';
import { MAIOR_NOTA, OPCOES_DE_FIT_MINIMO } from '@/lib/prospecting/filtrosReceita';
import { linhaValida } from '@/lib/prospecting/fitDoCatalogo';
import { resumo, rotulosDe } from '@/lib/prospecting/resumoDosFiltros';
import { EscolhaUnica, Grupo } from './BlocosDeFiltro';

interface GrupoDoFitPorLinhaProps {
  linhaDoFit: string | null;
  fitMinimo: number;
  onChange: (mudanca: { linhaDoFit?: string | null; fitMinimo?: number }) => void;
}

/**
 * Em qualificação (US-0047): a linha de serviço cujo fit a lista mostra, ordena e filtra, e a nota
 * mínima nela. A nota da linha é a maior entre os serviços dela que têm fit.
 */
export function GrupoDoFitPorLinha(props: GrupoDoFitPorLinhaProps) {
  const { linhaDoFit, fitMinimo, onChange } = props;
  const { linhas } = useFitDoCatalogo();
  const linha = linhaValida(linhaDoFit, linhas);
  const opcoes = [{ valor: MAIOR_NOTA, rotulo: 'Maior nota' }, ...linhas.map((l) => ({ valor: l.id, rotulo: l.nome }))];
  const resumoDoFit = [
    linha ? linhas.find((l) => l.id === linha)?.nome ?? null : null,
    fitMinimo > 0 ? rotulosDe(OPCOES_DE_FIT_MINIMO, [fitMinimo])[0] : null,
  ].filter((t): t is string => !!t);

  return (
    <Grupo titulo="Fit por linha" resumo={resumo(resumoDoFit)}>
      <EscolhaUnica
        rotulo="Linha do fit"
        opcoes={opcoes}
        valor={linha ?? MAIOR_NOTA}
        onEscolher={(v) => onChange({ linhaDoFit: v === MAIOR_NOTA ? null : v })}
      />
      <EscolhaUnica rotulo="Fit mínimo" opcoes={OPCOES_DE_FIT_MINIMO} valor={fitMinimo} onEscolher={(minimo) => onChange({ fitMinimo: minimo })} />
    </Grupo>
  );
}
