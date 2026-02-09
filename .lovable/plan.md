
# Excluir Projetos Concluidos do Timesheet

## Resumo

Projetos com `portfolio_stage = 'completed'` no Portfolio nao devem mais aparecer na tela de lancamento de horas.

## Mudanca

### Arquivo: `src/hooks/useTimesheetData.ts`

Alterar o filtro da query na funcao `useActiveProjectsWithMembers` (linha 90).

**Filtro atual:**
```
.or('status.eq.active,portfolio_stage.neq.planning')
```

**Novo filtro:**
```
.or('status.eq.active,portfolio_stage.neq.planning')
.neq('portfolio_stage', 'completed')
```

Isso adiciona uma condicao extra que exclui projetos cujo `portfolio_stage` seja `completed`, independente do status. Projetos em qualquer outro estagio do portfolio (value_delivery, results_presentation, etc.) continuam aparecendo normalmente.

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useTimesheetData.ts` | Adicionar `.neq('portfolio_stage', 'completed')` na query |
