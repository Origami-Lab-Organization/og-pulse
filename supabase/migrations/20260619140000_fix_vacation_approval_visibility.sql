-- Corrige a contagem de aprovações (ex.: aparecia 0/1 e 1/1 para o 2º gerente,
-- quando deveria ser 1/2 e 2/2) e a agregação de status na aprovação.
--
-- Causa: a policy de SELECT de vacation_request_approvals deixava cada aprovador
-- ver apenas a PRÓPRIA linha. Assim:
--   * o painel de progresso contava só 1 linha (/1);
--   * o approve() lia só o próprio voto e marcava o pedido como aprovado cedo demais.
--
-- Solução: qualquer aprovador de um pedido deve ver TODAS as linhas de aprovação
-- daquele pedido. Usamos o helper SECURITY DEFINER is_vacation_approver (sem recursão).

DROP POLICY IF EXISTS "vacation_approvals_select" ON public.vacation_request_approvals;
CREATE POLICY "vacation_approvals_select"
  ON public.vacation_request_approvals FOR SELECT TO authenticated
  USING (
    -- a própria linha (redundante com is_vacation_approver, mantida por clareza)
    approver_id IN (
      SELECT id FROM public.employees WHERE auth_id = auth.uid()
    )
    -- qualquer aprovador do pedido vê o painel completo de aprovações
    OR public.is_vacation_approver(request_id, auth.uid())
    -- solicitante e admin do tenant veem tudo
    OR public.vacation_request_owner_or_admin(request_id, auth.uid())
  );
