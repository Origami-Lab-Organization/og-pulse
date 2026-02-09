

# Bloqueio de Projetos Concluidos e Auditoria de Edicoes

## Resumo

Quando um projeto for movido para o estagio "Concluido" no Portfolio, seu status sera automaticamente alterado para `completed`. As edicoes no projeto ficarao desabilitadas para todos os usuarios exceto administradores, que deverao fornecer uma justificativa obrigatoria ao salvar qualquer alteracao.

## Mudancas

### 1. Atualizar status do projeto ao mover para "Concluido" no Portfolio

**Arquivo: `src/hooks/usePortfolioProjects.ts`**

Na mutation `useUpdatePortfolioStage`, quando o `newStage` for `'completed'`, atualizar tambem o campo `status` para `'completed'` na mesma operacao de update.

### 2. Desabilitar edicoes para projetos concluidos (nao-admin)

**Arquivo: `src/pages/ProjectDetail.tsx`**

- Criar uma variavel `isCompleted = project.portfolio_stage === 'completed'`.
- Se `isCompleted && !isAdmin`: ocultar o botao "Editar" no header.
- Se `isCompleted && isAdmin`: manter o botao "Editar" visivel.
- Passar `isCompleted` para as abas de Custos, OKRs, Cronograma, Stakeholders e Financeiro para desabilitar edicoes inline (adicionar/remover membros, materiais, fornecedores, etc.).
- Importar `useAuth` para verificar `isAdmin`.

### 3. Criar tabela de auditoria para edicoes em projetos concluidos

**Migracao SQL:**

```sql
CREATE TABLE public.project_edit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL,
  justification text NOT NULL,
  changes_summary text,
  edited_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_edit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert project edit logs"
  ON public.project_edit_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), get_project_tenant_id(project_id), 'admin'::app_role));

CREATE POLICY "Admins and managers can view project edit logs"
  ON public.project_edit_logs FOR SELECT
  USING (is_admin_or_manager(auth.uid(), get_project_tenant_id(project_id)));
```

### 4. Adicionar justificativa no formulario de edicao (admin + projeto concluido)

**Arquivo: `src/components/projects/ProjectFormDialog.tsx`**

- Receber nova prop `requireJustification?: boolean`.
- Quando `requireJustification = true`, exibir um campo de `Textarea` para "Justificativa" no rodape do formulario, antes dos botoes.
- A justificativa sera obrigatoria (minimo 10 caracteres), seguindo o mesmo padrao ja usado no timesheet.
- Passar a justificativa junto com o submit (nova prop `onSubmit` com justificativa opcional).

### 5. Salvar justificativa na tabela de auditoria

**Arquivo: `src/hooks/useProjects.ts`**

- Atualizar `useUpdateProject` para aceitar um campo opcional `justification`.
- Quando `justification` estiver presente, apos o update do projeto, inserir um registro em `project_edit_logs` com o `project_id`, `edited_by` (user atual), `justification` e um resumo das alteracoes.

### 6. Desabilitar edicoes inline nas abas internas

Os seguintes componentes receberao uma prop `isReadOnly?: boolean` que, quando `true`, oculta botoes de adicionar/editar/remover:

| Componente | Controle |
|------------|----------|
| `ProjectCostsTab` | Ja recebe `isEditable` e `canEditActuals` - setar ambos como `false` quando concluido e nao-admin |
| `ProjectOKRsTab` | Ocultar botoes de adicionar/editar OKRs e Key Results |
| `ProjectScheduleTab` | Ocultar botoes de adicionar/editar milestones |
| `ProjectStakeholdersTab` | Ocultar botoes de adicionar/editar stakeholders |
| `ProjectFinancialTab` | Desabilitar edicao de parcelas |

Para admin, essas edicoes continuam disponiveis. A justificativa sera exigida apenas no formulario principal de edicao do projeto (botao "Editar" no header). Edicoes granulares (OKRs, milestones, etc.) por admin nao exigirao justificativa individual nesta fase.

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/usePortfolioProjects.ts` | Atualizar `status` para `completed` ao mover para estagio concluido |
| `src/pages/ProjectDetail.tsx` | Logica de bloqueio por `isCompleted` + `isAdmin` |
| `src/components/projects/ProjectFormDialog.tsx` | Campo de justificativa condicional |
| `src/hooks/useProjects.ts` | Inserir log de auditoria com justificativa |
| `src/components/projects/detail/ProjectOKRsTab.tsx` | Prop `isReadOnly` |
| `src/components/projects/detail/ProjectScheduleTab.tsx` | Prop `isReadOnly` |
| `src/components/projects/detail/ProjectStakeholdersTab.tsx` | Prop `isReadOnly` |
| Migracao SQL | Criar tabela `project_edit_logs` com RLS |

## Detalhes Tecnicos

### Fluxo ao mover para "Concluido" no Portfolio

```text
Drag para coluna "Concluido"
  -> useUpdatePortfolioStage.mutate({ projectId, newStage: 'completed' })
    -> UPDATE projects SET portfolio_stage = 'completed', status = 'completed' WHERE id = ?
    -> Invalidar queries de portfolio E de projects
```

### Fluxo de edicao por admin em projeto concluido

```text
Admin clica "Editar"
  -> ProjectFormDialog abre com requireJustification=true
  -> Admin preenche campos + justificativa (min 10 chars)
  -> Submit
    -> useUpdateProject.mutate({ id, updates, justification })
      -> UPDATE projects SET ... WHERE id = ?
      -> INSERT INTO project_edit_logs (project_id, edited_by, justification, changes_summary)
```

### Interface atualizada do useUpdateProject

```typescript
mutationFn: async ({
  id,
  updates,
  justification,
}: {
  id: string;
  updates: Partial<CreateProjectInput>;
  justification?: string;
})
```
