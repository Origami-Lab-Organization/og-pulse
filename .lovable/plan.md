
# Plano: Validacao de Checklist para Mover Projeto de Planejamento para Entrega de Valor

## Objetivo

Impedir que um projeto seja movido do estagio "Planejamento" para "Entrega de Valor" no Kanban de Portfolio se o checklist de preparacao nao estiver completo (OKRs, Stakeholders, Custos e Cronograma).

## Abordagem

A validacao sera feita no `handleDragEnd` do `PortfolioKanbanBoard`. Quando o usuario tentar mover um card de `planning` para `value_delivery`, o sistema fara uma consulta rapida ao banco para verificar se os 4 itens obrigatorios estao preenchidos. Se algum estiver faltando, exibe um toast de erro informando o que falta e bloqueia a movimentacao.

## Mudancas

### 1. Criar hook de validacao: `useProjectPlanningReadiness`

**Novo arquivo:** `src/hooks/useProjectPlanningReadiness.ts`

Um hook que recebe um `projectId` e retorna uma funcao async `checkReadiness()` que consulta:
- `project_okrs` com `project_key_results` -- precisa de pelo menos 1 OKR com 1 KR
- `project_stakeholders` -- pelo menos 1
- `project_members` -- pelo menos 1 (custos/equipe alocada)
- `project_milestones` -- pelo menos 1

Retorna um objeto `{ ready: boolean, missing: string[] }` com os nomes dos itens faltantes.

### 2. Integrar validacao no Kanban Board

**Arquivo:** `src/components/portfolio/PortfolioKanbanBoard.tsx`

No `handleDragEnd`, antes de chamar `updateStage.mutate()`:
- Se a transicao for de `planning` para `value_delivery`, chamar `checkReadiness(projectId)`
- Se `ready === false`, exibir toast destrutivo listando os itens faltantes e cancelar a movimentacao
- Demais transicoes seguem sem validacao

### 3. Feedback visual

O toast de erro listara exatamente o que falta, por exemplo:
> "O projeto nao pode ser movido para Entrega de Valor. Itens pendentes: OKRs definidos, Cronograma definido."

## Detalhes Tecnicos

### useProjectPlanningReadiness.ts

```typescript
// Consultas paralelas ao Supabase para verificar cada item
const [okrs, stakeholders, members, milestones] = await Promise.all([
  supabase.from('project_okrs').select('id, key_results:project_key_results(id)').eq('project_id', projectId),
  supabase.from('project_stakeholders').select('id').eq('project_id', projectId).limit(1),
  supabase.from('project_members').select('id').eq('project_id', projectId).limit(1),
  supabase.from('project_milestones').select('id').eq('project_id', projectId).limit(1),
]);

const missing = [];
if (!okrs.data?.some(o => o.key_results?.length > 0)) missing.push('OKRs definidos');
if (!stakeholders.data?.length) missing.push('Stakeholders mapeados');
if (!members.data?.length) missing.push('Equipe alocada');
if (!milestones.data?.length) missing.push('Cronograma definido');

return { ready: missing.length === 0, missing };
```

### PortfolioKanbanBoard.tsx - handleDragEnd modificado

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  // ... determinar targetStage ...

  if (targetStage === 'value_delivery' && project.portfolio_stage === 'planning') {
    const { ready, missing } = await checkReadiness(projectId);
    if (!ready) {
      toast({
        title: 'Projeto nao pode ser movido',
        description: `Itens pendentes: ${missing.join(', ')}`,
        variant: 'destructive',
      });
      return; // bloqueia movimentacao
    }
  }

  updateStage.mutate({ projectId, newStage: targetStage });
};
```

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/hooks/useProjectPlanningReadiness.ts` | Criar (validacao de checklist) |
| `src/components/portfolio/PortfolioKanbanBoard.tsx` | Editar (integrar validacao no drag-and-drop) |
