import { CONTRACT_TYPE_LABELS } from '@/types/employee';
import type { PayrollMonthPoint } from './payrollHistory';

const CURRENCY_FMT = '"R$" #,##0.00';

interface ExportPayrollHistoryParams {
  history: PayrollMonthPoint[];
  selectedMonthKey: string | undefined;
}

function sanitizeSheetName(name: string): string {
  // Excel proíbe / \ ? * [ ] no nome da aba e limita a 31 caracteres.
  return name.replace(/[/\\?*[\]]/g, '-').slice(0, 31);
}

function situacaoLabel(point: PayrollMonthPoint): string {
  if (point.isCurrent) return 'Atual';
  if (point.projected) return 'Projeção';
  return 'Estimado';
}

export async function exportPayrollHistoryToExcel({ history, selectedMonthKey }: ExportPayrollHistoryParams): Promise<void> {
  // Import dinâmico: exceljs é uma dependência pesada usada só nesta exportação
  // pontual — não deve entrar no bundle principal carregado por todo usuário.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Origami Pulse';
  workbook.created = new Date();

  const year = history[0]?.key.slice(0, 4) ?? '';

  // Mesmas colunas e ordem da tabela "Custos por Colaborador" na tela.
  const evolutionSheet = workbook.addWorksheet(sanitizeSheetName(`Evolução Mensal ${year}`));
  evolutionSheet.columns = [
    { header: 'Mês', key: 'label', width: 12 },
    { header: 'Situação', key: 'situacao', width: 12 },
    { header: 'Colaboradores', key: 'headcount', width: 14 },
    { header: 'Salário Base', key: 'baseAmount', width: 16, style: { numFmt: CURRENCY_FMT } },
    { header: 'FGTS', key: 'fgtsAmount', width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: 'INSS', key: 'inssFuncionarioAmount', width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: 'Benefícios', key: 'benefitsAmount', width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: 'Ferramentas', key: 'toolsAmount', width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: 'Provisões', key: 'provisionsAmount', width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: 'Total Mensal', key: 'totalMonthlyCost', width: 16, style: { numFmt: CURRENCY_FMT } },
  ];
  evolutionSheet.getRow(1).font = { bold: true };
  evolutionSheet.getCell('B1').note =
    'Estimado: meses passados, reconstruídos com dados/taxas atuais. Projeção: meses futuros, com o quadro e os valores de hoje mantidos constantes.';
  for (const point of history) {
    evolutionSheet.addRow({
      label: point.label,
      situacao: situacaoLabel(point),
      headcount: point.headcount,
      baseAmount: point.baseAmount,
      fgtsAmount: point.fgtsAmount,
      inssFuncionarioAmount: point.inssFuncionarioAmount,
      benefitsAmount: point.benefitsAmount,
      toolsAmount: point.toolsAmount,
      provisionsAmount: point.provisionsAmount,
      totalMonthlyCost: point.totalMonthlyCost,
    });
  }

  const selected = history.find((h) => h.key === selectedMonthKey);
  if (selected) {
    const detailSheet = workbook.addWorksheet(sanitizeSheetName(`Detalhe ${selected.label} ${year}`));
    detailSheet.columns = [
      { header: 'Colaborador', key: 'nome', width: 28 },
      { header: 'Tipo', key: 'tipo', width: 16 },
      { header: 'Salário Base', key: 'baseAmount', width: 16, style: { numFmt: CURRENCY_FMT } },
      { header: 'FGTS', key: 'fgtsAmount', width: 14, style: { numFmt: CURRENCY_FMT } },
      { header: 'INSS', key: 'inssFuncionario', width: 14, style: { numFmt: CURRENCY_FMT } },
      { header: 'Benefícios', key: 'benefitsAmount', width: 14, style: { numFmt: CURRENCY_FMT } },
      { header: 'Ferramentas', key: 'toolsAmount', width: 14, style: { numFmt: CURRENCY_FMT } },
      { header: 'Provisões', key: 'provisionsAmount', width: 14, style: { numFmt: CURRENCY_FMT } },
      { header: 'Total Mensal', key: 'totalMonthlyCost', width: 16, style: { numFmt: CURRENCY_FMT } },
    ];
    detailSheet.getRow(1).font = { bold: true };
    for (const row of selected.rows) {
      detailSheet.addRow({
        nome: row.nome,
        tipo: CONTRACT_TYPE_LABELS[row.tipoContratacao],
        baseAmount: row.baseAmount,
        fgtsAmount: row.fgtsAmount,
        inssFuncionario: row.inssFuncionario,
        benefitsAmount: row.benefitsAmount,
        toolsAmount: row.toolsAmount,
        provisionsAmount: row.provisionsAmount,
        totalMonthlyCost: row.totalMonthlyCost,
      });
    }
    const totalsRow = detailSheet.addRow({
      nome: `Total (${selected.rows.length} colaboradores)`,
      baseAmount: selected.baseAmount,
      fgtsAmount: selected.fgtsAmount,
      inssFuncionario: selected.inssFuncionarioAmount,
      benefitsAmount: selected.benefitsAmount,
      toolsAmount: selected.toolsAmount,
      provisionsAmount: selected.provisionsAmount,
      totalMonthlyCost: selected.totalMonthlyCost,
    });
    totalsRow.font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `folha-pagamento-${selectedMonthKey ?? 'evolucao'}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
