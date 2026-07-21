import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Check, Clock, X } from 'lucide-react';
import { EmployeeVersionDB } from '@/services/employeeVersionService';
import { useCancelScheduledEmployeeVersion } from '@/hooks/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, todayLocalDateString } from '@/lib/formatters';
import { CONTRACT_TYPE_LABELS, SYSTEM_ROLE_LABELS, type ContractType, type SystemRole } from '@/types/employee';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EmployeeVersionsTableProps {
  versions: EmployeeVersionDB[];
  isLoading?: boolean;
}

function formatDateField(value: string | null): string {
  if (!value) return '—';
  return format(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
}

/** Campos "diretos" (não bancários/PIX) comparados entre uma versão e a anterior. */
const DIFF_FIELDS: {
  key: keyof EmployeeVersionDB;
  label: string;
  format?: (value: unknown) => string;
}[] = [
  { key: 'cargo', label: 'Cargo' },
  {
    key: 'tipo_contratacao',
    label: 'Tipo de contratação',
    format: (v) => CONTRACT_TYPE_LABELS[v as ContractType] ?? String(v),
  },
  { key: 'salario_mensal', label: 'Salário bruto', format: (v) => formatCurrency(Number(v)) },
  { key: 'valor_contrato_pj', label: 'Valor do contrato PJ', format: (v) => formatCurrency(Number(v)) },
  { key: 'dividendos', label: 'Dividendos', format: (v) => formatCurrency(Number(v)) },
  { key: 'jornada_diaria', label: 'Jornada diária', format: (v) => `${v}h/dia` },
  { key: 'nome', label: 'Nome' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'cpf', label: 'CPF' },
  { key: 'data_nascimento', label: 'Data de nascimento', format: (v) => formatDateField(v as string | null) },
  { key: 'data_admissao', label: 'Data de admissão', format: (v) => formatDateField(v as string | null) },
  {
    key: 'system_role',
    label: 'Permissão',
    format: (v) => (v ? (SYSTEM_ROLE_LABELS[v as SystemRole] ?? String(v)) : '—'),
  },
  { key: 'is_gerente', label: 'Gerente', format: (v) => (v ? 'Sim' : 'Não') },
];

const BANK_PIX_FIELDS: (keyof EmployeeVersionDB)[] = [
  'pix_key_type',
  'pix_key',
  'bank_name',
  'bank_account_type',
  'bank_agency',
  'bank_account',
];

/** O que mudou entre `version` e a versão cronologicamente anterior — null para a mais antiga. */
function describeChanges(version: EmployeeVersionDB, previous: EmployeeVersionDB | undefined): string[] {
  if (!previous) return [];
  const changes: string[] = [];

  for (const field of DIFF_FIELDS) {
    const before = previous[field.key];
    const after = version[field.key];
    if (before === after || before == null || after == null) continue;
    const fmt = field.format ?? ((v: unknown) => String(v));
    changes.push(`${field.label}: ${fmt(before)} → ${fmt(after)}`);
  }

  // Dados bancários/PIX agrupados num único badge (em vez de expor os valores lado a lado).
  const bankChanged = BANK_PIX_FIELDS.some((key) => previous[key] !== version[key]);
  if (bankChanged) changes.push('Dados bancários/PIX atualizados');

  return changes;
}

export function EmployeeVersionsTable({ versions, isLoading }: EmployeeVersionsTableProps) {
  const { employee: currentEmployee } = useAuth();
  const isAdmin = !!currentEmployee?.isAdmin;
  const [versionToCancel, setVersionToCancel] = useState<EmployeeVersionDB | null>(null);
  const cancelVersion = useCancelScheduledEmployeeVersion();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Nenhum histórico de versões disponível.</p>
      </div>
    );
  }

  // `versions` vem ordenado do mais recente para o mais antigo — o "anterior" de cada
  // linha (cronologicamente) é a próxima do array.
  const sorted = [...versions].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  const todayStr = todayLocalDateString();

  const handleConfirmCancel = () => {
    if (!versionToCancel || cancelVersion.isPending) return;
    cancelVersion.mutate(
      { versionId: versionToCancel.id, employeeId: versionToCancel.employee_id },
      { onSuccess: () => setVersionToCancel(null) },
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vigência</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead className="text-right">Salário Bruto</TableHead>
            <TableHead className="text-right">Encargos</TableHead>
            <TableHead className="text-right">Benefícios</TableHead>
            <TableHead className="text-right">Ferramentas</TableHead>
            <TableHead className="text-right">Jornada</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Alterações</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((version, index) => {
            // Uma versão "aberta" (sem effective_until) só está de fato em vigor se seu
            // effective_from já chegou — senão é um marco agendado, ainda não aplicado
            // em `employees` (ver activate_scheduled_employee_versions, cron diário).
            const isScheduled = version.effective_from > todayStr;
            const isActive = !isScheduled && !version.effective_until;
            const effectiveFrom = format(new Date(version.effective_from), 'dd/MM/yyyy', { locale: ptBR });
            const effectiveUntil = version.effective_until
              ? format(new Date(version.effective_until), 'dd/MM/yyyy', { locale: ptBR })
              : 'Atual';
            const previous = sorted[index + 1];
            const changes = describeChanges(version, previous);

            return (
              <TableRow key={version.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{effectiveFrom}</span>
                    <span className="text-xs text-muted-foreground">até {effectiveUntil}</span>
                  </div>
                </TableCell>
                <TableCell>{version.cargo}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(version.salario_mensal)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(version.encargos)}
                </TableCell>
                <TableCell className="text-right">
                  {version.total_benefits_cost != null ? (
                    formatCurrency(version.total_benefits_cost)
                  ) : (
                    <span className="text-muted-foreground italic text-xs">atual</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {version.total_tools_cost != null ? (
                    formatCurrency(version.total_tools_cost)
                  ) : (
                    <span className="text-muted-foreground italic text-xs">atual</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {version.jornada_diaria || Math.round(version.jornada_mensal / 22)}h/dia
                </TableCell>
                <TableCell>
                  {isScheduled ? (
                    <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                      <Clock className="h-3 w-3" />
                      Agendado
                    </Badge>
                  ) : isActive ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Histórico</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {changes.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {changes.map((change) => (
                        <Badge key={change} variant="outline" className="text-xs font-normal">
                          {change}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {previous ? '—' : 'Cadastro inicial'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {isScheduled && isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => setVersionToCancel(version)}
                    >
                      <X className="h-3 w-3" />
                      Cancelar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!versionToCancel} onOpenChange={(open) => !open && setVersionToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar marco agendado?</AlertDialogTitle>
            <AlertDialogDescription>
              {versionToCancel && (
                <>
                  A alteração programada para{' '}
                  {format(new Date(versionToCancel.effective_from), 'dd/MM/yyyy', { locale: ptBR })} será
                  cancelada e removida do histórico. O período anterior volta a valer normalmente. Essa ação
                  não pode ser desfeita — se mudar de ideia, será preciso programar a alteração novamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelVersion.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} disabled={cancelVersion.isPending}>
              {cancelVersion.isPending ? 'Cancelando...' : 'Cancelar alteração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
