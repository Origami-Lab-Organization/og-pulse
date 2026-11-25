import { useFitDoCatalogo } from '@/hooks/useFitDoCatalogo';
import { MAIOR_NOTA, OPCOES_DE_FIT_MINIMO, opcoesDeServicoDoFit } from '@/lib/prospecting/filtrosReceita';
import { regraValida, rotuloDoGrupo } from '@/lib/prospecting/fitDoCatalogo';
import { resumo, rotulosDe } from '@/lib/prospecting/resumoDosFiltros';
import type { FitFront } from '@/types/receita';
import { EscolhaUnica, Grupo } from './BlocosDeFiltro';

interface GrupoDoFitPorServicoProps {
  servicoDoFit: FitFront | null;
  fitMinimo: number;
  onChange: (mudanca: { servicoDoFit?: FitFront | null; fitMinimo?: number }) => void;
}

/**
 * O serviço cujo fit a lista mostra, ordena e filtra, e a nota mínima nele (US-0014, US-0042).
 * As opções vêm do catálogo (US-0047); uma regra salva que nenhum serviço usa vale como "Maior nota".
 */
export function GrupoDoFitPorServico(props: GrupoDoFitPorServicoProps) {
  const { servicoDoFit, fitMinimo, onChange } = props;
  const { grupos } = useFitDoCatalogo();
  const servico = regraValida(servicoDoFit, grupos);
  const resumoDoFit = [
    servico ? rotuloDoGrupo(servico, grupos) : null,
    fitMinimo > 0 ? rotulosDe(OPCOES_DE_FIT_MINIMO, [fitMinimo])[0] : null,
  ].filter((t): t is string => !!t);

  return (
    <Grupo titulo="Fit por serviço" resumo={resumo(resumoDoFit)}>
      <EscolhaUnica
        rotulo="Serviço do fit"
        opcoes={opcoesDeServicoDoFit(grupos)}
        valor={servico ?? MAIOR_NOTA}
        onEscolher={(v) => onChange({ servicoDoFit: v === MAIOR_NOTA ? null : (v as FitFront) })}
      />
      <EscolhaUnica rotulo="Fit mínimo" opcoes={OPCOES_DE_FIT_MINIMO} valor={fitMinimo} onEscolher={(minimo) => onChange({ fitMinimo: minimo })} />
    </Grupo>
  );
}
