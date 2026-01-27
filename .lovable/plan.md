
# Plano: Reformulacao Completa do Cadastro de Funcionario

## Resumo
Reformular o formulario de funcionario para incluir novos campos obrigatorios, validacao de CPF, tipos de contratacao, calculo automatico de encargos trabalhistas e tabela de beneficios.

## Mudancas no Banco de Dados

### Novos Campos na Tabela `employees`
```sql
ALTER TABLE public.employees
  ADD COLUMN tipo_contratacao TEXT NOT NULL DEFAULT 'CLT',
  ADD COLUMN jornada_mensal INTEGER NOT NULL DEFAULT 176,
  ADD COLUMN salario_liquido NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN fgts NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN inss_empresa NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN decimo_terceiro NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN ferias NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN pro_labore NUMERIC NOT NULL DEFAULT 0;
```

### Nova Tabela `employee_benefits`
```sql
CREATE TABLE public.employee_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Alterar CPF e Telefone para NOT NULL
```sql
ALTER TABLE public.employees 
  ALTER COLUMN cpf SET NOT NULL,
  ALTER COLUMN telefone SET NOT NULL;
```

## Tipos de Contratacao

| Tipo | Label | Campos Visiveis |
|------|-------|-----------------|
| SOCIO | Socio | Pro-labore (sem salario) |
| CLT | CLT | Salario, Encargos automaticos |
| PJ | PJ | Valor Mensal (sem encargos) |
| JOVEM_APRENDIZ | Jovem Aprendiz | Salario reduzido |
| ESTAGIO | Estagio | Bolsa-auxilio |

## Logica de Calculo Automatico (CLT)

Para funcionarios CLT, os encargos sao calculados automaticamente sobre o salario bruto:

| Encargo | Percentual | Formula |
|---------|------------|---------|
| FGTS | 8% | salario * 0.08 |
| INSS Empresa | 20% | salario * 0.20 |
| 13o Salario | 8.33% | salario / 12 |
| Ferias + 1/3 | 11.11% | (salario / 12) * 1.33 |

**Total Encargos CLT**: ~47.44% sobre salario bruto

## Validacao de CPF

Implementar algoritmo de validacao do digito verificador:
```typescript
export const validateCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false; // Todos iguais
  
  // Calculo do primeiro digito
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  
  // Calculo do segundo digito
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  
  return digit1 === parseInt(numbers[9]) && digit2 === parseInt(numbers[10]);
};
```

## Estrutura do Formulario (Novo Layout)

O formulario tera 3 abas:

### Aba 1: Dados Pessoais
- Nome Completo (obrigatorio)
- Email (obrigatorio)
- Telefone (obrigatorio, com mascara)
- CPF (obrigatorio, com mascara e validacao)
- Cargo
- Data de Admissao
- Status (Ativo/Inativo)
- Administrador? (Switch)

### Aba 2: Contratacao e Financeiro
- Tipo de Contratacao (Select: SOCIO, CLT, PJ, JOVEM_APRENDIZ, ESTAGIO)
- Jornada Mensal (horas/mes, default 176)

**Se SOCIO:**
- Pro-labore Mensal

**Se CLT:**
- Salario Bruto
- Salario Liquido (informativo)
- FGTS (calculado automatico: 8%)
- INSS Empresa (calculado automatico: 20%)
- 13o Salario (calculado automatico: 8.33%)
- Ferias (calculado automatico: 11.11%)
- Total Encargos (soma automatica)

**Se PJ:**
- Valor Mensal PJ

**Se JOVEM_APRENDIZ ou ESTAGIO:**
- Bolsa/Salario

### Aba 3: Beneficios
Tabela inline igual a Ferramentas:
- Nome do beneficio
- Descricao (opcional)
- Valor mensal

Exemplos: Vale Refeicao, Vale Transporte, Plano de Saude, etc.

## Arquivos a Modificar

### 1. Database Migration
Criar migração para adicionar novos campos e tabela de beneficios

### 2. `src/lib/masks.ts`
Adicionar funcao `validateCPF()`

### 3. `src/types/employee.ts`
Adicionar novos campos ao tipo Employee:
```typescript
export type ContractType = 'SOCIO' | 'CLT' | 'PJ' | 'JOVEM_APRENDIZ' | 'ESTAGIO';

export interface Employee {
  // ... campos existentes
  tipoContratacao: ContractType;
  jornadaMensal: number;
  salarioLiquido: number;
  fgts: number;
  inssEmpresa: number;
  decimoTerceiro: number;
  ferias: number;
  proLabore: number;
  benefits?: EmployeeBenefit[];
  totalBenefitsCost?: number;
}

export interface EmployeeBenefit {
  id: string;
  employee_id: string;
  name: string;
  description: string | null;
  monthly_value: number;
  created_at: string;
  updated_at: string;
}
```

### 4. `src/services/employeeService.ts`
- Atualizar `CreateEmployeeInput` com novos campos
- Adicionar CRUD para benefits (similar a tools)
- Mapear novos campos no `update()`

### 5. `src/hooks/useEmployees.ts`
- Atualizar `dbToEmployee()` para mapear novos campos
- Adicionar hooks para benefits: `useEmployeeBenefits`, `useAddEmployeeBenefit`, etc.

### 6. `src/components/employees/EmployeeFormDialog.tsx`
- Refatorar para 3 abas: Dados, Financeiro, Beneficios
- Adicionar campos condicionais por tipo de contratacao
- Implementar calculo automatico de encargos CLT
- Adicionar validacao de CPF no schema Zod

### 7. `src/components/employees/EmployeeBenefitsTable.tsx` (novo)
Componente similar ao `EmployeeToolsTable.tsx` para gerenciar beneficios

### 8. `supabase/functions/create-employee-user/index.ts`
Atualizar para receber e salvar os novos campos

## Fluxo de Calculo Automatico (CLT)

```text
Usuario digita Salario Bruto
         |
         v
Sistema calcula automaticamente:
  - FGTS = salario * 0.08
  - INSS Empresa = salario * 0.20
  - 13o = salario / 12
  - Ferias = (salario / 12) * 1.33
         |
         v
Exibe valores calculados (readonly)
         |
         v
Total Encargos = soma dos 4
         |
         v
Custo Total = Salario + Encargos + Beneficios + Ferramentas
```

## Custo/Hora Atualizado

O calculo do custo/hora sera atualizado para considerar:
```typescript
const custoTotal = salarioMensal + totalEncargos + totalBeneficios + totalFerramentas;
const custoHora = custoTotal / jornadaMensal;
```

## Resumo das Alteracoes

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar campos + tabela benefits |
| src/lib/masks.ts | Adicionar validateCPF |
| src/types/employee.ts | Novos tipos e interfaces |
| src/services/employeeService.ts | CRUD benefits + novos campos |
| src/hooks/useEmployees.ts | Hooks benefits + mapeamento |
| EmployeeFormDialog.tsx | Refatorar com 3 abas |
| EmployeeBenefitsTable.tsx | Novo componente |
| create-employee-user/index.ts | Novos campos na criacao |
