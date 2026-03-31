

# Plano: Refatorar Impostos — Lançamento por Extrato e Rateio por Data de Pagamento

## Resumo

Refatorar o sistema de impostos para: (1) registrar o **Extrato do Simples Nacional** (não apenas a DAE), armazenando RBT12, alíquota e breakdown por tributo; (2) alocar o custo do imposto pela **data de pagamento** (desembolso) e não pela competência; (3) ratear entre projetos proporcionalmente ao **faturamento do mês anterior** (reference_month); (4) usar o RBT12 como memória de cálculo para estimar impostos futuros.

---

## Mudança de Lógica Principal

```text
ATUAL:  DAE ref_month=Fev → custo alocado em Fevereiro
NOVO:   Extrato ref_month=Fev, payment_date=20/Mar → custo alocado em Março
        Rateio: proporcional ao faturamento de Fevereiro (NFs emitidas)
```

Isso alinha com a lógica de timesheets: o custo aparece quando o dinheiro sai, mas é rateado pela atividade que o gerou.

---

## 1. Migração — Expandir tabela `tax_entries`

Adicionar colunas para armazenar dados do extrato:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `rbt12` | numeric | Receita bruta acumulada 12 meses anteriores |
| `rpa` | numeric | Receita bruta do período de apuração |
| `aliquota_simples` | numeric | Alíquota efetiva do Simples (%) |
| `irpj` | numeric | Parcela IRPJ |
| `csll` | numeric | Parcela CSLL |
| `cofins` | numeric | Parcela COFINS |
| `pis_pasep` | numeric | Parcela PIS/Pasep |
| `inss_cpp` | numeric | Parcela INSS/CPP |
| `iss` | numeric | Parcela ISS |

Todos nullable com default 0, para não quebrar registros existentes.

---

## 2. Atualizar Types + Service + Hooks

- Adicionar novos campos em `TaxEntryDB`, `CreateTaxEntryInput`, `UpdateTaxEntryInput`
- Renomear label na UI de "DAE" para "Extrato do Simples"

---

## 3. Refatorar Lógica de Rateio (mudança crítica)

**Em `useProjectFinancials.ts` e `useAnalyticsData.ts`:**

Atualmente filtra tax_entries por `reference_month` no período. Novo comportamento:

```typescript
// Buscar tax_entries onde payment_date está no período do filtro
// Para cada entry, o rateio usa o faturamento do reference_month (mês anterior)
```

**Em `useFinancialEvolution.ts`:**

Atualmente mapeia tax_entry por `reference_month` para o mês do gráfico. Novo:

```typescript
// Mapear tax_entry por payment_date para o mês do gráfico
// O valor aparece no mês em que foi pago
```

---

## 4. Estimativa de impostos futuros

Para meses sem extrato lançado, o sistema pode estimar usando:
- Se existe um extrato recente com `rbt12` e `aliquota_simples` → usar a alíquota do último extrato × faturamento estimado do mês
- Fallback: usar `financial_settings.taxes_percent` (meta de 13%)

---

## 5. Atualizar UI do Admin (TaxEntriesManager)

- Renomear de "Lançamentos de DAE" para "Extrato do Simples Nacional"
- Adicionar campos no formulário: RBT12, RPA, Alíquota, e breakdown por tributo (colapsável/accordion)
- Na tabela mensal, mostrar a alíquota do extrato ao invés de calcular por faturamento
- Manter upload de arquivo (agora do extrato PDF)

---

## 6. Atualizar Analytics e Projetos

Os cards e gráficos já funcionam — a mudança é apenas na lógica de busca (payment_date vs reference_month). Nenhuma alteração visual necessária além do que já existe.

---

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/xxx.sql` | ALTER TABLE tax_entries ADD columns |
| `src/types/taxEntry.ts` | Novos campos nos tipos |
| `src/services/taxEntryService.ts` | Novo método `getByPaymentDateRange` |
| `src/hooks/useTaxEntries.ts` | Novo hook para buscar por payment_date |
| `src/components/settings/TaxEntriesManager.tsx` | Campos do extrato no formulário, rename labels |
| `src/hooks/useAnalyticsData.ts` | Filtrar por payment_date, ratear por ref_month |
| `src/hooks/useProjectFinancials.ts` | Idem |
| `src/hooks/useFinancialEvolution.ts` | Mapear por payment_date no gráfico |

---

## Detalhes Técnicos

**Novo fluxo de rateio:**
```typescript
// 1. Buscar tax_entries onde payment_date está no período
const taxEntries = await getByPaymentDateRange(tenantId, startDate, endDate);

// 2. Para cada entry, buscar faturamento do reference_month
for (const entry of taxEntries) {
  const refMonth = entry.reference_month; // ex: 2026-02-01
  // Buscar NFs emitidas em Fevereiro por projeto
  // Ratear entry.total_value proporcionalmente
}

// 3. O custo aparece no mês do payment_date
```

**Estimativa futura:**
```typescript
const lastExtrato = getLatestExtrato(tenantId);
const estimatedRate = lastExtrato?.aliquota_simples ?? taxesPercent;
const estimatedTax = faturadoEstimado * (estimatedRate / 100);
```

