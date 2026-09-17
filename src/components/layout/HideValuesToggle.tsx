import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useHideValuesPreference } from '@/contexts/HideValuesContext';

/**
 * O olho que oculta os valores monetários da tela.
 *
 * Um componente só, para o botão ser igual em toda página que tem dinheiro — antes cada tela
 * repetia o mesmo `Button` + `Tooltip` no próprio cabeçalho, e eles já tinham começado a
 * divergir.
 *
 * Não é controle de acesso: quem podia ver o valor continua podendo, e a preferência vale
 * neste navegador. É privacidade de ombro — reunião, café, telão —, e a diferença importa:
 * nada aqui substitui as capacidades que governam quem lê dado financeiro.
 */
export function HideValuesToggle() {
  const [hideValues, setHideValues] = useHideValuesPreference();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-pressed={hideValues}
          aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          onClick={() => setHideValues((v) => !v)}
        >
          {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{hideValues ? 'Mostrar valores' : 'Ocultar valores'}</TooltipContent>
    </Tooltip>
  );
}
