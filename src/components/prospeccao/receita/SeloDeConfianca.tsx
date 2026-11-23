import { cn } from '@/lib/utils';
import type { ConfiancaDoFaturamento, NivelDeConfianca } from '@/types/filtrosReceita';

// Verde = alta (ou informado pelo time), amarelo = média, vermelho = baixa (Victor, 23/11/2026).
// O texto sempre diz o nível: a cor não é o único sinal (WCAG 1.4.1).
const PONTO: Record<NivelDeConfianca, string> = {
  alta: 'bg-success',
  media: 'bg-warning',
  baixa: 'bg-destructive',
};

interface SeloDeConfiancaProps {
  confianca: ConfiancaDoFaturamento;
  className?: string;
}

interface PontoProps {
  nivel: NivelDeConfianca;
}

function Ponto(props: PontoProps) {
  const { nivel } = props;
  return <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', PONTO[nivel])} />;
}

/** "● confiança média", ao lado do faturamento na ficha (US-0018). */
export function SeloDeConfianca(props: SeloDeConfiancaProps) {
  const { confianca, className } = props;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground', className)}>
      <Ponto nivel={confianca.nivel} />
      {confianca.rotulo}
    </span>
  );
}

const primeiraMaiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** "● Confiança média: o porquê", no hover da lista e na ficha. */
export function MotivoDaConfianca(props: SeloDeConfiancaProps) {
  const { confianca, className } = props;
  return (
    <p className={cn('flex gap-1.5', className)}>
      <span className="flex h-[1lh] items-center"><Ponto nivel={confianca.nivel} /></span>
      <span>
        <span className="font-medium">{primeiraMaiuscula(confianca.rotulo)}:</span> {confianca.motivo}
      </span>
    </p>
  );
}
