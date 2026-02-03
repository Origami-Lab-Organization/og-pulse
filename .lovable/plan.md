
# Plano: Valor/Hora do Orcamento como Balizador e Custo Real do Funcionario

## Entendimento do Problema

Atualmente, quando um membro e adicionado ao projeto, o sistema usa o `hourly_rate` do papel do orcamento para calcular os custos. Isso esta errado porque:

- O **valor/hora do orcamento** e o preco de venda (quanto cobramos do cliente)
- O **custo real do funcionario** e quanto a empresa gasta (salario + encargos + beneficios + ferramentas)

## Nova Logica

O orcamento atua como **balizador** para formacao do time:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ORCAMENTO (referencia)                                                         │
│  Consultor Inovacao (Senior) - R$ 120/h (preco de venda) - 70h                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ALOCACAO DE EQUIPE                                                             │
│ ┌──────────────────────────────────────────────────────────────────────────────┐
│ │ Funcionario       │ Papel              │ Orc. R$/h │ Custo R$/h │ M1  │ M2  │
│ │───────────────────│────────────────────│───────────│────────────│─────│─────│
│ │ Maria Santos      │ Consultor Inovacao │ R$ 120    │ R$ 85,50   │ 35h │ 35h │
│ │ Joao Silva        │ Consultor Inovacao │ R$ 120    │ R$ 72,30   │ 35h │ 35h │
│ └──────────────────────────────────────────────────────────────────────────────┘
│  * Custo R$/h = Custo total mensal do funcionario / Jornada mensal             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Calculo do Custo/Hora Real do Funcionario

O campo `total_monthly_cost_estimated` ja inclui:
- Salario/Bolsa/Contrato PJ/Pro-labore
- Encargos (FGTS, INSS patronal, RAT, etc.)
- Provisoes (13o, ferias, 1/3 ferias)
- Beneficios
- Ferramentas

Formula:
```
custo_hora_real = total_monthly_cost_estimated / jornada_mensal
```

Exemplo:
- Funcionario com custo mensal total R$ 15.000 e jornada de 168h
- Custo/hora real = R$ 15.000 / 168 = R$ 89,29

## Alteracoes Necessarias

### 1. Atualizar Query de Membros do Projeto

**Arquivo:** `src/services/projectService.ts`

Buscar campos adicionais do funcionario:

```typescript
// De:
employee:employees(id, nome, cargo, salario_mensal, beneficios, encargos)

// Para:
employee:employees(
  id, 
  nome, 
  cargo, 
  total_monthly_cost_estimated, 
  jornada_mensal
)
```

### 2. Atualizar Tipos

**Arquivo:** `src/types/project.ts`

Atualizar interface do employee em `ProjectWithRelations`:

```typescript
employee?: {
  id: string;
  nome: string;
  cargo: string;
  total_monthly_cost_estimated: number;
  jornada_mensal: number;
};
```

### 3. Atualizar Interface de Alocacao de Equipe

**Arquivo:** `src/components/projects/detail/ProjectLaborSection.tsx`

Alteracoes:
1. Adicionar coluna "Orc. R$/h" mostrando valor do orcamento (referencia)
2. Alterar coluna "Valor/h" para "Custo R$/h" mostrando custo real do funcionario
3. Calcular `custo_hora_real = total_monthly_cost_estimated / jornada_mensal`
4. Usar `custo_hora_real` para calcular o custo total do projeto

```typescript
// Calculo do custo/hora real
const getRealHourlyCost = (member: typeof members[0]): number => {
  if (!member.employee) return 0;
  const totalCost = member.employee.total_monthly_cost_estimated || 0;
  const workHours = member.employee.jornada_mensal || 168;
  return totalCost / workHours;
};

// Obter valor/hora do orcamento (para referencia)
const getBudgetHourlyRate = (member: typeof members[0]): number => {
  return Number(member.hourly_rate) || 0;
};
```

### 4. Atualizar Dialogo de Adicionar Membro

Ao selecionar um funcionario, mostrar seu custo/hora real:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Adicionar Membro ao Projeto                                       │
├────────────────────────────────────────────────────────────────────┤
│ Funcionario                                                        │
│ [ Maria Santos - Consultor                            ▼ ]         │
│                                                                    │
│ Papel do Orcamento                                                 │
│ [ Consultor de Inovacao (Senior) - R$ 120/h           ▼ ]         │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Valor/hora do orcamento:  R$ 120,00                          │  │
│ │ Custo/hora do funcionario: R$ 85,50                          │  │
│ │ Margem estimada: 28,75%                                      │  │
│ └──────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│                                  [ Cancelar ]  [ Adicionar ]       │
└────────────────────────────────────────────────────────────────────┘
```

### 5. Atualizar Hook useEmployees

**Arquivo:** `src/components/projects/detail/ProjectLaborSection.tsx`

Garantir que o hook `useEmployees` retorne os campos necessarios para calculo do custo/hora no dialogo de adicao.

## Estrutura da Tabela Atualizada

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ Funcionario       │ Papel              │ Orc. R$/h │ Custo R$/h │ M1  │ Total  │
│───────────────────│────────────────────│───────────│────────────│─────│────────│
│ Maria Santos      │ Consultor Inovacao │ R$ 120    │ R$ 85,50   │ 35h │ R$ 2993│
│   Consultor       │   (Senior)         │           │            │     │        │
│ Joao Silva        │ Consultor Inovacao │ R$ 120    │ R$ 72,30   │ 35h │ R$ 2531│
│   Analista Jr     │   (Senior)         │           │            │     │        │
├────────────────────────────────────────────────────────────────────────────────┤
│ TOTAL             │                    │           │            │ 70h │ R$ 5524│
└────────────────────────────────────────────────────────────────────────────────┘
```

## Resumo de Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/services/projectService.ts` | Buscar `total_monthly_cost_estimated` e `jornada_mensal` do funcionario |
| `src/types/project.ts` | Atualizar interface do employee com novos campos |
| `src/components/projects/detail/ProjectLaborSection.tsx` | Adicionar coluna de referencia do orcamento, calcular e usar custo real |
| `src/components/projects/detail/ProjectCostsTab.tsx` | Atualizar calculo de custos para usar custo real |

## Beneficios

1. **Visibilidade clara** - Usuario ve o preco de venda vs custo real lado a lado
2. **Margem visivel** - Permite avaliar se a alocacao e rentavel
3. **Decisao informada** - Ao escolher funcionarios, usuario ve impacto no custo
4. **Orcamento como balizador** - Referencia para formacao do time sem distorcer custos reais
