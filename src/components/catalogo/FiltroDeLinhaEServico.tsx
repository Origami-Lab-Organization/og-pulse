import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCatalogoDosProjetos } from '@/hooks/useCatalogoDosProjetos';
import { linhasDoFiltro, servicosNoFiltro, type EscolhaDoFiltro, type GrupoDoFiltro } from '@/lib/catalogo';
import { SEM_SERVICO, TODOS_DO_FILTRO } from '@/lib/catalogo.constants';
import { cn } from '@/lib/utils';

interface FiltroDeLinhaEServicoProps {
  value: EscolhaDoFiltro;
  onChange: (escolha: EscolhaDoFiltro) => void;
  /** Classe de cada campo (largura e altura seguem a barra de filtros da tela). */
  className?: string;
}

function OpcoesAgrupadas(props: { grupos: GrupoDoFiltro[] }) {
  const { grupos } = props;
  return (
    <>
      {grupos.map((g, i) => (
        <SelectGroup key={g.titulo ?? 'soltas'}>
          {i > 0 && <SelectSeparator />}
          {g.titulo && <SelectLabel>{g.titulo}</SelectLabel>}
          {g.opcoes.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.rotulo}</SelectItem>
          ))}
        </SelectGroup>
      ))}
    </>
  );
}

const paraValor = (id: string | null) => id ?? TODOS_DO_FILTRO;
const deValor = (valor: string) => (valor === TODOS_DO_FILTRO ? null : valor);

/**
 * Filtro por linha de serviço e por serviço, sozinhos ou juntos (US-0048). Escolher a linha
 * restringe a lista de serviços a ela; serviços e linhas desativados ficam num grupo próprio.
 */
export function FiltroDeLinhaEServico(props: FiltroDeLinhaEServicoProps) {
  const { value, onChange, className } = props;
  const { services, lines } = useCatalogoDosProjetos();
  const servicos = servicosNoFiltro(services, lines, value.linhaId);
  const servicoNaLinha = (servicoId: string | null, linhaId: string | null) =>
    !servicoId || servicoId === SEM_SERVICO || !linhaId || services.some((s) => s.id === servicoId && s.serviceLineId === linhaId);

  const escolherLinha = (valor: string) => {
    const linhaId = deValor(valor);
    const servicoId = servicoNaLinha(value.servicoId, linhaId) && !(linhaId && value.servicoId === SEM_SERVICO) ? value.servicoId : null;
    onChange({ linhaId, servicoId });
  };

  return (
    <>
      <Select value={paraValor(value.linhaId)} onValueChange={escolherLinha}>
        <SelectTrigger className={cn('w-[170px]', className)} aria-label="Linha de serviço">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS_DO_FILTRO}>Todas as linhas</SelectItem>
          <OpcoesAgrupadas grupos={linhasDoFiltro(lines)} />
        </SelectContent>
      </Select>
      <Select value={paraValor(value.servicoId)} onValueChange={(v) => onChange({ ...value, servicoId: deValor(v) })}>
        <SelectTrigger className={cn('w-[210px]', className)} aria-label="Serviço">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS_DO_FILTRO}>Todos os serviços</SelectItem>
          <OpcoesAgrupadas grupos={servicos} />
          {/* "Sem serviço" não pertence a linha nenhuma: só sem linha escolhida. */}
          {!value.linhaId && (
            <>
              <SelectSeparator />
              <SelectItem value={SEM_SERVICO}>Sem serviço</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </>
  );
}
