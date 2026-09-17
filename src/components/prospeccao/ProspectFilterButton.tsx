import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import { INTERACTION_CHANNELS } from '@/lib/interactionChannels';
import {
  countActiveFilters,
  FILTRO_VAZIO,
  type ProspectFilter,
} from '@/lib/prospecting/filters';
import { PROSPECT_LEVERS } from '@/types/prospect';

/** Valor do "sem filtro" nos selects. Radix não aceita SelectItem com value vazio. */
const TODOS = '__todos__';

interface ProspectFilterButtonProps {
  filtro: ProspectFilter;
  onChange: (filtro: ProspectFilter) => void;
}

export function ProspectFilterButton({ filtro, onChange }: ProspectFilterButtonProps) {
  const { data: diretorio = [] } = useEmployeeDirectory();
  const ativos = countActiveFilters(filtro);

  const definir = (campo: keyof ProspectFilter) => (valor: string) =>
    onChange({ ...filtro, [campo]: valor === TODOS ? '' : valor });

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Filtros
            {ativos > 0 && <Badge variant="secondary" className="ml-1.5">{ativos}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3" align="start" collisionPadding={8}>
          <div className="space-y-1">
            <Label htmlFor="filtro-empresa" className="text-xs text-muted-foreground">Empresa</Label>
            <Input
              id="filtro-empresa"
              value={filtro.empresa}
              placeholder="Parte do nome"
              onChange={(e) => definir('empresa')(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="filtro-contato" className="text-xs text-muted-foreground">Contato</Label>
            <Input
              id="filtro-contato"
              value={filtro.contato}
              placeholder="Parte do nome"
              onChange={(e) => definir('contato')(e.target.value)}
            />
          </div>

          <Escolha
            label="Responsável"
            value={filtro.ownerId}
            onChange={definir('ownerId')}
            opcoes={diretorio.map((p) => ({ value: p.id, label: p.nome }))}
          />

          <Escolha
            label="Alavanca"
            value={filtro.lever}
            onChange={definir('lever')}
            opcoes={PROSPECT_LEVERS.map((l) => ({ value: l.value, label: l.label }))}
          />

          <Escolha
            label="Canal principal"
            value={filtro.channel}
            onChange={definir('channel')}
            opcoes={INTERACTION_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
          />

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={ativos === 0}
            onClick={() => onChange(FILTRO_VAZIO)}
          >
            Limpar filtros
          </Button>
        </PopoverContent>
      </Popover>

      {ativos > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(FILTRO_VAZIO)}
          aria-label="Limpar filtros"
        >
          <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Limpar
        </Button>
      )}
    </div>
  );
}

function Escolha({
  label,
  value,
  onChange,
  opcoes,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opcoes: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || TODOS} onValueChange={onChange}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {opcoes.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
