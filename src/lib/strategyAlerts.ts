import { StrategyObjectiveWithKrs, StrategyCycle } from '@/types/strategy';
import { getKrProgress } from '@/types/strategy';

export type AlertSeverity = 'danger' | 'warning' | 'info' | 'success';

export interface StrategyAlert {
  id: string;
  severity: AlertSeverity;
  message: string;
}

export function computeAlerts(
  objectives: StrategyObjectiveWithKrs[],
  activeCycle: StrategyCycle | null,
  now = Date.now(),
): StrategyAlert[] {
  const alerts: StrategyAlert[] = [];
  const msIn28Days = 28 * 24 * 60 * 60 * 1000;

  // Cycle ending soon (INFO)
  if (activeCycle) {
    const endMs = new Date(activeCycle.endDate + 'T00:00:00').getTime();
    const daysLeft = Math.ceil((endMs - now) / (24 * 60 * 60 * 1000));
    if (daysLeft > 0 && daysLeft < 45) {
      alerts.push({
        id: 'cycle-ending',
        severity: 'info',
        message: `O ciclo "${activeCycle.title}" encerra em ${daysLeft} dias.`,
      });
    }
  }

  for (const obj of objectives) {
    for (const kr of obj.keyResults) {
      const progress = getKrProgress(kr.currentValue, kr.targetValue);

      // SUCCESS: progress >= 100% or confidence = 10
      if (progress >= 100 || kr.confidence === 10) {
        alerts.push({
          id: `kr-success-${kr.id}`,
          severity: 'success',
          message: `KR "${kr.title}" atingiu a meta!`,
        });
        continue;
      }

      // DANGER: confidence declining in last 2 consecutive check-ins
      if (kr.checkins.length >= 2) {
        const [latest, prev] = kr.checkins; // ordered desc
        if (latest.confidence < prev.confidence) {
          alerts.push({
            id: `kr-declining-${kr.id}`,
            severity: 'danger',
            message: `KR "${kr.title}" teve confiança decrescente nos últimos 2 check-ins.`,
          });
        }
      }

      // WARNING: no check-in in last 28 days
      if (kr.checkins.length === 0) {
        alerts.push({
          id: `kr-no-checkin-${kr.id}`,
          severity: 'warning',
          message: `KR "${kr.title}" nunca recebeu um check-in.`,
        });
      } else {
        const lastCheckinMs = new Date(kr.checkins[0].createdAt).getTime();
        if (now - lastCheckinMs > msIn28Days) {
          alerts.push({
            id: `kr-stale-${kr.id}`,
            severity: 'warning',
            message: `KR "${kr.title}" não recebe check-in há mais de 28 dias.`,
          });
        }
      }
    }
  }

  // Sort: danger → warning → info → success
  const order: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2, success: 3 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
