import { differenceInYears, isValid, parseISO } from 'date-fns';
import {
  VACATION_DAYS_PER_YEAR,
  VacationBalance,
  VacationRequestStatus,
} from '@/types/vacation';

function toDate(value: string | Date): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/**
 * Anos completos (base aniversário) entre a admissão e a data de referência.
 * Espelha `EXTRACT(YEAR FROM age(...))` do trigger enforce_vacation_balance (ver ADR-0003).
 */
export function completedYearsSince(
  admissionDate: string | Date,
  referenceDate: string | Date = new Date(),
): number {
  const admission = toDate(admissionDate);
  const reference = toDate(referenceDate);
  if (!admission || !reference) return 0;
  const years = differenceInYears(reference, admission);
  return years > 0 ? years : 0;
}

interface BalanceInput {
  admissionDate: string | Date;
  /** Dias já em pedidos aprovados. */
  approvedDays: number;
  /** Dias em pedidos pendentes (reservam saldo). */
  pendingDays: number;
  referenceDate?: string | Date;
}

/**
 * Saldo de férias acumulado (lump por aniversário, ver ADR-0003):
 *   earned = anosCompletos * 30
 *   available = earned - approved - pending  (nunca negativo)
 */
export function computeVacationBalance({
  admissionDate,
  approvedDays,
  pendingDays,
  referenceDate = new Date(),
}: BalanceInput): VacationBalance {
  const completedYears = completedYearsSince(admissionDate, referenceDate);
  const earnedDays = completedYears * VACATION_DAYS_PER_YEAR;
  const usedDays = Math.max(0, approvedDays);
  const reserved = Math.max(0, pendingDays);
  const availableDays = Math.max(0, earnedDays - usedDays - reserved);

  return {
    completedYears,
    earnedDays,
    usedDays,
    pendingDays: reserved,
    availableDays,
  };
}

interface DaysCarrier {
  status: VacationRequestStatus;
  days_requested: number;
}

/** Conveniência: deriva o saldo a partir da lista de pedidos do funcionário. */
export function computeBalanceFromRequests(
  admissionDate: string | Date,
  requests: readonly DaysCarrier[],
  referenceDate: string | Date = new Date(),
): VacationBalance {
  const sumByStatus = (status: VacationRequestStatus): number =>
    requests
      .filter((r) => r.status === status)
      .reduce((total, r) => total + (Number(r.days_requested) || 0), 0);

  return computeVacationBalance({
    admissionDate,
    approvedDays: sumByStatus('approved'),
    pendingDays: sumByStatus('pending'),
    referenceDate,
  });
}
