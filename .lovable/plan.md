
# Plano: Ajustes na Aba Financeiro (Planejamento)

## Problemas Identificados

### 1. Margem Bruta sem impostos
A aba financeira do planejamento (`ProjectExpectedResultTab`) calcula a Margem Bruta como `Receita - Custos`, mas nao deduz impostos. O orcamento vinculado tem 13% de impostos. A formula correta (e usada na aba de Custos) e: `Margem Bruta = Receita - Impostos - Custos`.

### 2. Composicao de custos correta
A secao de composicao de custos usa `memberMonths` e `supplierMonths` para calcular custos detalhados por meses planejados. Isso esta correto e consistente com a aba de Custos.

### 3. Projecao de Recebimentos precisa virar tabela editavel
Atualmente mostra apenas barras de progresso por parcela. Precisa exibir uma tabela com: numero da parcela, valor, data de vencimento, data de emissao da NF e data de pagamento, tudo editavel na fase de planejamento.

## Alteracoes

### Arquivo: `src/components/projects/detail/ProjectExpectedResultTab.tsx`

**A) Corrigir calculo da Margem Bruta**
- Importar `useBudget` para buscar o orcamento vinculado
- Importar `useFinancialSettings` para buscar a meta de margem bruta
- Deduzir impostos (`budget.taxes_percent`) da receita antes de calcular a margem
- Formula: `grossMargin = totalValue - (totalValue * taxesPercent / 100) - totalCost`
- Adicionar indicador de gap em relacao a meta (como faz o card de Custos)

**B) Adicionar card de Impostos nos KPIs**
- Trocar o layout de 4 para 5 cards (ou manter 4 reorganizando)
- Melhor abordagem: manter 4 cards, mas incluir o valor dos impostos como informacao dentro do card de Margem

**C) Substituir secao "Projecao de Recebimentos"**
Trocar as barras de progresso por uma tabela editavel com as colunas:
- Parcela (numero)
- Valor (formatado)
- Vencimento (data)
- Data Emissao NF (input date, editavel)
- Data Pagamento (input date, editavel)
- Acoes (editar/salvar/cancelar)

A tabela tera comportamento inline-edit similar ao `ProjectInstallmentsTable` existente, mas simplificado para a fase de planejamento (sem coluna de status, que sera sempre "Pendente").

As datas de emissao e pagamento devem vir pre-preenchidas:
- **Data de Emissao NF**: mesma data do vencimento da parcela (convencionando que a NF e emitida no vencimento)
- **Data de Pagamento**: vencimento + prazo de pagamento (por padrao, mesma data do vencimento)

O usuario podera editar estas datas clicando no icone de edicao, usando inputs nativos de data para simplicidade.

### Resumo de mudancas no arquivo

| Secao | Mudanca |
|-------|---------|
| Imports | Adicionar `useBudget`, `useFinancialSettings`, `useUpdateInstallment` |
| KPIs | Deduzir impostos na margem; mostrar info de impostos |
| Composicao de Custos | Sem mudancas (ja esta correto) |
| Projecao de Recebimentos | Substituir barras por tabela editavel com datas |

## Detalhes Tecnicos

### Calculo corrigido da Margem
```typescript
const { data: budget } = useBudget(project.budget_id);
const { data: financialSettings } = useFinancialSettings();

const taxesPercent = budget?.taxes_percent || 0;
const taxes = totalValue * (taxesPercent / 100);
const grossMargin = totalValue - taxes - totalCost;
const marginPercent = totalValue > 0 ? (grossMargin / totalValue) * 100 : 0;
```

### Tabela de Parcelas (inline edit)
Reutilizar o padrao ja existente em `ProjectInstallmentsTable`:
- Estado `editingId` para controlar qual linha esta em edicao
- `useUpdateInstallment` hook ja existe para salvar alteracoes
- Inputs `type="date"` para emissao e pagamento
- Pre-preencher `invoice_date` e `payment_date` com `due_date` quando estiverem vazios na exibicao

### Pre-preenchimento das datas
Na renderizacao, quando `invoice_date` for null, exibir `due_date` como sugestao (em cor mais clara) e ao iniciar edicao, pre-popular o campo com `due_date`.
