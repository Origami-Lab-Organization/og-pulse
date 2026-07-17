import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { Loader2, Save, Timer, ShieldCheck, Camera, ScanFace } from 'lucide-react';
import { useTimeTrackingSettings, useUpsertTimeTrackingSettings } from '@/hooks/useTimeTrackingSettings';

const formSchema = z.object({
  tolerancia_entrada_minutos: z.coerce.number().min(0).max(120),
  tolerancia_saida_minutos: z.coerce.number().min(0).max(120),
  intervalo_minimo_minutos: z.coerce.number().min(0).max(240),
  limite_horas_extras_diarias: z.coerce.number().min(0).max(12),
  exigir_selfie: z.boolean(),
  exigir_reconhecimento_facial: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

const JornadaConfiguracoes = () => {
  const { data: settings, isLoading } = useTimeTrackingSettings();
  const upsertMutation = useUpsertTimeTrackingSettings();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tolerancia_entrada_minutos: 10,
      tolerancia_saida_minutos: 10,
      intervalo_minimo_minutos: 60,
      limite_horas_extras_diarias: 2,
      exigir_selfie: false,
      exigir_reconhecimento_facial: false,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const onSubmit = (data: FormData) => {
    upsertMutation.mutate(data);
  };

  return (
    <AppLayout
      title="OrigamiPonto — Configurações"
      description="Regras de tolerância e horas extras aplicadas ao registro de ponto"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Timer className="h-4 w-4" />
                  </span>
                  Tolerâncias e limites
                </CardTitle>
                <CardDescription>
                  Essas regras se aplicam a todos os colaboradores do tenant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="tolerancia_entrada_minutos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tolerância de entrada (minutos)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Minutos de atraso tolerados antes de marcar o dia como atraso.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tolerancia_saida_minutos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tolerância de saída (minutos)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="intervalo_minimo_minutos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo mínimo obrigatório (minutos)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="limite_horas_extras_diarias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de horas extras por dia</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  Verificação de identidade
                </CardTitle>
                <CardDescription>
                  Nunca bloqueiam o registro de ponto — só reforçam a confiabilidade da marcação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField
                  control={form.control}
                  name="exigir_selfie"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-start gap-3 space-y-0.5">
                        <Camera className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <FormLabel>Exigir selfie ao bater ponto</FormLabel>
                          <FormDescription>
                            Se a câmera falhar, o colaborador ainda consegue registrar o ponto sem a foto.
                          </FormDescription>
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="exigir_reconhecimento_facial"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-start gap-3 space-y-0.5">
                        <ScanFace className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <FormLabel>Exigir verificação facial ao bater ponto</FormLabel>
                          <FormDescription>
                            Só funciona para colaboradores que cadastraram o reconhecimento facial. Falha na
                            verificação nunca bloqueia o ponto — fica sinalizada para revisão.
                          </FormDescription>
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </form>
        </Form>
      )}
    </AppLayout>
  );
};

export default JornadaConfiguracoes;
