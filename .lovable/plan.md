

# Plano Revisado: Acompanhamento de Execução nas Abas Existentes

## Mudança de Abordagem

Em vez de criar uma nova aba "Execução", o acompanhamento de progresso será integrado diretamente nas abas já existentes do projeto:
- **Custos**: Planejado vs Realizado (Mão de Obra, Fornecedores, Materiais)
- **Cronograma**: Atualização de status dos Milestones
- **OKRs**: Atualização de progresso dos Key Results
- **Stakeholders**: Sem alteração

---

## Fase 1: Visualização na Aba de Custos (Planejado vs Realizado)

### Objetivo
Transformar a aba de Custos para exibir uma comparação clara entre valores planejados e realizados quando o projeto estiver em execução.

### Estrutura Visual Proposta

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Aba: Custos (modo execução)                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Cards de Resumo - já existentes, atualizados]                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Mão de Obra │ │ Fornecedores│ │ Materiais   │ │ Custo Total │           │
│  │ Plan: 50.000│ │ Plan: 10.000│ │ Plan: 5.000 │ │ Plan: 65.000│           │
│  │ Real: 42.000│ │ Real: 8.500 │ │ Real: 4.200 │ │ Real: 54.700│           │
│  │ ▲ 84%       │ │ ▲ 85%       │ │ ▲ 84%       │ │ ▲ 84%       │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
│  [Seção: Mão de Obra] ─────────────────────────────────────────────────────│
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Funcionário    │ Papel      │ Custo/h │ Horas     │ Custo Total    │   │
│  │                │            │         │ Plan|Real │ Plan | Real    │   │
│  ├────────────────┼────────────┼─────────┼───────────┼────────────────┤   │
│  │ João Silva     │ Designer   │ R$ 85   │ 240 | 180 │ 20.400|15.300  │   │
│  │ Maria Santos   │ Developer  │ R$ 120  │ 160 | 140 │ 19.200|16.800  │   │
│  │ Pedro Lima     │ PM         │ R$ 95   │ 80  | 75  │  7.600| 7.125  │   │
│  ├────────────────┴────────────┴─────────┼───────────┼────────────────┤   │
│  │ TOTAL                                 │ 480 | 395 │ 47.200|39.225  │   │
│  └───────────────────────────────────────┴───────────┴────────────────┘   │
│  * Horas reais são importadas dos Timesheets                               │
│                                                                             │
│  [Seção: Fornecedores] ────────────────────────────────────────────────────│
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Fornecedor      │ Mês 1        │ Mês 2        │ Total              │   │
│  │                 │ Plan | Real  │ Plan | Real  │ Plan | Real        │   │
│  ├─────────────────┼──────────────┼──────────────┼────────────────────┤   │
│  │ Agência Mkt     │ 2.000| 1.800 │ 2.000| 2.000 │ 4.000 | 3.800      │   │
│  │ Cloud Services  │ 1.500| 1.500 │ 1.500| --    │ 3.000 | 1.500      │   │
│  │ [+ Lançamento]                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Seção: Materiais] ───────────────────────────────────────────────────────│
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Descrição           │ Mês    │ Valor      │ Status                 │   │
│  ├─────────────────────┼────────┼────────────┼────────────────────────┤   │
│  │ Licenças software   │ Mês 1  │ R$ 2.000   │ [✓] Realizado          │   │
│  │ Equipamento teste   │ Mês 2  │ R$ 3.000   │ [ ] Pendente           │   │
│  │ [+ Material]                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Dados

### 1. Tabela de Timesheets (para Mão de Obra Real)

```sql
CREATE TABLE project_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_member_id UUID NOT NULL REFERENCES project_members(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES employees(id),
  
  UNIQUE(project_member_id, work_date)
);
```

### 2. Tabela de Custos Reais de Fornecedores

```sql
CREATE TABLE project_supplier_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_supplier_id UUID NOT NULL REFERENCES project_suppliers(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  invoice_number TEXT,
  invoice_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(project_supplier_id, month_number)
);
```

### 3. Materiais

Já possui o campo `is_realized` - será utilizado diretamente.

---

## Implementação: Aba de Custos Modo Execução

### Etapa 1: Criar Tabelas e Hooks

| Arquivo | Descrição |
|---------|-----------|
| **Migration SQL** | Criar `project_timesheets` e `project_supplier_actuals` com RLS |
| `src/hooks/useProjectTimesheets.ts` | Hook para buscar timesheets do projeto |
| `src/hooks/useProjectSupplierActuals.ts` | Hook para buscar custos reais de fornecedores |

### Etapa 2: Atualizar Componentes de Custos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/projects/detail/ProjectCostsTab.tsx` | Adicionar cálculo de valores reais nos cards de resumo |
| `src/components/projects/detail/ProjectLaborSection.tsx` | Adicionar coluna "Horas Reais" e "Custo Real" vindos dos timesheets |
| `src/components/projects/detail/ProjectSuppliersSection.tsx` | Adicionar colunas de valores reais por mês com possibilidade de lançamento inline |
| `src/components/projects/detail/ProjectMaterialsSection.tsx` | Melhorar UX do checkbox "Realizado" |

### Etapa 3: Criar Componente de Lançamento de Fornecedores

| Arquivo | Descrição |
|---------|-----------|
| `src/components/projects/detail/SupplierActualFormDialog.tsx` | Modal para lançar valor real de fornecedor |

---

## Fluxo de Dados: Mão de Obra

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mão de Obra                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PLANEJADO                        REALIZADO                     │
│  ────────────                     ─────────────                 │
│  project_member_months            project_timesheets            │
│  (horas por mês)                  (horas por dia)               │
│       │                                  │                      │
│       │                                  │                      │
│       ▼                                  ▼                      │
│  Custo Planejado =               Custo Realizado =              │
│  Σ horas × custo/hora            Σ horas × custo/hora           │
│  do funcionário                  do funcionário                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Tabela na Aba de Custos                         │   │
│  │  Funcionário │ Horas Plan│Real │ Custo Plan│Real │ %    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useProjectTimesheets.ts` | Query e mutations para timesheets |
| `src/hooks/useProjectSupplierActuals.ts` | Query e mutations para custos reais |
| `src/components/projects/detail/SupplierActualFormDialog.tsx` | Modal de lançamento de valor real |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/projects/detail/ProjectCostsTab.tsx` | Buscar dados reais e calcular totais planejado vs realizado |
| `src/components/projects/detail/ProjectLaborSection.tsx` | Exibir horas/custos reais por membro (readonly, vindo de timesheets) |
| `src/components/projects/detail/ProjectSuppliersSection.tsx` | Adicionar colunas de valores reais com possibilidade de lançamento |
| `src/components/projects/detail/ProjectMaterialsSection.tsx` | Aprimorar toggle de realização |

---

## Próximos Passos (Após esta fase)

1. **Timesheets**: Criar tela dedicada para lançamento de horas (sessão separada no sistema)
2. **Cronograma**: Adicionar ações rápidas para atualizar status de milestones
3. **OKRs**: Adicionar input inline para atualizar current_value dos Key Results

---

## Sequência de Implementação

```
1. Criar migrations SQL (tabelas + RLS)
       │
       ▼
2. Criar hooks (useProjectTimesheets, useProjectSupplierActuals)
       │
       ▼
3. Atualizar ProjectCostsTab (cards de resumo com planejado vs real)
       │
       ▼
4. Atualizar ProjectLaborSection (exibir horas reais readonly)
       │
       ▼
5. Atualizar ProjectSuppliersSection (colunas de valores reais + lançamento)
       │
       ▼
6. Atualizar ProjectMaterialsSection (melhorar UX de realização)
```

