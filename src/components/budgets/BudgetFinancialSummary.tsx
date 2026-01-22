import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BudgetCalculation } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';

interface BudgetFinancialSummaryProps {
  calculation: BudgetCalculation;
  adminExpensesPercent: number;
  taxesPercent: number;
  commissionPercent: number;
  maxCommissionPercent: number;
  discountPercent: number;
  onCommissionChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
}

export function BudgetFinancialSummary({
  calculation,
  adminExpensesPercent,
  taxesPercent,
  commissionPercent,
  maxCommissionPercent,
  discountPercent,
  onCommissionChange,
  onDiscountChange,
}: BudgetFinancialSummaryProps) {
  const commissionPercentage = maxCommissionPercent > 0 
    ? (commissionPercent / maxCommissionPercent) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal (Horas × Valores)</span>
          <span className="text-xl font-bold">{formatCurrency(calculation.subtotal)}</span>
        </div>

        <Separator />

        {/* Fixed percentages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Despesas Adm.</span>
              <span className="text-xs text-muted-foreground">({adminExpensesPercent}%)</span>
            </div>
            <span>{formatCurrency(calculation.adminExpenses)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Impostos</span>
              <span className="text-xs text-muted-foreground">({taxesPercent}%)</span>
            </div>
            <span>{formatCurrency(calculation.taxes)}</span>
          </div>
        </div>

        <Separator />

        {/* Commission - editable */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="commission">Comissão</Label>
            <div className="flex items-center gap-2">
              <Input
                id="commission"
                type="number"
                min={0}
                max={maxCommissionPercent}
                step={0.1}
                className="h-8 w-20 text-right"
                value={commissionPercent}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  onCommissionChange(Math.min(value, maxCommissionPercent));
                }}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={commissionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              Máximo: {maxCommissionPercent}%
            </p>
          </div>
          <div className="flex justify-end">
            <span>{formatCurrency(calculation.commission)}</span>
          </div>
        </div>

        <Separator />

        {/* Total with fees */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Total com Acréscimos</span>
          <span className="text-lg font-semibold">{formatCurrency(calculation.totalWithFees)}</span>
        </div>

        <Separator />

        {/* Discount - editable */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="discount">Desconto</Label>
            <div className="flex items-center gap-2">
              <Input
                id="discount"
                type="number"
                min={0}
                max={100}
                step={0.1}
                className="h-8 w-20 text-right"
                value={discountPercent}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  onDiscountChange(Math.min(value, 100));
                }}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div className="flex justify-end text-destructive">
            <span>-{formatCurrency(calculation.discount)}</span>
          </div>
        </div>

        <Separator />

        {/* Final total */}
        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
          <span className="text-lg font-bold">Valor Final</span>
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(calculation.finalTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
