import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCatalogoDosProjetos } from '@/hooks/useCatalogoDosProjetos';
import { cn } from '@/lib/utils';
import { IconeDaLinha } from './IconeDaLinha';

/** Linha de serviço como ícone (nome no tooltip) e o serviço numa etiqueta, na mesma fila (US-0048). */
export function ServicoDoProjeto(props: { serviceLine: string | null; className?: string }) {
  const { serviceLine, className } = props;
  const escolha = useCatalogoDosProjetos().linhaEServico(serviceLine);
  if (!escolha) return null;
  const { linha, servico } = escolha;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      {linha && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="img"
              aria-label={linha.nome}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-foreground"
            >
              <IconeDaLinha icone={linha.icone} />
            </span>
          </TooltipTrigger>
          <TooltipContent>{linha.nome}</TooltipContent>
        </Tooltip>
      )}
      <Badge variant="outline" className="min-w-0 font-normal">
        <span className="truncate" title={servico}>{servico}</span>
      </Badge>
    </span>
  );
}
