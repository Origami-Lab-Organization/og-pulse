import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolioGoals, useSavePortfolioGoals } from '@/hooks/usePortfolioGoals';

const currentYear = new Date().getFullYear();
const YEARS = [currentYear + 1, currentYear, currentYear - 1];

/**
 * Metas do portfólio por ano (US-0036): receita do ano e margem bruta. Provisório até as metas
 * virem da Estratégia. A meta de margem de cada projeto continua nas configurações acima.
 */
export function PortfolioGoalsForm() {
  const [year, setYear] = useState(currentYear);
  const { data: goals, isLoading } = usePortfolioGoals(year);
  const save = useSavePortfolioGoals();
  const [revenue, setRevenue] = useState(0);
  const [margin, setMargin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRevenue(goals?.revenueTarget ?? 0);
    setMargin(goals ? String(goals.grossMarginTargetPercent).replace('.', ',') : '');
    setError(null);
  }, [goals, year]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const marginValue = Number(margin.replace(',', '.'));
    if (!(revenue > 0)) return setError('Informe a meta de receita do ano.');
    if (!(marginValue > 0 && marginValue < 100)) return setError('A meta de margem fica entre 0 e 100%.');
    setError(null);
    save.mutate({ year, revenueTarget: revenue, grossMarginTargetPercent: marginValue });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Metas do portfólio
        </CardTitle>
        <CardDescription>
          O portfólio compara a receita esperada no ano e a margem bruta dos projetos ativos com estas metas.
          Provisório: depois elas virão da Estratégia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid max-w-xl gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="goals-year">Ano</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger id="goals-year" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="goals-revenue">Meta de receita do ano</Label>
            <CurrencyInput id="goals-revenue" value={revenue} onValueChange={setRevenue} disabled={isLoading} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="goals-margin">Meta de margem bruta do portfólio (%)</Label>
            <Input
              id="goals-margin"
              inputMode="decimal"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              disabled={isLoading}
              className="w-[140px]"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Button type="submit" disabled={save.isPending || isLoading}>
              {save.isPending ? 'Salvando...' : `Salvar metas de ${year}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
