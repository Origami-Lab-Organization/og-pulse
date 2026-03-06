

## Plano: Exibir dados financeiros da rescisão no tab Financeiro

### Problema
A aba Financeiro do modal de desligamento mostra "Nenhum ajuste registrado" porque depende apenas de registros na tabela `payroll_adjustments`. Para desligamentos criados antes da lógica de salvamento automático, ou quando o salvamento falha, a aba fica vazia. O usuário espera ver os cálculos rescisórios (saldo de salário, férias, 13º, FGTS, etc.).

### Solução
Duas abordagens combinadas:

1. **Expandir a query do `getAll`** no `terminationService` para incluir campos financeiros do employee (`salario_mensal`, `fgts`, `data_admissao`, `pro_labore`, `bolsa_auxilio`) — necessários para calcular verbas rescisórias on-the-fly.

2. **Refatorar `TerminationDetailFinancialTab`** para:
   - Computar auto-cálculos (reutilizando `calculateAutoCalcs` do wizard) com os dados do employee + termination
   - Mostrar uma seção "Verbas Rescisórias (Calculadas)" com os itens automáticos
   - Manter a seção "Ajustes Manuais" com os registros do banco (somente os que NÃO são auto-calculados, ou todos do banco)
   - Atualizar os totalizadores (Créditos, Débitos, Líquido) somando ambas as fontes

### Alterações

#### 1. `src/services/terminationService.ts`
- Na query `getAll` e `getById`, adicionar `salario_mensal, fgts, data_admissao, pro_labore, bolsa_auxilio` ao select de `employees`
- Atualizar `TerminationWithEmployee` para incluir esses campos

#### 2. `src/components/terminations/detail/TerminationDetailFinancialTab.tsx`
- Importar `calculateAutoCalcs` do wizard
- Construir um objeto `Employee`-like a partir de `termination.employees` para alimentar `calculateAutoCalcs`
- Exibir seção de "Verbas Rescisórias" (auto-calculadas) em tabela separada acima dos ajustes manuais
- Atualizar cards de resumo para somar auto-calcs + ajustes do banco

#### 3. `src/pages/TerminatedEmployees.tsx` e `src/components/terminations/TerminationsTable.tsx`
- Ajustar tipagem se necessário para os novos campos do employee

