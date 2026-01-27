import { useEffect, useState } from 'react';
import { usePayrollProfile, useUpsertPayrollProfile } from '@/hooks/usePayrollProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function PayrollProfileSettingsForm() {
  const { data: profile, isLoading } = usePayrollProfile();
  const upsertProfile = useUpsertPayrollProfile();

  // Form state with percentages (0-100 display)
  const [formData, setFormData] = useState({
    fgtsRateClt: '',
    fgtsRateApprentice: '',
    inssPatronalRate: '',
    ratRate: '',
    terceirosRate: '',
    outrosRate: '',
    inssPatronalProlaboreRate: '',
    fgtsProlaboreRate: '',
    applyFgtsOn13th: true,
    applyInssOn13th: true,
    applyRatOn13th: true,
    applyTerceirosOn13th: true,
    applyOutrosOn13th: false,
    applyFgtsOnVacation: true,
    applyInssOnVacation: true,
    applyRatOnVacation: true,
    applyTerceirosOnVacation: true,
    applyOutrosOnVacation: false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fgtsRateClt: (profile.fgtsRateClt * 100).toFixed(1),
        fgtsRateApprentice: (profile.fgtsRateApprentice * 100).toFixed(1),
        inssPatronalRate: (profile.inssPatronalRate * 100).toFixed(1),
        ratRate: (profile.ratRate * 100).toFixed(1),
        terceirosRate: (profile.terceirosRate * 100).toFixed(1),
        outrosRate: (profile.outrosRate * 100).toFixed(1),
        inssPatronalProlaboreRate: (profile.inssPatronalProlaboreRate * 100).toFixed(1),
        fgtsProlaboreRate: (profile.fgtsProlaboreRate * 100).toFixed(1),
        applyFgtsOn13th: profile.applyFgtsOn13th,
        applyInssOn13th: profile.applyInssOn13th,
        applyRatOn13th: profile.applyRatOn13th,
        applyTerceirosOn13th: profile.applyTerceirosOn13th,
        applyOutrosOn13th: profile.applyOutrosOn13th,
        applyFgtsOnVacation: profile.applyFgtsOnVacation,
        applyInssOnVacation: profile.applyInssOnVacation,
        applyRatOnVacation: profile.applyRatOnVacation,
        applyTerceirosOnVacation: profile.applyTerceirosOnVacation,
        applyOutrosOnVacation: profile.applyOutrosOnVacation,
      });
    }
  }, [profile]);

  const handleRateChange = (field: string, value: string) => {
    // Only allow numbers with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleCheckboxChange = (field: string, checked: boolean) => {
    setFormData({ ...formData, [field]: checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await upsertProfile.mutateAsync({
      fgtsRateClt: parseFloat(formData.fgtsRateClt) / 100 || 0,
      fgtsRateApprentice: parseFloat(formData.fgtsRateApprentice) / 100 || 0,
      inssPatronalRate: parseFloat(formData.inssPatronalRate) / 100 || 0,
      ratRate: parseFloat(formData.ratRate) / 100 || 0,
      terceirosRate: parseFloat(formData.terceirosRate) / 100 || 0,
      outrosRate: parseFloat(formData.outrosRate) / 100 || 0,
      inssPatronalProlaboreRate: parseFloat(formData.inssPatronalProlaboreRate) / 100 || 0,
      fgtsProlaboreRate: parseFloat(formData.fgtsProlaboreRate) / 100 || 0,
      applyFgtsOn13th: formData.applyFgtsOn13th,
      applyInssOn13th: formData.applyInssOn13th,
      applyRatOn13th: formData.applyRatOn13th,
      applyTerceirosOn13th: formData.applyTerceirosOn13th,
      applyOutrosOn13th: formData.applyOutrosOn13th,
      applyFgtsOnVacation: formData.applyFgtsOnVacation,
      applyInssOnVacation: formData.applyInssOnVacation,
      applyRatOnVacation: formData.applyRatOnVacation,
      applyTerceirosOnVacation: formData.applyTerceirosOnVacation,
      applyOutrosOnVacation: formData.applyOutrosOnVacation,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert className="border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning-foreground">Valores estimativos</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Os percentuais configurados aqui são utilizados para cálculos estimativos de custo. 
          Sempre valide com sua contabilidade para valores oficiais.
        </AlertDescription>
      </Alert>

      {/* CLT Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alíquotas CLT</CardTitle>
          <CardDescription>
            Percentuais aplicados sobre o salário bruto de funcionários CLT e Menor Aprendiz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fgtsRateClt">FGTS CLT (%)</Label>
              <div className="relative">
                <Input
                  id="fgtsRateClt"
                  value={formData.fgtsRateClt}
                  onChange={(e) => handleRateChange('fgtsRateClt', e.target.value)}
                  placeholder="8.0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fgtsRateApprentice">FGTS Menor Aprendiz (%)</Label>
              <div className="relative">
                <Input
                  id="fgtsRateApprentice"
                  value={formData.fgtsRateApprentice}
                  onChange={(e) => handleRateChange('fgtsRateApprentice', e.target.value)}
                  placeholder="2.0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inssPatronalRate">INSS Patronal (%)</Label>
              <div className="relative">
                <Input
                  id="inssPatronalRate"
                  value={formData.inssPatronalRate}
                  onChange={(e) => handleRateChange('inssPatronalRate', e.target.value)}
                  placeholder="20.0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ratRate">RAT (%)</Label>
              <div className="relative">
                <Input
                  id="ratRate"
                  value={formData.ratRate}
                  onChange={(e) => handleRateChange('ratRate', e.target.value)}
                  placeholder="3.0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="terceirosRate">Terceiros (%)</Label>
              <div className="relative">
                <Input
                  id="terceirosRate"
                  value={formData.terceirosRate}
                  onChange={(e) => handleRateChange('terceirosRate', e.target.value)}
                  placeholder="5.8"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outrosRate">Outros (%)</Label>
              <div className="relative">
                <Input
                  id="outrosRate"
                  value={formData.outrosRate}
                  onChange={(e) => handleRateChange('outrosRate', e.target.value)}
                  placeholder="0.0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pro-Labore Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alíquotas Pró-Labore (Sócio)</CardTitle>
          <CardDescription>
            Percentuais aplicados sobre o pró-labore de sócios. Dividendos não geram encargos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inssPatronalProlaboreRate">INSS Patronal (%)</Label>
              <div className="relative">
                <Input
                  id="inssPatronalProlaboreRate"
                  value={formData.inssPatronalProlaboreRate}
                  onChange={(e) => handleRateChange('inssPatronalProlaboreRate', e.target.value)}
                  placeholder="20.0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fgtsProlaboreRate">FGTS (%)</Label>
              <div className="relative">
                <Input
                  id="fgtsProlaboreRate"
                  value={formData.fgtsProlaboreRate}
                  onChange={(e) => handleRateChange('fgtsProlaboreRate', e.target.value)}
                  placeholder="0.0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidence on Provisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incidência sobre Provisões</CardTitle>
          <CardDescription>
            Selecione quais encargos incidem sobre as provisões de 13º Salário e Férias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* 13th Salary */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Sobre 13º Salário</h4>
              <div className="space-y-2">
                {[
                  { key: 'applyFgtsOn13th', label: 'FGTS' },
                  { key: 'applyInssOn13th', label: 'INSS Patronal' },
                  { key: 'applyRatOn13th', label: 'RAT' },
                  { key: 'applyTerceirosOn13th', label: 'Terceiros' },
                  { key: 'applyOutrosOn13th', label: 'Outros' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={formData[key as keyof typeof formData] as boolean}
                      onCheckedChange={(checked) => handleCheckboxChange(key, !!checked)}
                    />
                    <Label htmlFor={key} className="font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Vacation */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Sobre Férias + 1/3</h4>
              <div className="space-y-2">
                {[
                  { key: 'applyFgtsOnVacation', label: 'FGTS' },
                  { key: 'applyInssOnVacation', label: 'INSS Patronal' },
                  { key: 'applyRatOnVacation', label: 'RAT' },
                  { key: 'applyTerceirosOnVacation', label: 'Terceiros' },
                  { key: 'applyOutrosOnVacation', label: 'Outros' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={formData[key as keyof typeof formData] as boolean}
                      onCheckedChange={(checked) => handleCheckboxChange(key, !!checked)}
                    />
                    <Label htmlFor={key} className="font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={upsertProfile.isPending}>
          {upsertProfile.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
