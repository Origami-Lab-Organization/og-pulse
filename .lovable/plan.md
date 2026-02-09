

# Ajustes nos Cards de Projetos

## 1. Card "Recebido no Ano" mostrando R$ 0,00

**Causa raiz**: O calculo atual filtra parcelas pelo ano do `due_date` e depois verifica `status === 'received'`. Porem, parcelas com vencimento em 2025 que foram pagas em 2026 nao sao contabilizadas. Alem disso, o campo `payment_date` nao esta sendo carregado na query do `projectService.getAll`.

**Solucao**: Mudar a logica para filtrar pelo ano do `payment_date` (data do pagamento efetivo), nao pelo `due_date`:

- No `ProjectStats.tsx`:
  - `receivedValue`: filtrar parcelas com `status === 'received'` E `payment_date` no ano corrente (independente do `due_date`)
  - `overdueValue`: manter filtro por `due_date` no ano corrente com `status === 'overdue'`

**Arquivo**: `src/components/projects/ProjectStats.tsx`
- Alterar calculo de `receivedValue` para:
  ```
  receivedValue = installments
    .filter(i => i.status === 'received' && i.payment_date && new Date(i.payment_date).getFullYear() === currentYear)
    .reduce(...)
  ```

## 2. Card "Projetos Ativos" contando apenas status `active`

**Causa raiz**: A linha `projects.filter((p) => p.status === 'active')` so conta projetos com status exatamente `active`, excluindo `planning`.

**Solucao**: Contar projetos com status `planning` ou `active` (excluir `completed`, `paused`, `cancelled`).

**Arquivo**: `src/components/projects/ProjectStats.tsx`
- Alterar filtro de `activeProjects`:
  ```
  const activeProjects = projects.filter(
    (p) => p.status === 'planning' || p.status === 'active'
  ).length;
  ```
- Atualizar description para "Em planejamento ou execucao"

## Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `ProjectStats.tsx` | Filtrar recebidos por `payment_date` no ano; contar projetos planning + active |

