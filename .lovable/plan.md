
# Alterar Jornada de Trabalho de Mensal para Diaria

## Resumo

Trocar o campo de jornada no cadastro de funcionarios de "horas/mes" para "horas/dia" (ex: 8, 6, 4). O valor mensal passa a ser calculado automaticamente com base nos dias uteis, permitindo estimativas mais precisas na gestao de projetos.

## Impacto no Banco de Dados

O campo `jornada_mensal` no banco continua armazenando o valor **mensal** calculado (para nao quebrar toda a logica existente de custo/hora). Vamos adicionar um novo campo `jornada_diaria` que armazena o valor digitado pelo usuario.

### Migracao SQL
- Adicionar coluna `jornada_diaria` (integer, default 8, not null) na tabela `employees`
- Adicionar coluna `jornada_diaria` (integer, default 8, not null) na tabela `employee_versions`
- Preencher os registros existentes: `UPDATE employees SET jornada_diaria = ROUND(jornada_mensal / 22)` (estimativa)

## Mudancas nos Arquivos

### 1. Formulario de Funcionario (`EmployeeFormDialog.tsx`)
- Renomear o campo de "Jornada Mensal (horas)" para "Jornada Diaria (horas)"
- Alterar placeholder de "168" para "8"
- Alterar default de 168 para 8
- Alterar validacao: `z.number().min(1).max(24)`
- Renomear o campo no schema de `jornadaMensal` para `jornadaDiaria` (ou manter e converter)
- Ao salvar, calcular `jornada_mensal = jornada_diaria * 22` (dias uteis padrao) e salvar ambos os campos

### 2. Tipo Employee (`types/employee.ts`)
- Adicionar campo `jornadaDiaria: number` na interface Employee

### 3. Servico (`services/employeeService.ts`)
- Mapear `jornadaDiaria` para `jornada_diaria` no create/update
- Ao mapear do DB para o front, incluir `jornada_diaria`

### 4. Hook useEmployees (`hooks/useEmployees.ts`)
- Incluir `jornadaDiaria` no mapeamento DB -> frontend

### 5. Calculadora de Custos (`CalculatorInputs.tsx` e `EmployeeCalculatorDialog.tsx`)
- Trocar label de "Jornada (horas/mes)" para "Jornada Diaria (horas)"
- Placeholder de "168" para "8"
- Default de 168 para 8
- Converter para mensal ao passar para os calculos: `jornadaDiaria * 22`

### 6. Tabela de Versoes (`EmployeeVersionsTable.tsx`)
- Exibir jornada diaria ao inves de mensal (ou ambos: "8h/dia")

### 7. Tabela de Funcionarios (`EmployeesTable.tsx`)
- Ajustar calculo de custo/hora para usar `jornada_mensal` (que ja sera calculado corretamente)

### 8. Custo/hora nos Projetos
- Nenhuma mudanca necessaria nos arquivos de projetos (`ProjectLaborSection.tsx`, `ProjectOverviewTab.tsx`), pois eles ja usam `jornada_mensal` do banco, que continuara sendo calculado automaticamente

## Logica de Conversao

```text
jornada_mensal = jornada_diaria * 22
```

O valor 22 e uma estimativa padrao de dias uteis/mes. No futuro, a gestao de projetos podera usar o calendario de feriados para calcular os dias uteis reais de cada mes.

## Resumo dos Arquivos

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | Adicionar `jornada_diaria` em employees e employee_versions |
| `types/employee.ts` | Adicionar `jornadaDiaria` |
| `EmployeeFormDialog.tsx` | Input diario, converter para mensal ao salvar |
| `services/employeeService.ts` | Mapear novo campo |
| `hooks/useEmployees.ts` | Incluir no mapeamento |
| `CalculatorInputs.tsx` | Label e default para diario |
| `EmployeeCalculatorDialog.tsx` | Converter diario para mensal nos calculos |
| `EmployeeVersionsTable.tsx` | Exibir jornada diaria |
