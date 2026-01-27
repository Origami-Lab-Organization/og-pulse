
# Plano de Implementacao: Sistema de Custo Total do Funcionario

## Resumo Executivo

Este plano detalha a implementacao de um sistema completo de calculo automatico do custo total de funcionarios, incluindo uma nova tabela de Perfil de Encargos, ajustes na Etapa 2 (Contratacao), sincronizacao de auxilios com beneficios, e reflexo do custo total na listagem e dashboard.

---

## Fase 1: Banco de Dados

### 1.1 Nova Tabela: `payroll_profiles` (Perfil de Encargos)

Tabela para armazenar os percentuais configuraveis de encargos por tenant:

```text
+----------------------------------+------------+---------------+
| Coluna                           | Tipo       | Default       |
+----------------------------------+------------+---------------+
| id                               | uuid       | gen_random    |
| tenant_id                        | uuid       | NOT NULL      |
| fgts_rate_clt                    | numeric    | 0.08          |
| fgts_rate_apprentice             | numeric    | 0.02          |
| inss_patronal_rate               | numeric    | 0.20          |
| rat_rate                         | numeric    | 0.03          |
| terceiros_rate                   | numeric    | 0.058         |
| outros_rate                      | numeric    | 0.00          |
| inss_patronal_prolabore_rate     | numeric    | 0.20          |
| fgts_prolabore_rate              | numeric    | 0.00          |
| apply_fgts_on_13th               | boolean    | true          |
| apply_inss_on_13th               | boolean    | true          |
| apply_rat_on_13th                | boolean    | true          |
| apply_terceiros_on_13th          | boolean    | true          |
| apply_outros_on_13th             | boolean    | false         |
| apply_fgts_on_vacation           | boolean    | true          |
| apply_inss_on_vacation           | boolean    | true          |
| apply_rat_on_vacation            | boolean    | true          |
| apply_terceiros_on_vacation      | boolean    | true          |
| apply_outros_on_vacation         | boolean    | false         |
| created_at / updated_at          | timestamptz| now()         |
+----------------------------------+------------+---------------+
```

### 1.2 Alteracoes na Tabela `employees`

Adicionar novas colunas para armazenar valores especificos por tipo de contratacao e totais calculados:

- `bolsa_auxilio` (numeric, default 0) - Para estagiarios
- `valor_contrato_pj` (numeric, default 0) - Para PJ
- `dividendos` (numeric, default 0) - Para socios
- `provisao_13` (numeric, default 0) - Provisao calculada
- `provisao_ferias` (numeric, default 0) - Provisao calculada
- `provisao_recesso` (numeric, default 0) - Para estagiarios
- `total_monthly_cost_estimated` (numeric, default 0)
- `total_annual_cost_estimated` (numeric, default 0)
- `breakdown_json` (jsonb, nullable) - Detalhamento do calculo

### 1.3 Alteracoes na Tabela `employee_benefits`

Adicionar colunas para controlar origem e status:

- `is_active` (boolean, default true)
- `origin` (text, default 'MANUAL') - Valores: 'MANUAL' | 'FROM_CONTRATACAO'
- `origin_key` (text, nullable) - ID de vinculo para evitar duplicidade

### 1.4 Alteracoes na Tabela `employee_tools`

Adicionar colunas para suportar recorrencia:

- `is_active` (boolean, default true)
- `billing_cycle` (text, default 'monthly') - 'monthly' | 'annual'
- `annual_amount` (numeric, default 0)

---

## Fase 2: Configuracoes do Sistema - Perfil de Encargos

### 2.1 Novo Componente: `PayrollProfileSettingsForm`

Criar uma nova aba "Encargos/Folha" na pagina de Configuracoes (`/settings`) com:

- Card com campos editaveis para todas as aliquotas
- Secao "Aliquotas CLT" com FGTS, INSS Patronal, RAT, Terceiros, Outros
- Secao "Aliquotas Pro-Labore" com INSS e FGTS
- Secao "Incidencia sobre Provisoes" com checkboxes para cada componente
- Valores apresentados como percentuais (0-100%)
- Botao "Salvar Configuracoes"

### 2.2 Novos Arquivos

- `src/types/payrollProfile.ts` - Tipos TypeScript
- `src/services/payrollProfileService.ts` - CRUD no Supabase
- `src/hooks/usePayrollProfile.ts` - React Query hooks
- `src/components/settings/PayrollProfileSettingsForm.tsx` - Formulario UI

---

## Fase 3: Ajustes na Etapa 2 - Contratacao

### 3.1 Mudancas no `EmployeeFormDialog.tsx`

**Tipos de Contratacao (Dropdown):**
- Renomear `JOVEM_APRENDIZ` para `MENOR_APRENDIZ` no codigo
- Labels: CLT, Menor Aprendiz, Estagiario, PJ, Socio

**Campos Dinamicos por Tipo:**

```text
+----------------+-----------------------------+----------------------------+
| Tipo           | Campos Base (Editaveis)     | Encargos (Read-Only)       |
+----------------+-----------------------------+----------------------------+
| CLT            | Salario Bruto               | FGTS, INSS, 13o, Ferias    |
| Menor Aprendiz | Salario Bruto               | FGTS (2%), INSS, 13o, Ferias|
| Estagiario     | Bolsa-Auxilio               | Provisao Recesso (calc)    |
| PJ             | Valor Mensal Contrato       | Todos = 0                  |
| Socio          | Pro-Labore, Dividendos      | INSS/FGTS sobre Pro-Labore |
+----------------+-----------------------------+----------------------------+
```

**Remover:**
- Campo "Salario Liquido" (nao sera mais exibido)

**Adicionar para Socio:**
- Campo "Dividendos" (input moeda, opcional)
- Validacao: Pro-Labore + Dividendos > 0

### 3.2 Bloco de Auxilios na Etapa 2

Adicionar secao "Auxilios" na Etapa 2 com:
- Botao "Adicionar Auxilio"
- Lista simples de auxilios adicionados (nome + valor)
- Cada auxilio sincronizado com Etapa 3 como beneficio

### 3.3 Novo Componente: `Step2AuxiliosSection`

Componente para gerenciar auxilios na Etapa 2 que:
- Armazena auxilios em estado local (`localAuxilios`)
- Sincroniza bidirecionalmente com `localBenefits` da Etapa 3
- Marca beneficios originados da Etapa 2 com tag visual

---

## Fase 4: Motor de Calculo de Custo

### 4.1 Novo Arquivo: `src/lib/employeeCostCalculator.ts`

Implementar funcao `calculateEmployeeCost()` que recebe:

**Inputs:**
- `tipoContratacao`: string
- `salarioBruto`, `bolsaAuxilio`, `valorContratoPj`, `proLabore`, `dividendos`: number
- `payrollProfile`: PayrollProfile
- `benefitsTotalMonthly`: number
- `toolsTotalMonthly`: number

**Logica por Tipo:**

```text
CLT / MENOR APRENDIZ:
  base = salario_bruto
  provisao_13 = base / 12
  provisao_ferias = (base * 1.333) / 12
  encargos_salario = base * (fgts + inss + rat + terceiros + outros)
  encargos_13 = provisao_13 * (aliquotas com apply_on_13th)
  encargos_ferias = provisao_ferias * (aliquotas com apply_on_vacation)

ESTAGIARIO:
  base = bolsa_auxilio
  encargos = 0
  provisao_recesso = base / 12

PJ:
  base = valor_contrato_pj
  encargos = 0, provisoes = 0

SOCIO:
  base = pro_labore + dividendos
  encargos = pro_labore * (inss_prolabore + fgts_prolabore)
  provisoes = 0
```

**Output:**

```typescript
interface CostBreakdown {
  baseAmount: number;
  chargesAmount: number;
  provisionsAmount: number;
  benefitsAmount: number;
  toolsAmount: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
  details: {
    fgts: number;
    inss: number;
    rat: number;
    terceiros: number;
    outros: number;
    provisao13: number;
    provisaoFerias: number;
    provisaoRecesso: number;
  };
}
```

### 4.2 Integracao com Formulario

- Chamar `calculateEmployeeCost()` em tempo real quando valores mudarem
- Exibir card "Resumo de Custo" com breakdown
- Mostrar aviso: "Valores estimados; validar com contabilidade."

---

## Fase 5: Sincronizacao Auxilios/Beneficios

### 5.1 Logica de Sincronizacao

No `EmployeeFormDialog`:

1. Manter estado `localAuxilios` para Etapa 2
2. Quando auxilio adicionado na Etapa 2:
   - Criar entrada em `localBenefits` com `origin: 'FROM_CONTRATACAO'` e `originKey: auxilio.id`
3. Quando auxilio editado na Etapa 2:
   - Atualizar beneficio correspondente em `localBenefits`
4. Quando auxilio removido na Etapa 2:
   - Marcar beneficio como `isActive: false` em `localBenefits`
5. Na Etapa 3:
   - Beneficios de origem "FROM_CONTRATACAO" mostram badge "Origem: Contratacao"
   - Permitir editar valor e status ativo
   - Se desativado na Etapa 3, refletir na Etapa 2

### 5.2 Persistencia

No `handleSubmit`:
1. Salvar employee com todos os campos calculados
2. Salvar benefits com campos `is_active`, `origin`, `origin_key`
3. Salvar tools com campos `is_active`, `billing_cycle`

---

## Fase 6: Reflexos na Listagem e Dashboard

### 6.1 Alteracoes em `EmployeesTable.tsx`

- Alterar coluna "Custo/Hora" para mostrar `total_monthly_cost_estimated`
- Label: "Custo Mensal (estim.)"
- Calculo de custo/hora: `total_monthly_cost_estimated / jornada_mensal`

### 6.2 Alteracoes em `EmployeeStats.tsx`

- Card "Custo Mensal Total" = soma de `total_monthly_cost_estimated` de funcionarios ativos
- Card "Custo Anual Total" = soma * 12 ou soma de `total_annual_cost_estimated`

---

## Fase 7: Atualizacao de Tipos

### 7.1 Alterar `src/types/employee.ts`

```typescript
export type ContractType = 'CLT' | 'MENOR_APRENDIZ' | 'ESTAGIO' | 'PJ' | 'SOCIO';

export interface Employee {
  // ... campos existentes ...
  bolsaAuxilio: number;
  valorContratoPj: number;
  dividendos: number;
  provisao13: number;
  provisaoFerias: number;
  provisaoRecesso: number;
  totalMonthlyCostEstimated: number;
  totalAnnualCostEstimated: number;
  breakdownJson?: CostBreakdown;
}
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos:
1. `src/types/payrollProfile.ts`
2. `src/services/payrollProfileService.ts`
3. `src/hooks/usePayrollProfile.ts`
4. `src/components/settings/PayrollProfileSettingsForm.tsx`
5. `src/lib/employeeCostCalculator.ts`
6. `src/components/employees/Step2AuxiliosSection.tsx`

### Arquivos a Modificar:
1. `src/pages/Settings.tsx` - Adicionar aba Encargos
2. `src/types/employee.ts` - Novos campos e tipos
3. `src/components/employees/EmployeeFormDialog.tsx` - Campos dinamicos, auxilios, calculo
4. `src/components/employees/EmployeeBenefitsLocalTable.tsx` - Suporte a origem e ativo
5. `src/components/employees/EmployeeToolsLocalTable.tsx` - Suporte a ciclo e ativo
6. `src/services/employeeService.ts` - Novos campos
7. `src/hooks/useEmployees.ts` - Mapeamento de campos
8. `src/components/employees/EmployeesTable.tsx` - Coluna custo mensal
9. `src/components/employees/EmployeeStats.tsx` - Cards de custo total

### Migrations SQL:
1. Criar tabela `payroll_profiles` com RLS
2. Alterar tabela `employees` (novos campos)
3. Alterar tabela `employee_benefits` (is_active, origin, origin_key)
4. Alterar tabela `employee_tools` (is_active, billing_cycle, annual_amount)

---

## Secao Tecnica

### Migracao SQL Exemplo

```sql
-- 1. Tabela payroll_profiles
CREATE TABLE public.payroll_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fgts_rate_clt numeric NOT NULL DEFAULT 0.08,
  fgts_rate_apprentice numeric NOT NULL DEFAULT 0.02,
  inss_patronal_rate numeric NOT NULL DEFAULT 0.20,
  rat_rate numeric NOT NULL DEFAULT 0.03,
  terceiros_rate numeric NOT NULL DEFAULT 0.058,
  outros_rate numeric NOT NULL DEFAULT 0,
  inss_patronal_prolabore_rate numeric NOT NULL DEFAULT 0.20,
  fgts_prolabore_rate numeric NOT NULL DEFAULT 0,
  apply_fgts_on_13th boolean NOT NULL DEFAULT true,
  apply_inss_on_13th boolean NOT NULL DEFAULT true,
  apply_rat_on_13th boolean NOT NULL DEFAULT true,
  apply_terceiros_on_13th boolean NOT NULL DEFAULT true,
  apply_outros_on_13th boolean NOT NULL DEFAULT false,
  apply_fgts_on_vacation boolean NOT NULL DEFAULT true,
  apply_inss_on_vacation boolean NOT NULL DEFAULT true,
  apply_rat_on_vacation boolean NOT NULL DEFAULT true,
  apply_terceiros_on_vacation boolean NOT NULL DEFAULT true,
  apply_outros_on_vacation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- 2. Alteracoes em employees
ALTER TABLE public.employees 
  ADD COLUMN bolsa_auxilio numeric NOT NULL DEFAULT 0,
  ADD COLUMN valor_contrato_pj numeric NOT NULL DEFAULT 0,
  ADD COLUMN dividendos numeric NOT NULL DEFAULT 0,
  ADD COLUMN provisao_13 numeric NOT NULL DEFAULT 0,
  ADD COLUMN provisao_ferias numeric NOT NULL DEFAULT 0,
  ADD COLUMN provisao_recesso numeric NOT NULL DEFAULT 0,
  ADD COLUMN total_monthly_cost_estimated numeric NOT NULL DEFAULT 0,
  ADD COLUMN total_annual_cost_estimated numeric NOT NULL DEFAULT 0,
  ADD COLUMN breakdown_json jsonb;

-- 3. Alteracoes em employee_benefits
ALTER TABLE public.employee_benefits
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN origin text NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN origin_key text;

-- 4. Alteracoes em employee_tools
ALTER TABLE public.employee_tools
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN annual_amount numeric NOT NULL DEFAULT 0;
```

### Algoritmo de Calculo (Pseudocodigo)

```typescript
function calculateEmployeeCost(input: CostInput): CostBreakdown {
  const { tipo, salario, bolsa, pj, proLabore, dividendos, profile, benefits, tools } = input;
  
  let base = 0, charges = 0, provisions = 0;
  const details = { fgts: 0, inss: 0, rat: 0, terceiros: 0, outros: 0, ... };
  
  switch(tipo) {
    case 'CLT':
    case 'MENOR_APRENDIZ':
      base = salario;
      const fgtsRate = tipo === 'CLT' ? profile.fgts_rate_clt : profile.fgts_rate_apprentice;
      
      // Encargos sobre salario
      details.fgts = base * fgtsRate;
      details.inss = base * profile.inss_patronal_rate;
      details.rat = base * profile.rat_rate;
      details.terceiros = base * profile.terceiros_rate;
      details.outros = base * profile.outros_rate;
      
      // Provisoes
      details.provisao13 = base / 12;
      details.provisaoFerias = (base * 1.333) / 12;
      
      // Encargos sobre provisoes
      const rates13 = sumApplicableRates(profile, '13th', fgtsRate);
      const ratesFerias = sumApplicableRates(profile, 'vacation', fgtsRate);
      
      charges = details.fgts + details.inss + details.rat + details.terceiros + details.outros
              + (details.provisao13 * rates13) + (details.provisaoFerias * ratesFerias);
      provisions = details.provisao13 + details.provisaoFerias;
      break;
      
    case 'ESTAGIO':
      base = bolsa;
      details.provisaoRecesso = bolsa / 12;
      provisions = details.provisaoRecesso;
      break;
      
    case 'PJ':
      base = pj;
      break;
      
    case 'SOCIO':
      base = proLabore + dividendos;
      details.inss = proLabore * profile.inss_patronal_prolabore_rate;
      details.fgts = proLabore * profile.fgts_prolabore_rate;
      charges = details.inss + details.fgts;
      break;
  }
  
  const totalMonthly = base + charges + provisions + benefits + tools;
  
  return {
    baseAmount: base,
    chargesAmount: charges,
    provisionsAmount: provisions,
    benefitsAmount: benefits,
    toolsAmount: tools,
    totalMonthlyCost: totalMonthly,
    totalAnnualCost: totalMonthly * 12,
    details
  };
}
```

---

## Criterios de Aceite

1. Etapa 2 recalcula automaticamente encargos e resumo quando valores mudam
2. Auxilios da Etapa 2 aparecem na Etapa 3 como beneficios, sem duplicar, com sincronizacao bidirecional
3. Beneficios e Ferramentas entram no resumo e total mensal imediatamente
4. Encargos sao sempre read-only e vem do Perfil de Encargos do sistema
5. Ao salvar, listagem e dashboard refletem o custo mensal total estimado
6. Socio: usuario pode preencher pro-labore, dividendos ou ambos; encargos incidem apenas no pro-labore
7. Aviso "Valores estimados; validar com contabilidade" exibido no resumo
