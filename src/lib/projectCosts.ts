import { z } from 'zod';
import { Truck, Repeat, Wrench, Package, Plane, Receipt, MoreHorizontal, type LucideIcon } from 'lucide-react';
import type { ProjectCostCategory, CostCurrency } from '@/types/project';

// ── Categorias (ordem e labels conforme J9-01) ───────────────────────────
export interface CostCategoryMeta {
  value: ProjectCostCategory;
  label: string;
  icon: LucideIcon;
  emptyHint: string;
}

export const COST_CATEGORIES: CostCategoryMeta[] = [
  { value: 'supplier', label: 'Fornecedor', icon: Truck, emptyHint: 'Nenhum custo de fornecedor cadastrado.' },
  { value: 'subscription', label: 'Assinatura', icon: Repeat, emptyHint: 'Nenhuma assinatura cadastrada.' },
  { value: 'equipment_rental', label: 'Aluguel de Equipamento', icon: Wrench, emptyHint: 'Nenhum aluguel de equipamento cadastrado.' },
  { value: 'material', label: 'Material/Equipamento', icon: Package, emptyHint: 'Nenhum material/equipamento cadastrado.' },
  { value: 'travel', label: 'Viagem', icon: Plane, emptyHint: 'Nenhum custo de viagem cadastrado.' },
  { value: 'reimbursement', label: 'Reembolso', icon: Receipt, emptyHint: 'Nenhum reembolso cadastrado.' },
  { value: 'other', label: 'Outros', icon: MoreHorizontal, emptyHint: 'Nenhum custo cadastrado nesta categoria.' },
];

export const COST_CATEGORY_LABEL: Record<ProjectCostCategory, string> = COST_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<ProjectCostCategory, string>,
);

// ── Moedas ───────────────────────────────────────────────────────────────
export const COST_CURRENCIES: { value: CostCurrency; label: string }[] = [
  { value: 'BRL', label: 'Real (BRL)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'Libra (GBP)' },
];

export const isForeignCurrency = (currency: CostCurrency): boolean => currency !== 'BRL';

/** Converte um valor na moeda original para BRL. Para BRL a taxa é 1. */
export const toBRL = (amount: number, exchangeRate: number): number =>
  Math.round(amount * exchangeRate * 100) / 100;

// ── Regra de mês aberto/fechado (decisão: regra por data) ─────────────────
/** 'YYYY-MM' do mês corrente, em horário local. */
const currentYearMonth = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

/** Um custo está em mês fechado quando seu mês é anterior ao mês corrente. */
export const isCostMonthClosed = (costDate: string, now: Date = new Date()): boolean => {
  const ym = (costDate || '').slice(0, 7);
  return ym !== '' && ym < currentYearMonth(now);
};

/** GP só edita mês aberto; Admin edita qualquer mês. */
export const canEditCost = (costDate: string, isAdmin: boolean, now: Date = new Date()): boolean =>
  isAdmin || !isCostMonthClosed(costDate, now);

export const CLOSED_MONTH_MESSAGE =
  'Custo em mês fechado. Apenas administradores podem editar.';

// ── Validação do formulário (zod) ─────────────────────────────────────────
export const projectCostFormSchema = z
  .object({
    category: z.enum(['supplier', 'subscription', 'equipment_rental', 'material', 'travel', 'reimbursement', 'other']),
    description: z.string().trim().min(1, 'Descrição é obrigatória'),
    plannedAmount: z.number({ invalid_type_error: 'Valor planejado é obrigatório' }).positive('Valor planejado é obrigatório'),
    actualAmount: z.number().nonnegative('Valor realizado inválido').nullable().optional(),
    costDate: z.string().min(1, 'Data é obrigatória'),
    currency: z.enum(['BRL', 'USD', 'EUR', 'GBP']),
    exchangeRate: z.number().positive().optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (isForeignCurrency(data.currency) && (!data.exchangeRate || data.exchangeRate <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['exchangeRate'],
        message: 'Taxa de câmbio é obrigatória para moeda estrangeira',
      });
    }
  });

export type ProjectCostFormValues = z.infer<typeof projectCostFormSchema>;
