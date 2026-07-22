import { useMemo } from 'react';
import { AlertTriangle, FileText } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ProjectWithRelations } from '@/types/project';
import { deriveInstallmentStatus, isNfEmissionDue } from '@/lib/installmentStatus';

interface InstallmentAlertsBannerProps {
  project: ProjectWithRelations;
}

/**
 * Destaque na home/visão geral do projeto: parcelas vencidas sem recebimento
 * (atraso, vermelho) e parcelas cuja janela de emissão de NF já abriu sem NF
 * emitida (lembrete, âmbar). Ambos os estados são derivados no client.
 */
export function InstallmentAlertsBanner({ project }: InstallmentAlertsBannerProps) {
  const today = useMemo(() => new Date(), []);
  const leadDays = project.nf_emission_lead_days ?? 7;
  const installments = project.installments || [];

  const overdue = useMemo(
    () => installments.filter((i) => deriveInstallmentStatus(i, today) === 'atrasado'),
    [installments, today],
  );
  const nfDue = useMemo(
    () => installments.filter((i) => isNfEmissionDue(i, leadDays, today)),
    [installments, leadDays, today],
  );

  if (overdue.length === 0 && nfDue.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {overdue.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/[0.06] px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-sm text-muted-foreground">
            <b className="text-destructive">
              {overdue.length === 1
                ? `Parcela ${overdue[0].installment_number} vencida há ${differenceInCalendarDays(today, parseISO(overdue[0].due_date))} dias`
                : `${overdue.length} parcelas vencidas sem recebimento`}
            </b>{' '}
            — registre o recebimento na aba Financeiro.
          </span>
        </div>
      )}
      {nfDue.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-warning" />
          <span className="text-sm text-muted-foreground">
            <b className="text-warning-emphasis">
              {nfDue.length === 1 ? '1 parcela aguardando emissão de NF' : `${nfDue.length} parcelas aguardando emissão de NF`}
            </b>{' '}
            — a janela de emissão já abriu. Emita a NF na aba Financeiro.
          </span>
        </div>
      )}
    </div>
  );
}
