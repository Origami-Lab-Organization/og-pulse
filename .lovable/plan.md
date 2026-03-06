

## Plano: Criar aba Comissão e adicionar KPI cards de Impostos e Comissão nas abas Visão Geral e Financeiro

### Mudanças

**1. `src/pages/ProjectDetail.tsx`**
- Adicionar nova aba "Comissão" no TabsList (7 abas no total)
- Importar e renderizar novo componente `ProjectCommissionsTab`
- Grid de tabs: `grid-cols-7`

**2. Novo `src/components/projects/detail/ProjectCommissionsTab.tsx`**
- Mover toda a lógica de comissão que hoje está em `ProjectCostsTab` para esta nova aba
- Inclui: auto-geração de comissões, `ProjectCommissionsSection`, card KPI de comissão
- Recebe `project` como prop, busca budget internamente

**3. `src/components/projects/detail/ProjectCostsTab.tsx`**
- Remover toda lógica de comissão: imports, hooks, useEffect de auto-geração, card de comissão, seção de comissão
- Remover comissão dos cálculos de `totalPlanned` e `totalActual`

**4. `src/components/projects/detail/ProjectOverviewTab.tsx`**
- Alterar os KPI cards de 3 (Receita, Custos, Margem) para 5: **Receita, Impostos, Comissão, Custos, Margem**
- Grid: `grid-cols-5`
- Adicionar cálculo de impostos (usando `financialSettings.taxes_percent`) e comissão (usando budget `commission_percent * total_with_fees`)
- Importar `useFinancialSettings`, `useBudgets`, `useProjectCommissions`

**5. `src/components/projects/detail/ProjectFinancialTab.tsx`**
- Alterar os KPI cards de 4 (Receita, Impostos, Custos, Margem) para 5: **Receita, Impostos, Comissão, Custos, Margem**
- Grid: `grid-cols-5`
- Adicionar card de Comissão com planejado/realizado
- Importar `useBudgets` e `useProjectCommissions` para obter dados de comissão
- Incluir comissão no cálculo de margem (margem = receita - impostos - comissão - custos)

### Arquivos alterados/criados
1. `src/pages/ProjectDetail.tsx` - adicionar tab
2. `src/components/projects/detail/ProjectCommissionsTab.tsx` - novo
3. `src/components/projects/detail/ProjectCostsTab.tsx` - remover comissão
4. `src/components/projects/detail/ProjectOverviewTab.tsx` - 5 KPI cards
5. `src/components/projects/detail/ProjectFinancialTab.tsx` - 5 KPI cards

