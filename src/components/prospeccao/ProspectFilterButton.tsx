import { Filter, Search, X } from 'lucide-react';
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

/**
 * Busca por empresa sempre aberta + botão com os critérios adicionais.
 *
 * Empresa é o corte mais usado, então fica a um toque de tecla, sem abrir nada (23/09/2026).
 * Ela sai do popover para não existirem dois campos editando o mesmo valor, e por isso o
 * contador do botão conta só o que está lá dentro — quem digitou na busca já está vendo.
 */
export function ProspectFilterButton({ filtro, onChange }: ProspectFilterButtonProps) {
  const { data: diretorio = [] } = useEmployeeDirectory();
  const ativos = countActiveFilters(filtro);
  const ativosNoPopover = countActiveFilters({ ...filtro, empresa: '' });

  const definir = (campo: keyof ProspectFilter) => (valor: string) =>
    onChange({ ...filtro, [campo]: valor === TODOS ? '' : valor });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-56">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={filtro.empresa}
          onChange={(e) => definir('empresa')(e.target.value)}
          placeholder="Buscar empresa"
          aria-label="Buscar por nome da empresa"
          className="h-9 pl-8"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Filtros
            {ativosNoPopover > 0 && <Badge variant="secondary" className="ml-1.5">{ativosNoPopover}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3" align="start" collisionPadding={8}>
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
            disabled={ativosNoPopover === 0}
            onClick={() => onChange({ ...FILTRO_VAZIO, empresa: filtro.empresa })}
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
