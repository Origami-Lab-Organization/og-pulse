import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { setValuesHidden } from '@/lib/valueVisibility';
import { useValuesHidden } from '@/hooks/useValuesHidden';

/**
 * Oculta os valores monetários da tela, para compartilhar tela ou trabalhar em público.
 *
 * Não é controle de acesso: quem podia ver o valor continua podendo, e um F5 com o olho
 * desligado mostra tudo de novo. É privacidade de ombro, e a diferença importa — nada aqui
 * substitui as capacidades que governam quem lê dado financeiro.
 */
export function ValueVisibilityToggle() {
  const hidden = useValuesHidden();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-pressed={hidden}
          aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          onClick={() => setValuesHidden(!hidden)}
        >
          {hidden ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        <p>
          {hidden
            ? 'Valores ocultos nesta tela. Só você vê esta preferência, e ela vale neste navegador.'
            : 'Ocultar os valores monetários da tela, para compartilhar tela sem expor números.'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
