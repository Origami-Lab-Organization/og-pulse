
# Plano: Trava de Timesheets por Projeto (em vez de Global)

## Entendimento do Problema

Atualmente, quando a semana é "enviada", **todos os projetos** da empresa ficam travados, mesmo aqueles que não tiveram horas lançadas. Isso impede que gerentes de projeto façam lançamentos retroativos em projetos que ficaram pendentes.

A trava deve funcionar **individualmente por projeto**, permitindo que:
- Projetos já enviados fiquem travados
- Projetos ainda não enviados continuem editáveis (mesmo em semanas passadas)

## Arquitetura Atual vs Proposta

| Aspecto | Atual | Proposto |
|---------|-------|----------|
| Tabela de submissão | `timesheet_submissions` | `project_timesheet_submissions` (nova) |
| Chave única | `(tenant_id, week_start)` | `(project_id, week_start)` |
| Granularidade | 1 registro por semana/empresa | 1 registro por semana/projeto |
| Status na interface | 1 card global | Indicador por projeto |

## Mudanças Necessárias

### 1. Banco de Dados

Criar nova tabela `project_timesheet_submissions`:

```sql
CREATE TABLE project_timesheet_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  total_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, week_start)
);
```

A tabela `timesheet_submissions` existente pode ser mantida para compatibilidade ou removida após migração.

### 2. Tipos TypeScript

**Arquivo:** `src/types/timesheetSubmission.ts`

Adicionar interface para submissão por projeto:

```typescript
export interface ProjectTimesheetSubmission {
  id: string;
  project_id: string;
  week_start: string;
  status: 'draft' | 'submitted';
  submitted_at: string | null;
  submitted_by: string | null;
  total_hours: number;
  created_at: string;
  updated_at: string;
  submitted_by_employee?: { nome: string } | null;
}
```

### 3. Hook de Submissões por Projeto

**Arquivo:** `src/hooks/useTimesheetSubmissions.ts`

Criar novos hooks:

- `useProjectWeekSubmissions(weekStart, projectIds[])` - Busca status de submissão para múltiplos projetos
- `useSubmitProjectWeek()` - Submete uma semana específica de um projeto
- Atualizar `useAdminBatchEditTimesheets` para trabalhar por projeto

### 4. Componentes de Timesheet

**Arquivo:** `src/pages/Timesheets.tsx`

- Remover o estado global `isLocked`
- Buscar submissões por projeto usando o novo hook
- Passar status de lock individual para cada projeto

**Arquivo:** `src/components/timesheets/TimesheetByProject.tsx`

- Receber prop `submissions: Map<projectId, ProjectTimesheetSubmission>`
- Cada card de projeto terá seu próprio status de submissão
- Adicionar botão "Enviar Projeto" em cada card (para gerentes do projeto)

**Arquivo:** `src/components/timesheets/TimesheetWeekRow.tsx`

- Continua recebendo `isLocked` como prop (agora específico do projeto)

### 5. Nova UI por Projeto

Cada card de projeto terá:
- Indicador visual de status (rascunho/enviado)
- Botão "Enviar Projeto" visível para gerentes daquele projeto
- Campos travados apenas se aquele projeto específico foi enviado

### 6. Componente de Status da Semana

**Arquivo:** `src/components/timesheets/TimesheetWeekStatus.tsx`

Adaptar para mostrar resumo:
- "X de Y projetos enviados"
- Total de horas da semana
- Botão "Enviar Todos" para enviar projetos pendentes de uma vez

### 7. Permissões

Um gerente de projeto poderá enviar a semana de um projeto se:
- Tiver `is_gerente = true` E for membro do projeto, OU
- For administrador (`isAdmin = true`)

---

## Fluxo Resumido

1. Gerente acessa `/timesheets` e seleciona uma semana passada
2. Projetos já enviados aparecem travados com indicador verde
3. Projetos não enviados aparecem editáveis (campos brancos)
4. Gerente pode lançar horas nos projetos não enviados
5. Ao clicar "Enviar Projeto", apenas aquele projeto fica travado
6. Administrador pode usar "Editar Semana" em projetos já enviados

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabela `project_timesheet_submissions` com RLS |
| `src/types/timesheetSubmission.ts` | Adicionar `ProjectTimesheetSubmission` |
| `src/hooks/useTimesheetSubmissions.ts` | Novos hooks por projeto |
| `src/pages/Timesheets.tsx` | Usar submissões por projeto |
| `src/components/timesheets/TimesheetByProject.tsx` | Status individual por card |
| `src/components/timesheets/TimesheetWeekStatus.tsx` | Resumo de projetos enviados |
| `src/components/timesheets/SubmitWeekDialog.tsx` | Adaptar para projeto específico |
