import { useMemo } from 'react';
import {
  addDays,
  addMonths,
  differenceInDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ProjectReleaseWithSprints,
  RELEASE_STATUS_LABELS,
  RELEASE_STATUS_CLASSES,
} from '@/types/projectRelease';
import { ActivitySprintDB, ProjectActivityCardWithRelations } from '@/types/projectActivity';

// ── Layout constants ──────────────────────────────────────────────────────────
const PX_PER_DAY     = 8;
const MONTH_HDR_H    = 32;
const SPRINT_LANE_H  = 24;
const RELEASE_CARD_H = 86;
const ROW_GAP        = 12;
const SIDE_PAD       = 16;

// ── Props ─────────────────────────────────────────────────────────────────────
interface RoadmapViewProps {
  releases: ProjectReleaseWithSprints[];
  sprints: ActivitySprintDB[];
  cards: ProjectActivityCardWithRelations[];
  canManage: boolean;
  onReleaseClick: (release: ProjectReleaseWithSprints) => void;
  onNewRelease: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RoadmapView({
  releases,
  sprints,
  cards,
  canManage,
  onReleaseClick,
  onNewRelease,
}: RoadmapViewProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const sprintById = useMemo(
    () => Object.fromEntries(sprints.map((s) => [s.id, s])),
    [sprints],
  );

  const cardsByRelease = useMemo(() => {
    const map: Record<string, ProjectActivityCardWithRelations[]> = {};
    for (const card of cards) {
      if (card.release_id) {
        (map[card.release_id] ??= []).push(card);
      }
    }
    return map;
  }, [cards]);

  const sorted = useMemo(
    () => [...releases].sort((a, b) => a.target_date.localeCompare(b.target_date)),
    [releases],
  );

  // ── Empty state ────────────────────────────────────────────────────────────
  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 gap-3 text-muted-foreground">
        <p className="text-sm">Nenhuma release cadastrada.</p>
        {canManage && (
          <Button size="sm" onClick={onNewRelease}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Release
          </Button>
        )}
      </div>
    );
  }

  // ── Date range ─────────────────────────────────────────────────────────────
  const allDates: Date[] = [
    ...sorted.map((r) => parseISO(r.target_date)),
    ...sprints.map((s) => parseISO(s.start_date)),
    ...sprints.map((s) => parseISO(s.end_date)),
  ];
  const minMs = Math.min(...allDates.map((d) => d.getTime()));
  const maxMs = Math.max(...allDates.map((d) => d.getTime()));

  const originDate = startOfMonth(addDays(new Date(minMs), -14));
  const endDate    = endOfMonth(addDays(new Date(maxMs), 21));
  const totalDays  = differenceInDays(endDate, originDate) + 1;
  const totalWidth = Math.max(totalDays * PX_PER_DAY + SIDE_PAD * 2, 900);

  const toX = (date: Date) =>
    SIDE_PAD + differenceInDays(date, originDate) * PX_PER_DAY;

  const todayX   = toX(today);
  const showToday = today >= originDate && today <= endDate;

  // ── Month markers ──────────────────────────────────────────────────────────
  const months: Date[] = [];
  let cur = startOfMonth(originDate);
  while (cur <= endDate) {
    months.push(cur);
    cur = addMonths(cur, 1);
  }

  // ── Per-release layout ─────────────────────────────────────────────────────
  const rows = sorted.map((release) => {
    const assocSprints = release.release_sprints
      .map((rs) => sprintById[rs.sprint_id])
      .filter(Boolean) as ActivitySprintDB[];

    const targetX = toX(parseISO(release.target_date));

    const blockStartDate =
      assocSprints.length > 0
        ? new Date(Math.min(...assocSprints.map((s) => parseISO(s.start_date).getTime())))
        : addDays(parseISO(release.target_date), -28);

    const blockStartX = Math.max(SIDE_PAD, toX(blockStartDate));
    const blockW      = Math.max(targetX - blockStartX, 180);
    const cardLeft    = Math.max(SIDE_PAD, targetX - blockW);

    const releaseCards = cardsByRelease[release.id] ?? [];
    const totalPts = releaseCards.reduce((s, c) => s + (c.points ?? 0), 0);
    const donePts  = releaseCards
      .filter((c) => c.column_name === 'done')
      .reduce((s, c) => s + (c.points ?? 0), 0);
    const pct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

    const hasSprints = assocSprints.length > 0;
    const rowH = (hasSprints ? SPRINT_LANE_H + 6 : 0) + RELEASE_CARD_H;

    return { release, assocSprints, targetX, cardLeft, blockW, totalPts, donePts, pct, hasSprints, rowH };
  });

  const totalH =
    MONTH_HDR_H +
    rows.reduce((sum, r) => sum + r.rowH + ROW_GAP, 0) +
    ROW_GAP;

  return (
    <div className="flex flex-col gap-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onNewRelease} className="h-8 text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nova Release
          </Button>
        </div>
      )}

      {/* ── Scrollable timeline ── */}
      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <div style={{ width: totalWidth, height: totalH, position: 'relative' }}>

          {/* Month header */}
          <div
            style={{ height: MONTH_HDR_H, position: 'relative', borderBottom: '1px solid hsl(var(--border))' }}
            className="bg-background"
          >
            {months.map((m) => (
              <div
                key={m.toISOString()}
                style={{ position: 'absolute', left: toX(m), top: 0, height: MONTH_HDR_H, display: 'flex', alignItems: 'center', paddingLeft: 6 }}
                className="text-xs font-medium text-muted-foreground whitespace-nowrap"
              >
                {format(m, 'MMM yyyy', { locale: ptBR })}
              </div>
            ))}
            {showToday && (
              <div
                style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 1.5 }}
                className="bg-destructive/70"
              />
            )}
          </div>

          {/* Grid lines */}
          {months.map((m) => (
            <div
              key={m.toISOString()}
              style={{ position: 'absolute', left: toX(m), top: MONTH_HDR_H, bottom: 0, width: 1 }}
              className="bg-border/30"
            />
          ))}

          {/* Today vertical line */}
          {showToday && (
            <div
              style={{ position: 'absolute', left: todayX, top: MONTH_HDR_H, bottom: 0, width: 1.5 }}
              className="bg-destructive/30"
            />
          )}

          {/* Release rows */}
          {rows.map(({ release, assocSprints, targetX, cardLeft, blockW, totalPts, donePts, pct, hasSprints, rowH }, i) => {
            const top = MONTH_HDR_H + rows.slice(0, i).reduce((s, r) => s + r.rowH + ROW_GAP, ROW_GAP);
            const stemTop = hasSprints ? SPRINT_LANE_H + 6 : 0;

            return (
              <div
                key={release.id}
                style={{ position: 'absolute', top, left: 0, right: 0, height: rowH }}
              >
                {/* Sprint sub-lanes */}
                {assocSprints.map((sprint) => {
                  const sx = toX(parseISO(sprint.start_date));
                  const sw = Math.max(
                    differenceInDays(parseISO(sprint.end_date), parseISO(sprint.start_date)) * PX_PER_DAY,
                    48,
                  );
                  return (
                    <div
                      key={sprint.id}
                      style={{ position: 'absolute', left: sx, top: 2, width: sw, height: SPRINT_LANE_H - 4 }}
                      className="rounded-sm bg-primary/10 border border-primary/20 flex items-center px-2"
                      title={sprint.name}
                    >
                      <span className="text-[10px] font-medium text-primary truncate leading-none">
                        {sprint.name}
                      </span>
                    </div>
                  );
                })}

                {/* Target date vertical stem */}
                <div
                  style={{ position: 'absolute', left: targetX - 1, top: stemTop, height: RELEASE_CARD_H, width: 2 }}
                  className="bg-primary"
                />

                {/* Diamond milestone marker */}
                <div
                  style={{
                    position: 'absolute',
                    left: targetX - 5,
                    top: stemTop - 5,
                    width: 10,
                    height: 10,
                    transform: 'rotate(45deg)',
                    zIndex: 3,
                  }}
                  className="bg-primary border-2 border-background"
                />

                {/* Release card */}
                <div
                  onClick={() => onReleaseClick(release)}
                  style={{
                    position: 'absolute',
                    left: cardLeft,
                    top: stemTop,
                    width: blockW,
                    height: RELEASE_CARD_H,
                    zIndex: 1,
                    cursor: 'pointer',
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/40 transition-colors flex flex-col gap-1.5"
                >
                  {/* Name + version */}
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-semibold leading-snug line-clamp-1 flex-1">
                      {release.name}
                    </span>
                    {release.version && (
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-1">
                        {release.version}
                      </span>
                    )}
                  </div>

                  {/* Status + date */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px] h-4 px-1.5 border-0 shrink-0', RELEASE_STATUS_CLASSES[release.status])}
                    >
                      {RELEASE_STATUS_LABELS[release.status]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(release.target_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>

                  {/* Progress */}
                  {totalPts > 0 ? (
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                        <span>{donePts}/{totalPts}pts</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Sem cards associados</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
