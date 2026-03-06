

## Plano: Persistir ajustes financeiros na coluna JSON da rescisão

### Problema raiz
Os ajustes de folha (tanto auto-calculados quanto manuais como o débito de R$300) não estão sendo salvos na tabela `payroll_adjustments` porque o usuário logado não possui registro na tabela `user_roles`, fazendo com que a política RLS bloqueie silenciosamente os INSERTs. O wizard conclui sem erro porque o `Promise.all` dos ajustes falha sem feedback.

A tabela `employee_terminations` já possui a coluna `final_payroll_adjustments` (JSONB) que está vazia (`null`). Vamos usá-la como fonte primária.

### Solução

#### 1. `src/components/employees/TerminationWizardModal.tsx`
- Após criar a rescisão, salvar TODOS os ajustes (auto-calcs + manuais) na coluna `final_payroll_adjustments` do registro de termination via `terminationService.update()`
- Formato JSON: array de objetos `{ desc, value, isCredit, type }`
- Manter tentativa de salvar em `payroll_adjustments` como fallback (best-effort, sem bloquear)

#### 2. `src/components/terminations/detail/TerminationDetailFinancialTab.tsx`
- Ler ajustes de `termination.final_payroll_adjustments` (JSONB) como fonte primária
- Se `final_payroll_adjustments` tiver dados, mostrar na seção "Verbas Rescisórias" + "Ajustes Manuais"
- Fallback para auto-calcs on-the-fly + `payroll_adjustments` da tabela se o JSON estiver vazio
- Os cards de resumo somam créditos e débitos de todas as fontes

#### 3. `src/services/terminationService.ts`
- Garantir que o `update()` aceita o campo `final_payroll_adjustments`

### Resultado esperado
- O débito de R$300 aparecerá na seção "Ajustes Manuais"
- Os créditos de R$4.700 (bolsa + recesso) aparecerão em "Verbas Rescisórias"
- Cards mostrarão: Créditos R$4.700, Débitos R$300, Líquido R$4.400
- Funciona independente de RLS na tabela `payroll_adjustments`

