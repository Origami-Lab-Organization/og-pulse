import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { detalheDaRelacao, rotuloDaRelacao } from '@/lib/prospecting/relacao';
import { cn } from '@/lib/utils';
import type { Relacao, RelacaoDaEmpresa } from '@/types/relacao';

const COR: Record<Relacao, string> = {
  cliente_ativo: 'bg-success-subtle text-success-emphasis',
  sendo_abordada: 'bg-info-subtle text-info-emphasis',
  ja_foi_cliente: 'bg-muted text-foreground/80',
  sem_sucesso: 'bg-warning-subtle text-warning-emphasis',
};
const COR_PEDIU_PARA_PARAR = 'bg-destructive-subtle text-destructive-emphasis';
const PEDIU_PARA_PARAR = 'Pediu para parar';

/**
 * A relação da Origami com a empresa (US-0019): o selo e, ao passar o mouse ou focar, o detalhe
 * (projeto, etapa e responsável, motivo e data da perda). "Pediu para parar" fica em alerta.
 */
export function SeloDeRelacao({ relacao }: { relacao: RelacaoDaEmpresa }) {
  const { byId } = useEmployeeDirectoryMap();
  const nomeDe = (id: string | null) => (id ? byId.get(id)?.nome ?? 'responsável' : 'sem responsável');
  const rotulo = relacao.pediuParaParar ? PEDIU_PARA_PARAR : rotuloDaRelacao(relacao.relacao);
  const detalhe = detalheDaRelacao(relacao, nomeDe);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            relacao.pediuParaParar ? COR_PEDIU_PARA_PARAR : COR[relacao.relacao],
          )}
        >
          {rotulo}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal text-left text-[12.5px] leading-snug">
        <p className="font-medium">{rotuloDaRelacao(relacao.relacao)}</p>
        {detalhe.map((linha) => <p key={linha} className="mt-0.5">{linha}</p>)}
      </TooltipContent>
    </Tooltip>
  );
}

/** A célula da coluna: o selo, "—" sem relação, ou o aviso de que a relação não carregou. */
export function CelulaDeRelacao({ relacao, indisponivel }: { relacao: RelacaoDaEmpresa | null | undefined; indisponivel: boolean }) {
  if (relacao) return <SeloDeRelacao relacao={relacao} />;
  if (indisponivel) return <span className="text-[12.5px] text-muted-foreground" title="A relação com a Origami não carregou agora">?</span>;
  return <span className="text-[12.5px] text-muted-foreground" title="Sem relação com a Origami">—</span>;
}
