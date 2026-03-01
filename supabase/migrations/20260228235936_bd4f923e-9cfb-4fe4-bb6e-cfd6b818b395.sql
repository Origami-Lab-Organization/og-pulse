
-- Novos campos de pagamento em reimbursement_requests
ALTER TABLE public.reimbursement_requests 
  ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Tabela de notificacoes
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
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
