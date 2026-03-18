import { useMemo, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { RoleRateDB, SENIORITY_OPTIONS } from '@/types/roleRate';
import { BudgetRoleInput } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface BudgetRolesEditorProps {
  roles: BudgetRoleInput[];
  durationMonths: number;
  availableRoles: RoleRateDB[];
  onRolesChange: (roles: BudgetRoleInput[]) => void;
  monthlyMode?: boolean;
}

const getSeniorityLabel = (value: string) =>
  SENIORITY_OPTIONS.find((s) => s.value === value)?.label || value;

const getRoleTotalHours = (role: BudgetRoleInput) =>
  role.months.reduce((acc, m) => acc + m.hours, 0);

const getRoleTotalValue = (role: BudgetRoleInput) =>
  getRoleTotalHours(role) * role.hourlyRate;

// ─── Monthly-mode card ───────────────────────────────────────────────────────

interface MonthlyCardProps {
  role: BudgetRoleInput;
  availableRoles: RoleRateDB[];
  onSelect: (roleRateId: string) => void;
  onHoursChange: (hours: number) => void;
  onRemove: () => void;
}

function MonthlyCard({ role, availableRoles, onSelect, onHoursChange, onRemove }: MonthlyCardProps) {
  const monthlyHours = role.months[0]?.hours ?? 0;
  const monthlyCost = monthlyHours * role.hourlyRate;
  const hasRole = !!role.roleRateId;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {hasRole ? (
            <>
              <p className="text-sm font-medium leading-tight">{role.roleName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getSeniorityLabel(role.seniority)} · {formatCurrency(role.hourlyRate)}/h
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Novo profissional</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-destructive hover:text-destructive/80 transition-colors shrink-0 mt-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Role select when not yet chosen */}
      {!hasRole && (
        <Select onValueChange={onSelect}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Selecione um perfil" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.role_name} ({getSeniorityLabel(r.seniority)}) — {formatCurrency(r.hourly_rate)}/h
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Hours + cost */}
      {hasRole && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={monthlyHours || ''}
              placeholder="0"
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              onChange={(e) =>
                onHoursChange(Math.round((parseFloat(e.target.value) || 0) * 10) / 10)
              }
              className="h-8 w-[72px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-muted-foreground">h/mês</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold">{formatCurrency(monthlyCost)}</span>
            <span className="text-xs text-muted-foreground">/mês</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fixed-scope card ────────────────────────────────────────────────────────

interface FixedCardProps {
  role: BudgetRoleInput;
  availableRoles: RoleRateDB[];
  onSelect: (roleRateId: string) => void;
  onHoursChange: (monthNumber: number, hours: number) => void;
  onApplyAll: (hours: number) => void;
  onRemove: () => void;
}

function FixedCard({ role, availableRoles, onSelect, onHoursChange, onApplyAll, onRemove }: FixedCardProps) {
  const [editingPill, setEditingPill] = useState<{ monthNumber: number; value: string } | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const hasRole = !!role.roleRateId;
  const totalHours = getRoleTotalHours(role);
  const totalValue = getRoleTotalValue(role);
  const avgHours = role.months.length > 0 ? totalHours / role.months.length : 0;

  const commitPill = () => {
    if (!editingPill) return;
    onHoursChange(editingPill.monthNumber, Math.round((parseFloat(editingPill.value) || 0) * 10) / 10);
    setEditingPill(null);
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {hasRole ? (
            <>
              <p className="text-sm font-medium leading-tight">{role.roleName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getSeniorityLabel(role.seniority)} · {formatCurrency(role.hourlyRate)}/h
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Novo profissional</p>
          )}
        </div>
        <div className="flex items-start gap-3">
          {hasRole && totalHours > 0 && (
            <div className="text-right">
              <p className="text-sm font-semibold">{totalHours}h</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="text-destructive hover:text-destructive/80 transition-colors shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Role select when not yet chosen */}
      {!hasRole && (
        <Select onValueChange={onSelect}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Selecione um perfil" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.role_name} ({getSeniorityLabel(r.seniority)}) — {formatCurrency(r.hourly_rate)}/h
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Month pills grid */}
      {hasRole && (
        <>
          {/* Apply-all shortcut */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Aplicar em todos:</span>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={bulkValue}
              placeholder="h"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onApplyAll(Math.round((parseFloat(bulkValue) || 0) * 10) / 10);
                  setBulkValue('');
                }
              }}
              onChange={(e) => setBulkValue(e.target.value)}
              className="h-7 w-[64px] text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => {
                onApplyAll(Math.round((parseFloat(bulkValue) || 0) * 10) / 10);
                setBulkValue('');
              }}
              className="text-xs text-primary hover:underline"
            >
              Aplicar
            </button>
          </div>

          {/* Pills */}
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}
          >
            {role.months.map((m) => {
              const isEditing =
                editingPill?.monthNumber === m.monthNumber;
              const isVariant =
                avgHours > 0 && Math.round(m.hours * 10) !== Math.round(avgHours * 10);

              if (isEditing) {
                return (
                  <div key={m.monthNumber} className="rounded-md bg-primary/10 p-1.5 flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-muted-foreground font-medium">M{m.monthNumber}</span>
                    <input
                      autoFocus
                      type="number"
                      min={0}
                      step={0.5}
                      defaultValue={m.hours || ''}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitPill(); }
                        if (e.key === 'Escape') setEditingPill(null);
                      }}
                      onChange={(e) =>
                        setEditingPill((prev) =>
                          prev ? { ...prev, value: e.target.value } : prev
                        )
                      }
                      onBlur={commitPill}
                      className="w-full text-center text-sm font-semibold bg-transparent outline-none border-b border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                );
              }

              return (
                <button
                  key={m.monthNumber}
                  type="button"
                  onClick={() =>
                    setEditingPill({ monthNumber: m.monthNumber, value: String(m.hours) })
                  }
                  className={cn(
                    'rounded-md p-1.5 flex flex-col items-center gap-0.5 text-left transition-colors hover:brightness-95',
                    isVariant
                      ? 'bg-amber-50 dark:bg-amber-950/40'
                      : 'bg-muted',
                    m.hours === 0 && 'opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px] font-medium',
                      isVariant ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
                    )}
                  >
                    M{m.monthNumber}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isVariant ? 'text-amber-800 dark:text-amber-300' : 'text-foreground'
                    )}
                  >
                    {m.hours > 0 ? `${m.hours}h` : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function BudgetRolesEditor({
  roles,
  durationMonths,
  availableRoles,
  onRolesChange,
  monthlyMode = false,
}: BudgetRolesEditorProps) {
  const months = useMemo(
    () => Array.from({ length: durationMonths }, (_, i) => i + 1),
    [durationMonths]
  );

  const handleAddRole = () => {
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
    const selected = availableRoles.find((r) => r.id === roleRateId);
    if (!selected) return;
    onRolesChange(
      roles.map((r) =>
        r.tempId === tempId
          ? { ...r, roleRateId: selected.id, roleName: selected.role_name, seniority: selected.seniority, hourlyRate: selected.hourly_rate }
          : r
      )
    );
  };

  const handleHoursChange = (tempId: string, monthNumber: number, hours: number) => {
    onRolesChange(
      roles.map((r) =>
        r.tempId === tempId
          ? { ...r, months: r.months.map((m) => (m.monthNumber === monthNumber ? { ...m, hours } : m)) }
          : r
      )
    );
  };

  const handleApplyAll = (tempId: string, hours: number) => {
    onRolesChange(
      roles.map((r) =>
        r.tempId === tempId
          ? { ...r, months: r.months.map((m) => ({ ...m, hours })) }
          : r
      )
    );
  };

  // Update months array when duration changes
  useMemo(() => {
    if (roles.length === 0) return;
    const updatedRoles = roles.map((role) => ({
      ...role,
      months: months.map((m) => role.months.find((rm) => rm.monthNumber === m) || { monthNumber: m, hours: 0 }),
    }));
    const changed = roles.some((role, i) => role.months.length !== updatedRoles[i].months.length);
    if (changed) onRolesChange(updatedRoles);
  }, [durationMonths]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalMonthlyHours = roles.reduce((sum, r) => sum + (r.months[0]?.hours ?? 0), 0);
  const totalMonthlyCost = roles.reduce((sum, r) => sum + (r.months[0]?.hours ?? 0) * r.hourlyRate, 0);
  const totalHoursAll = roles.reduce((sum, r) => sum + getRoleTotalHours(r), 0);
  const totalCostAll = roles.reduce((sum, r) => sum + getRoleTotalValue(r), 0);
  const avgHoursPerMonth = durationMonths > 0 ? totalHoursAll / durationMonths : 0;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Mão de Obra</p>

      {monthlyMode
        ? roles.map((role) => (
            <MonthlyCard
              key={role.tempId}
              role={role}
              availableRoles={availableRoles}
              onSelect={(id) => handleRoleSelect(role.tempId, id)}
              onHoursChange={(h) => handleHoursChange(role.tempId, 1, h)}
              onRemove={() => handleRemoveRole(role.tempId)}
            />
          ))
        : roles.map((role) => (
            <FixedCard
              key={role.tempId}
              role={role}
              availableRoles={availableRoles}
              onSelect={(id) => handleRoleSelect(role.tempId, id)}
              onHoursChange={(mn, h) => handleHoursChange(role.tempId, mn, h)}
              onApplyAll={(h) => handleApplyAll(role.tempId, h)}
              onRemove={() => handleRemoveRole(role.tempId)}
            />
          ))}

      <button
        type="button"
        onClick={handleAddRole}
        className={cn(
          'w-full rounded-lg py-2.5 text-sm font-medium text-primary transition-colors',
          'border-[1.5px] border-dashed border-primary/40 hover:border-primary hover:bg-primary/5',
        )}
      >
        <Plus className="inline h-4 w-4 mr-1.5" />
        Adicionar profissional
      </button>

      {roles.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t text-sm">
          <span className="text-muted-foreground">
            {monthlyMode ? 'Total mão de obra/mês' : 'Total mão de obra'}
          </span>
          {monthlyMode ? (
            <div className="text-right">
              <span className="font-semibold">{formatCurrency(totalMonthlyCost)}/mês</span>
              {totalMonthlyHours > 0 && (
                <span className="block text-xs text-muted-foreground">{totalMonthlyHours}h/mês</span>
              )}
            </div>
          ) : (
            <div className="text-right">
              <span className="font-semibold">
                {totalHoursAll}h · {formatCurrency(totalCostAll)}
              </span>
              {avgHoursPerMonth > 0 && (
                <span className="block text-xs text-muted-foreground">
                  Média: {Math.round(avgHoursPerMonth)}h/mês
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
