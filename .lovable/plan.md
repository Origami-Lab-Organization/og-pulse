

## Adicionar cartoes de KPI ao CRM

### Objetivo

Adicionar 4 cartoes de resumo acima do Kanban na pagina do CRM:

1. **Projetos Ganhos** - Quantidade de leads em "Negocio Fechado" no ano corrente
2. **Total Ganho no Ano** - Soma do `final_total` dos orcamentos vinculados aos leads fechados no ano corrente
3. **Recebido no Ano** - Soma das parcelas pagas (status `received`) dos projetos vinculados aos orcamentos dos leads fechados
4. **Pipeline** - Soma dos valores dos leads em "Proposta" e "Negociacao" (usando `budget.final_total` quando disponivel, senao `estimated_value`)

### Alteracoes

**Novo arquivo: `src/components/crm/CRMStats.tsx`**

- Componente que recebe os leads e calcula os 4 KPIs
- Para os 3 primeiros KPIs, filtra leads com `crm_stage === 'closed'` cujo `closed_at` esta no ano corrente (se `closed_at` for nulo, considera todos os leads fechados como do ano corrente, ja que dados historicos nao tem essa data preenchida)
- Para "Recebido no Ano", sera necessario buscar installments dos projetos vinculados aos budgets dos leads fechados
- Layout em grid de 4 colunas seguindo o padrao visual dos outros Stats (ClientStats, BudgetStats)

**Novo hook ou query adicional no `useLeads`**

- Criar uma funcao `fetchCRMReceivedValue` no `leadService.ts` que busca o total recebido no ano para projetos vinculados aos orcamentos dos leads fechados
- Ou incluir essa logica diretamente no componente via query separada

**Arquivo: `src/pages/CRM.tsx`**

- Importar e renderizar `CRMStats` acima da barra de busca, passando os leads

### Detalhes tecnicos

Logica dos KPIs:

```text
Projetos Ganhos = leads.filter(stage === 'closed').length
Total Ganho = leads.filter(stage === 'closed').sum(budget?.final_total || estimated_value)
Pipeline = leads.filter(stage in ['proposal','negotiation']).sum(budget?.final_total || estimated_value)
```

Para "Recebido no Ano", query separada:

```sql
SELECT COALESCE(SUM(pi.value), 0) as total_received
FROM project_installments pi
JOIN projects p ON pi.project_id = p.id
JOIN leads l ON p.budget_id = l.budget_id
WHERE l.tenant_id = $tenant_id
  AND l.crm_stage = 'closed'
  AND pi.status = 'received'
  AND EXTRACT(YEAR FROM pi.payment_date) = EXTRACT(YEAR FROM NOW())
```

Essa query sera executada via Supabase RPC ou diretamente via joins no client. Como o Supabase JS nao suporta facilmente esse join triplo, criaremos uma database function `get_crm_received_value(p_tenant_id uuid)` para encapsular essa logica.

### Resumo das alteracoes

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar funcao `get_crm_received_value` |
| `src/services/leadService.ts` | Adicionar `fetchCRMReceivedValue` |
| `src/hooks/useLeads.ts` | Adicionar `useCRMReceivedValue` |
| `src/components/crm/CRMStats.tsx` | Novo componente com 4 cartoes |
| `src/pages/CRM.tsx` | Renderizar CRMStats acima do Kanban |

