

# Plano: Herança Automática e Custos de Papéis sem Funcionário

## Entendimento do Problema

O usuário identificou dois problemas principais:

1. **Herança do Orçamento**: Quando um gerente planeja os custos de projeto, equipe, fornecedores e materiais deveriam ser automaticamente herdados do orçamento no momento do fechamento do negócio.

2. **Papéis sem Funcionário**: Se um papel do orçamento não for associado a nenhum funcionário (ou um novo papel for adicionado), ele deve:
   - Permitir lançamento de horas
   - Contar para os custos do projeto (usando o valor/hora do orçamento como custo)
   - Mostrar apenas "valor real" (sem comparação orçado)

**Exemplo citado**: No projeto "Plataforma Bry", existe o papel "Designer de Produto" no orçamento, mas no planejamento o gerente quer adicionar um "Suporte" em vez do designer. Este novo papel deve permitir lançar horas e contabilizar custo.

---

## Situação Atual

| Aspecto | Comportamento Atual |
|---------|---------------------|
| Fechamento do Negócio | Copia apenas Fornecedores e Materiais |
| Papéis do Orçamento | Não são copiados automaticamente |
| Cálculo de Custo | Ignora membros sem funcionário (`if (!employee) return;`) |
| Novo papel sem orçamento | Não conta nos custos planejados |

---

## Solução Proposta

### 1. Herança Automática dos Papéis no Fechamento

Modificar `useCloseBusinessDeal.ts` para copiar os papéis do orçamento para `project_members`:

```typescript
// Para cada papel do orçamento, criar um project_member
for (const role of budget.roles || []) {
  const { data: member } = await supabase
    .from('project_members')
    .insert({
      project_id: project.id,
      employee_id: null, // Sem funcionário inicialmente
      role: role.role_name,
      seniority: role.seniority,
      hourly_rate: role.hourly_rate,
      hours_per_month: 0,
      budget_role_id: role.id,
    })
    .select()
    .single();

  // Copiar distribuição de horas mensais
  for (const month of role.months || []) {
    await supabase.from('project_member_months').insert({
      project_member_id: member.id,
      month_number: month.month_number,
      hours: month.hours,
    });
  }
}
```

### 2. Cálculo de Custos para Papéis sem Funcionário

Quando não houver funcionário associado, usar o `hourly_rate` do membro (herdado do orçamento) como custo:

**Arquivo**: `src/components/projects/detail/ProjectCostsTab.tsx`

```typescript
// ANTES (linha 237-238):
const employee = member.employee;
if (!employee) return;

// DEPOIS:
const employee = member.employee;
let realHourlyCost = 0;

if (employee) {
  // Se tem funcionário: usar custo real
  const totalMonthlyCost = employee.total_monthly_cost_estimated || 0;
  const workHours = employee.jornada_mensal || 168;
  realHourlyCost = workHours > 0 ? totalMonthlyCost / workHours : 0;
} else {
  // Se não tem funcionário: usar valor/hora do orçamento como custo
  realHourlyCost = Number(member.hourly_rate) || 0;
}
```

### 3. Exibição na Seção de Mão de Obra

**Arquivo**: `src/components/projects/detail/ProjectLaborSection.tsx`

Atualizar `getRealHourlyCost` para considerar papéis sem funcionário:

```typescript
const getRealHourlyCost = useCallback((member: typeof members[0]): number => {
  if (member.employee) {
    const totalCost = member.employee.total_monthly_cost_estimated || 0;
    const workHours = member.employee.jornada_mensal || 168;
    return workHours > 0 ? totalCost / workHours : 0;
  }
  // Sem funcionário: usar hourly_rate do membro como custo
  return Number((member as any).hourly_rate) || 0;
}, []);
```

### 4. Interface Visual para Papéis sem Funcionário

| Coluna | Com Funcionário | Sem Funcionário |
|--------|-----------------|-----------------|
| **Funcionário** | Nome do funcionário | "Sem funcionário" (itálico, cinza) |
| **R$/h** | Custo real (calculado) | Valor/hora do orçamento |
| **Horas** | Editável | Editável |
| **Custo** | Horas × Custo Real | Horas × Valor/Hora |

### 5. Novo Papel Fora do Orçamento

Ao adicionar um novo papel (não vinculado ao orçamento):
- O `hourly_rate` do formulário será usado como custo base
- O campo `budget_role_id` ficará `null`
- A interface mostrará apenas valor "planejado" sem comparação "orçado"

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useCloseBusinessDeal.ts` | Adicionar cópia de papéis do orçamento para project_members |
| `src/components/projects/detail/ProjectCostsTab.tsx` | Calcular custo para membros sem funcionário |
| `src/components/projects/detail/ProjectLaborSection.tsx` | Atualizar `getRealHourlyCost` e exibição visual |

---

## Fluxo Resumido

```text
┌─────────────────────────────────────────────────────────────┐
│                   Fechamento do Negócio                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Copiar para projeto:                                   │
    │  ✓ Fornecedores (já implementado)                       │
    │  ✓ Materiais (já implementado)                          │
    │  ✓ Papéis do orçamento → project_members [NOVO]         │
    │    - employee_id = null                                 │
    │    - hourly_rate = valor do orçamento                   │
    │    - Horas mensais copiadas                             │
    └─────────────────────┬───────────────────────────────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────────────────┐
    │                Planejamento do Projeto                  │
    └─────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────────┐
    │ Atribuir  │   │ Remover   │   │ Adicionar     │
    │ funcionário│  │ papel não │   │ novo papel    │
    │ ao papel  │   │ necessário│   │ (ex: Suporte) │
    └─────┬─────┘   └─────┬─────┘   └───────┬───────┘
          │               │                 │
          ▼               ▼                 ▼
    ┌─────────────────────────────────────────────────────────┐
    │               Cálculo de Custos                         │
    │                                                         │
    │  Com funcionário:  Horas × (custo_mensal/jornada)       │
    │  Sem funcionário:  Horas × hourly_rate                  │
    └─────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Planejamento completo**: Gerente já começa com todos os papéis previstos
2. **Flexibilidade**: Pode substituir Designer por Suporte sem perder rastreabilidade
3. **Custos precisos**: Papéis sem funcionário ainda contam para a margem
4. **Comparação orçado vs planejado**: Mantida para papéis herdados do orçamento

