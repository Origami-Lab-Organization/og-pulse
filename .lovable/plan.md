

## Problema Identificado

Rafael e um gerente (`is_gerente = true`) mas nao e o `manager_id` de nenhum projeto. Ele esta alocado como **membro** em 3 projetos (Prumo Obras - Fase 2, Plataforma Bry, Eficiencia Operacional - Discovery).

O codigo no `ReimbursementFormDialog.tsx` (linha 168-170) filtra projetos para gerentes usando apenas `manager_id === employee.id`, ignorando projetos onde o gerente e membro.

```text
Logica atual:
  Admin    → ve todos os projetos
  Gerente  → ve apenas projetos onde e manager_id  ← BUG
  Employee → ve projetos onde e membro (project_members)

Logica correta:
  Admin    → ve todos os projetos
  Gerente  → ve projetos onde e manager_id OU membro  ← FIX
  Employee → ve projetos onde e membro
```

## Alteracao

| # | Arquivo | O que muda |
|---|---------|-----------|
| 1 | `src/components/reimbursements/ReimbursementFormDialog.tsx` | Para gerentes, buscar tambem `project_members` e unir com projetos onde e `manager_id`, removendo duplicatas |

### Detalhe tecnico

No bloco `if (isManager)` (linhas 168-179), unificar a logica: buscar membros do gerente em `project_members` e fazer merge com o filtro de `manager_id`, usando um Set de IDs para desduplicar.

