import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { HoursAuditView } from '@/components/payroll/HoursAuditView';
import { AllocationCorrectionDialog } from '@/components/timesheets/AllocationCorrectionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditoriaHoras } from '@/hooks/useAuditoriaHoras';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';

/**
 * Auditoria das horas de uma pessoa no mês, aberta pelo botão "Auditar horas" do rateio da
 * Custo x Hora (decisão do Italo, 01/10/2026: tela própria, simples). Só horas, sem custo.
 * Corrigir usa a correção que já existe (semana a semana, com motivo e justificativa,
 * registrada e avisada à pessoa na caixa de entrada).
 */

const monthLabelOf = (monthKey: string) => {
  const label = format(parseISO(`${monthKey}-01`), "MMMM 'de' yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

function MonthPicker({ monthKey, onChange }: { monthKey: string; onChange: (monthKey: string) => void }) {
  return (
    <div className="space-y-1">
      <Label htmlFor="auditoria-mes">Mês</Label>
      <Input
        id="auditoria-mes"
        type="month"
        value={monthKey}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="w-44"
        aria-describedby="auditoria-mes-nome"
      />
      <span id="auditoria-mes-nome" className="sr-only">
        {monthLabelOf(monthKey)}
      </span>
    </div>
  );
}

function AuditBody(props: { query: ReturnType<typeof useAuditoriaHoras>; canEdit: boolean; onCorrect: (monday: string) => void }) {
  const { query, canEdit, onCorrect } = props;
  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.isError || !query.audit) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
        <p>{mensagemParaUsuario(query.error, 'Não foi possível carregar as horas do mês.')}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  return <HoursAuditView audit={query.audit} canEdit={canEdit} onCorrect={onCorrect} />;
}

/** Análises › Custo x Hora › Auditoria de horas: o mês de uma pessoa, dia a dia. */
export default function AuditoriaHoras() {
  const { employeeId = '' } = useParams<{ employeeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthKey = searchParams.get('mes') ?? format(new Date(), 'yyyy-MM');
  const { can, employee } = useAuth();
  const canEdit = can('timesheet-terceiro:editar');
  const query = useAuditoriaHoras(employeeId, monthKey, true);
  const [correctionWeek, setCorrectionWeek] = useState<Date | null>(null);
  const name = query.audit?.employeeName ?? '';

  return (
    <AppLayout
      title={name ? `Auditoria de horas — ${name}` : 'Auditoria de horas'}
      description="O que foi lançado no mês, dia a dia, com o que merece atenção. Corrigir avisa a pessoa e atualiza o rateio."
      breadcrumbs={[{ label: 'Análises', href: '/analises/meu-time' }, { label: 'Custo x Hora', href: '/analises/custo-hora' }, { label: 'Auditoria de horas' }]}
      actions={<MonthPicker monthKey={monthKey} onChange={(mes) => setSearchParams({ mes }, { replace: true })} />}
    >
      <AuditBody query={query} canEdit={canEdit} onCorrect={(monday) => setCorrectionWeek(parseISO(monday))} />
      {correctionWeek && employee && (
        <AllocationCorrectionDialog
          open
          onOpenChange={(isOpen) => !isOpen && setCorrectionWeek(null)}
          employeeId={employeeId}
          employeeName={name}
          tenantId={employee.tenant_id}
          canEditAll={canEdit}
          currentEmployeeId={employee.id}
          initialDate={correctionWeek}
        />
      )}
    </AppLayout>
  );
}
