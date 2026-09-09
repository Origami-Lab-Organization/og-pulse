/**
 * Ilustrações do produto para a landing. São composições em HTML/CSS com
 * dados inventados e assim rotulados ("dados ilustrativos"): não são
 * capturas de tela nem números de cliente. Só tokens do tema.
 */

import type { CSSProperties } from 'react';
import { CheckCircle2, TrendingUp } from 'lucide-react';
import { MockTone } from '@/types/landing';
import type { FloatingBadgeProps, MockFrameProps } from '@/types/landing';

const bar = (width: string): CSSProperties => ({ ['--lp-w' as string]: width });

const TONE_BAR: Record<MockTone, string> = {
  [MockTone.SUCCESS]: 'bg-success',
  [MockTone.WARNING]: 'bg-warning',
  [MockTone.PRIMARY]: 'bg-primary',
};

const TONE_TEXT: Record<MockTone, string> = {
  [MockTone.SUCCESS]: 'text-success',
  [MockTone.WARNING]: 'text-warning',
  [MockTone.PRIMARY]: 'text-primary',
};

function MockFrame(props: MockFrameProps) {
  const { title, children, className = '' } = props;
  return (
    <div
      role="img"
      aria-label={`Ilustração do produto: ${title}. Dados ilustrativos.`}
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-2xl shadow-foreground/10 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">dados ilustrativos</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const PORTFOLIO = [
  { name: 'Plataforma B2B', client: 'Cliente A', realized: 38, tone: MockTone.SUCCESS },
  { name: 'Diagnóstico comercial', client: 'Cliente B', realized: 12, tone: MockTone.WARNING },
  { name: 'Estúdio de produto', client: 'Cliente C', realized: 27, tone: MockTone.SUCCESS },
  { name: 'Discovery', client: 'Cliente D', realized: 31, tone: MockTone.SUCCESS },
] as const;

export function DashboardMock() {
  return (
    <MockFrame title="Portfólio · margem realizada">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[11px] text-muted-foreground">Margem realizada</p>
          <p className="mt-1 text-2xl font-semibold text-success">31%</p>
          <p className="text-[11px] text-muted-foreground">planejada 29%</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[11px] text-muted-foreground">Horas apontadas</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">1.240</p>
          <p className="text-[11px] text-muted-foreground">de 1.310 planejadas</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[11px] text-muted-foreground">Em atenção</p>
          <p className="mt-1 text-2xl font-semibold text-warning">1</p>
          <p className="text-[11px] text-muted-foreground">projeto abaixo do plano</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2.5">
        {PORTFOLIO.map((p) => (
          <li key={p.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="text-muted-foreground">{p.client}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`lp-bar h-full rounded-full ${TONE_BAR[p.tone]}`} style={bar(`${p.realized * 2}%`)} />
              </div>
            </div>
            <span className={`w-10 text-right font-semibold ${p.tone === MockTone.WARNING ? TONE_TEXT[p.tone] : 'text-foreground'}`}>
              {p.realized}%
            </span>
          </li>
        ))}
      </ul>
    </MockFrame>
  );
}

const STAGES = [
  { name: 'Prospecção', cards: ['Reposicionamento de marca', 'Portal do cliente'], closing: false },
  { name: 'Qualificação', cards: ['Discovery de produto'], closing: false },
  { name: 'Proposta enviada', cards: ['Plataforma de dados', 'Sprint de UX'], closing: false },
  { name: 'Negociação', cards: ['Redesenho do app'], closing: true },
] as const;

export function PipelineMock() {
  return (
    <MockFrame title="Pipeline · Oportunidades">
      <div className="grid grid-cols-4 gap-2">
        {STAGES.map((stage) => (
          <div key={stage.name} className="rounded-lg bg-muted/60 p-2">
            <p className="mb-2 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{stage.name}</p>
            <div className="space-y-2">
              {stage.cards.map((card) => (
                <div key={card} className="rounded-md border border-border bg-card p-2 text-[11px] leading-snug text-foreground shadow-sm">
                  {card}
                  <div className="mt-1.5 flex items-center gap-1" aria-hidden="true">
                    <span className="h-1.5 w-8 rounded-full bg-primary/60" />
                    <span className="h-1.5 w-4 rounded-full bg-muted-foreground/30" />
                  </div>
                </div>
              ))}
              {stage.closing && (
                <div className="flex items-center gap-1 rounded-md border border-dashed border-success/50 p-2 text-[11px] text-success">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Orçamento vinculado
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

const PEOPLE = [
  { name: 'Ana', load: [90, 100, 80, 60] },
  { name: 'Bruno', load: [110, 100, 95, 100] },
  { name: 'Carla', load: [40, 60, 100, 100] },
  { name: 'Diego', load: [100, 100, 70, 30] },
] as const;
const MONTHS = ['set', 'out', 'nov', 'dez'] as const;

function loadTone(value: number): string {
  if (value > 100) return 'bg-warning/80 text-warning-foreground';
  if (value >= 80) return 'bg-success/80 text-success-foreground';
  return 'bg-primary/15 text-foreground';
}

export function AllocationMock() {
  return (
    <MockFrame title="Alocação · planejado × apontado">
      <div className="grid grid-cols-[72px_repeat(4,1fr)] gap-1.5 text-[11px]">
        <span />
        {MONTHS.map((m) => (
          <span key={m} className="text-center font-medium uppercase tracking-wide text-muted-foreground">
            {m}
          </span>
        ))}
        {PEOPLE.map((person) => (
          <div key={person.name} className="contents">
            <span className="self-center font-medium text-foreground">{person.name}</span>
            {person.load.map((value, i) => (
              <span key={`${person.name}-${MONTHS[i]}`} className={`rounded-md py-2 text-center font-semibold ${loadTone(value)}`}>
                {value}%
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-[11px]">
        <span className="text-muted-foreground">Semana 37 · grade pré-preenchida pelo plano</span>
        <span className="flex items-center gap-1 font-medium text-success">
          <span className="lp-pulse h-2 w-2 rounded-full bg-success" aria-hidden="true" /> Semana fechada
        </span>
      </div>
    </MockFrame>
  );
}

const MARGIN = [
  { month: 'abr', planned: 30, realized: 24 },
  { month: 'mai', planned: 30, realized: 27 },
  { month: 'jun', planned: 30, realized: 29 },
  { month: 'jul', planned: 31, realized: 33 },
  { month: 'ago', planned: 31, realized: 30 },
  { month: 'set', planned: 31, realized: 34 },
] as const;

export function MarginMock() {
  return (
    <MockFrame title="Projeto · planejado × realizado">
      <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
        {MARGIN.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center gap-1" style={{ height: 112 }} aria-hidden="true">
              <div className="w-3 rounded-t bg-muted-foreground/30" style={{ height: `${m.planned * 3}px` }} />
              <div className={`w-3 rounded-t ${m.realized >= m.planned ? 'bg-success' : 'bg-primary/70'}`} style={{ height: `${m.realized * 3}px` }} />
            </div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.month}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-muted-foreground/30" aria-hidden="true" /> planejado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-success" aria-hidden="true" /> realizado
          </span>
        </span>
        <span className="flex items-center gap-1 font-medium text-success">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> +3 p.p. sobre o plano
        </span>
      </div>
    </MockFrame>
  );
}

/** Pequeno cartão flutuante do hero. */
export function FloatingBadge(props: FloatingBadgeProps) {
  const { label, value, tone = MockTone.SUCCESS } = props;
  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-xl shadow-foreground/10 backdrop-blur" aria-hidden="true">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${TONE_TEXT[tone]}`}>{value}</p>
    </div>
  );
}
