import { format, isBefore, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ActivityColumnName } from '@/types/projectActivity';
import type {
  CreatePersonalKanbanColumnInput,
  PersonalKanbanColor,
  DueTone,
  PersonalKanbanColumnDB,
  PersonalKanbanStage,
  ReminderOption,
} from '@/types/personalKanban';

// Regras do Meu Kanban (ADR-0050). Tudo aqui é puro: nada de rede, nada de React.

// ── Etapas e colunas ─────────────────────────────────────────────────────────

/** Base com que todo kanban nasce. Cada pessoa personaliza a partir daqui. */
export const DEFAULT_COLUMNS: Omit<CreatePersonalKanbanColumnInput, 'position'>[] = [
  { name: 'A fazer', stage: 'todo', color: 'neutral' },
  { name: 'Fazendo', stage: 'doing', color: 'info' },
  { name: 'Feito', stage: 'done', color: 'success' },
];

export const STAGE_ORDER: PersonalKanbanStage[] = ['todo', 'doing', 'done'];

export const STAGE_LABELS: Record<PersonalKanbanStage, string> = {
  todo: 'A fazer',
  doing: 'Fazendo',
  done: 'Feito',
};

export const PROJECT_TO_PERSONAL_STAGE: Record<ActivityColumnName, PersonalKanbanStage> = {
  product_backlog: 'todo',
  sprint_backlog: 'todo',
  in_dev: 'doing',
  in_test: 'doing',
  in_deploy: 'doing',
  done: 'done',
};

/** Cores de coluna: só tokens do tema, para acompanhar claro/escuro. */
export const COLUMN_COLORS: Record<PersonalKanbanColor, { label: string; dot: string }> = {
  neutral: { label: 'Cinza', dot: 'bg-muted-foreground' },
  info: { label: 'Azul', dot: 'bg-info' },
  success: { label: 'Verde', dot: 'bg-success' },
  warning: { label: 'Âmbar', dot: 'bg-warning' },
  destructive: { label: 'Vermelho', dot: 'bg-destructive' },
  slate: { label: 'Ardósia', dot: 'bg-brand-slate' },
  palm: { label: 'Oliva', dot: 'bg-brand-palm' },
};

export function isDoneColumn(column: Pick<PersonalKanbanColumnDB, 'stage'> | undefined): boolean {
  return column?.stage === 'done';
}

/** Primeira coluna da etapa: onde caem as atividades de projeto e para onde vai o "concluir". */
export function firstColumnOfStage(
  columns: PersonalKanbanColumnDB[],
  stage: PersonalKanbanStage,
): PersonalKanbanColumnDB | undefined {
  return columns
    .filter((column) => column.stage === stage)
    .sort((a, b) => a.position - b.position)[0];
}

/** Coluna para onde vai o card ao marcar/desmarcar "concluído": primeira de Feito, ou de volta à primeira de A fazer. */
export function toggleDoneTarget(
  columns: PersonalKanbanColumnDB[],
  currentColumnId: string,
): PersonalKanbanColumnDB | undefined {
  const current = columns.find((column) => column.id === currentColumnId);
  return firstColumnOfStage(columns, isDoneColumn(current) ? 'todo' : 'done');
}

function isLastOfStage(columns: PersonalKanbanColumnDB[], column: PersonalKanbanColumnDB) {
  return columns.filter((item) => item.stage === column.stage).length <= 1;
}

function lastOfStageMessage(column: PersonalKanbanColumnDB) {
  return `É a única coluna de "${STAGE_LABELS[column.stage]}". O kanban precisa de ao menos uma por etapa.`;
}

/** Motivo que impede excluir a coluna, ou null se pode. */
export function columnRemovalBlock(
  columns: PersonalKanbanColumnDB[],
  column: PersonalKanbanColumnDB,
  cardCount: number,
): string | null {
  if (cardCount > 0) {
    return `Mova ou exclua ${cardCount === 1 ? 'o card' : `os ${cardCount} cards`} desta coluna antes.`;
  }
  return isLastOfStage(columns, column) ? lastOfStageMessage(column) : null;
}

/** Motivo que impede trocar a etapa da coluna, ou null se pode. */
export function stageChangeBlock(
  columns: PersonalKanbanColumnDB[],
  column: PersonalKanbanColumnDB,
): string | null {
  return isLastOfStage(columns, column) ? lastOfStageMessage(column) : null;
}

// ── Lembrete ─────────────────────────────────────────────────────────────────

/** Card sem hora é lembrado neste horário (no dia ou na véspera). */
export const ALL_DAY_REMINDER_TIME = '09:00';

const TIMED_REMINDER_OPTIONS: ReminderOption[] = [
  { value: 0, label: 'Na hora' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 h antes' },
  { value: 1440, label: '1 dia antes' },
];

const ALL_DAY_REMINDER_OPTIONS: ReminderOption[] = [
  { value: 0, label: 'No dia, às 9h' },
  { value: 1440, label: 'Na véspera, às 9h' },
];

/** Opções da preferência "lembrete padrão": vale para cards com hora. */
export const DEFAULT_REMINDER_OPTIONS = TIMED_REMINDER_OPTIONS;

export function reminderOptions(hasTime: boolean): ReminderOption[] {
  return hasTime ? TIMED_REMINDER_OPTIONS : ALL_DAY_REMINDER_OPTIONS;
}

/** Card sem hora só aceita "no dia" ou "na véspera": arredonda a antecedência para uma delas. */
export function fitReminderToDue(minutes: number | null, hasTime: boolean): number | null {
  if (minutes === null || hasTime) return minutes;
  return minutes >= 1440 ? 1440 : 0;
}

export function reminderLabel(minutes: number, hasTime: boolean): string {
  const option = reminderOptions(hasTime).find((item) => item.value === minutes);
  return option?.label ?? `${minutes} min antes`;
}

/** 'HH:mm:ss' do banco → 'HH:mm'. */
export function normalizeTime(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null;
}

/**
 * Instante do lembrete, no fuso do navegador de quem marcou — o banco não guarda fuso.
 * `dueDate` é 'yyyy-MM-dd'; sem hora, a referência é ALL_DAY_REMINDER_TIME.
 */
export function computeRemindAt(
  dueDate: string | null,
  dueTime: string | null,
  minutes: number | null,
): string | null {
  if (!dueDate || minutes === null) return null;
  const anchor = new Date(`${dueDate}T${normalizeTime(dueTime) ?? ALL_DAY_REMINDER_TIME}:00`);
  return new Date(anchor.getTime() - minutes * 60_000).toISOString();
}

// ── Prazo ────────────────────────────────────────────────────────────────────

function dueDayLabel(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, 'd MMM', { locale: ptBR });
}

function isOverdue(date: Date, time: string | null, now: Date): boolean {
  if (!time) return isBefore(date, startOfDay(now));
  return isBefore(new Date(`${format(date, 'yyyy-MM-dd')}T${time}:00`), now);
}

function dueTone(date: Date, time: string | null, now: Date): DueTone {
  if (isOverdue(date, time, now)) return 'overdue';
  return isToday(date) ? 'today' : 'upcoming';
}

/** Rótulo curto do prazo ("Hoje 14:30", "Amanhã", "23 out") e o tom visual. */
export function describeDue(
  dueDate: string,
  dueTime: string | null,
  options: { done?: boolean; now?: Date } = {},
): { label: string; tone: DueTone } {
  const date = parseISO(dueDate);
  const time = normalizeTime(dueTime);
  const label = time ? `${dueDayLabel(date)} ${time}` : dueDayLabel(date);
  const tone = options.done ? 'done' : dueTone(date, time, options.now ?? new Date());
  return { label, tone };
}
