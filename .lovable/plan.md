

## Adaptar fluxo para projetos de Financiamento da Inovacao

### Contexto

Projetos do tipo "Financiamento da Inovacao" atuam no sucesso do cliente e, portanto:
1. Nao possuem orcamento atrelado (podem avancar no CRM sem budget)
2. As NFs (parcelas) devem ser cadastradas manualmente durante a execucao, nao geradas automaticamente no planejamento

### Alteracoes

**1. CRM - Permitir avancar sem orcamento (LeadKanbanBoard.tsx)**

A validacao atual bloqueia leads sem `budget_id` de avancar para "Negociacao" e "Fechado". Para leads com `service_line === 'financiamento_inovacao'`, essa validacao sera ignorada.

Quando um lead de Financiamento da Inovacao for arrastado para "Fechado" e nao tiver orcamento, o sistema abrira um dialog simplificado (sem resumo de orcamento) pedindo apenas os dados essenciais do projeto: gerente, datas de inicio/fim e valor contratual.

**2. CloseBusinessDialog - Modo sem orcamento**

O dialog "Fechar Negocio" sera adaptado para funcionar em dois modos:
- **Com orcamento** (fluxo atual): exibe resumo do orcamento, copia roles/suppliers/materials
- **Sem orcamento** (Financiamento da Inovacao): exibe campos para nome do projeto, cliente, valor total, gerente e datas. Os campos de NF (data primeira NF, parcelas, dia vencimento, forma de pagamento) serao ocultados

**3. useCloseBusinessDeal - Suportar criacao sem orcamento**

O hook sera adaptado para aceitar um input alternativo quando nao houver orcamento:
- Criar o projeto com `budget_id: null`
- Nao gerar installments automaticamente (pular a logica de `firstInvoiceDate`)
- Nao copiar roles/suppliers/materials (nao ha orcamento fonte)

**4. projectService.create - Nao gerar parcelas quando nao houver firstInvoiceDate**

O servico ja possui a condicao `if (input.firstInvoiceDate)` antes de gerar installments. Basta garantir que o input envie `firstInvoiceDate` como `undefined` para projetos de Financiamento da Inovacao, e nenhuma parcela sera gerada.

### Detalhes tecnicos

**LeadKanbanBoard.tsx** - Linha 77-80:
```text
// Antes (bloqueia sempre sem budget):
if ((newStage === 'negotiation' || newStage === 'closed') && !lead.budget_id) { ... }

// Depois (permite se for Financiamento da Inovacao):
const isFinInovacao = lead.service_line === 'financiamento_inovacao';
if ((newStage === 'negotiation' || newStage === 'closed') && !lead.budget_id && !isFinInovacao) { ... }
```

**CloseBusinessDialog.tsx** - Recebera uma prop `lead` opcional para obter dados quando nao houver orcamento:
- Se `budget` for null e `lead` existir: exibir campos de nome, cliente e valor
- Tornar campos de NF condicionais (ocultos quando nao ha orcamento)
- Schema zod adaptado: `firstInvoiceDate`, `installmentsCount`, `dueDay` opcionais

**useCloseBusinessDeal.ts** - O input ganhara campos opcionais:
- `leadName`, `clientId`, `totalValue` para quando nao houver budget
- Logica condicional: se `budget` for null, nao tenta copiar roles/suppliers/materials
- Nao chama `budgetService.updateStatus` quando nao ha budget

**Fluxo resumido:**

```text
Lead "Fin. Inovacao" arrastado para Fechado
  -> Sem budget? OK (permitido)
  -> Abre CloseBusinessDialog simplificado
  -> Usuario preenche: gerente, datas, valor
  -> Cria projeto sem budget_id, sem parcelas
  -> Parcelas serao cadastradas manualmente na aba Financeiro durante execucao
```

Nenhuma migracao de banco necessaria - os campos `budget_id` e `first_invoice_date` ja sao nullable.

