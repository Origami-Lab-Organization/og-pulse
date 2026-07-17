import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface EspelhoPontoRow {
  data: string; // yyyy-MM-dd
  entrada: string | null;
  inicioIntervalo: string | null;
  fimIntervalo: string | null;
  saida: string | null;
  horasTrabalhadas: number;
  status: string;
}

export interface EspelhoPontoInput {
  employeeName: string;
  cargo: string;
  periodLabel: string;
  rows: EspelhoPontoRow[];
  horasPrevistasTotal: number;
  horasTrabalhadasTotal: number;
  horasExtrasTotal: number;
  saldoBancoHoras: number;
}

const C_ACCENT = [15, 118, 110] as const; // teal-700
const C_DARK = [17, 24, 39] as const; // gray-900
const C_GRAY = [107, 114, 128] as const; // gray-500
const C_BG = [240, 253, 250] as const; // teal-50
const C_HDR = [204, 251, 241] as const; // teal-100

const STATUS_LABEL: Record<string, string> = {
  normal: 'Normal',
  atraso: 'Atraso',
  falta: 'Falta',
  incompleto: 'Incompleto',
  ferias: 'Férias',
  atestado: 'Atestado',
};

export function generateEspelhoPontoPdf(input: EspelhoPontoInput): void {
  const { employeeName, cargo, periodLabel, rows, horasPrevistasTotal, horasTrabalhadasTotal, horasExtrasTotal, saldoBancoHoras } = input;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  let y = 0;

  const drawHeader = () => {
    doc.setFillColor(...C_ACCENT);
    doc.rect(0, 0, pageW, 12, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Origami Pulse — Espelho de Ponto', margin, 8);
    doc.text(`Gerado em ${generatedAt}`, pageW - margin, 8, { align: 'right' });
    doc.setTextColor(...C_DARK);
    y = 20;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_ACCENT);
    doc.text(employeeName, margin, y);
    doc.setTextColor(...C_DARK);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_GRAY);
    doc.text(`${cargo} · Período: ${periodLabel}`, margin, y);
    doc.setTextColor(...C_DARK);
    y += 4;
    doc.setDrawColor(...C_ACCENT);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  const drawFooter = () => {
    const n = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_GRAY);
    doc.text('Confidencial — Origami Pulse', margin, pageH - 6);
    doc.text(`Página ${n}`, pageW - margin, pageH - 6, { align: 'right' });
    doc.setTextColor(...C_DARK);
  };

  const checkBreak = (needed: number) => {
    if (y + needed > pageH - 16) {
      drawFooter();
      doc.addPage();
      drawHeader();
      return true;
    }
    return false;
  };

  type ColDef = { label: string; w: number; align?: 'left' | 'right' | 'center' };
  const COLS: ColDef[] = [
    { label: 'Data', w: 24 },
    { label: 'Entrada', w: 22, align: 'center' },
    { label: 'Início Int.', w: 26, align: 'center' },
    { label: 'Fim Int.', w: 26, align: 'center' },
    { label: 'Saída', w: 22, align: 'center' },
    { label: 'Trabalhadas', w: 30, align: 'right' },
    { label: 'Status', w: 32, align: 'center' },
  ];

  const tableHeader = () => {
    doc.setFillColor(...C_HDR);
    doc.rect(margin, y, contentW, 6, 'F');
    let x = margin;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_ACCENT);
    for (const col of COLS) {
      const align = col.align ?? 'left';
      const tx = align === 'right' ? x + col.w - 1 : align === 'center' ? x + col.w / 2 : x + 1;
      doc.text(col.label, tx, y + 4, { align });
      x += col.w;
    }
    doc.setTextColor(...C_DARK);
    y += 6;
  };

  const tableRow = (values: string[], rowIdx: number) => {
    if (rowIdx % 2 === 0) {
      doc.setFillColor(...C_BG);
      doc.rect(margin, y, contentW, 5.5, 'F');
    }
    let x = margin;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_DARK);
    values.forEach((value, i) => {
      const col = COLS[i];
      const align = col.align ?? 'left';
      const tx = align === 'right' ? x + col.w - 1 : align === 'center' ? x + col.w / 2 : x + 1;
      doc.text(value, tx, y + 4, { align });
      x += col.w;
    });
    y += 5.5;
  };

  drawHeader();

  // Resumo do período
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C_ACCENT);
  doc.text('Resumo do período', margin, y);
  doc.setTextColor(...C_DARK);
  y += 5;

  const resumoLine = [
    `Horas previstas: ${horasPrevistasTotal.toFixed(2)}h`,
    `Horas trabalhadas: ${horasTrabalhadasTotal.toFixed(2)}h`,
    `Horas extras: ${horasExtrasTotal.toFixed(2)}h`,
    `Saldo do banco de horas: ${saldoBancoHoras.toFixed(2)}h`,
  ].join('   ·   ');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(resumoLine, margin, y);
  y += 8;

  tableHeader();
  rows.forEach((row, idx) => {
    checkBreak(6);
    tableRow(
      [
        format(new Date(`${row.data}T12:00:00`), 'dd/MM/yyyy'),
        row.entrada ?? '-',
        row.inicioIntervalo ?? '-',
        row.fimIntervalo ?? '-',
        row.saida ?? '-',
        `${row.horasTrabalhadas.toFixed(2)}h`,
        STATUS_LABEL[row.status] ?? row.status,
      ],
      idx,
    );
  });

  y += 14;
  checkBreak(20);
  doc.setDrawColor(...C_GRAY);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(...C_GRAY);
  doc.text('Assinatura do colaborador', margin, y);
  doc.text('Assinatura do responsável', pageW - margin - 70, y);
  doc.setTextColor(...C_DARK);

  drawFooter();

  const filename = `espelho-ponto-${employeeName.replace(/\s+/g, '-').toLowerCase()}-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(filename);
}
