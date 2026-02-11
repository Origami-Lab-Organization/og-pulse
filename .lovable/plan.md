
# Funcionalidade de Pedido de Reembolso

## Resumo

Todos os funcionarios poderao solicitar reembolsos pelo menu lateral. O gerente do projeto (ou admin) recebera as solicitacoes em uma caixa de entrada no header, podendo aprovar ou rejeitar. Ao aprovar, um email sera enviado automaticamente para reembolso@origamilab.com.br com os dados e anexos.

## Mudancas

### 1. Banco de Dados - Tabela `reimbursement_requests`

```sql
CREATE TABLE public.reimbursement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  requested_by uuid NOT NULL,  -- employee.id
  project_id uuid REFERENCES projects(id),  -- null se despesa interna
  client_id uuid REFERENCES clients(id),    -- null se despesa interna
  is_internal boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',   -- pending, approved, rejected
  reviewed_by uuid,                          -- employee.id do aprovador
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**RLS:**
- SELECT: funcionarios do mesmo tenant podem ver seus proprios pedidos; admins/managers veem todos do tenant
- INSERT: qualquer funcionario do tenant
- UPDATE: admins/managers do tenant (para aprovar/rejeitar)
- DELETE: admins do tenant

### 2. Banco de Dados - Tabela `reimbursement_attachments`

```sql
CREATE TABLE public.reimbursement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reimbursement_id uuid NOT NULL REFERENCES reimbursement_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**RLS:** mesma logica da tabela pai, via JOIN com reimbursement_requests.

### 3. Storage - Bucket `reimbursement-receipts`

Bucket privado para armazenar os comprovantes anexados. RLS para upload pelo solicitante e leitura por admins/managers.

### 4. Menu Lateral - Adicionar "Reembolsos"

**Arquivo: `src/components/layout/AppSidebar.tsx`**

Adicionar novo grupo "Meu Espaco" visivel a todos os funcionarios (sem `requiresManager`), com o item:
- "Reembolsos" -> `/reimbursements` -> icone `Receipt`

### 5. Rota e Pagina de Reembolsos

**Arquivo: `src/App.tsx`**

Nova rota `/reimbursements` acessivel a qualquer usuario autenticado (ProtectedRoute).

**Novo arquivo: `src/pages/Reimbursements.tsx`**

Pagina com:
- Botao "Novo Pedido de Reembolso"
- Tabela listando os pedidos do funcionario logado com colunas: Data, Descricao, Projeto/Interno, Valor, Status (badge colorido)
- Filtro por status

### 6. Formulario de Pedido de Reembolso

**Novo arquivo: `src/components/reimbursements/ReimbursementFormDialog.tsx`**

Dialog com campos:
- **Tipo**: Radio "Projeto" ou "Despesa Interna"
- **Cliente**: Select (visivel se tipo = Projeto)
- **Projeto**: Select filtrado pelo cliente (visivel se tipo = Projeto)
- **Descricao**: Textarea obrigatoria
- **Valor Total**: CurrencyInput (R$)
- **Anexos**: Upload multiplo de arquivos (notas/comprovantes) - obrigatorio pelo menos 1

### 7. Caixa de Entrada do Gerente (Inbox)

**Novo arquivo: `src/components/layout/InboxButton.tsx`**

Icone de caixa de entrada (Inbox) no header ao lado do UserMenu, visivel apenas para gerentes/admins. Mostra badge com contagem de pedidos pendentes.

**Novo arquivo: `src/components/reimbursements/ReimbursementInbox.tsx`**

Sheet/Dialog tipo email que abre ao clicar no icone. Lista os pedidos pendentes em formato de tabela:
- Funcionario solicitante
- Data
- Descricao
- Projeto ou "Interno"
- Valor
- Botoes de acao: Aprovar (verde) e Rejeitar (vermelho)

Ao rejeitar, exibir campo para motivo da rejeicao (obrigatorio).

### 8. Edge Function - Envio de Email de Reembolso

**Novo arquivo: `supabase/functions/send-reimbursement-email/index.ts`**

Ao aprovar, chamar esta edge function que:
- Recebe os dados do reembolso (descricao, valor, funcionario, projeto)
- Busca os anexos no Storage e gera URLs assinadas
- Envia email via Resend para `reembolso@origamilab.com.br` com:
  - Assunto: "Reembolso Aprovado - [Nome Funcionario] - R$ [Valor]"
  - Corpo: dados do reembolso, projeto/cliente, descricao
  - Anexos: comprovantes (via URLs ou inline)

### 9. Hooks

**Novo arquivo: `src/hooks/useReimbursements.ts`**

- `useMyReimbursements()` - lista pedidos do funcionario logado
- `usePendingReimbursements()` - lista pedidos pendentes (para gerentes/admins)
- `usePendingReimbursementsCount()` - contagem para o badge do inbox
- `useCreateReimbursement()` - mutation para criar pedido + upload de anexos
- `useApproveReimbursement()` - mutation que atualiza status + chama edge function de email
- `useRejectReimbursement()` - mutation que atualiza status + motivo

## Arquivos Modificados/Criados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| Migracao SQL | Novo | Tabelas `reimbursement_requests`, `reimbursement_attachments`, bucket storage |
| `src/components/layout/AppSidebar.tsx` | Editado | Novo grupo "Meu Espaco" com item "Reembolsos" |
| `src/components/layout/AppLayout.tsx` | Editado | Adicionar InboxButton no header |
| `src/App.tsx` | Editado | Nova rota `/reimbursements` |
| `src/pages/Reimbursements.tsx` | Novo | Pagina principal de reembolsos |
| `src/components/reimbursements/ReimbursementFormDialog.tsx` | Novo | Formulario de pedido |
| `src/components/reimbursements/ReimbursementInbox.tsx` | Novo | Caixa de entrada do gerente |
| `src/components/layout/InboxButton.tsx` | Novo | Botao com badge no header |
| `src/hooks/useReimbursements.ts` | Novo | Hooks de dados |
| `supabase/functions/send-reimbursement-email/index.ts` | Novo | Edge function de email |

## Fluxo Completo

```text
Funcionario:
  Menu lateral -> Reembolsos -> Novo Pedido
    -> Preenche formulario (tipo, projeto/interno, descricao, valor)
    -> Anexa comprovantes (upload ao Storage)
    -> Envia -> INSERT em reimbursement_requests + reimbursement_attachments
    -> Status: "pending"

Gerente/Admin:
  Header -> Icone Inbox (badge com contagem)
    -> Abre caixa de entrada
    -> Ve pedido pendente com detalhes
    -> Aprovar:
       -> UPDATE status = 'approved', reviewed_by, reviewed_at
       -> Chama edge function send-reimbursement-email
       -> Email enviado para reembolso@origamilab.com.br
    -> Rejeitar:
       -> Preenche motivo
       -> UPDATE status = 'rejected', rejection_reason
```

## Detalhes Tecnicos

### RLS para reimbursement_requests

```sql
-- Funcionario ve seus proprios pedidos
CREATE POLICY "Users can view own reimbursements"
  ON reimbursement_requests FOR SELECT
  USING (
    requested_by IN (
      SELECT id FROM employees WHERE auth_id = auth.uid() AND tenant_id = reimbursement_requests.tenant_id
    )
    OR is_admin_or_manager(auth.uid(), tenant_id)
  );

-- Qualquer funcionario do tenant pode criar
CREATE POLICY "Users can create reimbursements"
  ON reimbursement_requests FOR INSERT
  WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Gerentes/admins podem aprovar/rejeitar
CREATE POLICY "Managers can update reimbursements"
  ON reimbursement_requests FOR UPDATE
  USING (is_admin_or_manager(auth.uid(), tenant_id));
```

### Visibilidade no Inbox

Gerentes de projeto verao apenas reembolsos vinculados aos seus projetos (onde sao `manager_id`). Admins verao todos os reembolsos do tenant, incluindo despesas internas.
