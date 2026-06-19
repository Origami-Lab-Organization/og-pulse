import { addMonths } from 'date-fns';
import { ProjectType } from '@/types/project';

export interface CloseBusinessInstallment {
  installmentNumber: number;
  invoiceDate: string;
  dueDate: string;
  value: number;
}

export interface CloseBusinessSummaryInput {
  projectType: ProjectType;
  installments?: readonly CloseBusinessInstallment[];
  totalValue?: number;
  monthlyValue?: number;
  successFeePercent?: number;
}

function toCents(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100);
}

function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

function resolveDueDate(invoiceDate: string, dueDay: number): string {
  if (!invoiceDate) return '';

  const currentDate = new Date(`${invoiceDate}T00:00:00`);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const adjustedDueDay = Math.min(Math.max(dueDay, 1), lastDayOfMonth);

  return toDateInputValue(new Date(year, month, adjustedDueDay));
}

export function distributeInstallmentsEqually(
  totalValue: number,
  installments: readonly CloseBusinessInstallment[]
): CloseBusinessInstallment[] {
  if (installments.length === 0) return [];

  const totalCents = toCents(totalValue);
  const baseCents = Math.floor(totalCents / installments.length);
  const lastCents = totalCents - baseCents * (installments.length - 1);

  return installments.map((installment, index) => ({
    ...installment,
    value: fromCents(index === installments.length - 1 ? lastCents : baseCents),
  }));
}

export function createInstallmentSchedule(input: {
  totalValue: number;
  installmentsCount: number;
  firstInvoiceDate: string;
  dueDay: number;
}): CloseBusinessInstallment[] {
  const count = Math.max(1, Math.trunc(input.installmentsCount || 1));
  const firstInvoiceDate = input.firstInvoiceDate;

  const installments = Array.from({ length: count }, (_, index) => {
    const invoiceDate = firstInvoiceDate
      ? toDateInputValue(addMonths(new Date(`${firstInvoiceDate}T00:00:00`), index))
      : '';

    return {
      installmentNumber: index + 1,
      invoiceDate,
      dueDate: resolveDueDate(invoiceDate, input.dueDay),
      value: 0,
    };
  });

  return distributeInstallmentsEqually(input.totalValue, installments);
}

export function updateInstallmentDates(
  installments: readonly CloseBusinessInstallment[],
  firstInvoiceDate: string,
  dueDay: number
): CloseBusinessInstallment[] {
  return installments.map((installment, index) => {
    const invoiceDate = firstInvoiceDate
      ? toDateInputValue(addMonths(new Date(`${firstInvoiceDate}T00:00:00`), index))
      : installment.invoiceDate;

    return {
      ...installment,
      invoiceDate,
      dueDate: resolveDueDate(invoiceDate, dueDay),
    };
  });
}

export function resizeInstallmentSchedule(input: {
  installments: readonly CloseBusinessInstallment[];
  installmentsCount: number;
  firstInvoiceDate: string;
  dueDay: number;
}): CloseBusinessInstallment[] {
  const count = Math.max(1, Math.trunc(input.installmentsCount || 1));

  return Array.from({ length: count }, (_, index) => {
    const existingInstallment = input.installments[index];
    const invoiceDate = input.firstInvoiceDate
      ? toDateInputValue(addMonths(new Date(`${input.firstInvoiceDate}T00:00:00`), index))
      : existingInstallment?.invoiceDate ?? '';

    return {
      installmentNumber: index + 1,
      invoiceDate,
      dueDate: resolveDueDate(invoiceDate, input.dueDay),
      value: existingInstallment?.value ?? 0,
    };
  });
}

export function calculateCloseBusinessTotal(input: CloseBusinessSummaryInput): number {
  if (input.projectType === 'non_revenue') return 0;

  if (input.projectType === 'success_fee') {
    return fromCents(toCents(input.totalValue ?? 0) * ((input.successFeePercent ?? 0) / 100));
  }

  if (input.projectType === 'continuous') {
    return fromCents(toCents(input.monthlyValue ?? input.totalValue ?? 0));
  }

  if (input.installments?.length) {
    const cents = input.installments.reduce((sum, installment) => sum + toCents(installment.value), 0);
    return fromCents(cents);
  }

  return fromCents(toCents(input.totalValue ?? 0));
}

export function getNextRecurringCharges(input: {
  firstInvoiceDate: string;
  dueDay: number;
  monthlyValue: number;
}): CloseBusinessInstallment[] {
  return createInstallmentSchedule({
    totalValue: input.monthlyValue * 3,
    installmentsCount: 3,
    firstInvoiceDate: input.firstInvoiceDate,
    dueDay: input.dueDay,
  }).map((installment) => ({
    ...installment,
    value: input.monthlyValue,
  }));
}
