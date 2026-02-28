
## Plano: Fluxo de Reembolso em 3 Etapas + Notificacoes + Download PDF

### Resumo do Novo Fluxo

```text
Funcionario/PM        Gerente de Projeto       Admin
     |                       |                    |
  Cria pedido ──────> Recebe na inbox             |
  (pending)           Aprova ou Rejeita           |
                             |                    |
                      Se aprovado ──────>  Recebe na inbox
                      (approved)           Clica "Pago"
                             |                    |
                             |              (paid) ────> Funcionario
                             |                         recebe notificacao
                             |                         na caixa de entrada
```

**Status do reembolso**: `pending` → `approved` → `paid` (ou `rejected`)

---

### 1. Schema do Banco de Dados

#### 1.1. Novos campos em `reimbursement_requests`
- `paid_by` (uuid, nullable) -- admin que marcou como pago
- `paid_at` (timestamptz, nullable) -- data do pagamento

#### 1.2. Tabela de notificacoes `notifications`
Nova tabela para o sistema de caixa de entrada:

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | |
| recipient_id | uuid | employee.id do destinatario |
| type | text | tipo (ex: `reimbursement_paid`) |
| title | text | titulo curto |
| message | text | mensagem |
| reference_id | uuid | ID do reembolso relacionado |
| is_read | boolean | lido/nao lido |
| created_at | timestamptz | |

RLS: usuarios so veem suas proprias notificacoes (`recipient_id` via join com `employees.auth_id`).

---

### 2. Mudancas no Backend (Hooks)

#### 2.1. `useReimbursements.ts`
- Atualizar `statusConfig` para incluir `paid` (cor azul, icone de cifrao)
- Nova mutation `useMarkReimbursementPaid`: atualiza status para `paid`, grava `paid_by` e `paid_at`, e cria notificacao para o solicitante
- Atualizar `useApproveReimbursement`: apos aprovar, criar notificacao para todos os admins do tenant
- Novo hook `useNotifications`: buscar notificacoes do usuario logado
- Novo hook `useUnreadNotificationsCount`: contar nao lidas (para o badge)
- Novo hook `useMarkNotificationRead`: marcar como lida

#### 2.2. Logica de aprovacao atualizada
- Quando o gerente aprova, a despesa ja contabiliza no projeto (comportamento atual mantido)
- Apos aprovacao, criar registro em `notifications` para cada admin do tenant

---

### 3. Mudancas na UI

#### 3.1. `ReimbursementDetailDialog.tsx`
- Adicionar status `paid` no `statusConfig` (azul, "Pago")
- Quando status = `approved` e usuario = admin: mostrar botao "Marcar como Pago" (verde, icone DollarSign)
- Atualizar timeline para incluir etapa "Pago" com data e nome do admin
- Adicionar botao "Baixar PDF" que gera um resumo do reembolso em formato PDF para download (usando geracao client-side)

#### 3.2. `Reimbursements.tsx` (pagina principal)
- Adicionar status `paid` no `statusConfig` e filtro de status
- Na tabela, para reembolsos `approved`, exibir acao rapida "Pagar" (visivel apenas para admins)
- Atualizar cards de resumo: "Total Aprovado" passa a incluir ambos `approved` e `paid`, ou separar em "Aguardando Pagamento" e "Pagos"

#### 3.3. `InboxButton.tsx` / Caixa de Entrada
- Expandir para mostrar notificacoes gerais alem dos reembolsos pendentes
- Admin ve: reembolsos aprovados aguardando pagamento
- Funcionario ve: notificacoes de pagamento realizado
- Badge mostra contagem de itens nao lidos

#### 3.4. Geracao de PDF (client-side)
- Gerar PDF contendo: dados do reembolso (solicitante, data, valor, descricao, itens de despesa, status, historico de aprovacao/pagamento)
- O admin pode baixar o PDF e os anexos para subir manualmente no OneDrive
- Usar uma biblioteca leve como `jspdf` ou gerar via `window.print()` com CSS dedicado

---

### 4. Detalhes Tecnicos

#### 4.1. Migracao SQL
```sql
-- Novos campos de pagamento
ALTER TABLE public.reimbursement_requests 
  ADD COLUMN paid_by uuid REFERENCES auth.users(id),
  ADD COLUMN paid_at timestamptz;

-- Tabela de notificacoes
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  recipient_id uuid NOT NULL,  -- employee.id
  type text NOT NULL,
  title text NOT NULL,
  message text,
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS: usuario ve apenas suas notificacoes
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id IN (
    SELECT id FROM employees WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id IN (
    SELECT id FROM employees WHERE auth_id = auth.uid()
  ));

-- Admins/managers podem inserir notificacoes
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));
```

#### 4.2. Arquivos modificados
- `src/hooks/useReimbursements.ts` -- novos hooks e mutations
- `src/hooks/useNotifications.ts` -- novo arquivo
- `src/components/reimbursements/ReimbursementDetailDialog.tsx` -- botao pagar, timeline, download PDF
- `src/pages/Reimbursements.tsx` -- novo status, acao rapida, filtro
- `src/components/layout/InboxButton.tsx` -- notificacoes gerais
- `src/components/reimbursements/ReimbursementInbox.tsx` -- incluir notificacoes
- `src/components/reimbursements/ReimbursementPdfGenerator.tsx` -- novo, geracao de PDF

#### 4.3. Dependencia
- Instalar `jspdf` para geracao de PDF client-side

---

### 5. Sequencia de Implementacao
1. Migracao do banco (novos campos + tabela notifications)
2. Hooks de notificacoes (`useNotifications.ts`)
3. Atualizar hooks de reembolso (mutation de pagamento, notificacoes na aprovacao)
4. Atualizar UI da pagina de reembolsos e detail dialog
5. Expandir InboxButton para notificacoes
6. Implementar geracao de PDF
