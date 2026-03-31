

# Plano: Arquivar ou Excluir Projeto com Regras de Negócio

## Resumo

Implementar lógica de exclusão vs. arquivamento de projetos com validações:
- **Excluir**: apenas se o projeto não possui lançamentos (parcelas recebidas/faturadas, OKRs, milestones, stakeholders, commissions pagas, etc.). Ao excluir, limpar também lead e orçamento associados.
- **Arquivar (cancelar)**: se o projeto já tem lançamentos, o admin deve informar motivo e texto explicativo. O projeto recebe status `cancelled` e `portfolio_stage = 'completed'`.

Apenas admins podem executar essas ações.

---

## Etapas

### 1. Migration: adicionar campos de cancelamento na tabela `projects`

Adicionar colunas:
- `cancellation_reason TEXT` — motivo do cancelamento (ex: enum de opções)
- `cancellation_notes TEXT` — texto explicativo
- `cancelled_at TIMESTAMPTZ` — data do cancelamento
- `cancelled_by UUID REFERENCES auth.users(id)` — quem cancelou

### 2. Service: verificar se projeto possui lançamentos

Criar método `projectService.hasActivity(projectId)` que consulta se existem registros em:
- `project_installments` com status `invoiced` ou `received`
- `project_okrs` (qualquer registro)
- `project_milestones` com `completed_date IS NOT NULL`
- `project_stakeholders` (qualquer registro)
- `project_commissions` com `paid_date IS NOT NULL`
- `project_key_results` (qualquer registro)

Retorna `boolean` — `true` se qualquer dessas tabelas tem dados.

### 3. Service: exclusão completa com cascata comercial

Atualizar `projectService.delete(id)` para, antes de excluir o projeto:
1. Buscar `budget_id` e `lead_id` do projeto
2. Excluir o projeto (FK CASCADE já limpa members, installments, suppliers, materials, commissions, OKRs, key_results, milestones, stakeholders, edit_logs)
3. Excluir o orçamento (`budgets`) associado se existir
4. Excluir o lead (`leads`) associado se existir

### 4. Service: arquivar/cancelar projeto

Criar método `projectService.archive(id, { reason, notes, cancelledBy })` que:
- Atualiza `status = 'cancelled'`, `portfolio_stage = 'completed'`
- Preenche `cancellation_reason`, `cancellation_notes`, `cancelled_at = now()`, `cancelled_by`

### 5. Hook: `useArchiveProject`

Novo mutation hook em `useProjects.ts`:
- Chama `projectService.archive()`
- Invalida queries de projetos e portfolio
- Toast de sucesso/erro

### 6. Hook: `useCanDeleteProject`

Hook que chama `projectService.hasActivity(projectId)` e retorna se pode excluir ou deve arquivar.

### 7. Componente: `ProjectRemoveDialog`

Substituir o `DeleteProjectDialog` atual por um componente inteligente:
- Ao abrir, verifica se o projeto tem atividade (`hasActivity`)
- **Se não tem atividade**: mostra confirmação de exclusão definitiva (remove projeto + lead + orçamento)
- **Se tem atividade**: mostra formulário de arquivamento com:
  - Select de motivo (ex: "Cancelamento pelo cliente", "Mudança de escopo", "Restrição orçamentária", "Outro")
  - Textarea para texto explicativo (obrigatório)
  - Botão "Arquivar Projeto"

### 8. Integrar nas páginas

- **ProjectDetail.tsx**: trocar `DeleteProjectDialog` por `ProjectRemoveDialog`, visível apenas para admin
- **Projects.tsx**: trocar `DeleteProjectDialog` por `ProjectRemoveDialog`, ação de delete apenas para admin
- **PortfolioCard.tsx**: adicionar menu de contexto (right-click ou botão) com opção "Excluir/Arquivar" para admin

### 9. Exibição do status cancelado

Projetos arquivados/cancelados devem exibir badge visual indicando cancelamento com o motivo.

---

## Detalhes Técnicos

**Tabelas filho do projeto (cascade delete via FK):**
`project_members`, `project_installments`, `project_suppliers`, `project_materials`, `project_commissions`, `project_okrs`, `project_key_results`, `project_milestones`, `project_stakeholders`, `project_edit_logs`

**Limpeza comercial na exclusão:**
- `leads` onde `id = project.lead_id`
- `budgets` onde `id = project.budget_id`
- Budget roles, suppliers, materials (cascade do budget)

**Campos do formulário de arquivamento:**
```typescript
interface ArchiveProjectInput {
  reason: string;     // motivo padronizado
  notes: string;      // texto livre obrigatório
}
```

