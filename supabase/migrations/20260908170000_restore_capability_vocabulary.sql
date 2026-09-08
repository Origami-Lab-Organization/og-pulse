-- Repara o estado deixado por um ensaio meu que escapou da transação.
--
-- O que aconteceu: 20260908150000 foi aplicada pelo deploy. Em seguida rodei o ensaio de
-- ida e volta (migration + reversão) achando que estava dentro de `BEGIN ... ROLLBACK`.
-- O arquivo de reversão traz o próprio `BEGIN;` e o próprio `COMMIT;`, e o `\i` executou
-- os dois: o `COMMIT` de dentro do arquivo fechou a MINHA transação, o `ROLLBACK` final
-- caiu no vazio, e a reversão ficou gravada em produção. O psql avisou duas vezes
-- ("there is already a transaction in progress" e "there is no transaction in progress")
-- e eu passei por cima dos dois.
--
-- Estado resultante, medido:
--   `has_role`                             fora de todas as funções (o defeito relatado segue corrigido)
--   vacation_request_*                     na versão nova, com `ferias:administrar`
--   simulate_allocation_margin_impact      na versão nova
--   enforce_past_month_allocation_edit     na versão da REVERSÃO, com `pessoa:editar-papel`
--   reopen_project_gpo_report              idem
--   alocacao:editar-mes-fechado            NÃO EXISTE
--   gpo:reabrir-relatorio                  NÃO EXISTE
--
-- Consequência prática: o banco continuava deixando o admin editar mês fechado, mas o
-- front (já publicado) pergunta `can('alocacao:editar-mes-fechado')`, que era falso para
-- todo mundo — então a tela bloqueava até quem o banco liberava.
--
-- 20260908150000 já está registrada em `schema_migrations` e não pode ser editada: o
-- Supabase não reaplica versão registrada, e o arquivo passaria a mentir sobre o banco.
-- Correção vira migration nova, que é esta.

-- 1. Vocabulário de volta ------------------------------------------------------------
INSERT INTO public.capabilities (key, domain, label, is_sensitive, description) VALUES
  ('alocacao:editar-mes-fechado', 'alocacao',
   'Corrigir hora planejada de mês já fechado', false,
   'Alterar planejamento de alocação de um mês anterior ao corrente. O mês fechado é a base de comparação com o realizado, então mexer nele reescreve histórico — por isso é capacidade separada de alocacao:editar. Fecha a lacuna de vocabulário registrada em TD-0019.'),
  ('gpo:reabrir-relatorio', 'projeto',
   'Reabrir relatório de GPO já entregue', true,
   'Devolver ao rascunho um relatório de GPO com status entregue. Entregue é o estado que o cliente viu; reabrir descola o que está registrado do que foi comunicado, e por isso não acompanha a edição comum do relatório.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, c.key, true
FROM public.role_capabilities rc
CROSS JOIN (VALUES ('alocacao:editar-mes-fechado'), ('gpo:reabrir-relatorio')) AS c(key)
WHERE rc.capability = 'pessoa:editar-papel' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, c.key, true, 'espelhamento de user_roles (PUL-209)'
FROM public.user_capability_overrides o
CROSS JOIN (VALUES ('alocacao:editar-mes-fechado'), ('gpo:reabrir-relatorio')) AS c(key)
WHERE o.capability = 'pessoa:editar-papel' AND o.enabled
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT d.role_name, c.key
FROM public.default_role_capabilities d
CROSS JOIN (VALUES ('alocacao:editar-mes-fechado'), ('gpo:reabrir-relatorio')) AS c(key)
WHERE d.capability = 'pessoa:editar-papel'
ON CONFLICT (role_name, capability) DO NOTHING;

-- 2. As duas funções que ficaram na versão da reversão --------------------------------
--
-- Idênticas às de 20260908150000. As outras três já estão certas e não são tocadas.

CREATE OR REPLACE FUNCTION public.enforce_past_month_allocation_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.planned_hours IS DISTINCT FROM OLD.planned_hours
     AND make_date(OLD.year, OLD.month, 1) < date_trunc('month', now())::date
     AND NOT public.has_capability(auth.uid(), OLD.tenant_id, 'alocacao:editar-mes-fechado')
  THEN
    RAISE EXCEPTION 'O mês % / % já está fechado e a hora planejada dele não pode mais ser alterada por você. Quem administra o sistema consegue corrigir; se a diferença é de execução, registre no mês corrente.',
      lpad(OLD.month::text, 2, '0'), OLD.year
      USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_project_gpo_report(_report_id uuid)
RETURNS project_gpo_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result public.project_gpo_reports;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.project_gpo_reports r
    WHERE r.id = _report_id AND r.status = 'delivered'
      AND public.has_capability(auth.uid(), r.tenant_id, 'gpo:reabrir-relatorio')
  ) THEN
    RAISE EXCEPTION 'Este relatório não pode ser reaberto por você. Reabrir é permissão de quem administra o sistema, e só vale para relatório já entregue.'
      USING ERRCODE = 'PU001';
  END IF;
  PERFORM set_config('app.gpo_transition', 'reopen', true);
  UPDATE public.project_gpo_reports
     SET status = 'draft', delivered_at = NULL, delivered_by = NULL,
         reopened_at = now(),
         reopened_by = (SELECT id FROM public.employees WHERE auth_id = auth.uid()),
         updated_at = now()
   WHERE id = _report_id RETURNING * INTO result;
  RETURN result;
END;
$function$;
