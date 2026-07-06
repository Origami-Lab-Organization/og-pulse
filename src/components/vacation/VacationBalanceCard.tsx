import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palmtree } from 'lucide-react';
import { VacationBalance } from '@/types/vacation';

interface Props {
  balance: VacationBalance;
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={accent ? 'text-3xl font-bold text-primary' : 'text-3xl font-bold'}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function VacationBalanceCard({ balance }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palmtree className="h-4 w-4 text-primary" />
          Saldo de férias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Dias disponíveis" value={balance.availableDays} accent />
          <Stat label="Total acumulado" value={balance.earnedDays} />
          <Stat label="Em análise" value={balance.pendingDays} />
          <Stat label="Já utilizados" value={balance.usedDays} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {balance.completedYears > 0
            ? `${balance.completedYears} ano(s) completo(s) de empresa — 30 dias por ano, acumulativos.`
            : 'Você ainda não completou 12 meses de empresa. As férias liberam no aniversário de admissão.'}
        </p>
      </CardContent>
    </Card>
  );
}
