import type { ReactNode, RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import type { TotalReceita } from '@/lib/prospecting/empresasReceita';

interface GavetaDeFiltrosProps {
  aberta: boolean;
  onAbertaChange: (aberta: boolean) => void;
  contagem: TotalReceita | undefined;
  contando: boolean;
  /** O ícone de filtros, que recebe o foco quando a gaveta fecha. */
  botao: RefObject<HTMLButtonElement>;
  children: ReactNode;
}

/**
 * Filtros da tela Empresas, em qualquer tamanho de tela (US-0004; desde 18/11/2026 também no
 * computador): por cima da lista, pela direita. Esc, clicar fora, o botão de fechar do painel e
 * "Ver N empresas" fecham. A lista atrás muda a cada filtro.
 */
export function GavetaDeFiltros(props: GavetaDeFiltrosProps) {
  const { aberta, onAbertaChange, contagem, contando, botao, children } = props;
  return (
    <Sheet open={aberta} onOpenChange={onAbertaChange}>
      <SheetContent
        side="right"
        hideClose
        className="flex w-[min(92vw,380px)] flex-col p-0 sm:max-w-none"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          botao.current?.focus();
        }}
      >
        <SheetTitle className="sr-only">Filtros</SheetTitle>
        <SheetDescription className="sr-only">Os filtros valem enquanto você marca.</SheetDescription>
        {children}
        <div className="border-t bg-card p-3">
          <Button className="w-full" onClick={() => onAbertaChange(false)}>
            {textoDeVer(contagem, contando)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function textoDeVer(contagem: TotalReceita | undefined, contando: boolean): string {
  if (contando || contagem?.total == null) return 'Ver empresas';
  const n = contagem.total.toLocaleString('pt-BR');
  if (contagem.limitado) return `Ver mais de ${n} empresas`;
  return contagem.total === 1 ? 'Ver 1 empresa' : `Ver ${n} empresas`;
}
