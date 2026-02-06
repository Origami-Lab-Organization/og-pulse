import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useFinancialSettings, useUpsertFinancialSettings } from '@/hooks/useFinancialSettings';
import { Loader2, Save, Percent, Building2, Receipt, Users, TrendingUp } from 'lucide-react';

const formSchema = z.object({
  admin_expenses_percent: z.coerce
    .number()
    .min(0, 'Valor mínimo é 0%')
    .max(100, 'Valor máximo é 100%'),
  taxes_percent: z.coerce
    .number()
    .min(0, 'Valor mínimo é 0%')
    .max(100, 'Valor máximo é 100%'),
  commission_percent: z.coerce
    .number()
    .min(0, 'Valor mínimo é 0%')
    .max(100, 'Valor máximo é 100%'),
  net_margin_percent: z.coerce
    .number()
    .min(0, 'Valor mínimo é 0%')
    .max(100, 'Valor máximo é 100%'),
  gross_margin_target_percent: z.coerce
    .number()
    .min(0, 'Valor mínimo é 0%')
    .max(100, 'Valor máximo é 100%'),
});

type FormData = z.infer<typeof formSchema>;

export function FinancialSettingsForm() {
  const { data: settings, isLoading } = useFinancialSettings();
  const upsertMutation = useUpsertFinancialSettings();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      admin_expenses_percent: 0,
      taxes_percent: 0,
      commission_percent: 0,
      net_margin_percent: 0,
      gross_margin_target_percent: 0,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        admin_expenses_percent: settings.admin_expenses_percent,
        taxes_percent: settings.taxes_percent,
        commission_percent: settings.commission_percent,
        net_margin_percent: settings.net_margin_percent ?? 0,
        gross_margin_target_percent: settings.gross_margin_target_percent ?? 0,
      });
    }
  }, [settings, form]);

  const onSubmit = (data: FormData) => {
    upsertMutation.mutate({
      admin_expenses_percent: data.admin_expenses_percent,
      taxes_percent: data.taxes_percent,
      commission_percent: data.commission_percent,
      net_margin_percent: data.net_margin_percent,
      gross_margin_target_percent: data.gross_margin_target_percent,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Percentuais para Orçamentos
            </CardTitle>
            <CardDescription>
              Configure os percentuais padrão usados na fórmula de markup dos orçamentos.
              O preço de venda é calculado como: Custo Total / (1 - soma dos percentuais)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="admin_expenses_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Despesas Administrativas
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          className="pr-8"
                          {...field}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Percentual de despesas administrativas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxes_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      Impostos
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          className="pr-8"
                          {...field}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Percentual de impostos
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commission_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Comissão Máxima
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          className="pr-8"
                          {...field}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Percentual máximo de comissão de vendas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="net_margin_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      Margem Líquida
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          className="pr-8"
                          {...field}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Percentual de margem líquida desejada
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gross_margin_target_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      Meta de Margem Bruta
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="32.00"
                          className="pr-8"
                          {...field}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Meta de margem bruta sobre a receita
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
