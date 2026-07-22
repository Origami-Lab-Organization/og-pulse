import { useState } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { MyTimesheetAllocation } from '@/components/timesheets/MyTimesheetAllocation';
import { MonthlyTimesheetView } from '@/components/timesheets/MonthlyTimesheetView';
import { WeeklyTimesheetGrid } from '@/components/timesheets/weekly/WeeklyTimesheetGrid';
import { useAuth } from '@/contexts/AuthContext';

const MyTimesheet = () => {
  const { employee } = useAuth();
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  return (
    <AppLayout title="Minha Timesheet">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="hidden shrink-0 gap-1 rounded-lg bg-muted p-1 md:flex">
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('monthly')}
            >
              Meses
            </Button>
            <Button
              variant={viewMode === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('weekly')}
            >
              Semanas
            </Button>
          </div>
          {viewMode === 'weekly' && (
            <div className="w-fit">
              <TimesheetWeekSelector
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                viewMonth={viewMonth}
                onViewMonthChange={setViewMonth}
                part="month-nav"
              />
            </div>
          )}
        </div>

        {viewMode === 'monthly' ? (
          <div className="space-y-4">
            <MyTimesheetAllocation
              employeeId={employee?.id}
              monthKey={format(new Date(), 'yyyy-MM')}
            />
            {employee?.id && <MonthlyTimesheetView employeeId={employee.id} />}
          </div>
        ) : (
          <WeeklyTimesheetGrid
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            viewMonth={viewMonth}
            onViewMonthChange={setViewMonth}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default MyTimesheet;
