

# Plano: Edição de Admin com Justificativa por Semana

## Problemas Identificados

### 1. RLS Bloqueando Edição
A política de INSERT na tabela `timesheet_edit_logs` exige `has_role(auth.uid(), tenant_id, 'admin')`, mas a edição de timesheets usa `is_admin_or_manager()`. Isso pode causar inconsistências.

### 2. Justificativa por Dia (atual)
O fluxo atual pede justificativa para cada dia editado individualmente, o que é trabalhoso.

---

## Nova Experiência Proposta

### Fluxo de Edição

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Semana Enviada - Travado]                                          │
│  Enviado em 05/02/2026 às 10:40 por Victor                          │
│                                            [Editar Semana] ← NOVO   │
└──────────────────────────────────────────────────────────────────────┘
```

Quando o admin clica em "Editar Semana":

```
┌─ Editar Semana Enviada ────────────────────────────────────────────┐
│                                                                     │
│  Projeto: Cliente X / Projeto Y                                     │
│  Semana: 03/02 - 07/02/2025                                        │
│                                                                     │
│  ┌─────────────┬─────────────────────────────────────────────────┐ │
│  │ Funcionário │ Seg │ Ter │ Qua │ Qui │ Sex │ Total            │ │
│  ├─────────────┼─────┼─────┼─────┼─────┼─────┼──────────────────┤ │
│  │ João Silva  │ [6] │ [8] │ [8] │ [7] │ [0] │ 29h → 29h       │ │
│  │ Maria Costa │ [4] │ [4] │ [4] │ [4] │ [4] │ 20h → 20h       │ │
│  └─────────────┴─────┴─────┴─────┴─────┴─────┴──────────────────┘ │
│                                                                     │
│  Justificativa * (aplicada a todas as alterações)                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Correção solicitada pelo cliente após revisão do projeto   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                               [Cancelar] [Salvar Alterações]        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Banco de Dados

**Corrigir RLS de `timesheet_edit_logs`** para permitir que admins (verificados por `has_role`) possam inserir:
- A policy atual já está correta para admins
- Verificar se o usuário tem a role 'admin' na tabela `user_roles`

### 2. Componente `TimesheetWeekStatus.tsx`

Adicionar botão "Editar Semana" quando:
- `isSubmitted === true`
- `isAdmin === true`

```typescript
{isSubmitted && isAdmin && (
  <Button variant="outline" onClick={onAdminEdit}>
    <Edit2 className="h-4 w-4 mr-2" />
    Editar Semana
  </Button>
)}
```

### 3. Novo Componente `AdminWeekEditDialog.tsx`

Substituir o `AdminEditDialog` por um dialog mais completo que:
- Mostra todos os projetos e membros da semana
- Permite editar qualquer valor diretamente
- Tem um único campo de justificativa no final
- Salva todas as alterações de uma vez com batch update

### 4. Arquivo `src/pages/Timesheets.tsx`

- Remover o handler de edição por célula individual
- Adicionar handler para edição da semana inteira
- Passar dados completos (projetos, timesheets) para o novo dialog

### 5. Arquivo `src/hooks/useTimesheetSubmissions.ts`

Criar mutation `useAdminBatchEditTimesheets` que:
- Recebe array de alterações `{ timesheetId, newHours, previousHours }[]`
- Recebe uma única justificativa
- Atualiza todos os timesheets
- Cria log único com resumo das alterações (ou múltiplos logs vinculados)

### 6. Remover Edição Individual

- Remover o click handler das células travadas para admin
- As células travadas ficam apenas visuais (cinza com cadeado)
- Toda edição passa pelo botão "Editar Semana"

---

## Modelo de Dados para Log

Opção A - Um log por alteração (atual):
```
timesheet_edit_logs
├── id
├── timesheet_id → individual
├── previous_hours
├── new_hours
├── justification → repetida em cada registro
├── edited_by
└── edited_at
```

Opção B - Um log por sessão de edição (recomendado):
```
timesheet_edit_sessions
├── id
├── week_start
├── tenant_id
├── justification → única
├── edited_by
├── edited_at
└── changes_json → [{ timesheet_id, prev, new }, ...]
```

**Recomendação**: Manter a estrutura atual (Opção A) por simplicidade, apenas replicando a justificativa para cada registro.

---

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `src/components/timesheets/AdminWeekEditDialog.tsx` | Criar (novo) |
| `src/components/timesheets/AdminEditDialog.tsx` | Remover |
| `src/components/timesheets/TimesheetWeekStatus.tsx` | Adicionar botão |
| `src/components/timesheets/TimesheetWeekRow.tsx` | Remover click admin |
| `src/pages/Timesheets.tsx` | Refatorar handlers |
| `src/hooks/useTimesheetSubmissions.ts` | Adicionar batch mutation |
| `src/types/timesheetSubmission.ts` | Adicionar tipos batch |

