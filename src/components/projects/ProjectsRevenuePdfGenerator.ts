import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PortfolioProject } from '@/hooks/usePortfolioProjects';
import { PORTFOLIO_STAGE_LABELS } from '@/types/portfolio';
import { ProjectCostSummary } from '@/services/projectReportService';

const YEAR = 2026;
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtK = (v: number) =>
  v > 0 ? `R$${(v / 1000).toFixed(0)}k` : '—';

function getProjectTypeLabel(p: PortfolioProject): string {
  if (p.total_value === 0) return 'Sem Receita';
  if (p.service?.billing_type === 'success_fee') return 'Taxa de Sucesso';
  if (p.is_continuous) return 'Recorrente';
  return 'Escopo Fechado';
}

interface ProjectRevenueSummary {
  project: PortfolioProject;
  prevista: number;
  executada: number;
  monthly: { prevista: number; executada: number }[];
}

function buildRevenueSummaries(projects: PortfolioProject[]): ProjectRevenueSummary[] {
  return projects
    .map((p) => {
      const inst2026 = (p.installments || []).filter(
        (i) => i.due_date && new Date(i.due_date + 'T12:00:00').getFullYear() === YEAR
      );
      const prevista = inst2026.reduce((s, i) => s + Number(i.value), 0);
      const executada = inst2026.filter((i) => i.status === 'received').reduce((s, i) => s + Number(i.value), 0);

      const monthly: { prevista: number; executada: number }[] = Array.from({ length: 12 }, () => ({
        prevista: 0,
        executada: 0,
      }));
      for (const i of inst2026) {
        const m = new Date(i.due_date + 'T12:00:00').getMonth();
        monthly[m].prevista += Number(i.value);
        if (i.status === 'received') monthly[m].executada += Number(i.value);
      }

      return { project: p, prevista, executada, monthly };
    })
    .filter((d) => d.prevista > 0 || d.executada > 0)
    .sort((a, b) => b.prevista - a.prevista);
}

export function generateProjectsRevenue2026Pdf(
  projects: PortfolioProject[],
  costs: Map<string, ProjectCostSummary>
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 24;

  // ── helpers ──────────────────────────────────────────────────────────────

  const drawPageHeader = () => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Origami Pulse — Relatório de Receitas e Custos 2026', margin, 8);
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      pageW - margin,
      8,
      { align: 'right' }
    );
    doc.setTextColor(20);
  };

  const drawPageFooter = (n: number, total: number) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(`Página ${n} de ${total}`, pageW / 2, pageH - 6, { align: 'center' });
    doc.setTextColor(20);
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 14) {
      doc.addPage();
      y = 24;
      drawPageHeader();
    }
  };

  const hLine = (yPos: number, gray = 220) => {
    doc.setDrawColor(gray);
    doc.line(margin, yPos, pageW - margin, yPos);
  };

  // ── data ─────────────────────────────────────────────────────────────────

  const summaries = buildRevenueSummaries(projects);

  const totalPrevista = summaries.reduce((s, d) => s + d.prevista, 0);
  const totalExecutada = summaries.reduce((s, d) => s + d.executada, 0);
  const execPct = totalPrevista > 0 ? (totalExecutada / totalPrevista) * 100 : 0;

  const totalCostPlanned = summaries.reduce((s, d) => s + (costs.get(d.project.id)?.totalPlanned ?? 0), 0);
  const totalCostActual = summaries.reduce((s, d) => s + (costs.get(d.project.id)?.totalActual ?? 0), 0);

  const marginPlanned = totalPrevista > 0 ? ((totalPrevista - totalCostPlanned) / totalPrevista) * 100 : 0;
  const marginActual = totalExecutada > 0 ? ((totalExecutada - totalCostActual) / totalExecutada) * 100 : 0;

  const monthlyTotals: { prevista: number; executada: number }[] = Array.from({ length: 12 }, () => ({
    prevista: 0,
    executada: 0,
  }));
  for (const d of summaries) {
    for (let m = 0; m < 12; m++) {
      monthlyTotals[m].prevista += d.monthly[m].prevista;
      monthlyTotals[m].executada += d.monthly[m].executada;
    }
  }

  // ── page 1: title + KPI cards ─────────────────────────────────────────────

  drawPageHeader();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text('Relatório de Receitas e Custos 2026', pageW / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Origami — Receitas e Custos Previstos vs. Realizados', pageW / 2, y, { align: 'center' });
  y += 10;
  doc.setTextColor(20);

  // KPI cards — 2 rows of 4
  const cardW = (contentW - 9) / 4;
  const cardH = 20;

  const row1 = [
    { label: 'Projetos c/ Receita em 2026', value: String(summaries.length) },
    { label: 'Receita Prevista', value: fmtCurrency(totalPrevista) },
    { label: 'Receita Executada', value: fmtCurrency(totalExecutada) },
    { label: '% Execução Receita', value: `${execPct.toFixed(1)}%` },
  ];
  const row2 = [
    { label: 'Custo Previsto Total', value: fmtCurrency(totalCostPlanned) },
    { label: 'Custo Real Total', value: fmtCurrency(totalCostActual) },
    { label: 'Margem Prevista', value: `${marginPlanned.toFixed(1)}%` },
    { label: 'Margem Real (receitas recebidas)', value: `${marginActual.toFixed(1)}%` },
  ];

  [row1, row2].forEach((row, ri) => {
    const rowY = y + ri * (cardH + 4);
    row.forEach((card, i) => {
      const x = margin + i * (cardW + 3);
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(220);
      doc.roundedRect(x, rowY, cardW, cardH, 2, 2, 'FD');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(card.label, x + cardW / 2, rowY + 6, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20);
      doc.text(card.value, x + cardW / 2, rowY + 15, { align: 'center' });
    });
  });
  y += 2 * (cardH + 4) + 6;

  // ── Monthly Revenue Overview ───────────────────────────────────────────────

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text('Visão Mensal de Receita Consolidada', margin, y);
  y += 5;
  hLine(y, 200);
  y += 4;

  const labelColW = 26;
  const mColW = (contentW - labelColW) / 12;
  const rowH = 6.5;

  const drawMonthlyHeader = () => {
    doc.setFillColor(40, 40, 40);
    doc.setTextColor(255);
    doc.rect(margin, y, contentW, rowH, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicador', margin + 2, y + 4.5);
    MONTHS_PT.forEach((m, i) => {
      doc.text(m, margin + labelColW + i * mColW + mColW / 2, y + 4.5, { align: 'center' });
    });
    y += rowH;
  };

  drawMonthlyHeader();

  // Prevista row
  doc.setFillColor(235, 245, 255);
  doc.setTextColor(20);
  doc.rect(margin, y, contentW, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Prevista', margin + 2, y + 4.5);
  doc.setFont('helvetica', 'normal');
  monthlyTotals.forEach((mt, i) => {
    doc.text(fmtK(mt.prevista), margin + labelColW + i * mColW + mColW / 2, y + 4.5, { align: 'center' });
  });
  y += rowH;

  // Executada row
  doc.setFillColor(235, 255, 240);
  doc.rect(margin, y, contentW, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Executada', margin + 2, y + 4.5);
  doc.setFont('helvetica', 'normal');
  monthlyTotals.forEach((mt, i) => {
    doc.text(fmtK(mt.executada), margin + labelColW + i * mColW + mColW / 2, y + 4.5, { align: 'center' });
  });
  y += rowH;

  // % row
  doc.setFillColor(250, 248, 235);
  doc.rect(margin, y, contentW, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('% Exec.', margin + 2, y + 4.5);
  monthlyTotals.forEach((mt, i) => {
    const pct = mt.prevista > 0 ? (mt.executada / mt.prevista) * 100 : 0;
    const txt = mt.prevista > 0 ? `${pct.toFixed(0)}%` : '—';
    if (mt.prevista > 0) {
      doc.setTextColor(pct >= 80 ? 34 : pct >= 50 ? 180 : 190, pct >= 80 ? 130 : pct >= 50 ? 120 : 50, pct >= 80 ? 34 : pct >= 50 ? 0 : 50);
    } else {
      doc.setTextColor(150);
    }
    doc.text(txt, margin + labelColW + i * mColW + mColW / 2, y + 4.5, { align: 'center' });
    doc.setTextColor(20);
  });
  y += rowH + 10;

  // ── Project Detail Table ───────────────────────────────────────────────────

  checkPage(40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text('Detalhamento por Projeto — Receita e Custo', margin, y);
  y += 5;
  hLine(y, 200);
  y += 4;

  // Column widths (raw proportions, scaled to fill contentW)
  const COLS = {
    name:       55,
    client:     38,
    type:       24,
    stage:      28,
    recPrev:    30,
    recExec:    30,
    recPct:     14,
    custoPrev:  30,
    custoReal:  30,
    margem:     14,
  };
  const totalRaw = Object.values(COLS).reduce((a, b) => a + b, 0);
  const sc = contentW / totalRaw;

  const cx: Record<string, number> = {};
  let accX = margin;
  for (const [key, w] of Object.entries(COLS)) {
    cx[key] = accX;
    accX += w * sc;
  }
  const cw = (k: keyof typeof COLS) => COLS[k] * sc;

  const TABLE_ROW_H = 7;

  // Header
  doc.setFillColor(40, 40, 40);
  doc.setTextColor(255);
  doc.rect(margin, y, contentW, TABLE_ROW_H, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Projeto', cx.name + 2, y + 5);
  doc.text('Cliente', cx.client + 2, y + 5);
  doc.text('Tipo', cx.type + 2, y + 5);
  doc.text('Estágio', cx.stage + 2, y + 5);
  doc.text('Rec. Prev.', cx.recPrev + cw('recPrev') - 2, y + 5, { align: 'right' });
  doc.text('Rec. Real', cx.recExec + cw('recExec') - 2, y + 5, { align: 'right' });
  doc.text('% Rec.', cx.recPct + cw('recPct') - 2, y + 5, { align: 'right' });
  doc.text('Custo Prev.', cx.custoPrev + cw('custoPrev') - 2, y + 5, { align: 'right' });
  doc.text('Custo Real', cx.custoReal + cw('custoReal') - 2, y + 5, { align: 'right' });
  doc.text('Margem', cx.margem + cw('margem') - 2, y + 5, { align: 'right' });
  y += TABLE_ROW_H;

  // Rows
  summaries.forEach((d, idx) => {
    checkPage(TABLE_ROW_H + 2);

    const { project, prevista, executada } = d;
    const cost = costs.get(project.id);
    const recPct = prevista > 0 ? (executada / prevista) * 100 : 0;
    const margem = executada > 0 && cost ? ((executada - cost.totalActual) / executada) * 100 : null;

    const fill = idx % 2 === 0 ? 250 : 255;
    doc.setFillColor(fill, fill, fill);
    doc.rect(margin, y, contentW, TABLE_ROW_H, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20);

    doc.text(doc.splitTextToSize(project.name, cw('name') - 4)[0] as string, cx.name + 2, y + 5);
    doc.text(
      doc.splitTextToSize(project.client?.trading_name || project.client?.company_name || '-', cw('client') - 4)[0] as string,
      cx.client + 2,
      y + 5
    );
    doc.text(getProjectTypeLabel(project), cx.type + 2, y + 5);
    doc.text(
      doc.splitTextToSize(PORTFOLIO_STAGE_LABELS[project.portfolio_stage] || '-', cw('stage') - 4)[0] as string,
      cx.stage + 2,
      y + 5
    );

    doc.text(fmtCurrency(prevista), cx.recPrev + cw('recPrev') - 2, y + 5, { align: 'right' });
    doc.text(fmtCurrency(executada), cx.recExec + cw('recExec') - 2, y + 5, { align: 'right' });

    // % receita — color coded
    doc.setFont('helvetica', 'bold');
    if (recPct >= 80) doc.setTextColor(34, 130, 34);
    else if (recPct >= 50) doc.setTextColor(180, 120, 0);
    else if (prevista > 0) doc.setTextColor(190, 50, 50);
    else doc.setTextColor(150);
    doc.text(`${recPct.toFixed(0)}%`, cx.recPct + cw('recPct') - 2, y + 5, { align: 'right' });
    doc.setTextColor(20);
    doc.setFont('helvetica', 'normal');

    doc.text(cost ? fmtCurrency(cost.totalPlanned) : '—', cx.custoPrev + cw('custoPrev') - 2, y + 5, { align: 'right' });
    doc.text(cost ? fmtCurrency(cost.totalActual) : '—', cx.custoReal + cw('custoReal') - 2, y + 5, { align: 'right' });

    // Margem
    doc.setFont('helvetica', 'bold');
    if (margem !== null) {
      if (margem >= 30) doc.setTextColor(34, 130, 34);
      else if (margem >= 0) doc.setTextColor(180, 120, 0);
      else doc.setTextColor(190, 50, 50);
      doc.text(`${margem.toFixed(1)}%`, cx.margem + cw('margem') - 2, y + 5, { align: 'right' });
    } else {
      doc.setTextColor(150);
      doc.text('—', cx.margem + cw('margem') - 2, y + 5, { align: 'right' });
    }
    doc.setTextColor(20);
    doc.setFont('helvetica', 'normal');

    y += TABLE_ROW_H;
  });

  // Totals row
  checkPage(TABLE_ROW_H + 4);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentW, TABLE_ROW_H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(20);
  doc.text('TOTAL', cx.name + 2, y + 5);
  doc.text(fmtCurrency(totalPrevista), cx.recPrev + cw('recPrev') - 2, y + 5, { align: 'right' });
  doc.text(fmtCurrency(totalExecutada), cx.recExec + cw('recExec') - 2, y + 5, { align: 'right' });
  doc.text(`${execPct.toFixed(1)}%`, cx.recPct + cw('recPct') - 2, y + 5, { align: 'right' });
  doc.text(fmtCurrency(totalCostPlanned), cx.custoPrev + cw('custoPrev') - 2, y + 5, { align: 'right' });
  doc.text(fmtCurrency(totalCostActual), cx.custoReal + cw('custoReal') - 2, y + 5, { align: 'right' });
  doc.text(`${marginActual.toFixed(1)}%`, cx.margem + cw('margem') - 2, y + 5, { align: 'right' });
  y += TABLE_ROW_H;

  // ── Cost Breakdown Section (page 2 if needed) ─────────────────────────────

  y += 10;
  checkPage(50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text('Detalhamento de Custos por Categoria', margin, y);
  y += 5;
  hLine(y, 200);
  y += 4;

  const CC = { name: 55, laborPrev: 32, laborReal: 32, supPrev: 32, supReal: 32, matPrev: 28, matReal: 28, total: 30 };
  const totalCC = Object.values(CC).reduce((a, b) => a + b, 0);
  const scC = contentW / totalCC;
  const ccx: Record<string, number> = {};
  let ax = margin;
  for (const [key, w] of Object.entries(CC)) {
    ccx[key] = ax;
    ax += w * scC;
  }
  const ccw = (k: keyof typeof CC) => CC[k] * scC;

  // Header
  doc.setFillColor(40, 40, 40);
  doc.setTextColor(255);
  doc.rect(margin, y, contentW, TABLE_ROW_H, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Projeto', ccx.name + 2, y + 5);
  doc.text('MO Prev.', ccx.laborPrev + ccw('laborPrev') - 2, y + 5, { align: 'right' });
  doc.text('MO Real', ccx.laborReal + ccw('laborReal') - 2, y + 5, { align: 'right' });
  doc.text('Fornec. Prev.', ccx.supPrev + ccw('supPrev') - 2, y + 5, { align: 'right' });
  doc.text('Fornec. Real', ccx.supReal + ccw('supReal') - 2, y + 5, { align: 'right' });
  doc.text('Mat. Prev.', ccx.matPrev + ccw('matPrev') - 2, y + 5, { align: 'right' });
  doc.text('Mat. Real', ccx.matReal + ccw('matReal') - 2, y + 5, { align: 'right' });
  doc.text('Total Real', ccx.total + ccw('total') - 2, y + 5, { align: 'right' });
  y += TABLE_ROW_H;

  summaries.forEach((d, idx) => {
    checkPage(TABLE_ROW_H + 2);
    const cost = costs.get(d.project.id);
    if (!cost) return;

    const fill = idx % 2 === 0 ? 250 : 255;
    doc.setFillColor(fill, fill, fill);
    doc.rect(margin, y, contentW, TABLE_ROW_H, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20);

    doc.text(doc.splitTextToSize(d.project.name, ccw('name') - 4)[0] as string, ccx.name + 2, y + 5);
    doc.text(fmtCurrency(cost.laborPlanned), ccx.laborPrev + ccw('laborPrev') - 2, y + 5, { align: 'right' });
    doc.text(fmtCurrency(cost.laborActual), ccx.laborReal + ccw('laborReal') - 2, y + 5, { align: 'right' });
    doc.text(fmtCurrency(cost.supplierPlanned), ccx.supPrev + ccw('supPrev') - 2, y + 5, { align: 'right' });
    doc.text(fmtCurrency(cost.supplierActual), ccx.supReal + ccw('supReal') - 2, y + 5, { align: 'right' });
    doc.text(fmtCurrency(cost.materialPlanned), ccx.matPrev + ccw('matPrev') - 2, y + 5, { align: 'right' });
    doc.text(fmtCurrency(cost.materialActual), ccx.matReal + ccw('matReal') - 2, y + 5, { align: 'right' });
    doc.text(fmtCurrency(cost.totalActual), ccx.total + ccw('total') - 2, y + 5, { align: 'right' });

    y += TABLE_ROW_H;
  });

  // Cost totals row
  checkPage(TABLE_ROW_H + 4);
  const totalLabPrev = summaries.reduce((s, d) => s + (costs.get(d.project.id)?.laborPlanned ?? 0), 0);
  const totalLabReal = summaries.reduce((s, d) => s + (costs.get(d.project.id)?.laborActual ?? 0), 0);
  const totalSupPrev = summaries.reduce((s, d) => s + (costs.get(d.project.id)?.supplierPlanned ?? 0), 0);
  const totalSupReal = summaries.reduce((s, d) => s + (costs.get(d.project.id)?.supplierActual ?? 0), 0);
  const totalMatPrev = summaries.reduce((s, d) => s + (costs.get(d.project.id)?.materialPlanned ?? 0), 0);
  const totalMatReal = summaries.reduce((s, d) => s + (costs.get(d.project.id)?.materialActual ?? 0), 0);

  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentW, TABLE_ROW_H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(20);
  doc.text('TOTAL', ccx.name + 2, y + 5);
  doc.text(fmtCurrency(totalLabPrev), ccx.laborPrev + ccw('laborPrev') - 2, y + 5, { align: 'right' });
  doc.text(fmtCurrency(totalLabReal), ccx.laborReal + ccw('laborReal') - 2, y + 5, { align: 'right' });
  doc.text(fmtCurrency(totalSupPrev), ccx.supPrev + ccw('supPrev') - 2, y + 5, { align: 'right' });
  doc.text(fmtCurrency(totalSupReal), ccx.supReal + ccw('supReal') - 2, y + 5, { align: 'right' });
  doc.text(fmtCurrency(totalMatPrev), ccx.matPrev + ccw('matPrev') - 2, y + 5, { align: 'right' });
  doc.text(fmtCurrency(totalMatReal), ccx.matReal + ccw('matReal') - 2, y + 5, { align: 'right' });
  doc.text(fmtCurrency(totalCostActual), ccx.total + ccw('total') - 2, y + 5, { align: 'right' });
  y += TABLE_ROW_H;

  // ── Footnotes ─────────────────────────────────────────────────────────────

  y += 8;
  checkPage(18);
  hLine(y, 200);
  y += 4;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  const notes = [
    '* Receita Prevista: parcelas com vencimento em 2026. Receita Executada: parcelas com status "Recebido" em 2026.',
    '* Custo Previsto (MO): alocação de horas × taxa horária do orçamento por mês do projeto em 2026.',
    '* Custo Real (MO): horas registradas em timesheets × taxa horária do orçamento.',
    '* Custo Real (Fornecedores): valores registrados em lançamentos mensais do projeto.',
    '* Materiais Prev.: itens ainda não realizados. Materiais Reais: itens marcados como realizados.',
    '* Margem Real = (Receita Recebida − Custo Real) / Receita Recebida. Dados extraídos do Origami Pulse.',
  ];
  for (const note of notes) {
    checkPage(5);
    doc.text(note, margin, y);
    y += 4;
  }

  // ── Page footers ──────────────────────────────────────────────────────────

  const totalPages = (doc.internal as any).pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(i, totalPages);
  }

  doc.save(`relatorio-receitas-custos-2026-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
