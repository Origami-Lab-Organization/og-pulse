import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PartyPopper, Plus, Pencil, Trash2 } from 'lucide-react';
import { useHolidays, formatHolidayDate } from '@/hooks/useHolidays';
import { Holiday, HOLIDAY_TYPE_LABELS } from '@/types/holiday';
import { HolidayFormDialog } from './HolidayFormDialog';
import { DeleteHolidayDialog } from './DeleteHolidayDialog';
import { Badge } from '@/components/ui/badge';

export function HolidaysSettingsForm() {
  const { data: holidays, isLoading } = useHolidays();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  const handleEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setFormDialogOpen(true);
  };

  const handleDelete = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedHoliday(null);
    setFormDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5" />
              Feriados e Folgas
            </CardTitle>
            <CardDescription>
              Configure os dias que não serão contabilizados nos timesheets
            </CardDescription>
          </div>
          <Button onClick={handleAddNew} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Feriado
          </Button>
        </CardHeader>
        <CardContent>
          {!holidays || holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PartyPopper className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum feriado cadastrado.</p>
              <p className="text-sm">Clique em "Adicionar Feriado" para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>{formatHolidayDate(holiday)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        holiday.holiday_type === 'fixed' ? 'default' :
                        holiday.holiday_type === 'floating' ? 'secondary' : 'outline'
                      }>
                        {HOLIDAY_TYPE_LABELS[holiday.holiday_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(holiday)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(holiday)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <HolidayFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        holiday={selectedHoliday}
      />

      <DeleteHolidayDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        holiday={selectedHoliday}
      />
    </>
  );
}
