import { parseDateString } from '@/lib/formatters';
import { Employee } from '@/hooks/useEmployees';
import { TerminationWizardData } from '@/components/employees/termination-wizard/types';

export interface AutoCalcItem {
  desc: string;
  value: number;
  isCredit: boolean;
}

/**
 * Calcula verbas rescisórias automáticas conforme tipo de contratação e tipo de desligamento.
 *
 * CLT Art. 477/482/484-A, Lei 8.036/90 (FGTS), Lei 12.506/2011 (aviso prévio),
 * Lei 11.788/2008 (estágio), Lei 10.097/2000 (menor aprendiz).
 */
export function calculateAutoCalcs(employee: Employee, data: TerminationWizardData): AutoCalcItem[] {
  const salary = employee.salarioMensal;
  const termDate = data.termination_date ? parseDateString(data.termination_date) : new Date();
  const dayOfMonth = termDate.getDate();
  const daysInMonth = new Date(termDate.getFullYear(), termDate.getMonth() + 1, 0).getDate();

  let monthsWorked = 0;
  if (employee.dataAdmissao) {
    const admDate = parseDateString(employee.dataAdmissao);
    if (!isNaN(admDate.getTime())) {
      monthsWorked =
        (termDate.getFullYear() - admDate.getFullYear()) * 12 +
        (termDate.getMonth() - admDate.getMonth());
    }
  }
  const monthsInYear = termDate.getMonth() + 1;
  const contractType = employee.tipoContratacao;
  const items: AutoCalcItem[] = [];

  switch (contractType) {
    case 'CLT': {
      const salaryBalance = (salary / daysInMonth) * dayOfMonth;
      items.push({ desc: `Saldo de salário (${dayOfMonth} dias)`, value: salaryBalance, isCredit: true });

      // Justa causa (Art. 482 CLT): perde férias, 13º, aviso prévio indenizado e multa FGTS
      if (data.is_just_cause) break;

      const vacationProp = (salary / 12) * (monthsWorked % 12) * (4 / 3);
      const thirteenthProp = (salary / 12) * monthsInYear;
      items.push({ desc: 'Férias proporcionais + 1/3', value: vacationProp, isCredit: true });
      items.push({ desc: '13º proporcional', value: thirteenthProp, isCredit: true });

      if (data.termination_type === 'involuntary') {
        const fgtsFine = employee.fgts * monthsWorked * 0.4;
        if (fgtsFine > 0) items.push({ desc: 'Multa FGTS 40% (Art. 18 §1º Lei 8.036/90)', value: fgtsFine, isCredit: true });
      } else if (data.termination_type === 'mutual_agreement') {
        const fgtsFine = employee.fgts * monthsWorked * 0.2;
        if (fgtsFine > 0) items.push({ desc: 'Multa FGTS 20% (CLT Art. 484-A)', value: fgtsFine, isCredit: true });
      }

      if (!data.notice_worked && data.notice_period_days > 0) {
        const noticeValue = (salary / 30) * data.notice_period_days;
        items.push({
          desc: `Aviso prévio ${data.notice_indemnified_by_company ? 'indenizado' : '(desconto)'}`,
          value: noticeValue,
          isCredit: data.notice_indemnified_by_company,
        });
      }
      break;
    }

    case 'ESTAGIO': {
      const stipend = employee.bolsaAuxilio || salary;
      const stipendBalance = (stipend / daysInMonth) * dayOfMonth;
      // Lei 11.788/2008: recesso 30 dias/ano proporcional, sem 1/3
      const recessDays = (monthsWorked / 12) * 30;
      const recessValue = (stipend / 30) * recessDays;
      items.push({ desc: `Saldo de bolsa-auxílio (${dayOfMonth} dias)`, value: stipendBalance, isCredit: true });
      if (recessValue > 0) {
        items.push({
          desc: `Recesso remunerado proporcional (${Math.round(recessDays)} dias)`,
          value: recessValue,
          isCredit: true,
        });
      }
      break;
    }

    case 'SOCIO':
      // Saída de sócio é tratada via contrato social — sem cálculos automáticos (CA3)
      break;

    case 'MENOR_APRENDIZ': {
      const salaryBalance = (salary / daysInMonth) * dayOfMonth;
      const vacationProp = (salary / 12) * (monthsWorked % 12) * (4 / 3);
      const thirteenthProp = (salary / 12) * monthsInYear;
      // Lei 10.097/2000: FGTS 2%, sem multa no término regular de prazo determinado
      const fgtsValue = salary * 0.02 * monthsWorked;
      items.push({ desc: `Saldo de salário (${dayOfMonth} dias)`, value: salaryBalance, isCredit: true });
      items.push({ desc: 'Férias proporcionais + 1/3', value: vacationProp, isCredit: true });
      items.push({ desc: '13º proporcional', value: thirteenthProp, isCredit: true });
      if (fgtsValue > 0) items.push({ desc: 'FGTS acumulado (alíquota 2%)', value: fgtsValue, isCredit: true });
      break;
    }

    case 'PJ': {
      // Pagamento proporcional ao período trabalhado no mês, sem encargos CLT (CA3)
      const contractValue = employee.valorContratoPj || 0;
      if (contractValue > 0) {
        const proportional = (contractValue / daysInMonth) * dayOfMonth;
        items.push({
          desc: `Pagamento proporcional PJ (${dayOfMonth}/${daysInMonth} dias)`,
          value: proportional,
          isCredit: true,
        });
      }
      break;
    }

    default:
      // CA4: tipo não suportado → sem cálculo automático; registrar via ajuste manual
      break;
  }

  return items;
}
