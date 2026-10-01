import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PencilLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { correctionReasonLabel } from '@/hooks/useAllocationActualEdits';
import { DAY_FLAG_LABEL } from '@/lib/auditoriaHoras';
import { formatHours } from '@/lib/relatorioHoras';
import { AuditEntryKind, DayFlag } from '@/types/auditoriaHoras';
import type { AuditDay, AuditWeek, CorrectionRecord, HoursAudit, UnplannedItem } from '@/types/auditoriaHoras';

/** O mês auditado de uma pessoa: semanas dia a dia, horas sem alocação e correções. Sem I/O. */

const FLAG_BADGE: Record<DayFlag, 'warning' | 'destructive' | 'info' | 'neutral'> = {
  [DayFlag.OverJourney]: 'warning',
  [DayFlag.Weekend]: 'info',
  [DayFlag.Holiday]: 'info',
  [DayFlag.Missing]: 'destructive',
  [DayFlag.Late]: 'neutral',
};

const shortDate = (date: string) => format(parseISO(date), 'dd/MM');
const dayLabel = (date: string) => format(parseISO(date), 'EEE dd/MM', { locale: ptBR });

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function SummaryLine({ audit }: { audit: HoursAudit }) {
  const s = audit.summary;
  return (
    <p className="text-sm text-muted-foreground">
      Lançou <span className="font-semibold tabular-nums text-foreground">{formatHours(s.logged)}</span> de{' '}
      <span className="tabular-nums">{formatHours(s.expected)}</span> esperadas · {plural(s.daysWithFlags, 'dia com alerta', 'dias com alerta')} ·{' '}
      {formatHours(s.unplannedHours)} sem alocação · {plural(s.corrections, 'correção', 'correções')}
    </p>
  );
}

function EntryText({ day }: { day: AuditDay }) {
  if (day.entries.length === 0) return null;
  return (
    <p className="text-sm text-foreground">
      {day.entries.map((e, i) => (
        <span key={e.key}>
          {i > 0 && ' · '}
          {e.itemName}
          {e.kind === AuditEntryKind.Activity && <span className="text-muted-foreground"> (atividade)</span>}{' '}
          <span className="tabular-nums text-muted-foreground">{formatHours(e.hours)}</span>
          {e.edited && <span className="text-muted-foreground"> · corrigido</span>}
          {e.lateDays != null && <span className="text-muted-foreground"> · lançado {e.lateDays} dias depois</span>}
        </span>
      ))}
    </p>
  );
}

function DayRow({ day }: { day: AuditDay }) {
  return (
    <li className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-28 shrink-0 whitespace-nowrap text-sm font-medium capitalize text-foreground">{dayLabel(day.date)}</span>
      <span className="w-28 shrink-0 text-sm tabular-nums text-muted-foreground">
        {formatHours(day.logged)}
        {day.expected > 0 && ` de ${formatHours(day.expected)}`}
        {day.onVacation && ' · férias'}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <EntryText day={day} />
        {day.flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {day.flags.map((f) => (
              <Badge key={f} variant={FLAG_BADGE[f]}>
                {DAY_FLAG_LABEL[f]}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

/** Fim de semana, feriado e dia futuro sem lançamento não dizem nada: ficam fora da lista. */
const matters = (day: AuditDay) => day.expected > 0 || day.logged > 0 || day.flags.length > 0;

function WeekBlock(props: { week: AuditWeek; onlyFlagged: boolean; canEdit: boolean; onCorrect: (monday: string) => void }) {
  const { week, onlyFlagged, canEdit, onCorrect } = props;
  const days = week.days.filter(onlyFlagged ? (d) => d.flags.length > 0 : matters);
  if (days.length === 0) return null;
  const first = week.days[0].date;
  const last = week.days[week.days.length - 1].date;
  return (
    <section className="rounded-lg border border-border bg-card" aria-label={`Semana de ${shortDate(first)} a ${shortDate(last)}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="text-sm font-medium text-foreground">
          {shortDate(first)} a {shortDate(last)}
          <span className="ml-2 font-normal tabular-nums text-muted-foreground">
            {formatHours(week.logged)} de {formatHours(week.expected)}
          </span>
        </span>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => onCorrect(week.monday)}>
            <PencilLine className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Corrigir semana
          </Button>
        )}
      </header>
      <ul className="divide-y divide-border px-3">
        {days.map((day) => (
          <DayRow key={day.date} day={day} />
        ))}
      </ul>
    </section>
  );
}

function UnplannedList({ items }: { items: UnplannedItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Toda hora de projeto do mês tinha alocação planejada.</p>;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card px-3">
      {items.map((u) => (
        <li key={u.projectId} className="flex justify-between gap-3 py-2 text-sm">
          <span className="text-foreground">{u.name}</span>
          <span className="tabular-nums text-muted-foreground">{formatHours(u.hours)}</span>
        </li>
      ))}
    </ul>
  );
}

function CorrectionsList({ corrections }: { corrections: CorrectionRecord[] }) {
  if (corrections.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma correção nas horas deste mês.</p>;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card px-3">
      {corrections.map((c) => (
        <li key={c.key} className="space-y-0.5 py-2 text-sm">
          <p className="text-foreground">
            <span className="font-medium">{c.itemName}</span>
            {c.workDate && <span className="text-muted-foreground"> · {shortDate(c.workDate)}</span>}{' '}
            <span className="tabular-nums text-muted-foreground line-through">{formatHours(c.previousHours)}</span> →{' '}
            <span className="font-medium tabular-nums">{formatHours(c.newHours)}</span>
          </p>
          <p className="text-muted-foreground">
            {c.editorName} em {format(parseISO(c.editedAt), "dd/MM 'às' HH:mm")} · {correctionReasonLabel(c.reasonCode)}
            {c.justification && ` — ${c.justification}`}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function HoursAuditView(props: { audit: HoursAudit; canEdit: boolean; onCorrect: (monday: string) => void }) {
  const { audit, canEdit, onCorrect } = props;
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SummaryLine audit={audit} />
          <div className="flex items-center gap-2">
            <Switch id="auditoria-so-alertas" checked={onlyFlagged} onCheckedChange={setOnlyFlagged} />
            <Label htmlFor="auditoria-so-alertas" className="text-sm text-muted-foreground">
              Só dias com alerta
            </Label>
          </div>
        </div>
        {audit.weeks.map((week) => (
          <WeekBlock key={week.monday} week={week} onlyFlagged={onlyFlagged} canEdit={canEdit} onCorrect={onCorrect} />
        ))}
      </div>
      <section className="space-y-2" aria-labelledby="auditoria-sem-alocacao">
        <h2 id="auditoria-sem-alocacao" className="text-base font-semibold text-foreground">
          Horas sem alocação
        </h2>
        <UnplannedList items={audit.unplanned} />
      </section>
      <section className="space-y-2" aria-labelledby="auditoria-correcoes">
        <h2 id="auditoria-correcoes" className="text-base font-semibold text-foreground">
          Correções do mês
        </h2>
        <CorrectionsList corrections={audit.corrections} />
      </section>
    </div>
  );
}
