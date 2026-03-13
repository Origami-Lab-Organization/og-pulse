import { useState } from 'react';
import { format } from 'date-fns';
import { Search, TrendingUp, TrendingDown, MinusCircle, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MonthSelector } from '@/components/timesheets/MonthSelector';
import { AllocationOverview } from '@/components/timesheets/AllocationOverview';

type StatusLabel = 'Sobrealocado' | 'Subalocado' | 'Ocioso' | 'Adequado';

const KPI_CONFIG: { label: StatusLabel; icon: React.ElementType; iconClass: string }[] = [
  { label: 'Sobrealocado', icon: TrendingUp,    iconClass: 'bg-red-100 text-red-700' },
  { label: 'Subalocado',   icon: TrendingDown,  iconClass: 'bg-yellow-100 text-yellow-700' },
  { label: 'Ocioso',       icon: MinusCircle,   iconClass: 'bg-muted text-muted-foreground' },
  { label: 'Adequado',     icon: CheckCircle2,  iconClass: 'bg-green-100 text-green-700' },
];

export default function Timesheets() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusCounts, setStatusCounts] = useState<Record<StatusLabel, number>>({
    Sobrealocado: 0, Subalocado: 0, Ocioso: 0, Adequado: 0,
  });

  return (
    <AppLayout
      title="Alocação"
      description="Gerencie alocação de horas e lançamentos dos projetos"
      breadcrumbs={[{ label: 'Alocação' }]}
    >
      <div className="space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {KPI_CONFIG.map(({ label, icon: Icon, iconClass }) => (
            <Card key={label} className="animate-scale-in">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-lg p-3 ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}s</p>
                  <p className="text-xl font-semibold">{statusCounts[label]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[250px]"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <AllocationOverview
          searchQuery={searchQuery}
          selectedMonth={format(selectedMonth, 'yyyy-MM')}
          onStatusCountsChange={setStatusCounts}
        />
      </div>
    </AppLayout>
  );
}
