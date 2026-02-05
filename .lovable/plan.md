

# Plano: Workflow de Submissão de Timesheets com Rascunho e Travamento

## Objetivo

Implementar um fluxo onde:
1. Ao digitar valores, os registros são salvos como **rascunho** (draft)
2. Um botão **"Enviar Semana"** permite submeter/travar as horas lançadas
3. Após envio, as horas ficam **bloqueadas para edição**
4. Somente **Admins** podem editar timesheets submetidos, mediante preenchimento de **justificativa**

---

## Estrutura Visual

### Interface Atualizada

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Timesheets                                                                 │
│  Registre as horas trabalhadas pelos funcionários nos projetos             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Semana: ◀ 03/02 - 07/02/2025 ▶]     [Por Projeto] [Por Funcionário]      │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📝 Status da Semana                                                   │ │
│  │                                                                       │ │
│  │ Esta semana está em modo RASCUNHO.                  [Enviar Semana]  │ │
│  │ As horas serão salvas automaticamente, mas só                         │ │
│  │ serão consideradas após o envio.                                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─ Bry Tecnologia / Plataforma Discovery ──────────────────────────────┐  │
│  │  Funcionário         │ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │ Total     │  │
│  ├──────────────────────┼──────┼──────┼──────┼──────┼──────┼───────────┤  │
│  │  Victor Couto        │ [8]  │ [8]  │ [6]  │ [8]  │ [8]  │ 38h       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Status Enviado (Travado)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ✅ Status da Semana                                                       │
│                                                                           │
│ Esta semana foi ENVIADA em 07/02/2025 às 18:30 por Maria Silva           │
│ Total: 186 horas lançadas                                                 │
│                                                                           │
│ [Admin: Os campos abaixo estão editáveis apenas para admins]              │
└───────────────────────────────────────────────────────────────────────────┘
```

### Dialog de Justificativa (Edição pelo Admin)

```
┌─ Editar Timesheet Enviado ───────────────────────────────────┐
│                                                               │
│  ⚠️ Este timesheet já foi enviado e está travado.            │
│                                                               │
│  Para alterar, é necessário fornecer uma justificativa.      │
│                                                               │
│  Funcionário: Victor Couto                                   │
│  Projeto: Bry Discovery                                      │
│  Data: Seg, 03/02/2025                                       │
│  Horas atuais: 8h                                            │
│                                                               │
│  Novas horas *                                               │
│  [6                                                  ]       │
│                                                               │
│  Justificativa *                                             │
│  [Correção solicitada pelo funcionário, havia erro ]        │
│  [no lançamento original                           ]        │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│                              [Cancelar] [Salvar Alteração]   │
└───────────────────────────────────────────────────────────────┘
```

---

## Modelo de Dados

### Nova Tabela: timesheet_submissions

Controla o status de submissão por semana:

```sql
CREATE TABLE timesheet_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  week_start DATE NOT NULL,  -- Segunda-feira da semana
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,  -- auth.users.id
  total_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (tenant_id, week_start)
);
```

### Alteração: project_timesheets

Adicionar colunas para rastreamento de edições:

```sql
ALTER TABLE project_timesheets 
  ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN updated_by UUID;

-- Tabela de histórico de alterações (auditoria)
CREATE TABLE timesheet_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES project_timesheets(id) ON DELETE CASCADE,
  previous_hours NUMERIC NOT NULL,
  new_hours NUMERIC NOT NULL,
  justification TEXT NOT NULL,
  edited_by UUID NOT NULL,  -- auth.users.id
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Regras de Negócio

### Estados do Timesheet Semanal

| Estado | Descrição | Quem pode editar |
|--------|-----------|------------------|
| `draft` | Rascunho - horas estão sendo lançadas | Gerentes e Admins |
| `submitted` | Enviado - horas travadas | Somente Admins (com justificativa) |

### Fluxo de Trabalho

```
┌────────────┐      Enviar      ┌────────────┐
│   DRAFT    │ ───────────────► │  SUBMITTED │
│            │                  │ (Travado)  │
└────────────┘                  └────────────┘
       ▲                              │
       │                              │ Admin edita
       │                              │ com justificativa
       │                              ▼
       │                        ┌────────────┐
       └─────── (não volta) ────│   Editado  │
                                │ (Auditoria)│
                                └────────────┘
```

### Validações

1. **Ao enviar**: Verificar se há pelo menos uma hora lançada na semana
2. **Ao editar (admin)**: Justificativa é obrigatória (mínimo 10 caracteres)
3. **Travamento**: Após submissão, apenas admin pode alterar

---

## Implementação

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/types/timesheetSubmission.ts` | Tipos para submissão de timesheets |
| `src/hooks/useTimesheetSubmissions.ts` | Hooks para gerenciar submissões |
| `src/components/timesheets/TimesheetWeekStatus.tsx` | Card de status da semana (rascunho/enviado) |
| `src/components/timesheets/SubmitWeekDialog.tsx` | Dialog de confirmação para enviar semana |
| `src/components/timesheets/AdminEditDialog.tsx` | Dialog para admin editar com justificativa |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Timesheets.tsx` | Adicionar card de status e botão de envio |
| `src/components/timesheets/TimesheetWeekRow.tsx` | Desabilitar inputs se semana estiver travada, habilitar edição admin com modal |
| `src/hooks/useProjectTimesheets.ts` | Adicionar mutation para atualização com justificativa |

---

## Componentes Detalhados

### TimesheetWeekStatus

Exibe o status atual da semana:

```typescript
interface TimesheetWeekStatusProps {
  weekStart: Date;
  submission: TimesheetSubmission | null;
  totalHours: number;
  onSubmit: () => void;
  isAdmin: boolean;
}
```

- **Rascunho**: Exibe mensagem + botão "Enviar Semana"
- **Enviado**: Exibe data de envio + quem enviou + total de horas

### AdminEditDialog

Modal para edição pelo admin:

```typescript
interface AdminEditDialogProps {
  open: boolean;
  onClose: () => void;
  entry: {
    id: string;
    employeeName: string;
    projectName: string;
    workDate: string;
    currentHours: number;
  };
  onSave: (newHours: number, justification: string) => void;
}
```

### TimesheetWeekRow (Atualizado)

Adicionar props:

```typescript
interface TimesheetWeekRowProps {
  // ... props existentes
  isLocked: boolean;          // Nova prop - semana travada
  isAdmin: boolean;           // Nova prop - usuário é admin
  onAdminEdit?: (date: string, currentHours: number) => void;  // Callback para edição admin
}
```

---

## Hooks

### useTimesheetSubmissions

```typescript
// Buscar status da semana
export const useWeekSubmission = (weekStart: string) => {
  return useQuery({
    queryKey: ['timesheet-submission', weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheet_submissions')
        .select('*, submitted_by_employee:employees!submitted_by(nome)')
        .eq('week_start', weekStart)
        .maybeSingle();
      // ...
    },
  });
};

// Submeter semana
export const useSubmitWeek = () => {
  return useMutation({
    mutationFn: async ({ weekStart, totalHours }: SubmitWeekInput) => {
      // 1. Criar/atualizar registro de submissão
      // 2. Marcar todos os timesheets da semana como is_locked = true
    },
  });
};

// Edição pelo admin com justificativa
export const useAdminEditTimesheet = () => {
  return useMutation({
    mutationFn: async ({ timesheetId, newHours, justification }: AdminEditInput) => {
      // 1. Buscar horas atuais
      // 2. Inserir log de auditoria
      // 3. Atualizar timesheet
    },
  });
};
```

---

## RLS Policies

### timesheet_submissions

```sql
-- Gerentes e admins podem visualizar
CREATE POLICY "Users can view submissions in their tenant" 
  ON timesheet_submissions FOR SELECT 
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Gerentes e admins podem criar/atualizar
CREATE POLICY "Managers can manage submissions" 
  ON timesheet_submissions FOR ALL 
  USING (is_admin_or_manager(auth.uid(), tenant_id));
```

### timesheet_edit_logs

```sql
-- Apenas admins podem inserir logs (editar timesheets travados)
CREATE POLICY "Only admins can edit locked timesheets" 
  ON timesheet_edit_logs FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Todos podem visualizar logs (auditoria)
CREATE POLICY "Users can view edit logs" 
  ON timesheet_edit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM project_timesheets pt
      JOIN project_members pm ON pt.project_member_id = pm.id
      JOIN projects p ON pm.project_id = p.id
      WHERE pt.id = timesheet_edit_logs.timesheet_id
      AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
    )
  );
```

---

## Fluxo de UI

### Semana em Rascunho

1. Usuário (gerente/admin) entra na tela de timesheets
2. Card amarelo exibe "Status: Rascunho"
3. Inputs habilitados para edição
4. Ao alterar valor, salva automaticamente como rascunho
5. Botão "Enviar Semana" disponível
6. Ao clicar, dialog de confirmação exibe resumo

### Semana Enviada

1. Card verde exibe "Status: Enviado" + detalhes
2. Inputs desabilitados para gerentes
3. Para admins: inputs clicáveis abrem modal de edição
4. Admin preenche justificativa obrigatória
5. Alteração é salva + log de auditoria criado

---

## Sequência de Implementação

```
1. Criar migration SQL (tabelas + RLS)
       │
       ▼
2. Criar tipos TypeScript
       │
       ▼
3. Criar hooks de submissão
       │
       ▼
4. Criar componente TimesheetWeekStatus
       │
       ▼
5. Criar dialogs (Submit + AdminEdit)
       │
       ▼
6. Atualizar TimesheetWeekRow com props de lock
       │
       ▼
7. Atualizar Timesheets.tsx com status e fluxo
       │
       ▼
8. Testar fluxo completo
```

---

## Notas Importantes

1. **Histórico preservado**: Todas as edições em timesheets travados ficam registradas em `timesheet_edit_logs`
2. **Não há "desfazer envio"**: Uma vez enviado, o status não pode voltar para rascunho
3. **Semana = Segunda a Sexta**: O travamento é por semana inteira, não por dia individual
4. **Performance**: O status de submissão é por tenant + semana, não por projeto

