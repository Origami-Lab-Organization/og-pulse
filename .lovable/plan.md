

# Plano: Lançamento de DAE e Cálculo Real de Impostos

## Resumo

Criar um sistema para registrar os valores reais de impostos (DAE do Simples Nacional) por mês, calcular a alíquota efetiva e ratear o imposto real entre os projetos proporcionalmente à receita que cada um gerou no mês de referência.

---

## Modelo de Dados

Nova tabela `tax_entries`:

```text
tax_entries
├── id (uuid, PK)
├── tenant_id (uuid, FK tenants)
├── reference_month (date)       -- 1º dia do mês de competência (ex: 2026-02-01)
├── payment_date (date)          -- data do pagamento da DAE
├── total_value (numeric)        -- valor total da DAE
├── description (text)           -- descrição/observações
├── file_url (text, nullable)    -- URL do arquivo DAE no storage
├── created_by (uuid, FK auth.users)
├── created_at, updated_at
```

Regra: a DAE paga em março tem `reference_month = 2026-02-01` (competência fevereiro).

---

## Lógica de Rateio por Projeto

Para cada `tax_entry` de um `reference_month`:
1. Buscar todas as parcelas (`project_installments`) com `status = 'received'` e `payment_date` dentro do mês de referência
2. Calcular a receita total recebida no mês
3. Cada projeto recebe a proporção: `(receita_projeto / receita_total) * valor_DAE`

Isso será calculado em tempo de consulta (sem tabela de rateio), permitindo que a alteração de parcelas recalcule automaticamente.

---

## Etapas de Implementação

### 1. Migration — criar tabela `tax_entries`
- Tabela com RLS por tenant
- Bucket `tax-documents` (privado) para upload dos PDFs da DAE
- Policies de storage com verificação de tenant

### 2. Service + Hook — CRUD de `tax_entries`
- `taxEntryService.ts`: getAll(tenantId, year), create, update, delete
- `useTaxEntries.ts`: hooks React Query para listar/criar/atualizar/excluir
- Apenas admin pode criar/editar/excluir

### 3. UI no Portal Admin — aba "Impostos" ou seção dentro de "Financeiro"
- Tabela com os 12 meses do ano, mostrando:
  - Mês de referência
  - Valor da DAE
  - Alíquota efetiva (valor_DAE / receita_recebida_no_mês)
  - Status (lançado / pendente)
- Botão para adicionar lançamento com:
  - Mês de referência (date picker mês/ano, default = mês anterior)
  - Data de pagamento
  - Valor total
  - Descrição
  - Upload do PDF da DAE
- Edição e exclusão de lançamentos existentes

### 4. Atualizar Analytics — usar imposto real quando disponível
- No `useAnalyticsData.ts`, para cada mês do período:
  - Se existe `tax_entry` para aquele mês → usar valor real
  - Se não existe → usar alíquota planejada (financial_settings.taxes_percent)
- Exibir no `TaxesOverview.tsx`:
  - Card 1: Alíquota planejada (meta) — já existe
  - Card 2: Imposto real (soma das DAEs no período) vs estimado
  - Card 3: Alíquota efetiva real (soma DAEs / receita recebida)

### 5. Rateio nos projetos — imposto real por projeto
- Na aba financeira do projeto, quando há DAE lançada:
  - Calcular a participação do projeto na receita do mês
  - Mostrar o imposto real rateado ao invés do estimado
- Isso afeta o cálculo de margem bruta real do projeto

### 6. Visão consolidada — comparativo planejado vs real
- Na seção de impostos do Analytics, tabela mensal:
  - Mês | Receita | Imposto Planejado (%) | DAE Real | Alíquota Efetiva | Diferença

---

## Detalhes Técnicos

**Cálculo da alíquota efetiva:**
```typescript
const aliquotaEfetiva = receitaMes > 0 
  ? (valorDAE / receitaMes) * 100 
  : 0;
```

**Rateio por projeto:**
```typescript
const receitaProjeto = installmentsProjeto
  .filter(i => i.status === 'received' && isInMonth(i.payment_date, refMonth))
  .reduce((sum, i) => sum + i.value, 0);

const impostoRateado = receitaTotal > 0
  ? (receitaProjeto / receitaTotal) * valorDAE
  : 0;
```

**Fallback no Analytics:**
```typescript
// Para meses sem DAE lançada, usar estimativa
const taxesValue = taxEntry 
  ? taxEntry.total_value 
  : revenueActual * (taxesPercent / 100);
```

**Arquivos a criar:**
- `supabase/migrations/xxx_create_tax_entries.sql`
- `src/services/taxEntryService.ts`
- `src/hooks/useTaxEntries.ts`
- `src/types/taxEntry.ts`
- `src/components/settings/TaxEntriesManager.tsx` (UI admin)

**Arquivos a editar:**
- `src/hooks/useAnalyticsData.ts` — fallback real vs planejado
- `src/components/analytics/TaxesOverview.tsx` — 3 cards atualizados
- `src/pages/AdminPortal.tsx` — nova seção/aba de impostos
- `src/components/projects/detail/ProjectOverviewTab.tsx` — rateio real
- `src/components/projects/detail/ProjectExpectedResultTab.tsx` — rateio real

