import type {
  StrategyCycle,
  StrategyObjectiveWithKrs,
  StrategyInitiative,
  StrategyKeyResult,
  StrategyCheckin,
} from '@/types/strategy';
import { getKrProgress, getKrStatus } from '@/types/strategy';
import type { StrategyAlert } from '@/lib/strategyAlerts';
import { truncateToCents } from '@/lib/formatters';

interface ExportStrategyParams {
  cycle: StrategyCycle;
  objectives: StrategyObjectiveWithKrs[];
  initiatives: StrategyInitiative[];
  alerts: StrategyAlert[];
}

const statusEmoji: Record<string, string> = {
  green: '🟢',
  amber: '🟡',
  red: '🔴',
};

const severityLabel: Record<string, string> = {
  danger: '🔴 Crítico',
  warning: '🟡 Atenção',
  info: '🔵 Info',
  success: '🟢 Sucesso',
};

const initiativeStatusLabel: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  review: 'Revisão',
  done: 'Concluído',
};

const initiativePriorityLabel: Record<string, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const initiativeEffortLabel: Record<number, string> = {
  1: 'Baixo',
  2: 'Médio',
  3: 'Alto',
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCheckinDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatKrValue(value: number, unit: string | null): string {
  if (unit === 'R$') {
    return truncateToCents(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  if (unit === '%') {
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }
  const formatted = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function buildCheckinTable(checkins: StrategyCheckin[], unit: string | null): string {
  if (checkins.length === 0) return '_Nenhum check-in registrado._\n';

  const sorted = [...checkins].sort(
    (a, b) => new Date(a.checkinDate).getTime() - new Date(b.checkinDate).getTime(),
  );

  const rows = sorted.map((c, i) => {
    const prev = sorted[i - 1];
    const delta = prev != null ? c.currentValue - prev.currentValue : null;
    const deltaStr =
      delta != null
        ? `${delta >= 0 ? '+' : ''}${formatKrValue(delta, unit)}`
        : '—';
    const notes = c.notes?.replace(/\|/g, '\\|').replace(/\n/g, ' ') ?? '—';
    return `| ${formatCheckinDate(c.checkinDate)} | ${formatKrValue(c.currentValue, unit)} | ${deltaStr} | ${c.confidence}/10 | ${notes} |`;
  });

  return [
    '| Data | Valor | Variação | Confiança | Notas |',
    '|------|-------|----------|-----------|-------|',
    ...rows,
  ].join('\n') + '\n';
}

function buildKrSection(kr: StrategyKeyResult, index: number, objIndex: number): string {
  const status = getKrStatus(kr.confidence);
  const progress = getKrProgress(kr.currentValue, kr.targetValue, kr.direction, kr.initialValue);
  const lines: string[] = [];

  lines.push(`#### KR ${objIndex}.${index} — ${kr.title}`);
  if (kr.description) lines.push(`\n> ${kr.description}`);
  lines.push('');
  lines.push(
    `- **Meta:** ${formatKrValue(kr.initialValue, kr.unit)} → ${formatKrValue(kr.targetValue, kr.unit)} _(${kr.direction === 'higher_is_better' ? 'quanto maior melhor' : 'quanto menor melhor'})_`,
  );
  lines.push(`- **Atual:** ${formatKrValue(kr.currentValue, kr.unit)} (${progress}%)`);
  lines.push(`- **Confiança:** ${kr.confidence}/10 ${statusEmoji[status]}`);
  lines.push('');
  lines.push('##### Histórico de Check-ins');
  lines.push('');
  lines.push(buildCheckinTable(kr.checkins, kr.unit));

  return lines.join('\n');
}

function buildObjectiveSection(obj: StrategyObjectiveWithKrs, index: number): string {
  const status = getKrStatus(obj.avgConfidence);
  const lines: string[] = [];

  lines.push(`### ${index}. ${obj.title} ${statusEmoji[status]}`);
  lines.push('');
  if (obj.description) {
    lines.push(`> ${obj.description}`);
    lines.push('');
  }
  lines.push(
    `**Responsável:** ${obj.ownerName ?? '—'} | **Progresso médio:** ${Math.round(obj.avgProgress)}% | **Confiança:** ${obj.avgConfidence.toFixed(1)}/10`,
  );
  lines.push('');

  if (obj.keyResults.length === 0) {
    lines.push('_Nenhum Key Result cadastrado._');
  } else {
    obj.keyResults.forEach((kr, i) => {
      lines.push(buildKrSection(kr, i + 1, index));
    });
  }

  return lines.join('\n');
}

function buildMetricsSummary(
  objectives: StrategyObjectiveWithKrs[],
  initiatives: StrategyInitiative[],
): string {
  const allKrs = objectives.flatMap((o) => o.keyResults);
  const cycleHealth =
    objectives.length > 0
      ? Math.round((objectives.reduce((sum, o) => sum + o.avgConfidence, 0) / objectives.length) * 10)
      : 0;

  const greenKrs = allKrs.filter((kr) => getKrStatus(kr.confidence) === 'green').length;
  const amberKrs = allKrs.filter((kr) => getKrStatus(kr.confidence) === 'amber').length;
  const redKrs = allKrs.filter((kr) => getKrStatus(kr.confidence) === 'red').length;
  const onTrackObjs = objectives.filter((o) => getKrStatus(o.avgConfidence) === 'green').length;
  const inProgressInit = initiatives.filter((i) => i.status === 'in_progress').length;

  return [
    '| Métrica | Valor |',
    '|---------|-------|',
    `| 🏥 Saúde do ciclo | ${cycleHealth}% |`,
    `| 🎯 Objetivos | ${objectives.length} total, ${onTrackObjs} no prazo |`,
    `| 📊 Key Results | ${allKrs.length} total — 🟢 ${greenKrs} / 🟡 ${amberKrs} / 🔴 ${redKrs} |`,
    `| 🚀 Iniciativas | ${initiatives.length} total, ${inProgressInit} em andamento |`,
  ].join('\n');
}

function buildInitiativesSection(
  initiatives: StrategyInitiative[],
  objectives: StrategyObjectiveWithKrs[],
): string {
  if (initiatives.length === 0) return '_Nenhuma iniciativa cadastrada neste ciclo._\n';

  const objMap = Object.fromEntries(objectives.map((o) => [o.id, o.title]));

  const rows = initiatives.map((init, i) => {
    const title = init.title.replace(/\|/g, '\\|');
    const status = initiativeStatusLabel[init.status] ?? init.status;
    const priority = init.priority ? initiativePriorityLabel[init.priority] : '—';
    const effort = init.effort ? initiativeEffortLabel[init.effort] : '—';
    const owner = init.ownerName ?? '—';
    const due = init.dueDate ? formatDate(init.dueDate) : '—';
    const objective = (objMap[init.objectiveId] ?? '—').replace(/\|/g, '\\|');
    return `| ${i + 1} | ${title} | ${objective} | ${status} | ${priority} | ${effort} | ${owner} | ${due} |`;
  });

  return [
    '| # | Título | Objetivo | Status | Prioridade | Esforço | Responsável | Prazo |',
    '|---|--------|----------|--------|------------|---------|-------------|-------|',
    ...rows,
  ].join('\n') + '\n';
}

function buildAlertsSection(alerts: StrategyAlert[]): string {
  if (alerts.length === 0) return '_Nenhum alerta ativo._\n';
  return alerts
    .map((a) => `- ${severityLabel[a.severity] ?? a.severity}: ${a.message}`)
    .join('\n') + '\n';
}

export function exportStrategyToMarkdown({
  cycle,
  objectives,
  initiatives,
  alerts,
}: ExportStrategyParams): void {
  const now = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [];

  // Header
  lines.push(`# Relatório Estratégico — ${cycle.title}`);
  lines.push('');
  lines.push(
    `**Período:** ${formatDate(cycle.startDate)} → ${formatDate(cycle.endDate)} | **Status:** ${cycle.isActive ? 'Ativo' : 'Encerrado'}`,
  );
  lines.push(`**Exportado em:** ${now}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Resumo
  lines.push('## Resumo do Ciclo');
  lines.push('');
  lines.push(buildMetricsSummary(objectives, initiatives));
  lines.push('');
  lines.push('---');
  lines.push('');

  // Alertas
  lines.push('## Alertas');
  lines.push('');
  lines.push(buildAlertsSection(alerts));
  lines.push('---');
  lines.push('');

  // Objetivos e KRs
  lines.push('## Objetivos e Key Results');
  lines.push('');
  if (objectives.length === 0) {
    lines.push('_Nenhum objetivo cadastrado neste ciclo._');
  } else {
    objectives.forEach((obj, i) => {
      lines.push(buildObjectiveSection(obj, i + 1));
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  }

  // Iniciativas
  lines.push('## Iniciativas');
  lines.push('');
  lines.push(buildInitiativesSection(initiatives, objectives));

  const content = lines.join('\n');
  const slug = cycle.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `estrategia-${slug}-${dateStr}.md`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
