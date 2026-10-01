import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Peças das listas de cadastro da Prospecção — Empresas e Contatos (01/10/2026): abas com
 * contagem, estado vazio e rodapé com paginação.
 */

interface AbasDaListaProps<T extends string> {
  rotulo: string;
  abas: ReadonlyArray<{ valor: T; rotulo: string }>;
  valor: T;
  contagem: Record<T, number>;
  onChange: (aba: T) => void;
}

export function AbasDaLista<T extends string>(props: AbasDaListaProps<T>) {
  const { rotulo, abas, valor, contagem, onChange } = props;
  return (
    <div role="tablist" aria-label={rotulo} className="flex gap-0.5 rounded-[9px] bg-muted p-[3px]">
      {abas.map((aba) => {
        const ativa = aba.valor === valor;
        return (
          <button
            key={aba.valor}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => onChange(aba.valor)}
            className={cn(
              'flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              ativa ? 'bg-card text-foreground shadow-sm' : 'text-foreground/70 hover:text-foreground',
            )}
          >
            {aba.rotulo}
            <span className="font-medium text-muted-foreground">{contagem[aba.valor]}</span>
          </button>
        );
      })}
    </div>
  );
}

interface EstadoVazioProps {
  titulo: string;
  texto: string;
  children?: ReactNode;
}

export function EstadoVazio(props: EstadoVazioProps) {
  const { titulo, texto, children } = props;
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
      <p className="text-[14.5px] font-medium">{titulo}</p>
      <p className="text-[13px] text-muted-foreground">{texto}</p>
      {children}
    </div>
  );
}

interface RodapeDaListaProps {
  texto: string;
  pagina: number;
  totalDePaginas: number;
  onPagina: (pagina: number) => void;
}

export function RodapeDaLista(props: RodapeDaListaProps) {
  const { texto, pagina, totalDePaginas, onPagina } = props;
  return (
    <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-5 py-2.5 text-[12.5px] text-muted-foreground">
      <span>{texto}</span>
      <div className="flex items-center gap-1.5">
        {totalDePaginas > 1 && <span className="mr-1">{pagina + 1} de {totalDePaginas}</span>}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          aria-label="Página anterior"
          disabled={pagina === 0}
          onClick={() => onPagina(pagina - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          aria-label="Próxima página"
          disabled={pagina >= totalDePaginas - 1}
          onClick={() => onPagina(pagina + 1)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
