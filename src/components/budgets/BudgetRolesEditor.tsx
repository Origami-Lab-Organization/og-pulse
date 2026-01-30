import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { RoleRateDB, SENIORITY_OPTIONS } from '@/types/roleRate';
import { BudgetRoleInput } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';

interface BudgetRolesEditorProps {
  roles: BudgetRoleInput[];
  durationMonths: number;
  availableRoles: RoleRateDB[];
  onRolesChange: (roles: BudgetRoleInput[]) => void;
}

export function BudgetRolesEditor({
  roles,
  durationMonths,
  availableRoles,
  onRolesChange,
}: BudgetRolesEditorProps) {
  const months = useMemo(
    () => Array.from({ length: durationMonths }, (_, i) => i + 1),
    [durationMonths]
  );

  const handleAddRole = () => {
    if (availableRoles.length === 0) return;

    const newRole: BudgetRoleInput = {
      tempId: crypto.randomUUID(),
      roleRateId: '',
      roleName: '',
      seniority: '',
      hourlyRate: 0,
      months: months.map((m) => ({ monthNumber: m, hours: 0 })),
    };

    onRolesChange([...roles, newRole]);
  };

  const handleRemoveRole = (tempId: string) => {
    onRolesChange(roles.filter((r) => r.tempId !== tempId));
  };

  const handleRoleSelect = (tempId: string, roleRateId: string) => {
    const selectedRole = availableRoles.find((r) => r.id === roleRateId);
    if (!selectedRole) return;

    onRolesChange(
      roles.map((r) =>
        r.tempId === tempId
          ? {
              ...r,
              roleRateId: selectedRole.id,
              roleName: selectedRole.role_name,
              seniority: selectedRole.seniority,
              hourlyRate: selectedRole.hourly_rate,
            }
          : r
      )
    );
  };

  const handleHoursChange = (tempId: string, monthNumber: number, hours: number) => {
    onRolesChange(
      roles.map((r) =>
        r.tempId === tempId
          ? {
              ...r,
              months: r.months.map((m) =>
                m.monthNumber === monthNumber ? { ...m, hours } : m
              ),
            }
          : r
      )
    );
  };

  const getRoleTotalHours = (role: BudgetRoleInput) =>
    role.months.reduce((acc, m) => acc + m.hours, 0);

  const getRoleTotalValue = (role: BudgetRoleInput) =>
    getRoleTotalHours(role) * role.hourlyRate;

  const getSeniorityLabel = (value: string) =>
    SENIORITY_OPTIONS.find((s) => s.value === value)?.label || value;

  // Update months when duration changes
  useMemo(() => {
    if (roles.length === 0) return;

    const updatedRoles = roles.map((role) => {
      const newMonths = months.map((m) => {
        const existing = role.months.find((rm) => rm.monthNumber === m);
        return existing || { monthNumber: m, hours: 0 };
      });
      return { ...role, months: newMonths };
    });

    // Only update if different
    const monthsChanged = roles.some((role, i) => {
      return role.months.length !== updatedRoles[i].months.length;
    });

    if (monthsChanged) {
      onRolesChange(updatedRoles);
    }
  }, [durationMonths]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Mão de Obra</h3>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRole}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Papel
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Nenhum papel alocado. Clique em "Adicionar Papel" para começar.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto max-w-full">
          <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">Papel</TableHead>
                  <TableHead className="min-w-[100px] text-right">Valor/Hora</TableHead>
                  {months.map((m) => (
                    <TableHead key={m} className="min-w-[80px] text-center">
                      Mês {m}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[80px] text-center">Total Horas</TableHead>
                  <TableHead className="min-w-[120px] text-right">Total Valor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.tempId}>
                    <TableCell className="sticky left-0 bg-background z-10">
                      <Select
                        value={role.roleRateId}
                        onValueChange={(v) => handleRoleSelect(role.tempId, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um papel" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.role_name} ({getSeniorityLabel(r.seniority)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {role.hourlyRate > 0 ? formatCurrency(role.hourlyRate) : '-'}
                    </TableCell>
                    {months.map((m) => {
                      const monthData = role.months.find((rm) => rm.monthNumber === m);
                      return (
                        <TableCell key={m} className="p-1">
                          <Input
                            type="number"
                            min={0}
                            className="h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={monthData?.hours || ''}
                            onChange={(e) =>
                              handleHoursChange(
                                role.tempId,
                                m,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-medium">
                      {getRoleTotalHours(role)}h
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(getRoleTotalValue(role))}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveRole(role.tempId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {roles.length > 0 && (
                <tfoot className="bg-muted/50 font-medium">
                  <tr>
                    <td className="sticky left-0 bg-muted/50 z-10 p-2 font-semibold">Total Mão de Obra</td>
                    <td className="p-2 text-right">-</td>
                    {months.map((m) => (
                      <td key={m} className="p-2 text-center">
                        {roles.reduce((sum, r) => {
                          const month = r.months.find((rm) => rm.monthNumber === m);
                          return sum + (month?.hours || 0);
                        }, 0)}h
                      </td>
                    ))}
                    <td className="p-2 text-center font-semibold">
                      {roles.reduce((sum, role) => sum + getRoleTotalHours(role), 0)}h
                    </td>
                    <td className="p-2 text-right font-semibold">
                      {formatCurrency(roles.reduce((sum, role) => sum + getRoleTotalValue(role), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
          </Table>
        </div>
      )}
    </div>
  );
}
