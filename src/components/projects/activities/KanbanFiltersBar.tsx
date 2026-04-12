import { useState } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectMembers } from '@/hooks/useProjects';
import { useProjectTags } from '@/hooks/useActivityTags';
import { useActivitySprints } from '@/hooks/useActivitySprints';
import { ActivityCardType, CARD_TYPE_OPTIONS } from '@/types/projectActivity';
import { KanbanFiltersReturn } from '@/hooks/useKanbanFilters';
import { cn } from '@/lib/utils';

interface KanbanFiltersBarProps extends KanbanFiltersReturn {
  projectId: string;
}

// ── Generic multi-select popover ──────────────────────────────────────────────

interface MultiSelectOption {
  value: string;
  label: string;
  color?: string;
  avatar?: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (v: string[]) => void;
}

function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs font-normal',
            selected.length > 0 && 'border-primary/60 bg-primary/5 text-primary'
          )}
        >
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] leading-none">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Sem opções</p>
        ) : (
          options.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60"
                onClick={() => toggle(opt.value)}
              >
                <div
                  className={cn(
                    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
                    active ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  )}
                >
                  {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>

                {opt.color && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: opt.color }}
                  />
                )}

                {opt.avatar !== undefined && (
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarFallback className="text-[9px]">
                      {opt.avatar.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <span className="truncate text-xs">{opt.label}</span>
              </button>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── KanbanFiltersBar ──────────────────────────────────────────────────────────

export function KanbanFiltersBar({
  projectId,
  searchText,
  setSearchText,
  assigneeIds,
  setAssigneeIds,
  cardTypes,
  setCardTypes,
  tagIds,
  setTagIds,
  sprintId,
  setSprintId,
  filterCount,
  clearAllFilters,
}: KanbanFiltersBarProps) {
  const { data: members = [] } = useProjectMembers(projectId);
  const { data: tags = [] } = useProjectTags(projectId);
  const { data: sprints = [] } = useActivitySprints(projectId);

  const memberOptions: MultiSelectOption[] = members
    .filter((m) => m.employee)
    .map((m) => ({
      value: m.employee!.id,
      label: m.employee!.nome,
      avatar: m.employee!.nome,
    }));

  const cardTypeOptions: MultiSelectOption[] = CARD_TYPE_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  const tagOptions: MultiSelectOption[] = tags.map((t) => ({
    value: t.id,
    label: t.name,
    color: t.color,
  }));

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 shrink-0">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Buscar..."
          className="h-8 w-44 pl-8 text-xs"
        />
        {searchText && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchText('')}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Responsável */}
      <MultiSelect
        label="Responsável"
        options={memberOptions}
        selected={assigneeIds}
        onChange={setAssigneeIds}
      />

      {/* Tipo */}
      <MultiSelect
        label="Tipo"
        options={cardTypeOptions}
        selected={cardTypes}
        onChange={(v) => setCardTypes(v as ActivityCardType[])}
      />

      {/* Tag */}
      {tagOptions.length > 0 && (
        <MultiSelect
          label="Tag"
          options={tagOptions}
          selected={tagIds}
          onChange={setTagIds}
        />
      )}

      {/* Sprint */}
      {sprints.length > 0 && (
        <Select value={sprintId ?? 'all'} onValueChange={(v) => setSprintId(v === 'all' ? null : v)}>
          <SelectTrigger
            className={cn(
              'h-8 w-auto min-w-[110px] gap-1.5 text-xs font-normal',
              sprintId && 'border-primary/60 bg-primary/5 text-primary'
            )}
          >
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todas as sprints</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Active filter badge + clear */}
      {filterCount > 0 && (
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="h-6 px-2 text-xs">
            {filterCount} {filterCount === 1 ? 'filtro ativo' : 'filtros ativos'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={clearAllFilters}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
