-- PUL-165, 166, 167, 168 — leitura e escrita por perfil, não por "membro do tenant".
--
-- Padrão aplicado: onde a escrita já exigia perfil e a leitura era tenant-wide,
-- a leitura passa a usar o mesmo predicado. Onde a escrita era tenant-wide em dado
-- de catálogo/comercial, passa a exigir perfil. Nenhuma policy é enfraquecida.
--
-- Ver ADR-0023.


-- Idempotência: remove também os nomes novos, para o arquivo poder ser
-- reexecutado depois de uma falha parcial sem erro de "policy already exists".

DROP POLICY IF EXISTS "Admins and managers can view payroll profiles" ON public.payroll_profiles;
DROP POLICY IF EXISTS "Admins and managers can view role rates" ON public.role_rates;
DROP POLICY IF EXISTS "Admins and managers can view financial settings" ON public.financial_settings;
DROP POLICY IF EXISTS "Admins and managers can view leads" ON public.leads;
DROP POLICY IF EXISTS "Admins and managers can view budgets" ON public.budgets;
DROP POLICY IF EXISTS "services_insert" ON public.services;
DROP POLICY IF EXISTS "services_update" ON public.services;
DROP POLICY IF EXISTS "services_delete" ON public.services;
DROP POLICY IF EXISTS "service_lines_insert" ON public.service_lines;
DROP POLICY IF EXISTS "service_lines_update" ON public.service_lines;
DROP POLICY IF EXISTS "service_lines_delete" ON public.service_lines;
DROP POLICY IF EXISTS "activity_types_insert" ON public.activity_types;
DROP POLICY IF EXISTS "activity_types_update" ON public.activity_types;
DROP POLICY IF EXISTS "activity_types_delete" ON public.activity_types;
DROP POLICY IF EXISTS "activity_type_employees_insert" ON public.activity_type_employees;
DROP POLICY IF EXISTS "activity_type_employees_delete" ON public.activity_type_employees;
DROP POLICY IF EXISTS "Recruiters can create job openings" ON public.job_openings;
DROP POLICY IF EXISTS "Recruiters can update job openings" ON public.job_openings;
DROP POLICY IF EXISTS "Recruiters can delete job openings" ON public.job_openings;
DROP POLICY IF EXISTS "Admins and managers can view follow-ups" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Admins and managers can insert follow-ups" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Admins and managers can update follow-ups" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Admins and managers can delete follow-ups" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Admins and managers can view interactions" ON public.lead_interactions;
DROP POLICY IF EXISTS "Admins and managers can insert interactions" ON public.lead_interactions;
DROP POLICY IF EXISTS "Admins and managers can update interactions" ON public.lead_interactions;
DROP POLICY IF EXISTS "lead_services_select" ON public.lead_services;
DROP POLICY IF EXISTS "lead_services_insert" ON public.lead_services;
DROP POLICY IF EXISTS "lead_services_update" ON public.lead_services;
DROP POLICY IF EXISTS "lead_services_delete" ON public.lead_services;
DROP POLICY IF EXISTS "Admins and managers can view lead activities" ON public.lead_activity_log;
DROP POLICY IF EXISTS "Admins and managers can insert lead activities" ON public.lead_activity_log;
DROP POLICY IF EXISTS "Recruiters can view job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Recruiters can update job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Recruiters can read curriculos" ON storage.objects;
-- =============================================================================
-- PUL-165 — Parâmetros de folha e financeiros
-- =============================================================================
--
-- Desvio deliberado da história, que pedia "somente admin": payroll_profiles,
-- role_rates e financial_settings são consumidos por telas requireManager —
-- EmployeeFormDialog e EmployeeCreate/EmployeeDetail (/employees/*),
-- TerminationStep3Payroll (/rh/desligamentos) e BudgetForm (/budgets/new) usam
-- esses parâmetros para calcular custo e margem. Restringir a admin quebraria
-- essas telas para gerente. O alvo é `is_admin_or_manager`, que já é o predicado
-- de escrita de leads/budgets e mantém o funcionário comum fora.

DROP POLICY IF EXISTS "Users can view payroll profiles in their tenant" ON public.payroll_profiles;

CREATE POLICY "Admins and managers can view payroll profiles"
ON public.payroll_profiles FOR SELECT TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can view role rates in their tenant" ON public.role_rates;

CREATE POLICY "Admins and managers can view role rates"
ON public.role_rates FOR SELECT TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can view financial settings in their tenant" ON public.financial_settings;

CREATE POLICY "Admins and managers can view financial settings"
ON public.financial_settings FOR SELECT TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

-- =============================================================================
-- PUL-166 — Oportunidades e orçamentos
-- =============================================================================
--
-- Escrita já era is_admin_or_manager; a leitura era tenant-wide. Rotas /pipeline
-- e /budgets/* são requireManager, então nenhum consumidor legítimo perde acesso.
-- LeadHistoryLink (detalhe de projeto) ignora o erro da consulta e simplesmente
-- não renderiza o vínculo para quem não pode ler — degradação graciosa.

DROP POLICY IF EXISTS "Users can view leads in their tenant" ON public.leads;

CREATE POLICY "Admins and managers can view leads"
ON public.leads FOR SELECT TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can view budgets in their tenant" ON public.budgets;

CREATE POLICY "Admins and managers can view budgets"
ON public.budgets FOR SELECT TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

-- budget_versions não tem tenant_id: o tenant vem por budget_id, mesmo padrão das
-- policies de escrita que já existiam nesta tabela.
DROP POLICY IF EXISTS "Users can view budget versions in their tenant" ON public.budget_versions;
DROP POLICY IF EXISTS "Admins and managers can view budget versions" ON public.budget_versions;

CREATE POLICY "Admins and managers can view budget versions"
ON public.budget_versions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_versions.budget_id
      AND public.is_admin_or_manager(auth.uid(), b.tenant_id)
  )
);

-- =============================================================================
-- PUL-167 — Escrita de catálogo e comercial exige perfil
-- =============================================================================
--
-- SELECT continua tenant-wide nestas tabelas de propósito: funcionário precisa
-- ler o catálogo de serviços e os tipos de atividade para apontar horas. O que
-- muda é a ESCRITA — antes qualquer membro do tenant podia apagar um serviço do
-- catálogo ou uma vaga.

-- Catálogo de serviços
DROP POLICY IF EXISTS "services_insert" ON public.services;
DROP POLICY IF EXISTS "services_update" ON public.services;
DROP POLICY IF EXISTS "services_delete" ON public.services;

CREATE POLICY "services_insert" ON public.services FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "services_update" ON public.services FOR UPDATE TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "services_delete" ON public.services FOR DELETE TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "service_lines_insert" ON public.service_lines;
DROP POLICY IF EXISTS "service_lines_update" ON public.service_lines;
DROP POLICY IF EXISTS "service_lines_delete" ON public.service_lines;

CREATE POLICY "service_lines_insert" ON public.service_lines FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "service_lines_update" ON public.service_lines FOR UPDATE TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "service_lines_delete" ON public.service_lines FOR DELETE TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

-- Tipos de atividade
DROP POLICY IF EXISTS "activity_types_insert" ON public.activity_types;
DROP POLICY IF EXISTS "activity_types_update" ON public.activity_types;
DROP POLICY IF EXISTS "activity_types_delete" ON public.activity_types;

CREATE POLICY "activity_types_insert" ON public.activity_types FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "activity_types_update" ON public.activity_types FOR UPDATE TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "activity_types_delete" ON public.activity_types FOR DELETE TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "activity_type_employees_insert" ON public.activity_type_employees;
DROP POLICY IF EXISTS "activity_type_employees_delete" ON public.activity_type_employees;

CREATE POLICY "activity_type_employees_insert" ON public.activity_type_employees
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.activity_types at
    WHERE at.id = activity_type_employees.activity_type_id
      AND public.is_admin_or_manager(auth.uid(), at.tenant_id)
  )
);

CREATE POLICY "activity_type_employees_delete" ON public.activity_type_employees
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.activity_types at
    WHERE at.id = activity_type_employees.activity_type_id
      AND public.is_admin_or_manager(auth.uid(), at.tenant_id)
  )
);

-- Vagas
DROP POLICY IF EXISTS "Tenant members can create job openings" ON public.job_openings;
DROP POLICY IF EXISTS "Tenant members can update job openings" ON public.job_openings;
DROP POLICY IF EXISTS "Tenant members can delete job openings" ON public.job_openings;

CREATE POLICY "Recruiters can create job openings" ON public.job_openings
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager(auth.uid(), tenant_id)
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);
CREATE POLICY "Recruiters can update job openings" ON public.job_openings
FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager(auth.uid(), tenant_id)
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);
CREATE POLICY "Recruiters can delete job openings" ON public.job_openings
FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager(auth.uid(), tenant_id)
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

-- Pipeline: follow-ups, interações, serviços da oportunidade e log
DROP POLICY IF EXISTS "Users can insert follow-ups for their tenant" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Users can update follow-ups for their tenant" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Users can delete follow-ups for their tenant" ON public.lead_follow_ups;
DROP POLICY IF EXISTS "Users can view follow-ups for their tenant" ON public.lead_follow_ups;

CREATE POLICY "Admins and managers can view follow-ups" ON public.lead_follow_ups
FOR SELECT TO authenticated USING (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Admins and managers can insert follow-ups" ON public.lead_follow_ups
FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Admins and managers can update follow-ups" ON public.lead_follow_ups
FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Admins and managers can delete follow-ups" ON public.lead_follow_ups
FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert interactions for their tenant" ON public.lead_interactions;
DROP POLICY IF EXISTS "Users can update interactions for their tenant" ON public.lead_interactions;
DROP POLICY IF EXISTS "Users can delete interactions for their tenant" ON public.lead_interactions;
DROP POLICY IF EXISTS "Users can view interactions for their tenant" ON public.lead_interactions;

CREATE POLICY "Admins and managers can view interactions" ON public.lead_interactions
FOR SELECT TO authenticated USING (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Admins and managers can insert interactions" ON public.lead_interactions
FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Admins and managers can update interactions" ON public.lead_interactions
FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "lead_services_insert" ON public.lead_services;
DROP POLICY IF EXISTS "lead_services_update" ON public.lead_services;
DROP POLICY IF EXISTS "lead_services_delete" ON public.lead_services;
DROP POLICY IF EXISTS "lead_services_select" ON public.lead_services;

CREATE POLICY "lead_services_select" ON public.lead_services FOR SELECT TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "lead_services_insert" ON public.lead_services FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "lead_services_update" ON public.lead_services FOR UPDATE TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "lead_services_delete" ON public.lead_services FOR DELETE TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

-- lead_activity_log tem dois conjuntos de policies sobrepostos (histórico de
-- migrations). Como policies se somam por OR, o conjunto permissivo anulava o
-- restritivo: os quatro são removidos e recriados por perfil.
DROP POLICY IF EXISTS "Users can view activity logs for their tenant" ON public.lead_activity_log;
DROP POLICY IF EXISTS "Users can insert activity logs for their tenant" ON public.lead_activity_log;
DROP POLICY IF EXISTS "Users can view lead activities in their tenant" ON public.lead_activity_log;
DROP POLICY IF EXISTS "Users can insert lead activities in their tenant" ON public.lead_activity_log;

CREATE POLICY "Admins and managers can view lead activities" ON public.lead_activity_log
FOR SELECT TO authenticated USING (public.is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Admins and managers can insert lead activities" ON public.lead_activity_log
FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));

-- Guardrails de estratégia: as policies de admin já existiam
-- (strategy_guardrails_*_admin), mas as antigas tenant_isolation_* permissivas
-- continuavam no ar e, por OR, anulavam a restrição. Basta remover as antigas.
DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.strategy_guardrails;
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.strategy_guardrails;
DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.strategy_guardrails;

-- NÃO alterados de propósito:
--   notifications (INSERT tenant-wide): o sistema notifica entre usuários — um
--     gerente cria notificação para o solicitante, o solicitante para o aprovador.
--     Restringir por perfil quebraria o fluxo de aprovação. Precisa de regra de
--     recurso ("posso notificar quem?"), que é decisão de produto, não de RLS.
--   reimbursement_requests (INSERT tenant-wide): por desenho o próprio colaborador
--     cria o pedido. O módulo foi removido do produto (ADR-0007) e a tabela é
--     vestigial; mexer aqui é risco sem retorno.

-- =============================================================================
-- PUL-168 — Candidaturas e currículos
-- =============================================================================
--
-- INSERT público é preservado: é o formulário externo Trabalhe Conosco.
-- Leitura e edição passam a exigir gerente, RH ou admin (decisão de produto).

DROP POLICY IF EXISTS "Tenant members can view job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Tenant members can update job applications" ON public.job_applications;

CREATE POLICY "Recruiters can view job applications" ON public.job_applications
FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager(auth.uid(), tenant_id)
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

CREATE POLICY "Recruiters can update job applications" ON public.job_applications
FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager(auth.uid(), tenant_id)
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

-- Bucket de currículos: a policy existente já limitava a admin/manager por
-- user_roles; passa a incluir o perfil rh, coerente com a tabela acima.
DROP POLICY IF EXISTS "Admins and managers can read curriculos" ON storage.objects;

CREATE POLICY "Recruiters can read curriculos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'curriculos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'manager'::app_role, 'rh'::app_role)
  )
);
