# Sequencia de Prompts - Analytics de Projetos

Cada prompt eh independente e deve ser executado na ordem indicada.
Os prompts ja consideram o estado atual do codigo (hook com projectId,
hourlyCost, idleHours/idleCost/totalCapacity, tabela com colunas de
ociosidade, CostCompositionChart e CostByProjectTable renderizados,
tabs implementadas, AnalyticsFilters com granularidade, stakeholder
e OKR hooks e componentes ja criados).

---

## FASE 1 - Quick Wins

### Prompt 1.1 - Tabela de saude das receitas por projeto

Crie um novo componente RevenueHealthTable em
src/components/analytics/RevenueHealthTable.tsx que mostre a saude
das receitas por projeto.

COLUNAS DA TABELA:
- Projeto (nome, font-weight: 600)
- Tipo (badge colorido: Escopo Fechado / Recorrente / Taxa de Sucesso / Sem Receita)
- Receita Projetada (soma das installments com due_date no periodo)
- Receita Recebida (soma das installments com status='received' e payment_date no periodo)
- Gap (diferenca: recebida - projetada. Verde se positivo, vermelho se negativo)
- Parcelas Pendentes (count de installments com status != 'received' e due_date no periodo)
- Parcelas Atrasadas (count de installments com status != 'received' e due_date < hoje)
- Status: "No prazo" (badge verde) se 0 atrasadas, "Atrasado" (badge vermelho) se 1+ atrasadas, "Adiantado" (badge azul) se recebida > projetada

DADOS - atualize o hook useAnalyticsData (src/hooks/useAnalyticsData.ts):

1. Adicione a interface:

export interface RevenueByProject {
  projectId: string;
  projectName: string;
  projectType: string;
  revenueProjected: number;
  revenueActual: number;
  gap: number;
  pendingInstallments: number;
  overdueInstallments: number;
  status: 'on_track' | 'overdue' | 'ahead';
}

2. No hook, ao processar installments, agrupe por project_id:
   - Para cada projeto, some valores de installments com due_date no periodo (projetada)
   - Some valores de installments com status='received' e payment_date no periodo (recebida)
   - Conte installments pendentes (status != 'received', due_date no periodo)
   - Conte installments atrasadas (status != 'received', due_date < new Date())
   - Altere a query de projetos para incluir project_type no select

3. Adicione revenueByProject: RevenueByProject[] na interface AnalyticsData e retorne no objeto final. Ordene por parcelas atrasadas (desc).

COMPONENTE:
- Use Card + Table do shadcn/ui (mesmo padrao de CostByProjectTable)
- Badges coloridos para tipo: escopo fechado (indigo), recorrente (amber), success_fee (emerald), non_revenue (gray)
- Use os labels de PROJECT_TYPE_LABELS se existirem em src/types/project.ts
- Linha de total no final
- Use formatCurrency para valores

RENDERIZE na aba "Financeiro" do Analytics.tsx, abaixo do AnalyticsKPIs.
Textos em pt-BR.

---

## FASE 2 - Graficos Avancados

### Prompt 2.1 - Graficos financeiros: Receita e Margem por Projeto

Adicione 3 novos graficos na aba "Financeiro" do Analytics:

1. CRIE src/components/analytics/RevenueComparisonChart.tsx:
Grafico de barras agrupadas (recharts BarChart):
- Eixo X: projetos (top 10 por receita projetada)
- 2 barras por projeto: azul (projetada), verde (recebida)
- Tooltip com valores formatados (formatCurrency)
- ResponsiveContainer height={350}
- Props: data: RevenueByProject[] (do hook)

2. CRIE src/components/analytics/MarginByProjectChart.tsx:
Grafico de barras horizontais (recharts BarChart layout="vertical"):
- Cada barra = margem % de um projeto
- ReferenceLine vertical na meta de margem bruta
- Cores: verde se margem >= meta, vermelho se abaixo
- Ordenar por margem ascendente (piores no topo)
- DADOS: adicione no hook useAnalyticsData o calculo de margem por projeto:

export interface MarginByProject {
  projectId: string;
  projectName: string;
  margin: number;
  isAboveTarget: boolean;
}

Calculo: margin = (receita - custos) / receita * 100 por projeto.
Adicione marginByProject: MarginByProject[] no AnalyticsData.

3. CRIE src/components/analytics/RevenueEvolutionChart.tsx:
Grafico de area com linha (recharts ComposedChart):
- Eixo X: meses
- Area: receita acumulada recebida
- Linha tracejada: receita acumulada projetada
- So exibir quando o periodo filtrado > 1 mes
- Se periodo = 1 mes, mostrar Card com mensagem: "Selecione visao Trimestre ou Ano para ver a evolucao"
- DADOS: campo opcional no hook:

revenueEvolution?: Array<{
  month: string;
  actual: number;
  projected: number;
  accumulatedActual: number;
  accumulatedProjected: number;
}>;

RENDERIZE na aba "Financeiro":
- Grid 2 colunas: RevenueComparisonChart + MarginByProjectChart
- RevenueEvolutionChart em largura total abaixo
- Todos acima da RevenueHealthTable

Textos em pt-BR.

---

### Prompt 2.2 - Grafico de distribuicao de utilizacao

Crie src/components/analytics/UtilizationDistributionChart.tsx:

Grafico de barras empilhadas horizontais mostrando a distribuicao de horas por colaborador:
- Eixo Y: nome do colaborador (truncado em 20 chars se necessario)
- Barras empilhadas com stackId="utilization":
  - Verde (hsl(var(--chart-2))): horas alocadas (productivas)
  - Vermelho claro (hsl(var(--destructive)) com opacity 0.3): horas ociosas (capacity - allocatedHours, minimo 0)
- Cada barra vai ate a capacidade total do colaborador
- Label a direita: "XX% utilizacao"
- Ordenar por utilizacao ascendente (menos utilizados no topo)
- Tooltip: "Alocado: Xh | Ocioso: Yh | Capacidade: Zh"
- ResponsiveContainer height baseado em (employees.length * 40 + 60)

Props: data: EmployeeUtilization[] (importar de @/hooks/useAnalyticsData)
Use Card + CardHeader + CardTitle + CardContent como wrapper.
Titulo: "Distribuicao de Utilizacao"

RENDERIZE na aba "Utilizacao & Custos" do Analytics.tsx, ao lado do CostCompositionChart em grid de 2 colunas.
Layout final da aba:
1. Cards de Horas Ociosas + Custo Ociosidade (grid 2 cols)
2. Grid 2 cols: UtilizationDistributionChart + CostCompositionChart
3. EmployeeUtilizationTable (largura total)
4. CostByProjectTable (largura total)

Textos em pt-BR.

---

### Prompt 2.3 - Mapa de Influencia x Interesse dos Stakeholders

Crie src/components/analytics/StakeholderMatrixChart.tsx:

Scatter plot mostrando stakeholders por Influencia x Interesse:
- Eixo X: Interesse (low=1, medium=2, high=3) com labels "Baixo", "Medio", "Alto"
- Eixo Y: Influencia (low=1, medium=2, high=3) com labels "Baixa", "Media", "Alta"
- Cada ponto = um stakeholder
- Cor do ponto: verde (#10b981 promotor), cinza (#6b7280 neutro), vermelho (#ef4444 detrator)
- Quadrantes com labels de fundo usando ReferenceArea:
  - Alta Influencia + Alto Interesse = "Gerenciar de Perto"
  - Alta Influencia + Baixo Interesse = "Manter Satisfeito"
  - Baixa Influencia + Alto Interesse = "Manter Informado"
  - Baixa Influencia + Baixo Interesse = "Monitorar"
- Tooltip: nome, projeto, cargo, sponsorship level
- Use recharts ScatterChart com XAxis, YAxis, Scatter, Cell, ReferenceArea

DADOS: atualize useStakeholderAnalytics para retornar tambem:

stakeholderDetails: Array<{
  name: string;
  projectName: string;
  jobTitle: string | null;
  influenceLevel: InfluenceLevel | null;
  interestLevel: InterestLevel | null;
  sponsorshipLevel: SponsorshipLevel | null;
}>;

RENDERIZE na aba "Satisfacao", em grid de 2 colunas junto com o StakeholderDistributionChart.
Textos em pt-BR.

---

## FASE 3 - Features Novas (Migrations + CRUDs)

### Prompt 3.1 - Migration: Tabela de pesquisas de satisfacao

Crie uma nova migration Supabase para a tabela de pesquisas de satisfacao com stakeholders.

SQL da migration:

CREATE TABLE stakeholder_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES project_stakeholders(id) ON DELETE CASCADE,
  survey_date DATE NOT NULL DEFAULT CURRENT_DATE,
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  csat_score INTEGER CHECK (csat_score >= 1 AND csat_score <= 5),
  comments TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stakeholder_surveys_project ON stakeholder_surveys(project_id);
CREATE INDEX idx_stakeholder_surveys_stakeholder ON stakeholder_surveys(stakeholder_id);
CREATE INDEX idx_stakeholder_surveys_tenant_date ON stakeholder_surveys(tenant_id, survey_date);

ALTER TABLE stakeholder_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON stakeholder_surveys
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM employees WHERE id = auth.uid()));

Use supabase migration new add_stakeholder_surveys para criar o arquivo.

Depois, crie os tipos TypeScript em src/types/stakeholderSurvey.ts seguindo o padrao do projeto:
- StakeholderSurveyDB (snake_case, espelha colunas)
- CreateStakeholderSurveyInput
- UpdateStakeholderSurveyInput

---

### Prompt 3.2 - CRUD de pesquisas de satisfacao

Implemente o CRUD completo para pesquisas de satisfacao de stakeholders, seguindo a Receita 1 do CLAUDE.md.

1. SERVICE - src/services/stakeholderSurveyService.ts:
- getByProject(projectId, tenantId): todas as pesquisas de um projeto
- getByStakeholder(stakeholderId, tenantId): historico de um stakeholder
- getForAnalytics(tenantId, startDate, endDate, filters?): para o dashboard
- create(input: CreateStakeholderSurveyInput, tenantId): nova pesquisa
- update(id, updates: UpdateStakeholderSurveyInput): editar
- delete(id): remover
- Sempre filtrar por tenant_id. Throw error em caso de falha.

2. HOOK - src/hooks/useStakeholderSurveys.ts:
- useStakeholderSurveys(projectId): lista por projeto
- useStakeholderSurveyAnalytics(filters): dados agregados para analytics
- useCreateStakeholderSurvey(): mutation com invalidateQueries + toast
- useUpdateStakeholderSurvey(): mutation com invalidateQueries + toast
- useDeleteStakeholderSurvey(): mutation com invalidateQueries + toast
- Query keys: ['stakeholder-surveys', projectId], ['stakeholder-surveys', 'analytics', tenantId, ...]

3. FORMULARIO - src/components/projects/stakeholders/SurveyFormDialog.tsx:
- Dialog com form (React Hook Form + Zod)
- Campos:
  - Stakeholder (Select, pre-selecionado se vindo do contexto)
  - Data da pesquisa (Popover + Calendar, default hoje)
  - NPS Score (grupo de 11 botoes 0-10, com cores: 0-6 vermelho "Detrator", 7-8 amarelo "Neutro", 9-10 verde "Promotor")
  - CSAT Score (5 estrelas clicaveis ou 5 botoes com emoji)
  - Comentarios (Textarea opcional)
- Schema Zod: nps_score z.number().min(0).max(10), csat_score z.number().min(1).max(5), etc.

4. INTEGRAR na pagina de detalhe do projeto:
- Procure a aba de stakeholders do projeto (provavelmente em src/components/projects/)
- Adicione botao "Nova Pesquisa" que abre SurveyFormDialog
- Abaixo da lista de stakeholders, adicione tabela de pesquisas recentes com: Data, Stakeholder, NPS, CSAT, Comentario, Acoes (editar/excluir)
- Mostre o NPS calculado do projeto no topo: NPS = ((promotores - detratores) / total) * 100 onde promotor = score 9-10, detrator = score 0-6

Textos em pt-BR. Siga todos os padroes do CLAUDE.md (tenant_id, invalidateQueries, toast, etc.).

---

### Prompt 3.3 - Migration + CRUD: OKRs estrategicos da empresa

Implemente OKRs estrategicos no nivel da empresa.

1. MIGRATION (supabase migration new add_company_okrs):

CREATE TABLE company_okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  objective TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  progress_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE company_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES company_okrs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('very_high','high','medium','low','very_low')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_okr_alignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_okr_id UUID NOT NULL REFERENCES project_okrs(id) ON DELETE CASCADE,
  company_okr_id UUID NOT NULL REFERENCES company_okrs(id) ON DELETE CASCADE,
  contribution_weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_okr_id, company_okr_id)
);

CREATE INDEX idx_company_okrs_tenant ON company_okrs(tenant_id);
ALTER TABLE company_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_okr_alignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON company_okrs FOR ALL USING (tenant_id = (SELECT tenant_id FROM employees WHERE id = auth.uid()));
CREATE POLICY "tenant_isolation" ON company_key_results FOR ALL USING (okr_id IN (SELECT id FROM company_okrs WHERE tenant_id = (SELECT tenant_id FROM employees WHERE id = auth.uid())));
CREATE POLICY "tenant_isolation" ON project_okr_alignments FOR ALL USING (company_okr_id IN (SELECT id FROM company_okrs WHERE tenant_id = (SELECT tenant_id FROM employees WHERE id = auth.uid())));

2. TYPES - src/types/companyOkr.ts:
- CompanyOKRDB, CompanyKeyResultDB, ProjectOkrAlignmentDB
- CreateCompanyOKRInput, UpdateCompanyOKRInput
- CreateCompanyKeyResultInput, UpdateCompanyKeyResultInput
- Reuse OKRStatus e KeyResultConfidenceLevel de projectOkr.ts

3. SERVICE - src/services/companyOkrService.ts:
- CRUD para company_okrs e company_key_results
- getAlignments(companyOkrId): projetos alinhados
- createAlignment(projectOkrId, companyOkrId, weight?)
- deleteAlignment(id)

4. HOOK - src/hooks/useCompanyOkrs.ts:
- useCompanyOkrs(): lista todos do tenant
- useCompanyOkr(id): detalhe com key results e alinhamentos
- Mutations padrao com invalidateQueries + toast

5. PAGINA - src/pages/CompanyOkrs.tsx:
- Rota: /okrs (admin only: RoleProtectedRoute requireAdmin)
- Lista de OKRs estrategicos com progress bars
- CRUD com formulario em dialog (React Hook Form + Zod)
- Para cada OKR, mostrar quais projetos estao alinhados com progress bar agregado
- Adicionar rota em App.tsx acima do path="*"
- Adicionar item na sidebar em AppSidebar.tsx (grupo adequado, com icone Target do lucide)

Textos em pt-BR. Siga todos os padroes do CLAUDE.md.

---

### Prompt 3.4 - Integrar CSAT/NPS e OKRs Estrategicos no Analytics

Integre as pesquisas de satisfacao e OKRs estrategicos nas abas do Analytics.

1. EVOLUA a aba "Satisfacao":
- Adicione KPIs novos usando dados de useStakeholderSurveyAnalytics: NPS Medio (calculado das pesquisas), CSAT Medio, Tendencia (comparacao com periodo anterior)
- Adicione grafico de evolucao temporal: NPS por mes (recharts LineChart, so quando periodo > 1 mes)
- Na tabela de distribuicao por projeto, adicione colunas "Ultimo NPS" e "Ultimo CSAT"
- Organize em 2 secoes com subtitulos: "Visao Qualitativa" (stakeholder sponsorship) e "Visao Quantitativa" (pesquisas CSAT/NPS)

2. EVOLUA a aba "OKRs e Impacto":
- Adicione secao "OKRs Estrategicos" usando useCompanyOkrs:
  - Card para cada OKR estrategico com progress bar
  - Abaixo de cada OKR, listar projetos alinhados (usando project_okr_alignments)
  - Progresso agregado: media ponderada dos OKRs de projeto alinhados (peso = contribution_weight)
- Use Accordion do shadcn/ui para expandir/colapsar cada OKR e ver seus projetos contribuintes
- KPI novo: "% dos OKRs estrategicos com projetos alinhados"

3. EVOLUA o Score de Saude (projectHealthCalculator.ts):
- Na dimensao "Satisfacao", quando pesquisas existirem, usar NPS:
  - Verde: NPS >= 50
  - Amarelo: NPS entre 0 e 49
  - Vermelho: NPS < 0
- Manter sponsorship_level como fallback quando nao houver pesquisas

Textos em pt-BR.

---

### Prompt 3.5 - Pesos de saude configuraveis

Adicione configuracao de pesos do score de saude em FinancialSettings.

1. MIGRATION (supabase migration new add_health_weights):

ALTER TABLE financial_settings
ADD COLUMN health_weight_financial NUMERIC DEFAULT 35,
ADD COLUMN health_weight_utilization NUMERIC DEFAULT 25,
ADD COLUMN health_weight_satisfaction NUMERIC DEFAULT 20,
ADD COLUMN health_weight_okr NUMERIC DEFAULT 20;

2. Atualize o tipo FinancialSettingsDB (procure em src/types/ ou no servico que busca financial_settings) para incluir os 4 novos campos.

3. Atualize projectHealthCalculator.ts para aceitar pesos customizados:

export function calculateProjectHealth(params: {
  // ... campos existentes
  weights?: {
    financial: number;
    utilization: number;
    satisfaction: number;
    okr: number;
  };
}): ProjectHealthScore;

Se weights nao for passado, usar defaults (35/25/20/20).

4. Atualize a pagina de configuracoes financeiras para incluir os 4 campos:
- Use inputs numericos ou sliders
- Validacao: soma dos 4 deve = 100
- Labels: "Peso Financeiro (%)", "Peso Utilizacao (%)", "Peso Satisfacao (%)", "Peso OKR (%)"
- Mostrar erro se soma != 100

5. No hook useProjectHealthData, busque os pesos de financial_settings e passe para calculateProjectHealth.

Textos em pt-BR.

---

## Notas Finais

- Ordem eh importante: execute os prompts na sequencia dentro de cada fase. Entre fases, teste tudo antes de avancar.
- Apos cada prompt, rode npm run build para verificar erros de tipo.
- Dados de exemplo: para testar Satisfacao e OKRs, cadastre stakeholders e OKRs em pelo menos 2-3 projetos antes.
