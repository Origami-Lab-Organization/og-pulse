import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  useBatchUpdateColumnPositions,
  useCreatePersonalColumn,
  useDeletePersonalColumn,
  usePersonalKanbanSettings,
  useUpdatePersonalColumn,
  useUpdatePersonalKanbanSettings,
} from '@/hooks/usePersonalKanban';
import { useWebPush } from '@/hooks/useWebPush';
import {
  COLUMN_COLORS,
  DEFAULT_REMINDER_OPTIONS,
  STAGE_LABELS,
  STAGE_ORDER,
  columnRemovalBlock,
  isDoneColumn,
  stageChangeBlock,
} from '@/lib/personalKanban';
import type { PersonalKanbanColor, PersonalKanbanColumnDB, PersonalKanbanStage } from '@/types/personalKanban';
import type { PushStatus } from '@/types/webPush';

interface PersonalKanbanSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: PersonalKanbanColumnDB[];
  cardCountByColumn: Record<string, number>;
}

const NO_REMINDER = 'none';
const ARCHIVE_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 7, label: 'Depois de 7 dias' },
  { value: 14, label: 'Depois de 14 dias' },
  { value: 30, label: 'Depois de 30 dias' },
];

function Section(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{props.title}</h3>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </div>
      {props.children}
    </section>
  );
}

// Controle bloqueado continua focável e explica o motivo no tooltip.
function Blocked(props: { reason: string | null; children: React.ReactElement }) {
  if (!props.reason) return props.children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{props.children}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px]">{props.reason}</TooltipContent>
    </Tooltip>
  );
}

function ColorPicker(props: { value: PersonalKanbanColor; columnName: string; onChange: (color: PersonalKanbanColor) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Cor da coluna ${props.columnName}: ${COLUMN_COLORS[props.value].label}`}>
          <span className={cn('h-3 w-3 rounded-full', COLUMN_COLORS[props.value].dot)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-7 gap-1" role="group" aria-label="Cores">
          {(Object.keys(COLUMN_COLORS) as PersonalKanbanColor[]).map((color) => (
            <button
              key={color}
              type="button"
              aria-label={COLUMN_COLORS[color].label}
              aria-pressed={props.value === color}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                props.value === color && 'bg-muted ring-1 ring-border',
              )}
              onClick={() => props.onChange(color)}
            >
              <span className={cn('h-3.5 w-3.5 rounded-full', COLUMN_COLORS[color].dot)} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColumnNameInput(props: { column: PersonalKanbanColumnDB; onSave: (name: string) => void }) {
  const { column, onSave } = props;
  const [name, setName] = useState(column.name);
  useEffect(() => setName(column.name), [column.name]);

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setName(column.name); return; }
    if (trimmed !== column.name) onSave(trimmed);
  };

  return (
    <Input
      value={name}
      maxLength={60}
      aria-label="Nome da coluna"
      className="h-8 min-w-0 flex-1 text-sm"
      onChange={(event) => setName(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
    />
  );
}

function ColumnRow(props: { column: PersonalKanbanColumnDB; columns: PersonalKanbanColumnDB[]; cardCount: number }) {
  const { column, columns, cardCount } = props;
  const updateColumn = useUpdatePersonalColumn();
  const deleteColumn = useDeletePersonalColumn();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });
  const stageBlock = stageChangeBlock(columns, column);
  const removalBlock = columnRemovalBlock(columns, column, cardCount);
  const save = (updates: Parameters<typeof updateColumn.mutate>[0]['updates']) => updateColumn.mutate({ id: column.id, updates });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-center gap-1.5 rounded-lg border border-border bg-card p-1.5', isDragging && 'relative z-10 shadow-md')}
    >
      <button type="button" className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Reordenar ${column.name}`} {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <ColorPicker value={column.color} columnName={column.name} onChange={(color) => save({ color })} />
      <ColumnNameInput column={column} onSave={(name) => save({ name })} />
      <Blocked reason={stageBlock}>
        <Select value={column.stage} onValueChange={(stage) => save({ stage: stage as PersonalKanbanStage })} disabled={!!stageBlock}>
          <SelectTrigger className="h-8 w-[110px] shrink-0 text-xs" aria-label={`Etapa de ${column.name}`}><SelectValue /></SelectTrigger>
          <SelectContent>{STAGE_ORDER.map((stage) => <SelectItem key={stage} value={stage}>{STAGE_LABELS[stage]}</SelectItem>)}</SelectContent>
        </Select>
      </Blocked>
      <Blocked reason={removalBlock}>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive-subtle hover:text-destructive disabled:bg-transparent disabled:opacity-40" aria-label={`Excluir coluna ${column.name}`} disabled={!!removalBlock || deleteColumn.isPending} onClick={() => deleteColumn.mutate(column.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </Blocked>
    </li>
  );
}

// Coluna nova entra antes da primeira de "Feito", como etapa "Fazendo": é o lugar mais comum.
function newColumnLayout(columns: PersonalKanbanColumnDB[]) {
  const firstDone = columns.findIndex((column) => isDoneColumn(column));
  const insertAt = firstDone === -1 ? columns.length : firstDone;
  const shifted = columns
    .map((column, index) => ({ id: column.id, position: index < insertAt ? index : index + 1 }))
    .filter((item, index) => item.position !== columns[index].position);
  return { insertAt, shifted };
}

function ColumnsSection(props: { columns: PersonalKanbanColumnDB[]; cardCountByColumn: Record<string, number> }) {
  const [ordered, setOrdered] = useState(props.columns);
  const createColumn = useCreatePersonalColumn();
  const batchPositions = useBatchUpdateColumnPositions();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => setOrdered(props.columns), [props.columns]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(ordered, ordered.findIndex((c) => c.id === active.id), ordered.findIndex((c) => c.id === over.id));
    setOrdered(next);
    batchPositions.mutate(next.map((column, position) => ({ id: column.id, position })));
  };

  const addColumn = async () => {
    const { insertAt, shifted } = newColumnLayout(ordered);
    if (shifted.length) await batchPositions.mutateAsync(shifted);
    createColumn.mutate({ name: 'Nova coluna', stage: 'doing', color: 'neutral', position: insertAt });
  };

  return (
    <Section title="Colunas" description="Arraste para reordenar. A etapa diz onde entram as atividades de projeto e o que conta como concluído.">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((column) => column.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {ordered.map((column) => (
              <ColumnRow key={column.id} column={column} columns={ordered} cardCount={props.cardCountByColumn[column.id] ?? 0} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addColumn} disabled={createColumn.isPending || batchPositions.isPending}>
        <Plus className="h-4 w-4" />
        Adicionar coluna
      </Button>
    </Section>
  );
}

const PUSH_COPY: Record<PushStatus, string> = {
  loading: 'Verificando…',
  unsupported: 'Este navegador não recebe notificações. No iPhone, adicione o Pulse à Tela de Início e ative por lá.',
  unconfigured: 'As notificações do Pulse ainda não foram configuradas. Fale com quem administra o sistema.',
  denied: 'As notificações estão bloqueadas para o Pulse neste navegador. Libere nas permissões do site e volte aqui.',
  enabled: 'Ativadas neste aparelho. O lembrete chega mesmo com o Pulse fechado.',
  disabled: 'Receba o lembrete mesmo com o Pulse fechado.',
};

const PUSH_TOGGLE: Partial<Record<PushStatus, { label: string; variant: 'default' | 'outline'; turnOn: boolean }>> = {
  enabled: { label: 'Desativar', variant: 'outline', turnOn: false },
  disabled: { label: 'Ativar', variant: 'default', turnOn: true },
};

function PushDeviceRow() {
  const { status, busy, enable, disable } = useWebPush();
  const toggle = PUSH_TOGGLE[status];
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Notificações neste aparelho</p>
        <p className="text-xs text-muted-foreground">{PUSH_COPY[status]}</p>
      </div>
      {toggle && (
        <Button type="button" size="sm" variant={toggle.variant} disabled={busy} onClick={toggle.turnOn ? enable : disable}>
          {toggle.label}
        </Button>
      )}
    </div>
  );
}

function RemindersSection() {
  const { employee } = useAuth();
  const { data: settings } = usePersonalKanbanSettings();
  const updateSettings = useUpdatePersonalKanbanSettings();
  if (!settings) return null;
  const defaultValue = settings.default_reminder_minutes === null ? NO_REMINDER : String(settings.default_reminder_minutes);

  return (
    <Section title="Lembretes" description="O lembrete sempre chega no Inbox do Pulse. Card sem hora é lembrado às 9h.">
      <div className="space-y-1.5">
        <Label htmlFor="default-reminder">Lembrete padrão</Label>
        <Select value={defaultValue} onValueChange={(value) => updateSettings.mutate({ default_reminder_minutes: value === NO_REMINDER ? null : Number(value) })}>
          <SelectTrigger id="default-reminder"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_REMINDER}>Sem lembrete</SelectItem>
            {DEFAULT_REMINDER_OPTIONS.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Sugerido quando você dá prazo a um card. Dá para mudar em cada card.</p>
      </div>
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="email-reminders" className="text-sm font-medium">Também por e-mail</Label>
          <p className="text-xs text-muted-foreground">{employee?.email ? `Para ${employee.email}.` : 'Para o seu e-mail de acesso.'}</p>
        </div>
        <Switch id="email-reminders" checked={settings.email_reminders} onCheckedChange={(checked) => updateSettings.mutate({ email_reminders: checked })} />
      </div>
      <PushDeviceRow />
    </Section>
  );
}

function DoneSection() {
  const { data: settings } = usePersonalKanbanSettings();
  const updateSettings = useUpdatePersonalKanbanSettings();
  if (!settings) return null;
  return (
    <Section title="Concluídos" description="Cards arquivados saem do board e ficam em Arquivados, de onde podem voltar.">
      <div className="space-y-1.5">
        <Label htmlFor="archive-done">Arquivar cards concluídos</Label>
        <Select value={String(settings.archive_done_after_days)} onValueChange={(value) => updateSettings.mutate({ archive_done_after_days: Number(value) })}>
          <SelectTrigger id="archive-done"><SelectValue /></SelectTrigger>
          <SelectContent>{ARCHIVE_OPTIONS.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </Section>
  );
}

export function PersonalKanbanSettingsSheet(props: PersonalKanbanSettingsSheetProps) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle>Configurar Meu Kanban</SheetTitle>
          <SheetDescription>Só vale para o seu kanban.</SheetDescription>
        </SheetHeader>
        <div className="space-y-8">
          <ColumnsSection columns={props.columns} cardCountByColumn={props.cardCountByColumn} />
          <RemindersSection />
          <DoneSection />
        </div>
      </SheetContent>
    </Sheet>
  );
}
