import { useState } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { MonthSelector } from '@/components/timesheets/MonthSelector';
import { AllocationOverview } from '@/components/timesheets/AllocationOverview';

export default function Timesheets() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AppLayout 
      title="Alocação"
      description="Gerencie alocação de horas e lançamentos dos projetos"
      breadcrumbs={[{ label: 'Alocação' }]}
    >
      <div className="space-y-6">
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
        <AllocationOverview searchQuery={searchQuery} selectedMonth={format(selectedMonth, 'yyyy-MM')} />
      </div>
    </AppLayout>
  );
}
