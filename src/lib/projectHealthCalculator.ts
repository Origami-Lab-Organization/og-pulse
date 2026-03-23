import type { KeyResultConfidenceLevel } from '@/types/projectOkr';

export type HealthStatus = 'green' | 'amber' | 'red';

export interface HealthDimension {
  score: number;
  status: HealthStatus;
}

export interface ProjectHealthScore {
  projectId: string;
  financial: HealthDimension;
  utilization: HealthDimension;
  satisfaction: HealthDimension;
  okr: HealthDimension;
  overall: { score: number; status: HealthStatus; label: string };
}

function scoreToStatus(score: number): HealthStatus {
  if (score >= 70) return 'green';
  if (score >= 40) return 'amber';
  return 'red';
}

export function calculateProjectHealth(params: {
  projectId: string;
  margin: number;
  marginTarget: number | null;
  overdueInstallments: number;
  avgUtilization: number;
  promoterPercent: number;
  highInfluenceDetractors: number;
  hasStakeholders: boolean;
  okrProgress: number;
  okrConfidence: KeyResultConfidenceLevel | null;
  hasOkrs: boolean;
  isNonRevenue: boolean;
}): ProjectHealthScore {
  const {
    projectId, margin, marginTarget, overdueInstallments,
    avgUtilization, promoterPercent, highInfluenceDetractors,
    hasStakeholders, okrProgress, okrConfidence, hasOkrs, isNonRevenue,
  } = params;

  // ── Financeiro ──────────────────────────────────────────────────────────────
  let financialScore: number;
  if (isNonRevenue) {
    financialScore = 50; // neutro, peso redistribuído
  } else {
    const target = marginTarget ?? 30;
    const ratio = target > 0 ? margin / target : (margin >= 0 ? 1 : 0);
    if (overdueInstallments >= 2 || ratio < 0.5) {
      financialScore = 0;
    } else if (overdueInstallments === 1 || ratio < 1) {
      financialScore = 50;
    } else {
      financialScore = 100;
    }
  }

  // ── Utilização ──────────────────────────────────────────────────────────────
  let utilizationScore: number;
  if (avgUtilization >= 80 && avgUtilization <= 100) {
    utilizationScore = 100;
  } else if (
    (avgUtilization >= 60 && avgUtilization < 80) ||
    (avgUtilization > 100 && avgUtilization <= 120)
  ) {
    utilizationScore = 50;
  } else {
    utilizationScore = 0;
  }

  // ── Satisfação ──────────────────────────────────────────────────────────────
  let satisfactionScore: number;
  if (!hasStakeholders) {
    satisfactionScore = 50; // neutro
  } else if (promoterPercent < 40 || highInfluenceDetractors >= 2) {
    satisfactionScore = 0;
  } else if (promoterPercent >= 60 && highInfluenceDetractors === 0) {
    satisfactionScore = 100;
  } else {
    satisfactionScore = 50;
  }

  // ── OKR ─────────────────────────────────────────────────────────────────────
  let okrScore: number;
  if (!hasOkrs) {
    okrScore = 50; // neutro
  } else {
    const isHighConf = okrConfidence === 'very_high' || okrConfidence === 'high';
    const isLowConf = okrConfidence === 'low' || okrConfidence === 'very_low';
    if (okrProgress < 30 || isLowConf) {
      okrScore = 0;
    } else if (okrProgress >= 60 && isHighConf) {
      okrScore = 100;
    } else {
      okrScore = 50;
    }
  }

  // ── Pesos (redistribuídos para non_revenue) ──────────────────────────────────
  const fw = isNonRevenue ? 0    : 0.35;
  const uw = isNonRevenue ? 0.40 : 0.25;
  const sw = isNonRevenue ? 0.30 : 0.20;
  const ow = isNonRevenue ? 0.30 : 0.20;

  const rawScore =
    financialScore  * fw +
    utilizationScore * uw +
    satisfactionScore * sw +
    okrScore        * ow;

  // Override: qualquer dimensão = 0 → teto de "Atenção" (score máx 69)
  const hasZero =
    financialScore === 0 || utilizationScore === 0 ||
    satisfactionScore === 0 || okrScore === 0;
  const finalScore = hasZero ? Math.min(rawScore, 69) : rawScore;

  const overallStatus = scoreToStatus(finalScore);
  const label =
    overallStatus === 'green' ? 'Saudável' :
    overallStatus === 'amber' ? 'Atenção'  : 'Crítico';

  return {
    projectId,
    financial:    { score: financialScore,    status: scoreToStatus(financialScore) },
    utilization:  { score: utilizationScore,  status: scoreToStatus(utilizationScore) },
    satisfaction: { score: satisfactionScore, status: scoreToStatus(satisfactionScore) },
    okr:          { score: okrScore,          status: scoreToStatus(okrScore) },
    overall:      { score: finalScore, status: overallStatus, label },
  };
}
