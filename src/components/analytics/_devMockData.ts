/**
 * Dados de demonstração para visualização local do Analytics.
 * Ativado via DEV_MOCK em Analytics.tsx — remover antes do merge.
 */
import type { FinancialEvolutionData } from '@/hooks/useFinancialEvolution'
import type { ProjectFinancialsData, DimensionFinancialRow } from '@/hooks/useProjectFinancials'

export const MOCK_FINANCIAL_EVOLUTION: FinancialEvolutionData = {
  year: 2026,
  grossMarginTarget: 25,
  months: [
    {
      monthIndex: 0, label: 'jan', isHighlighted: false, isPast: true, isCurrent: false,
      revenueReal: 38000, revenuePlanned: 40000, faturado: 35000,
      totalCosts: 28000, laborCost: 18000, supplierCost: 6000, materialCost: 2500, commissionCost: 1000, reimbursementCost: 500,
      plannedTotalCosts: 29000, plannedLaborCost: 19000, plannedSupplierCost: 7000, plannedMaterialCost: 3000,
      grossMarginPct: 26.3, plannedGrossMarginPct: 27.5,
    },
    {
      monthIndex: 1, label: 'fev', isHighlighted: false, isPast: true, isCurrent: false,
      revenueReal: 55000, revenuePlanned: 52000, faturado: 55000,
      totalCosts: 38000, laborCost: 24000, supplierCost: 8000, materialCost: 3500, commissionCost: 1500, reimbursementCost: 1000,
      plannedTotalCosts: 37000, plannedLaborCost: 23000, plannedSupplierCost: 8500, plannedMaterialCost: 5500,
      grossMarginPct: 30.9, plannedGrossMarginPct: 28.8,
    },
    {
      monthIndex: 2, label: 'mar', isHighlighted: false, isPast: true, isCurrent: false,
      revenueReal: 72000, revenuePlanned: 70000, faturado: 65000,
      totalCosts: 52000, laborCost: 32000, supplierCost: 12000, materialCost: 5000, commissionCost: 2000, reimbursementCost: 1000,
      plannedTotalCosts: 51000, plannedLaborCost: 31000, plannedSupplierCost: 12000, plannedMaterialCost: 8000,
      grossMarginPct: 27.8, plannedGrossMarginPct: 27.1,
    },
    {
      monthIndex: 3, label: 'abr', isHighlighted: true, isPast: true, isCurrent: false,
      revenueReal: 88000, revenuePlanned: 85000, faturado: 80000,
      totalCosts: 63000, laborCost: 40000, supplierCost: 14000, materialCost: 5500, commissionCost: 2000, reimbursementCost: 1500,
      plannedTotalCosts: 60000, plannedLaborCost: 38000, plannedSupplierCost: 14000, plannedMaterialCost: 8000,
      grossMarginPct: 28.4, plannedGrossMarginPct: 29.4,
    },
    {
      monthIndex: 4, label: 'mai', isHighlighted: true, isPast: true, isCurrent: false,
      revenueReal: 95000, revenuePlanned: 90000, faturado: 90000,
      totalCosts: 72000, laborCost: 45000, supplierCost: 16000, materialCost: 7000, commissionCost: 3000, reimbursementCost: 1000,
      plannedTotalCosts: 67000, plannedLaborCost: 42000, plannedSupplierCost: 15000, plannedMaterialCost: 10000,
      grossMarginPct: 24.2, plannedGrossMarginPct: 25.6,
    },
    {
      monthIndex: 5, label: 'jun', isHighlighted: true, isPast: true, isCurrent: true,
      revenueReal: 72000, revenuePlanned: 95000, faturado: 55000,
      totalCosts: 43000, laborCost: 28000, supplierCost: 9000, materialCost: 4000, commissionCost: 1500, reimbursementCost: 500,
      plannedTotalCosts: 70000, plannedLaborCost: 44000, plannedSupplierCost: 16000, plannedMaterialCost: 10000,
      grossMarginPct: 40.3, plannedGrossMarginPct: 26.3,
    },
    // Jul–Dez: meses futuros sem dados
    { monthIndex: 6,  label: 'jul', isHighlighted: false, isPast: false, isCurrent: false, revenueReal: 0, revenuePlanned: 0, faturado: 0, totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0, commissionCost: 0, reimbursementCost: 0, plannedTotalCosts: 0, plannedLaborCost: 0, plannedSupplierCost: 0, plannedMaterialCost: 0, grossMarginPct: null, plannedGrossMarginPct: null },
    { monthIndex: 7,  label: 'ago', isHighlighted: false, isPast: false, isCurrent: false, revenueReal: 0, revenuePlanned: 0, faturado: 0, totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0, commissionCost: 0, reimbursementCost: 0, plannedTotalCosts: 0, plannedLaborCost: 0, plannedSupplierCost: 0, plannedMaterialCost: 0, grossMarginPct: null, plannedGrossMarginPct: null },
    { monthIndex: 8,  label: 'set', isHighlighted: false, isPast: false, isCurrent: false, revenueReal: 0, revenuePlanned: 0, faturado: 0, totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0, commissionCost: 0, reimbursementCost: 0, plannedTotalCosts: 0, plannedLaborCost: 0, plannedSupplierCost: 0, plannedMaterialCost: 0, grossMarginPct: null, plannedGrossMarginPct: null },
    { monthIndex: 9,  label: 'out', isHighlighted: false, isPast: false, isCurrent: false, revenueReal: 0, revenuePlanned: 0, faturado: 0, totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0, commissionCost: 0, reimbursementCost: 0, plannedTotalCosts: 0, plannedLaborCost: 0, plannedSupplierCost: 0, plannedMaterialCost: 0, grossMarginPct: null, plannedGrossMarginPct: null },
    { monthIndex: 10, label: 'nov', isHighlighted: false, isPast: false, isCurrent: false, revenueReal: 0, revenuePlanned: 0, faturado: 0, totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0, commissionCost: 0, reimbursementCost: 0, plannedTotalCosts: 0, plannedLaborCost: 0, plannedSupplierCost: 0, plannedMaterialCost: 0, grossMarginPct: null, plannedGrossMarginPct: null },
    { monthIndex: 11, label: 'dez', isHighlighted: false, isPast: false, isCurrent: false, revenueReal: 0, revenuePlanned: 0, faturado: 0, totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0, commissionCost: 0, reimbursementCost: 0, plannedTotalCosts: 0, plannedLaborCost: 0, plannedSupplierCost: 0, plannedMaterialCost: 0, grossMarginPct: null, plannedGrossMarginPct: null },
  ],
}

// abr+mai+jun: receita=255k, custos=178k, margem ponderada≈30%
// donut: labor 113k · supplier 39k · material 16.5k · commission 6.5k · reimb 3k
export const MOCK_PROJECT_FINANCIALS: ProjectFinancialsData = {
  grossMarginTarget: 25,
  byProject: [
    { projectId: 'p1', projectName: 'Plataforma Digital TechCorp', clientId: 'c1', clientName: 'TechCorp SA', managerId: 'm1', managerName: 'Ana Lima', serviceLine: 'tech', serviceLineLabel: 'Tecnologia', revenue: 95000, costs: 59000, grossMargin: 37.9 },
    { projectId: 'p2', projectName: 'Identidade Visual Criativa', clientId: 'c2', clientName: 'Criativa Design', managerId: 'm2', managerName: 'Bruno Melo', serviceLine: 'design', serviceLineLabel: 'Design', revenue: 68000, costs: 46000, grossMargin: 32.4 },
    { projectId: 'p3', projectName: 'Consultoria Estratégica Alfa', clientId: 'c3', clientName: 'Alfa Group', managerId: 'm1', managerName: 'Ana Lima', serviceLine: 'consulting', serviceLineLabel: 'Consultoria', revenue: 52000, costs: 40000, grossMargin: 23.1 },
    { projectId: 'p4', projectName: 'App Mobile StartupXYZ', clientId: 'c1', clientName: 'TechCorp SA', managerId: 'm2', managerName: 'Bruno Melo', serviceLine: 'tech', serviceLineLabel: 'Tecnologia', revenue: 24000, costs: 20000, grossMargin: 16.7 },
    { projectId: 'p5', projectName: 'Branding Empresa Beta', clientId: 'c2', clientName: 'Criativa Design', managerId: 'm1', managerName: 'Ana Lima', serviceLine: 'design', serviceLineLabel: 'Design', revenue: 12000, costs: 9000, grossMargin: 25.0 },
    { projectId: 'p6', projectName: 'Análise de Dados FinCorp', clientId: 'c3', clientName: 'Alfa Group', managerId: 'm2', managerName: 'Bruno Melo', serviceLine: 'consulting', serviceLineLabel: 'Consultoria', revenue: 4000, costs: 3800, grossMargin: 5.0 },
  ],
  byClient: [
    { id: 'c1', label: 'TechCorp SA',     revenue: 119000, costs: 79000, grossMargin: 33.6 },
    { id: 'c2', label: 'Criativa Design', revenue: 80000,  costs: 55000, grossMargin: 31.3 },
    { id: 'c3', label: 'Alfa Group',      revenue: 56000,  costs: 43800, grossMargin: 21.8 },
  ],
  byManager: [
    { id: 'm1', label: 'Ana Lima',   revenue: 159000, costs: 108000, grossMargin: 32.1 },
    { id: 'm2', label: 'Bruno Melo', revenue: 96000,  costs: 69800,  grossMargin: 27.3 },
  ],
  byServiceLine: [
    { id: 'tech',       label: 'Tecnologia',  revenue: 119000, costs: 79000, grossMargin: 33.6 },
    { id: 'design',     label: 'Design',      revenue: 80000,  costs: 55000, grossMargin: 31.3 },
    { id: 'consulting', label: 'Consultoria', revenue: 56000,  costs: 43800, grossMargin: 21.8 },
  ],
}

/** Filtra o mock de projeto financials por managerId, recalculando as dimensões. */
export function filterMockByManager(gpFilter: string | null): ProjectFinancialsData {
  if (!gpFilter) return MOCK_PROJECT_FINANCIALS

  const byProject = MOCK_PROJECT_FINANCIALS.byProject.filter(
    (p) => p.managerId === gpFilter,
  )

  const clientMap = new Map<string, DimensionFinancialRow>()
  const serviceLineMap = new Map<string, DimensionFinancialRow>()

  for (const p of byProject) {
    const addTo = (map: Map<string, DimensionFinancialRow>, key: string, label: string) => {
      if (!map.has(key)) map.set(key, { id: key, label, revenue: 0, costs: 0, grossMargin: null })
      const e = map.get(key)!
      e.revenue += p.revenue
      e.costs   += p.costs
      e.grossMargin = e.revenue > 0 ? ((e.revenue - e.costs) / e.revenue) * 100 : null
    }
    addTo(clientMap,      p.clientId,   p.clientName)
    addTo(serviceLineMap, p.serviceLine, p.serviceLineLabel)
  }

  const manager = MOCK_PROJECT_FINANCIALS.byManager.find((m) => m.id === gpFilter)

  return {
    grossMarginTarget: MOCK_PROJECT_FINANCIALS.grossMarginTarget,
    byProject,
    byClient:      [...clientMap.values()],
    byManager:     manager ? [manager] : [],
    byServiceLine: [...serviceLineMap.values()],
  }
}

export const MOCK_FILTER_OPTIONS = {
  clients: [
    { id: 'c1', company_name: 'TechCorp SA' },
    { id: 'c2', company_name: 'Criativa Design' },
    { id: 'c3', company_name: 'Alfa Group' },
  ],
  managers: [
    { id: 'm1', nome: 'Ana Lima' },
    { id: 'm2', nome: 'Bruno Melo' },
  ],
  projects: [
    { id: 'p1', name: 'Plataforma Digital TechCorp' },
    { id: 'p2', name: 'Identidade Visual Criativa' },
    { id: 'p3', name: 'Consultoria Estratégica Alfa' },
    { id: 'p4', name: 'App Mobile StartupXYZ' },
    { id: 'p5', name: 'Branding Empresa Beta' },
    { id: 'p6', name: 'Análise de Dados FinCorp' },
  ],
}
