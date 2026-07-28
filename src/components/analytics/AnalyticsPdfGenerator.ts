import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution';
import type { ProjectFinancialsData } from '@/hooks/useProjectFinancials';
import type { RevenueAnalyticsData } from '@/hooks/useRevenueAnalytics';
import type { StakeholderAnalyticsData } from '@/hooks/useStakeholderAnalytics';
import { truncateToCents } from '@/lib/formatters';

export interface AnalyticsPdfFinancialKPIs {
  faturado: number;
  revenueActual: number;
  revenueProjected: number;
  totalCosts: number;
  laborCost: number;
  supplierCost: number;
  materialCost: number;
  commissionCost: number;
  grossMargin: number;
  grossMarginTarget: number | null;
}

export interface AnalyticsPdfInput {
  periodLabel: string;
  year: number;
  financialKPIs: AnalyticsPdfFinancialKPIs;
  financialMonths: FinancialMonthlyPoint[];
  projectFinancials: ProjectFinancialsData;
  revenueData: RevenueAnalyticsData;
  stakeholderData: StakeholderAnalyticsData;
}

const fmtCurrency = (v: number) =>
  truncateToCents(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (v: number | null) =>
  v === null ? '—' : `${v.toFixed(1)}%`;

const fmtK = (v: number) =>
  v === 0 ? '—' : `R$${(v / 1000).toFixed(0)}k`;

const COLOR_ACCENT = [32, 111, 74] as const;    // hsl(152,55%,28%) — primary do DS
const COLOR_GREEN  = [16, 185, 129] as const;   // emerald-500
const COLOR_RED    = [239, 68, 68] as const;    // red-500
const COLOR_GRAY   = [107, 114, 128] as const;  // gray-500
const COLOR_BG     = [235, 249, 243] as const;  // hsl(152,55%,95%) — fundo suave verde
const COLOR_HEADER = [215, 244, 230] as const;  // hsl(152,55%,90%) — cabeçalho tabela

export function generateAnalyticsPdf(input: AnalyticsPdfInput): void {
  const { periodLabel, year, financialKPIs, financialMonths, projectFinancials, revenueData, stakeholderData } = input;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  const getMonthKind = (monthIndex: number): 'past' | 'current' | 'future' => {
    if (year < currentYear) return 'past';
    if (year > currentYear) return 'future';
    if (monthIndex < currentMonth) return 'past';
    if (monthIndex === currentMonth) return 'current';
    return 'future';
  };

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  let y = 0;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const drawPageHeader = (title: string) => {
    doc.setFillColor(...COLOR_ACCENT);
    doc.rect(0, 0, pageW, 12, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Origami Pulse — Relatório de Analytics de Projetos (${periodLabel})`, margin, 8);
    doc.text(`Gerado em ${generatedAt}`, pageW - margin, 8, { align: 'right' });
    doc.setTextColor(20, 20, 20);
    y = 20;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_ACCENT);
    doc.text(title, margin, y);
    doc.setTextColor(20, 20, 20);
    y += 2;

    doc.setDrawColor(...COLOR_ACCENT);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  const drawPageFooter = () => {
    const pageCount = (doc.internal as any).getNumberOfPages();
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_GRAY);
    doc.text(`Página ${pageCount}`, pageW - margin, pageH - 6, { align: 'right' });
    doc.text('Confidencial — Origami Pulse', margin, pageH - 6);
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageH - 16) {
      drawPageFooter();
      doc.addPage();
      return true;
    }
    return false;
  };

  const drawKpiCard = (x: number, cardY: number, w: number, h: number, label: string, value: string, sub?: string, colorOk?: boolean) => {
    doc.setFillColor(...COLOR_BG);
    doc.roundedRect(x, cardY, w, h, 2, 2, 'F');
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, w, h, 2, 2, 'S');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_GRAY);
    doc.text(label, x + w / 2, cardY + 5, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    if (colorOk !== undefined) {
      const c = colorOk ? COLOR_GREEN : COLOR_RED;
      doc.setTextColor(c[0], c[1], c[2]);
    } else {
      doc.setTextColor(...COLOR_ACCENT);
    }
    doc.text(value, x + w / 2, cardY + 11, { align: 'center' });

    if (sub) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR_GRAY);
      doc.text(sub, x + w / 2, cardY + 16, { align: 'center' });
    }

    doc.setTextColor(20, 20, 20);
  };

  const drawTableHeader = (cols: { label: string; w: number; align?: 'left' | 'right' | 'center' }[]) => {
    doc.setFillColor(...COLOR_HEADER);
    doc.rect(margin, y, contentW, 6, 'F');
    let x = margin;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_ACCENT);
    for (const col of cols) {
      const align = col.align ?? 'left';
      const tx = align === 'right' ? x + col.w - 1 : align === 'center' ? x + col.w / 2 : x + 1;
      doc.text(col.label, tx, y + 4, { align });
      x += col.w;
    }
    doc.setTextColor(20, 20, 20);
    y += 6;
  };

  const drawTableRow = (
    cols: { value: string; w: number; align?: 'left' | 'right' | 'center'; bold?: boolean; color?: readonly [number, number, number] }[],
    rowIndex: number,
  ) => {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(245, 252, 248);
      doc.rect(margin, y, contentW, 5.5, 'F');
    }
    let x = margin;
    doc.setFontSize(6.5);
    for (const col of cols) {
      doc.setFont('helvetica', col.bold ? 'bold' : 'normal');
      if (col.color) doc.setTextColor(...col.color);
      else doc.setTextColor(30, 30, 30);
      const align = col.align ?? 'left';
      const tx = align === 'right' ? x + col.w - 1 : align === 'center' ? x + col.w / 2 : x + 1;
      doc.text(col.value, tx, y + 4, { align });
      x += col.w;
    }
    doc.setTextColor(20, 20, 20);
    y += 5.5;
  };

  const drawSectionTitle = (title: string) => {
    checkPageBreak(12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_ACCENT);
    doc.text(title, margin, y);
    doc.setTextColor(20, 20, 20);
    y += 1;
    doc.setDrawColor(...COLOR_ACCENT);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 80, y);
    y += 5;
  };

  // ─── PAGE 1: Visão Geral ─────────────────────────────────────────────────────

  drawPageHeader('Visão Geral');

  // KPI cards
  const kpiH = 19;
  const kpiCount = 4;
  const kpiW = (contentW - 3 * 3) / kpiCount;
  const target = financialKPIs.grossMarginTarget;
  const marginOk = target !== null ? financialKPIs.grossMargin >= target : undefined;

  drawKpiCard(margin,                     y, kpiW, kpiH, 'Faturado (NFs emitidas)', fmtCurrency(financialKPIs.faturado));
  drawKpiCard(margin + kpiW + 3,          y, kpiW, kpiH, 'Receita Recebida', fmtCurrency(financialKPIs.revenueActual));
  drawKpiCard(margin + (kpiW + 3) * 2,   y, kpiW, kpiH, 'Custos Totais', fmtCurrency(financialKPIs.totalCosts));
  drawKpiCard(
    margin + (kpiW + 3) * 3,
    y, kpiW, kpiH,
    'Margem Bruta',
    fmtPct(financialKPIs.grossMargin),
    target !== null ? `Meta: ${fmtPct(target)}` : undefined,
    marginOk,
  );
  y += kpiH + 6;

  // Monthly evolution table
  drawSectionTitle('Evolução Mensal');

  // Legend note
  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLOR_GRAY);
  doc.text('Real: meses passados  |  Real + Previsto: mês atual  |  Previsto: meses futuros', margin, y);
  doc.setTextColor(20, 20, 20);
  y += 4;

  const mCols = [
    { label: 'Mês',          w: 14 },
    { label: 'Faturado',     w: 28, align: 'right' as const },
    { label: 'Rec. Real',    w: 28, align: 'right' as const },
    { label: 'Custo Real',   w: 28, align: 'right' as const },
    { label: 'Mg. Real %',   w: 22, align: 'right' as const },
    { label: 'Rec. Prev.',   w: 28, align: 'right' as const },
    { label: 'Custo Prev.',  w: 28, align: 'right' as const },
    { label: 'Mg. Prev. %',  w: 22, align: 'right' as const },
    { label: 'M.O. Real',    w: 26, align: 'right' as const },
    { label: 'Forn. Real',   w: 26, align: 'right' as const },
  ];

  drawTableHeader(mCols);

  financialMonths.forEach((m, i) => {
    checkPageBreak(6);
    const kind = getMonthKind(m.monthIndex);
    const showReal = kind === 'past' || kind === 'current';
    const showPrev = kind === 'current' || kind === 'future';

    const realMarginColor = m.grossMarginPct !== null
      ? (m.grossMarginPct >= (target ?? 30) ? COLOR_GREEN : COLOR_RED)
      : COLOR_GRAY;
    const prevMarginColor = m.plannedGrossMarginPct !== null
      ? (m.plannedGrossMarginPct >= (target ?? 30) ? COLOR_GREEN : COLOR_RED)
      : COLOR_GRAY;

    // highlight current month row
    if (kind === 'current') {
      doc.setFillColor(...COLOR_HEADER);
      doc.rect(margin, y, contentW, 5.5, 'F');
    }

    drawTableRow([
      { value: m.label,                                                        w: mCols[0].w, bold: kind === 'current' },
      { value: showReal ? fmtK(m.faturado)          : '—',                    w: mCols[1].w, align: 'right' },
      { value: showReal ? fmtK(m.revenueReal)        : '—',                   w: mCols[2].w, align: 'right' },
      { value: showReal ? fmtK(m.totalCosts)         : '—',                   w: mCols[3].w, align: 'right' },
      { value: showReal ? fmtPct(m.grossMarginPct)   : '—',                   w: mCols[4].w, align: 'right', color: showReal ? realMarginColor : COLOR_GRAY },
      { value: showPrev ? fmtK(m.revenuePlanned)     : '—',                   w: mCols[5].w, align: 'right', color: showPrev ? undefined : COLOR_GRAY },
      { value: showPrev ? fmtK(m.plannedTotalCosts)  : '—',                   w: mCols[6].w, align: 'right', color: showPrev ? undefined : COLOR_GRAY },
      { value: showPrev ? fmtPct(m.plannedGrossMarginPct) : '—',              w: mCols[7].w, align: 'right', color: showPrev ? prevMarginColor : COLOR_GRAY },
      { value: showReal ? fmtK(m.laborCost)          : '—',                   w: mCols[8].w, align: 'right' },
      { value: showReal ? fmtK(m.supplierCost)       : '—',                   w: mCols[9].w, align: 'right' },
    ], i);
  });

  drawPageFooter();

  // ─── PAGE 2: Receita ─────────────────────────────────────────────────────────

  doc.addPage();
  drawPageHeader('Receita');

  const nfCount = revenueData.periodNFs.length;
  const overdueAmount = revenueData.overdueReceipts.reduce((s, o) => s + o.value, 0);
  const revKpiW = (contentW - 3 * 3) / 4;

  drawKpiCard(margin,                        y, revKpiW, kpiH, 'Faturado (NFs emitidas)', fmtCurrency(financialKPIs.faturado));
  drawKpiCard(margin + revKpiW + 3,          y, revKpiW, kpiH, 'Receita Recebida', fmtCurrency(financialKPIs.revenueActual));
  drawKpiCard(margin + (revKpiW + 3) * 2,   y, revKpiW, kpiH, 'Receita Prevista', fmtCurrency(financialKPIs.revenueProjected));
  drawKpiCard(margin + (revKpiW + 3) * 3,   y, revKpiW, kpiH, 'NFs Emitidas no Período', String(nfCount));
  y += kpiH + 6;

  // Inadimplência block
  if (overdueAmount > 0) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_RED);
    doc.text(
      `Inadimplência: ${fmtCurrency(overdueAmount)} em ${revenueData.overdueReceipts.length} recebível(is) vencido(s)`,
      margin + 3, y + 6,
    );
    doc.setTextColor(20, 20, 20);
    y += 15;
  }

  // Revenue by client
  drawSectionTitle('Receita por Cliente');

  const revCols = [
    { label: 'Cliente', w: 70 },
    { label: 'Faturado', w: 38, align: 'right' as const },
    { label: 'Recebido', w: 38, align: 'right' as const },
    { label: 'Previsto', w: 38, align: 'right' as const },
    { label: 'Conv.%', w: 28, align: 'right' as const },
  ];

  drawTableHeader(revCols);

  const topClients = [...revenueData.byClient]
    .sort((a, b) => b.faturado - a.faturado)
    .slice(0, 15);

  topClients.forEach((c, i) => {
    checkPageBreak(6);
    const conv = c.faturado > 0 ? (c.received / c.faturado) * 100 : null;
    drawTableRow([
      { value: c.label, w: revCols[0].w },
      { value: fmtK(c.faturado), w: revCols[1].w, align: 'right' },
      { value: fmtK(c.received), w: revCols[2].w, align: 'right' },
      { value: fmtK(c.planned), w: revCols[3].w, align: 'right' },
      { value: fmtPct(conv), w: revCols[4].w, align: 'right', color: conv !== null && conv >= 80 ? COLOR_GREEN : COLOR_GRAY },
    ], i);
  });

  // By manager
  if (revenueData.byManager.length > 0) {
    y += 4;
    drawSectionTitle('Receita por Gestor');
    const mgrCols = [
      { label: 'Gestor', w: 70 },
      { label: 'Faturado', w: 38, align: 'right' as const },
      { label: 'Recebido', w: 38, align: 'right' as const },
      { label: 'Previsto', w: 38, align: 'right' as const },
    ];
    drawTableHeader(mgrCols);
    revenueData.byManager.slice(0, 10).forEach((m, i) => {
      checkPageBreak(6);
      drawTableRow([
        { value: m.label, w: mgrCols[0].w },
        { value: fmtK(m.faturado), w: mgrCols[1].w, align: 'right' },
        { value: fmtK(m.received), w: mgrCols[2].w, align: 'right' },
        { value: fmtK(m.planned), w: mgrCols[3].w, align: 'right' },
      ], i);
    });
  }

  drawPageFooter();

  // ─── PAGE 3: Custos ──────────────────────────────────────────────────────────

  doc.addPage();
  drawPageHeader('Custos');

  const plannedCosts = financialMonths.filter(m => m.isHighlighted).reduce((s, m) => s + m.plannedTotalCosts, 0);

  // Row 1: 4 cards
  const costKpiW = (contentW - 3 * 3) / 4;
  drawKpiCard(margin,                          y, costKpiW, kpiH, 'Custo Total Realizado', fmtCurrency(financialKPIs.totalCosts));
  drawKpiCard(margin + costKpiW + 3,           y, costKpiW, kpiH, 'Custo Total Planejado', fmtCurrency(plannedCosts));
  drawKpiCard(margin + (costKpiW + 3) * 2,    y, costKpiW, kpiH, 'Mão de Obra', fmtCurrency(financialKPIs.laborCost));
  drawKpiCard(margin + (costKpiW + 3) * 3,    y, costKpiW, kpiH, 'Fornecedores', fmtCurrency(financialKPIs.supplierCost));
  y += kpiH + 3;

  // Row 2: 2 cards
  const costKpiW2 = (contentW - 1 * 3) / 2;
  drawKpiCard(margin,                           y, costKpiW2, kpiH, 'Materiais', fmtCurrency(financialKPIs.materialCost));
  drawKpiCard(margin + costKpiW2 + 3,           y, costKpiW2, kpiH, 'Comissões', fmtCurrency(financialKPIs.commissionCost));
  y += kpiH + 6;

  // Adherence alert
  if (plannedCosts > 0) {
    const adherencePct = (financialKPIs.totalCosts / plannedCosts) * 100;
    const adherenceOk = adherencePct <= 100;
    if (adherenceOk) doc.setFillColor(...COLOR_BG); else doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const adherenceColor = adherenceOk ? COLOR_GREEN : COLOR_RED;
    doc.setTextColor(adherenceColor[0], adherenceColor[1], adherenceColor[2]);
    doc.text(
      `Aderência ao orçamento: ${adherencePct.toFixed(1)}% do planejado utilizado — ${adherenceOk ? 'dentro do orçamento' : 'acima do orçamento'}`,
      margin + 3, y + 6,
    );
    doc.setTextColor(20, 20, 20);
    y += 15;
  }

  // Cost by project table
  drawSectionTitle('Custos por Projeto');

  const costProjCols = [
    { label: 'Projeto', w: 55 },
    { label: 'Cliente', w: 40 },
    { label: 'Gestor', w: 35 },
    { label: 'Receita', w: 32, align: 'right' as const },
    { label: 'Custo', w: 32, align: 'right' as const },
    { label: 'Margem', w: 24, align: 'right' as const },
    { label: 'Linha', w: 34 },
  ];

  drawTableHeader(costProjCols);

  const sortedProjects = [...projectFinancials.byProject].sort((a, b) => b.costs - a.costs);

  sortedProjects.forEach((p, i) => {
    checkPageBreak(6);
    const marginColor = p.grossMargin !== null
      ? (p.grossMargin >= (projectFinancials.grossMarginTarget ?? 30) ? COLOR_GREEN : COLOR_RED)
      : COLOR_GRAY;
    drawTableRow([
      { value: p.projectName.slice(0, 28), w: costProjCols[0].w },
      { value: p.clientName.slice(0, 20), w: costProjCols[1].w },
      { value: p.managerName.split(' ')[0], w: costProjCols[2].w },
      { value: fmtK(p.revenue), w: costProjCols[3].w, align: 'right' },
      { value: fmtK(p.costs), w: costProjCols[4].w, align: 'right' },
      { value: fmtPct(p.grossMargin), w: costProjCols[5].w, align: 'right', color: marginColor },
      { value: p.serviceLineLabel.slice(0, 18), w: costProjCols[6].w },
    ], i);
  });

  drawPageFooter();

  // ─── PAGE 4: Margem Bruta ────────────────────────────────────────────────────

  doc.addPage();
  drawPageHeader('Margem Bruta');

  const projectsAboveTarget = projectFinancials.byProject.filter(
    p => p.grossMargin !== null && p.grossMargin >= (projectFinancials.grossMarginTarget ?? 30),
  ).length;

  const marginKpiW = (contentW - 2 * 3) / 3;
  drawKpiCard(margin,                          y, marginKpiW, kpiH, 'Margem Bruta Realizada', fmtPct(financialKPIs.grossMargin), target !== null ? `Meta: ${fmtPct(target)}` : undefined, marginOk);
  drawKpiCard(margin + marginKpiW + 3,         y, marginKpiW, kpiH, 'Meta de Margem', target !== null ? fmtPct(target) : 'Não definida');
  drawKpiCard(margin + (marginKpiW + 3) * 2,  y, marginKpiW, kpiH, 'Projetos Acima da Meta', `${projectsAboveTarget} / ${projectFinancials.byProject.length}`);
  y += kpiH + 6;

  // Margin by project
  drawSectionTitle('Margem por Projeto');

  const marginProjCols = [
    { label: 'Projeto', w: 58 },
    { label: 'Cliente', w: 42 },
    { label: 'Receita', w: 34, align: 'right' as const },
    { label: 'Custos', w: 34, align: 'right' as const },
    { label: 'Margem %', w: 28, align: 'right' as const },
    { label: 'vs Meta', w: 24, align: 'center' as const },
    { label: 'Gestor', w: 32 },
  ];

  drawTableHeader(marginProjCols);

  const sortedByMargin = [...projectFinancials.byProject].sort((a, b) => {
    if (a.grossMargin === null) return 1;
    if (b.grossMargin === null) return -1;
    return b.grossMargin - a.grossMargin;
  });

  sortedByMargin.forEach((p, i) => {
    checkPageBreak(6);
    const aboveTarget = p.grossMargin !== null && p.grossMargin >= (projectFinancials.grossMarginTarget ?? 30);
    const marginColor = p.grossMargin !== null ? (aboveTarget ? COLOR_GREEN : COLOR_RED) : COLOR_GRAY;
    drawTableRow([
      { value: p.projectName.slice(0, 30), w: marginProjCols[0].w },
      { value: p.clientName.slice(0, 22), w: marginProjCols[1].w },
      { value: fmtK(p.revenue), w: marginProjCols[2].w, align: 'right' },
      { value: fmtK(p.costs), w: marginProjCols[3].w, align: 'right' },
      { value: fmtPct(p.grossMargin), w: marginProjCols[4].w, align: 'right', color: marginColor },
      { value: p.grossMargin !== null ? (aboveTarget ? '✓' : '✗') : '—', w: marginProjCols[5].w, align: 'center', color: marginColor },
      { value: p.managerName.split(' ')[0], w: marginProjCols[6].w },
    ], i);
  });

  // By client summary
  if (projectFinancials.byClient.length > 0) {
    y += 4;
    checkPageBreak(30);
    drawSectionTitle('Margem por Cliente');
    const dimCols = [
      { label: 'Cliente', w: 70 },
      { label: 'Receita', w: 36, align: 'right' as const },
      { label: 'Custos', w: 36, align: 'right' as const },
      { label: 'Margem %', w: 28, align: 'right' as const },
    ];
    drawTableHeader(dimCols);
    projectFinancials.byClient.slice(0, 10).forEach((c, i) => {
      checkPageBreak(6);
      const mc = c.grossMargin !== null ? (c.grossMargin >= (projectFinancials.grossMarginTarget ?? 30) ? COLOR_GREEN : COLOR_RED) : COLOR_GRAY;
      drawTableRow([
        { value: c.label, w: dimCols[0].w },
        { value: fmtK(c.revenue), w: dimCols[1].w, align: 'right' },
        { value: fmtK(c.costs), w: dimCols[2].w, align: 'right' },
        { value: fmtPct(c.grossMargin), w: dimCols[3].w, align: 'right', color: mc },
      ], i);
    });
  }

  drawPageFooter();

  // ─── PAGE 5: Satisfação ──────────────────────────────────────────────────────

  doc.addPage();
  drawPageHeader('Satisfação de Stakeholders');

  const { totals } = stakeholderData;
  const satKpiW = (contentW - 3 * 3) / 4;
  const promoterPct = totals.total > 0 ? (totals.promoters / totals.total) * 100 : 0;

  drawKpiCard(margin,                       y, satKpiW, kpiH, 'Total de Stakeholders', String(totals.total));
  drawKpiCard(margin + satKpiW + 3,         y, satKpiW, kpiH, 'Promotores', `${totals.promoters} (${fmtPct(promoterPct)})`, undefined, promoterPct >= 60);
  drawKpiCard(margin + (satKpiW + 3) * 2,  y, satKpiW, kpiH, 'Neutros', String(totals.neutrals));
  drawKpiCard(margin + (satKpiW + 3) * 3,  y, satKpiW, kpiH, 'Detratores', String(totals.detractors), undefined, totals.detractors === 0);
  y += kpiH + 6;

  // By project distribution
  if (stakeholderData.byProject.length > 0) {
    drawSectionTitle('Distribuição por Projeto');
    const satProjCols = [
      { label: 'Projeto', w: 80 },
      { label: 'Total', w: 22, align: 'right' as const },
      { label: 'Promotores', w: 30, align: 'right' as const },
      { label: '% Promo.', w: 26, align: 'right' as const },
      { label: 'Neutros', w: 26, align: 'right' as const },
      { label: 'Detratores', w: 30, align: 'right' as const },
      { label: '% Detr.', w: 24, align: 'right' as const },
    ];
    drawTableHeader(satProjCols);
    stakeholderData.byProject.forEach((p, i) => {
      checkPageBreak(6);
      drawTableRow([
        { value: p.projectName.slice(0, 40), w: satProjCols[0].w },
        { value: String(p.total), w: satProjCols[1].w, align: 'right' },
        { value: String(p.promoters), w: satProjCols[2].w, align: 'right', color: COLOR_GREEN },
        { value: fmtPct(p.promoterPercent), w: satProjCols[3].w, align: 'right', color: p.promoterPercent >= 60 ? COLOR_GREEN : COLOR_GRAY },
        { value: String(p.neutrals), w: satProjCols[4].w, align: 'right' },
        { value: String(p.detractors), w: satProjCols[5].w, align: 'right', color: p.detractors > 0 ? COLOR_RED : COLOR_GRAY },
        { value: fmtPct(p.detractorPercent), w: satProjCols[6].w, align: 'right', color: p.detractorPercent > 20 ? COLOR_RED : COLOR_GRAY },
      ], i);
    });
    y += 4;
  }

  // High-influence detractors
  if (stakeholderData.highInfluenceDetractors.length > 0) {
    checkPageBreak(20);
    drawSectionTitle('Detratores de Alta Influência — Ações Recomendadas');
    const detrCols = [
      { label: 'Nome', w: 50 },
      { label: 'Projeto', w: 60 },
      { label: 'Cargo', w: 50 },
      { label: 'Ação Recomendada', w: 92 },
    ];
    drawTableHeader(detrCols);
    stakeholderData.highInfluenceDetractors.forEach((d, i) => {
      checkPageBreak(6);
      drawTableRow([
        { value: d.name.slice(0, 26), w: detrCols[0].w, bold: true },
        { value: d.projectName.slice(0, 32), w: detrCols[1].w },
        { value: (d.jobTitle ?? '—').slice(0, 26), w: detrCols[2].w },
        { value: (d.action ?? '—').slice(0, 48), w: detrCols[3].w },
      ], i);
    });
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLOR_GRAY);
    doc.text('Nenhum detrator de alta influência identificado no período.', margin, y + 4);
    doc.setTextColor(20, 20, 20);
    y += 10;
  }

  drawPageFooter();

  // ─── Save ────────────────────────────────────────────────────────────────────

  const fileName = `relatorio-analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
