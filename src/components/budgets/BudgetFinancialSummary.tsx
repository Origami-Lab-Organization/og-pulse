import { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BudgetCalculation } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';

interface BudgetFinancialSummaryProps {
  layout?: 'sidebar' | 'footer';
  calculation: BudgetCalculation;
  adminExpensesPercent: number;
  taxesPercent: number;
  commissionPercent: number;
  maxCommissionPercent: number;
  netMarginPercent: number;
  minNetMarginPercent: number;
  discountValue: number;
  onCommissionChange: (value: number) => void;
  onNetMarginChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
}

export const BudgetFinancialSummary = forwardRef<HTMLDivElement, BudgetFinancialSummaryProps>(
  function BudgetFinancialSummary(
    {
      layout = 'sidebar',
      calculation,
      adminExpensesPercent,
      taxesPercent,
      commissionPercent,
      maxCommissionPercent,
      netMarginPercent,
      minNetMarginPercent,
      discountValue,
      onCommissionChange,
      onNetMarginChange,
      onDiscountChange,
    },
    ref
  ) {
    // Footer layout (horizontal)
    if (layout === 'footer') {
      return (
        <div ref={ref} className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg py-4 px-6">
          <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center gap-6 lg:gap-8">
            {/* Custos */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Mão de Obra:</span>
                <span className="font-medium">{formatCurrency(calculation.laborCost)}</span>
              </div>
              {calculation.suppliersTotal > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Fornecedores:</span>
                  <span className="font-medium">{formatCurrency(calculation.suppliersTotal)}</span>
                </div>
              )}
              {calculation.materialsTotal > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Materiais:</span>
                  <span className="font-medium">{formatCurrency(calculation.materialsTotal)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                <span className="font-medium">Custo Total:</span>
                <span className="font-semibold">{formatCurrency(calculation.totalCost)}</span>
              </div>
            </div>

            <Separator orientation="vertical" className="h-10 hidden lg:block" />

            {/* Composição */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Desp. Adm. ({adminExpensesPercent}%):</span>
                <span>{formatCurrency(calculation.adminExpenses)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Impostos ({taxesPercent}%):</span>
                <span>{formatCurrency(calculation.taxes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="commission-footer" className="text-muted-foreground text-sm">Comissão:</Label>
                <Input
                  id="commission-footer"
                  type="number"
                  min={0}
                  max={maxCommissionPercent}
                  step={0.1}
                  className="h-7 w-16 text-right text-sm"
                  value={commissionPercent}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    onCommissionChange(Math.min(value, maxCommissionPercent));
                  }}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="margin-footer" className="text-muted-foreground text-sm">Margem:</Label>
                <Input
                  id="margin-footer"
                  type="number"
                  min={minNetMarginPercent}
                  max={100}
                  step={0.1}
                  className="h-7 w-16 text-right text-sm"
                  value={netMarginPercent}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      onNetMarginChange(value);
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value) || minNetMarginPercent;
                    onNetMarginChange(Math.max(minNetMarginPercent, Math.min(value, 100)));
                  }}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>

            <Separator orientation="vertical" className="h-10 hidden lg:block" />

            {/* Preço Final */}
            <div className="flex flex-wrap items-center gap-4 text-sm ml-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Preço Venda:</span>
                <span className="font-medium">{formatCurrency(calculation.sellingPrice)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="discount-footer" className="text-muted-foreground text-sm">Desconto:</Label>
                <span className="text-xs text-muted-foreground">R$</span>
                <Input
                  id="discount-footer"
                  type="number"
                  min={0}
                  step={100}
                  className="h-7 w-24 text-right text-sm"
                  value={discountValue}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      onDiscountChange(value);
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    onDiscountChange(Math.max(0, Math.min(value, calculation.sellingPrice)));
                  }}
                />
              </div>
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
                <span className="font-bold">Valor Final:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(calculation.finalTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Sidebar layout (vertical - original)
    return (
      <div ref={ref}>
        <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cost breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Custos</h4>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mão de Obra</span>
              <span className="font-medium">{formatCurrency(calculation.laborCost)}</span>
            </div>
            {calculation.suppliersTotal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fornecedores</span>
                <span className="font-medium">{formatCurrency(calculation.suppliersTotal)}</span>
              </div>
            )}
            {calculation.materialsTotal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Materiais</span>
                <span className="font-medium">{formatCurrency(calculation.materialsTotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between bg-muted/50 rounded-md p-2 -mx-2">
              <span className="font-medium">Custo Total</span>
              <span className="font-semibold">{formatCurrency(calculation.totalCost)}</span>
            </div>
          </div>

          <Separator />

          {/* Markup components (calculated from selling price) */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Composição do Preço</h4>
            
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

            {/* Commission - editable */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="commission" className="text-muted-foreground">Comissão</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="commission"
                    type="number"
                    min={0}
                    max={maxCommissionPercent}
                    step={0.1}
                    className="h-8 w-20 text-right"
                    value={commissionPercent}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      onCommissionChange(Math.min(value, maxCommissionPercent));
                    }}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Máximo: {maxCommissionPercent}%</span>
                <span>{formatCurrency(calculation.commission)}</span>
              </div>
            </div>

            {/* Net Margin - editable with minimum (validation on blur) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="netMargin" className="text-muted-foreground">Margem Líquida</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="netMargin"
                    type="number"
                    min={minNetMarginPercent}
                    max={100}
                    step={0.1}
                    className="h-8 w-20 text-right"
                    value={netMarginPercent}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        onNetMarginChange(value);
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value) || minNetMarginPercent;
                      onNetMarginChange(Math.max(minNetMarginPercent, Math.min(value, 100)));
                    }}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Mínimo: {minNetMarginPercent}%</span>
                <span>{formatCurrency(calculation.netMargin)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Selling price */}
          <div className="flex items-center justify-between">
            <span className="font-medium">Preço de Venda</span>
            <span className="text-lg font-semibold">{formatCurrency(calculation.sellingPrice)}</span>
          </div>

          <Separator />

          {/* Discount - editable (absolute value in BRL) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="discount">Desconto</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  step={100}
                  className="h-8 w-28 text-right"
                  value={discountValue}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      onDiscountChange(value);
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    onDiscountChange(Math.max(0, Math.min(value, calculation.sellingPrice)));
                  }}
                />
              </div>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-end text-destructive">
                <span>-{formatCurrency(calculation.discount)}</span>
              </div>
            )}
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
      </div>
    );
  }
);
