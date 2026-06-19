import { useMemo } from 'react';
import { Cake } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DashboardSection } from './DashboardSection';
import { parseDateString } from '@/lib/formatters';
import type { Employee } from '@/hooks/useEmployees';

interface BirthdaysCardProps {
  employees: Employee[];
  startDate: Date;
  endDate: Date;
  loading?: boolean;
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface BirthdayPerson {
  id: string;
  nome: string;
  cargo: string;
  fotoUrl?: string;
  month: number; // 0-based
  day: number;
}

/**
 * Retorna funcionários cujo aniversário (dia/mês) cai dentro do período
 * selecionado, considerando todos os anos abrangidos pelo intervalo.
 */
function birthdaysInPeriod(
  employees: Employee[],
  startDate: Date,
  endDate: Date,
): BirthdayPerson[] {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const result: BirthdayPerson[] = [];

  for (const emp of employees) {
    if (emp.status !== 'ativo') continue;
    if (!emp.dataNascimento) continue;

    const birth = parseDateString(emp.dataNascimento);
    const month = birth.getMonth();
    const day = birth.getDate();

    let matches = false;
    for (let year = startYear; year <= endYear; year++) {
      const occurrence = new Date(year, month, day);
      if (occurrence >= startDate && occurrence <= endDate) {
        matches = true;
        break;
      }
    }
    if (!matches) continue;

    result.push({
      id: emp.id,
      nome: emp.nome,
      cargo: emp.cargo,
      fotoUrl: emp.fotoUrl,
      month,
      day,
    });
  }

  // Ordena por mês/dia
  return result.sort((a, b) => (a.month - b.month) || (a.day - b.day));
}

export function BirthdaysCard({ employees, startDate, endDate, loading }: BirthdaysCardProps) {
  const people = useMemo(
    () => birthdaysInPeriod(employees, startDate, endDate),
    [employees, startDate, endDate],
  );

  const hasActiveEmployees = useMemo(
    () => employees.some((e) => e.status === 'ativo'),
    [employees],
  );

  return (
    <DashboardSection
      title="Aniversariantes"
      icon={Cake}
      description="Aniversários no período selecionado"
      loading={loading}
      empty={people.length === 0}
      emptyMessage={
        hasActiveEmployees
          ? 'Nenhum aniversariante no período selecionado.'
          : 'Cadastre funcionários (com data de nascimento) para ver os aniversariantes.'
      }
      headerAction={
        people.length > 0 ? (
          <span className="text-xs font-medium text-muted-foreground">
            {people.length}
          </span>
        ) : undefined
      }
    >
      <ul className="space-y-3">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {p.fotoUrl && <AvatarImage src={p.fotoUrl} alt={p.nome} />}
              <AvatarFallback className="text-xs">
                {p.nome.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{p.nome}</p>
              <p className="text-xs text-muted-foreground truncate">{p.cargo}</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {p.day} {MONTHS_SHORT[p.month]}
            </span>
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}
