import {
  Briefcase, Code2, Coins, GraduationCap, Handshake, Landmark, Layers, Lightbulb, Rocket, TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { ICONES_DA_LINHA, NOME_DO_ICONE, type IconeDaLinha as ChaveDoIcone } from '@/lib/catalogo.constants';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

const COMPONENTE_DO_ICONE: Record<ChaveDoIcone, LucideIcon> = {
  camadas: Layers,
  maleta: Briefcase,
  moedas: Coins,
  predio: Landmark,
  foguete: Rocket,
  codigo: Code2,
  lampada: Lightbulb,
  grafico: TrendingUp,
  capelo: GraduationCap,
  aperto_de_maos: Handshake,
};

/** Ícone da linha de serviço (US-0048). Decorativo: quem usa dá o nome da linha. */
export function IconeDaLinha(props: { icone: ChaveDoIcone; className?: string }) {
  const { icone, className } = props;
  const Icone = COMPONENTE_DO_ICONE[icone];
  return <Icone className={cn('h-3.5 w-3.5 shrink-0', className)} aria-hidden />;
}

/** Escolha do ícone no formulário da linha. */
export function EscolhaDoIcone(props: { value: ChaveDoIcone; onChange: (icone: ChaveDoIcone) => void; id?: string }) {
  const { value, onChange, id } = props;
  return (
    <ToggleGroup
      id={id}
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ChaveDoIcone)}
      className="flex flex-wrap justify-start gap-1.5"
    >
      {ICONES_DA_LINHA.map((icone) => (
        <ToggleGroupItem
          key={icone}
          value={icone}
          aria-label={NOME_DO_ICONE[icone]}
          className="h-9 w-9 border border-border p-0 data-[state=on]:border-primary data-[state=on]:bg-accent-subtle data-[state=on]:text-foreground"
        >
          <IconeDaLinha icone={icone} className="h-4 w-4" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
