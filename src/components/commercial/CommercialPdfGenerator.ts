import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LeadWithBudget } from '@/types/lead';
import { getFunnelIndex, getStageForecastWeight, getStageLabel } from '@/types/lead';

/**
 * Índice de ordenação por etapa. Etapas fora do funil (nutrição) vão para o
 * fim: `indexOf` devolveria -1 e as jogaria para o topo do relatório.
 */
function funnelSortIndex(stage: string): number {
  const index = getFunnelIndex(stage);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}
import { truncateToCents } from '@/lib/formatters';
import { resolveLeadEstimatedValue } from '@/lib/leadValue';

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CommercialPdfKPIs {
  conversionRate: number;
  avgTicket: number;
  avgSalesCycleDays: number | null;
  activePipeline: number;
  forecast: number;
  forecastLeadsCount: number;
  newLeadsThisYear: number;
  prevConversionRate: number;
  prevAvgTicket: number;
  prevActivePipeline: number;
  prevForecast: number;
  prevNewLeadsThisYear: number;
}

export interface CommercialPdfInput {
  periodLabel: string;
  kpis: CommercialPdfKPIs;
  funnelData: { stage: string; label: string; count: number }[];
  revenueByMonth: { month: string; wonMonth: number; lostMonth: number; wonAccumulated: number }[];
  pipelineByStage: { name: string; value: number; count: number }[];
  totalPipeline: number;
  topClients: { name: string; value: number }[];
  lossReasons: { reason: string; count: number }[];
  leadsBySource: { source: string; label: string; count: number; wonCount: number; conversionRate: number }[];
  activeLeads: LeadWithBudget[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  truncateToCents(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtK = (v: number) =>
  v === 0 ? '—' : v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : fmtCurrency(v);

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const fmtDelta = (curr: number, prev: number): string => {
  if (prev === 0) return '';
  const delta = curr - prev;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${fmtPct((delta / prev) * 100)} vs ant.`;
};


// ─── Colors ───────────────────────────────────────────────────────────────────

const C_ACCENT  = [15, 118, 110] as const;   // teal-700
const C_DARK    = [17, 24, 39] as const;      // gray-900
const C_GRAY    = [107, 114, 128] as const;   // gray-500
const C_GREEN   = [22, 163, 74] as const;     // green-600
const C_RED     = [220, 38, 38] as const;     // red-600
const C_BG      = [240, 253, 250] as const;   // teal-50
const C_HDR     = [204, 251, 241] as const;   // teal-100

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateCommercialPdf(input: CommercialPdfInput): void {
  const { periodLabel, kpis, funnelData, revenueByMonth, pipelineByStage, totalPipeline, topClients, lossReasons, leadsBySource, activeLeads } = input;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  let y = 0;

  // ── Shared helpers ──────────────────────────────────────────────────────────

  const drawHeader = (title: string) => {
    doc.setFillColor(...C_ACCENT);
    doc.rect(0, 0, pageW, 12, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Origami Pulse — Relatório Comercial (${periodLabel})`, margin, 8);
    doc.text(`Gerado em ${generatedAt}`, pageW - margin, 8, { align: 'right' });
    doc.setTextColor(...C_DARK);
    y = 20;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_ACCENT);
    doc.text(title, margin, y);
    doc.setTextColor(...C_DARK);
    y += 2;
    doc.setDrawColor(...C_ACCENT);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  const drawFooter = () => {
    const n = (doc.internal as any).getNumberOfPages();
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
      return true;
    }
    return false;
  };

  const sectionTitle = (title: string) => {
    checkBreak(12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_ACCENT);
    doc.text(title, margin, y);
    doc.setTextColor(...C_DARK);
    y += 1;
    doc.setDrawColor(...C_ACCENT);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 80, y);
    y += 5;
  };

  type ColDef = { label: string; w: number; align?: 'left' | 'right' | 'center' };

  const tableHeader = (cols: ColDef[]) => {
    doc.setFillColor(...C_HDR);
    doc.rect(margin, y, contentW, 6, 'F');
    let x = margin;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_ACCENT);
    for (const col of cols) {
      const align = col.align ?? 'left';
      const tx = align === 'right' ? x + col.w - 1 : align === 'center' ? x + col.w / 2 : x + 1;
      doc.text(col.label, tx, y + 4, { align });
      x += col.w;
    }
    doc.setTextColor(...C_DARK);
    y += 6;
  };

  type CellDef = { value: string; w: number; align?: 'left' | 'right' | 'center'; bold?: boolean; color?: readonly [number, number, number] };

  const tableRow = (cells: CellDef[], rowIdx: number, forceColor?: readonly [number, number, number]) => {
    if (rowIdx % 2 === 0) {
      doc.setFillColor(...C_BG);
      doc.rect(margin, y, contentW, 5.5, 'F');
    }
    let x = margin;
    doc.setFontSize(6.5);
    for (const cell of cells) {
      doc.setFont('helvetica', cell.bold ? 'bold' : 'normal');
      const color = forceColor ?? cell.color;
      if (color) doc.setTextColor(color[0], color[1], color[2]);
      else doc.setTextColor(...C_DARK);
      const align = cell.align ?? 'left';
      const tx = align === 'right' ? x + cell.w - 1 : align === 'center' ? x + cell.w / 2 : x + 1;
      doc.text(cell.value, tx, y + 4, { align });
      x += cell.w;
    }
    doc.setTextColor(...C_DARK);
    y += 5.5;
  };

  const kpiCard = (x: number, cardY: number, w: number, h: number, label: string, value: string, sub?: string, subColor?: readonly [number, number, number]) => {
    doc.setFillColor(...C_BG);
    doc.roundedRect(x, cardY, w, h, 2, 2, 'F');
    doc.setDrawColor(200, 240, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, w, h, 2, 2, 'S');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_GRAY);
    doc.text(label, x + w / 2, cardY + 5, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_ACCENT);
    doc.text(value, x + w / 2, cardY + 12, { align: 'center' });

    if (sub) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      if (subColor) doc.setTextColor(subColor[0], subColor[1], subColor[2]);
      else doc.setTextColor(...C_GRAY);
      doc.text(sub, x + w / 2, cardY + 17, { align: 'center' });
    }

    doc.setTextColor(...C_DARK);
  };

  // ── PAGE 1: Resumo Executivo ────────────────────────────────────────────────

  drawHeader('Resumo Executivo');

  // Row 1: 4 KPI cards
  const kH = 21;
  const kW4 = (contentW - 9) / 4;

  const convDelta = fmtDelta(kpis.conversionRate, kpis.prevConversionRate);
  const ticketDelta = fmtDelta(kpis.avgTicket, kpis.prevAvgTicket);
  const pipelineDelta = fmtDelta(kpis.activePipeline, kpis.prevActivePipeline);
  const forecastDelta = fmtDelta(kpis.forecast, kpis.prevForecast);

  const convOk = kpis.conversionRate >= kpis.prevConversionRate;
  const ticketOk = kpis.avgTicket >= kpis.prevAvgTicket;
  const pipelineOk = kpis.activePipeline >= kpis.prevActivePipeline;
  const forecastOk = kpis.forecast >= kpis.prevForecast;

  kpiCard(margin,              y, kW4, kH, 'Taxa de Conversão', fmtPct(kpis.conversionRate), convDelta, convOk ? C_GREEN : C_RED);
  kpiCard(margin + kW4 + 3,   y, kW4, kH, 'Ticket Médio (Fechados)', fmtK(kpis.avgTicket), ticketDelta, ticketOk ? C_GREEN : C_RED);
  kpiCard(margin + (kW4+3)*2, y, kW4, kH, 'Pipeline Ativo', fmtK(kpis.activePipeline), pipelineDelta, pipelineOk ? C_GREEN : C_RED);
  kpiCard(margin + (kW4+3)*3, y, kW4, kH, 'Forecast Ponderado', fmtK(kpis.forecast), forecastDelta, forecastOk ? C_GREEN : C_RED);
  y += kH + 3;

  // Row 2: 3 KPI cards
  const kW3 = (contentW - 6) / 3;
  const leadsOk = kpis.newLeadsThisYear >= kpis.prevNewLeadsThisYear;

  kpiCard(margin,            y, kW3, kH, 'Novas Oportunidades', String(kpis.newLeadsThisYear), fmtDelta(kpis.newLeadsThisYear, kpis.prevNewLeadsThisYear), leadsOk ? C_GREEN : C_RED);
  kpiCard(margin + kW3 + 3, y, kW3, kH, 'Ciclo Médio de Vendas', kpis.avgSalesCycleDays !== null ? `${Math.round(kpis.avgSalesCycleDays)} dias` : '—');
  kpiCard(margin + (kW3+3)*2, y, kW3, kH, 'Leads c/ Valor no Forecast', `${kpis.forecastLeadsCount} leads`);
  y += kH + 6;

  // Funil de Vendas
  sectionTitle('Funil de Vendas');

  const totalFunnel = funnelData.reduce((s, f) => s + f.count, 0);
  const funnelCols: ColDef[] = [
    { label: 'Estágio', w: 52 },
    { label: 'Leads', w: 24, align: 'right' },
    { label: '% do Total', w: 30, align: 'right' },
    { label: 'Prob. Conversão', w: 42, align: 'right' },
  ];
  tableHeader(funnelCols);

  funnelData.forEach((f, i) => {
    const pct = totalFunnel > 0 ? (f.count / totalFunnel) * 100 : 0;
    const prob = getStageForecastWeight(f.stage) * 100;
    tableRow([
      { value: f.label, w: funnelCols[0].w, bold: true },
      { value: String(f.count), w: funnelCols[1].w, align: 'right' },
      { value: fmtPct(pct), w: funnelCols[2].w, align: 'right' },
      { value: prob !== undefined ? fmtPct(prob) : '—', w: funnelCols[3].w, align: 'right' },
    ], i);
  });

  drawFooter();

  // ── PAGE 2: Pipeline e Receita ──────────────────────────────────────────────

  doc.addPage();
  drawHeader('Pipeline e Receita');

  // Pipeline by stage
  sectionTitle('Pipeline por Estágio');

  const pipelineCols: ColDef[] = [
    { label: 'Estágio', w: 52 },
    { label: 'Leads', w: 24, align: 'right' },
    { label: 'Valor Total', w: 44, align: 'right' },
    { label: '% do Pipeline', w: 36, align: 'right' },
  ];
  tableHeader(pipelineCols);

  pipelineByStage.forEach((s, i) => {
    const pct = totalPipeline > 0 ? (s.value / totalPipeline) * 100 : 0;
    tableRow([
      { value: s.name, w: pipelineCols[0].w, bold: true },
      { value: String(s.count), w: pipelineCols[1].w, align: 'right' },
      { value: fmtK(s.value), w: pipelineCols[2].w, align: 'right' },
      { value: fmtPct(pct), w: pipelineCols[3].w, align: 'right' },
    ], i);
  });

  // total row
  checkBreak(6);
  doc.setFillColor(220, 245, 235);
  doc.rect(margin, y, contentW, 5.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C_ACCENT);
  doc.text('Total', margin + 1, y + 4);
  doc.text(fmtK(totalPipeline), margin + pipelineCols[0].w + pipelineCols[1].w + pipelineCols[2].w - 1, y + 4, { align: 'right' });
  doc.setTextColor(...C_DARK);
  y += 5.5 + 5;

  // Revenue by month
  sectionTitle('Receita por Mês');

  const revCols: ColDef[] = [
    { label: 'Mês', w: 26 },
    { label: 'Ganho no Mês', w: 44, align: 'right' },
    { label: 'Perdido no Mês', w: 44, align: 'right' },
    { label: 'Acumulado Ganho', w: 46, align: 'right' },
  ];
  tableHeader(revCols);

  revenueByMonth.forEach((m, i) => {
    checkBreak(6);
    tableRow([
      { value: m.month, w: revCols[0].w },
      { value: m.wonMonth > 0 ? fmtK(m.wonMonth) : '—', w: revCols[1].w, align: 'right', color: m.wonMonth > 0 ? C_GREEN : C_GRAY },
      { value: m.lostMonth > 0 ? fmtK(m.lostMonth) : '—', w: revCols[2].w, align: 'right', color: m.lostMonth > 0 ? C_RED : C_GRAY },
      { value: m.wonAccumulated > 0 ? fmtK(m.wonAccumulated) : '—', w: revCols[3].w, align: 'right' },
    ], i);
  });

  y += 5;

  // Top clients + loss reasons side by side if space allows
  const halfW = (contentW - 6) / 2;

  checkBreak(50);
  const col2Y = y;

  // Top clients (left)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C_ACCENT);
  doc.text('Top Clientes', margin, y);
  doc.setTextColor(...C_DARK);
  y += 1;
  doc.setDrawColor(...C_ACCENT);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 60, y);
  y += 5;

  const clientCols: ColDef[] = [
    { label: 'Cliente', w: halfW - 40 },
    { label: 'Receita Fechada', w: 40, align: 'right' },
  ];

  // header manually (left half only)
  doc.setFillColor(...C_HDR);
  doc.rect(margin, y, halfW, 6, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C_ACCENT);
  doc.text('Cliente', margin + 1, y + 4);
  doc.text('Receita Fechada', margin + halfW - 1, y + 4, { align: 'right' });
  doc.setTextColor(...C_DARK);
  y += 6;

  const clientStartY = y;
  topClients.forEach((c, i) => {
    if (i % 2 === 0) { doc.setFillColor(...C_BG); doc.rect(margin, y, halfW, 5.5, 'F'); }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
    doc.setTextColor(...C_DARK);
    doc.text(c.name.slice(0, 28), margin + 1, y + 4);
    doc.setTextColor(...C_GREEN);
    doc.text(fmtK(c.value), margin + halfW - 1, y + 4, { align: 'right' });
    doc.setTextColor(...C_DARK);
    y += 5.5;
  });

  // Loss reasons (right column)
  const rightX = margin + halfW + 6;
  let ry = col2Y;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C_ACCENT);
  doc.text('Motivos de Perda', rightX, ry);
  doc.setTextColor(...C_DARK);
  ry += 1;
  doc.setDrawColor(...C_ACCENT);
  doc.setLineWidth(0.3);
  doc.line(rightX, ry, rightX + 70, ry);
  ry += 5;

  const totalLost = lossReasons.reduce((s, l) => s + l.count, 0);

  doc.setFillColor(...C_HDR);
  doc.rect(rightX, ry, halfW, 6, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C_ACCENT);
  doc.text('Motivo', rightX + 1, ry + 4);
  doc.text('Qtd.', rightX + halfW - 20, ry + 4, { align: 'right' });
  doc.text('%', rightX + halfW - 1, ry + 4, { align: 'right' });
  doc.setTextColor(...C_DARK);
  ry += 6;

  lossReasons.forEach((l, i) => {
    const pct = totalLost > 0 ? (l.count / totalLost) * 100 : 0;
    if (i % 2 === 0) { doc.setFillColor(...C_BG); doc.rect(rightX, ry, halfW, 5.5, 'F'); }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_DARK);
    doc.text(l.reason.slice(0, 32), rightX + 1, ry + 4);
    doc.setTextColor(...C_RED);
    doc.text(String(l.count), rightX + halfW - 20, ry + 4, { align: 'right' });
    doc.text(fmtPct(pct), rightX + halfW - 1, ry + 4, { align: 'right' });
    doc.setTextColor(...C_DARK);
    ry += 5.5;
  });

  y = Math.max(y, ry) + 6;

  // Leads by source (origem)
  checkBreak(20);
  sectionTitle('Leads por Origem');

  const sourceCols: ColDef[] = [
    { label: 'Origem', w: 60 },
    { label: 'Leads', w: 24, align: 'right' },
    { label: 'Ganhos', w: 24, align: 'right' },
    { label: 'Taxa de Conversão', w: 42, align: 'right' },
  ];
  tableHeader(sourceCols);

  leadsBySource.forEach((s, i) => {
    checkBreak(6);
    tableRow([
      { value: s.label, w: sourceCols[0].w, bold: true },
      { value: String(s.count), w: sourceCols[1].w, align: 'right' },
      { value: String(s.wonCount), w: sourceCols[2].w, align: 'right', color: s.wonCount > 0 ? C_GREEN : C_GRAY },
      { value: fmtPct(s.conversionRate), w: sourceCols[3].w, align: 'right' },
    ], i);
  });

  drawFooter();

  // ── PAGE 3: Leads Ativos por Estágio ───────────────────────────────────────

  doc.addPage();
  drawHeader('Leads Ativos no Período');

  const leadCols: ColDef[] = [
    { label: 'Oportunidade', w: 52 },
    { label: 'Empresa', w: 40 },
    { label: 'Estágio', w: 30 },
    { label: 'Valor', w: 30, align: 'right' },
    { label: 'Orçamento', w: 30, align: 'right' },
    { label: 'Responsável', w: 30 },
    { label: 'Linha', w: 34 },
    { label: 'Criado em', w: 23, align: 'right' },
  ];

  const SERVICE_LINE: Record<string, string> = {
    financiamento_inovacao: 'Fin. Inovação',
    consultoria_estrategica: 'Consultoria',
    product_studio: 'Product Studio',
    educacao_corporativa: 'Educ. Corp.',
    ventures: 'Ventures',
  };

  // Sort by stage order then by value desc
  const sortedLeads = [...activeLeads]
    .filter(l => !l.archived)
    .sort((a, b) => {
      const stageOrder = funnelSortIndex(a.crm_stage) - funnelSortIndex(b.crm_stage);
      if (stageOrder !== 0) return stageOrder;
      return resolveLeadEstimatedValue(b) - resolveLeadEstimatedValue(a);
    });

  let lastStage = '';

  sortedLeads.forEach((lead, i) => {
    // Stage separator header
    if (lead.crm_stage !== lastStage) {
      checkBreak(14);
      if (lastStage !== '') y += 3;
      doc.setFillColor(...C_ACCENT);
      doc.rect(margin, y, contentW, 7, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const stageLeads = sortedLeads.filter(l => l.crm_stage === lead.crm_stage);
      const stageTotal = stageLeads.reduce((s, l) => s + resolveLeadEstimatedValue(l), 0);
      doc.text(
        `${getStageLabel(lead.crm_stage)}   (${stageLeads.length} oportunidades — ${fmtK(stageTotal)})`,
        margin + 2, y + 5,
      );
      doc.setTextColor(...C_DARK);
      y += 7;

      tableHeader(leadCols);
      lastStage = lead.crm_stage;
      i = 0; // reset row stripe for each stage
    }

    checkBreak(6);
    const value = lead.estimated_value;
    const budget = lead.budget?.final_total || 0;
    const responsibleName = lead.responsible?.nome?.split(' ')[0] ?? '—';
    const serviceLine = SERVICE_LINE[lead.service_line ?? ''] ?? '—';
    const createdAt = format(parseISO(lead.created_at), 'dd/MM/yy');

    tableRow([
      { value: lead.name.slice(0, 26), w: leadCols[0].w, bold: true },
      { value: (lead.company_name ?? '—').slice(0, 20), w: leadCols[1].w },
      { value: getStageLabel(lead.crm_stage), w: leadCols[2].w },
      { value: value > 0 ? fmtK(value) : '—', w: leadCols[3].w, align: 'right' },
      { value: budget > 0 ? fmtK(budget) : '—', w: leadCols[4].w, align: 'right', color: budget > 0 ? C_GREEN : C_GRAY },
      { value: responsibleName, w: leadCols[5].w },
      { value: serviceLine, w: leadCols[6].w },
      { value: createdAt, w: leadCols[7].w, align: 'right' },
    ], i);
  });

  if (sortedLeads.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C_GRAY);
    doc.text('Nenhum lead ativo no período selecionado.', margin, y + 4);
    doc.setTextColor(...C_DARK);
    y += 10;
  }

  drawFooter();

  // ── Save ────────────────────────────────────────────────────────────────────

  const fileName = `relatorio-comercial-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
