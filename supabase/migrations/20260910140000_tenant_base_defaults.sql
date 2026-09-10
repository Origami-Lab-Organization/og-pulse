-- PUL-249 — a empresa nova nasce com a base do produto cadastrada.
--
-- LACUNA: `register-tenant` cria tenant + admin, o trigger de PUL-206 semeia os quatro
-- perfis, e a Edge Function insere 12 feriados. É tudo. O dono entra num produto onde
-- NADA calcula: sem perfil de encargos não há custo hora, sem linha de serviço não há
-- catálogo, sem centro de custo a hora não tem onde ser lida (ADR-0031). Ele precisa
-- adivinhar quatro cadastros antes de ver o primeiro número.
--
-- Nada disso é escolha do cliente: encargo de Simples Nacional é lei, e "Administrativo,
-- Comercial, Operação" é o recorte mínimo de qualquer empresa de serviço. Não é dado de
-- exemplo para apagar depois — é o padrão do produto, e o cliente edita se quiser.
--
-- Segue o padrão de PUL-206: o padrão é DADO em tabela de catálogo, inspecionável e
-- versionado por migration, nunca INSERT escondido numa função.

-- ---------------------------------------------------------------------------
-- Catálogos de produto
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.default_cost_centers (
  name        text PRIMARY KEY,
  description text,
  position    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.default_service_lines (
  name        text PRIMARY KEY,
  description text,
  position    integer NOT NULL DEFAULT 0
);

ALTER TABLE public.default_cost_centers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_service_lines ENABLE ROW LEVEL SECURITY;

-- Leitura liberada a quem está autenticado: é catálogo de produto, não dado de cliente.
-- Escrita não tem policy nenhuma de propósito — muda por migration, como o vocabulário.
CREATE POLICY "Autenticados leem os centros padrao" ON public.default_cost_centers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem as linhas padrao" ON public.default_service_lines
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.default_cost_centers  TO authenticated;
GRANT SELECT ON public.default_service_lines TO authenticated;

INSERT INTO public.default_cost_centers (name, description, position) VALUES
  ('Administrativo', 'Custo de estrutura: financeiro, jurídico, gestão e o que sustenta a operação.', 1),
  ('Comercial',      'Custo de conquistar cliente: prospecção, proposta e marketing.',                 2),
  ('Operação',       'Custo de entregar o que foi vendido. É aqui que a hora de projeto cai.',         3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.default_service_lines (name, description, position) VALUES
  ('Serviços Prestados', 'Linha inicial do catálogo. Renomeie ou crie outras conforme suas frentes de trabalho.', 1)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.default_cost_centers IS
  'Centros de custo com que uma empresa nova nasce. Muda por migration, e a mudanca vale '
  'para os proximos clientes, nunca retroativamente (PUL-249, ADR-0031).';
COMMENT ON TABLE public.default_service_lines IS
  'Linhas de servico com que uma empresa nova nasce (PUL-249, ADR-0003).';

-- ---------------------------------------------------------------------------
-- Os semeadores, um por assunto, todos idempotentes
-- ---------------------------------------------------------------------------

-- Idempotência por "o tenant ainda não tem NENHUM", não por nome. É o que protege o
-- cliente que já organizou a casa: quem tem centro próprio não recebe os genéricos por
-- cima, mesmo que os nomes não coincidam.

CREATE OR REPLACE FUNCTION public.seed_tenant_cost_centers(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.cost_centers WHERE tenant_id = _tenant_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.cost_centers (tenant_id, name, description, is_active)
  SELECT _tenant_id, d.name, d.description, true
  FROM public.default_cost_centers d
  ORDER BY d.position;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_tenant_service_lines(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.service_lines WHERE tenant_id = _tenant_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.service_lines (tenant_id, name, description, is_active, sort_order)
  SELECT _tenant_id, d.name, d.description, true, d.position
  FROM public.default_service_lines d
  ORDER BY d.position;
END;
$$;

-- Encargos de Simples Nacional. Os valores espelham DEFAULT_PAYROLL_PROFILE em
-- src/types/payrollProfile.ts, que hoje é fallback em CÓDIGO e não persiste: FGTS 8% (Lei
-- 8.036/90), aprendiz 2% (Lei 10.097/2000), e INSS patronal, RAT e Terceiros em zero porque
-- estão dentro do DAS. Persistir muda o comportamento: o cliente passa a VER e poder editar
-- o que antes era invisível, e quem sai do Simples ajusta em vez de descobrir que o cálculo
-- assumia algo por ele.
CREATE OR REPLACE FUNCTION public.seed_tenant_payroll_profile(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payroll_profiles WHERE tenant_id = _tenant_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.payroll_profiles (
    tenant_id,
    fgts_rate_clt, fgts_rate_apprentice, fgts_prolabore_rate,
    inss_patronal_rate, inss_patronal_prolabore_rate,
    rat_rate, terceiros_rate, outros_rate,
    apply_fgts_on_13th, apply_inss_on_13th, apply_rat_on_13th,
    apply_terceiros_on_13th, apply_outros_on_13th,
    apply_fgts_on_vacation, apply_inss_on_vacation, apply_rat_on_vacation,
    apply_terceiros_on_vacation, apply_outros_on_vacation
  ) VALUES (
    _tenant_id,
    0.08, 0.02, 0,
    0, 0,
    0, 0, 0,
    true, false, false,
    false, false,
    true, false, false,
    false, false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Uma porta só: tudo que uma empresa nova recebe
-- ---------------------------------------------------------------------------

-- Existir um ponto único importa: hoje os feriados são semeados pela Edge Function e os
-- perfis pelo trigger, então "o que um cliente novo recebe" está em dois lugares e ninguém
-- sabe de cabeça. Daqui em diante, o que for novo entra aqui.
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_tenant_roles(_tenant_id);
  PERFORM public.seed_tenant_cost_centers(_tenant_id);
  PERFORM public.seed_tenant_service_lines(_tenant_id);
  PERFORM public.seed_tenant_payroll_profile(_tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_cost_centers(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_tenant_service_lines(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_tenant_payroll_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_tenant_defaults(uuid)        TO authenticated;

-- O trigger de PUL-206 passa a chamar a porta única. `seed_tenant_roles` continua
-- existindo e exportada: quem já a chamava não quebra.
CREATE OR REPLACE FUNCTION public.seed_tenant_roles_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_tenant_defaults(NEW.id);
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.seed_tenant_defaults(uuid) IS
  'Tudo que uma empresa nova recebe cadastrado. Chamada pelo trigger AFTER INSERT em '
  'tenants e reutilizavel para consertar tenant criado antes (PUL-249).';

-- ---------------------------------------------------------------------------
-- Backfill dos tenants que já existem
-- ---------------------------------------------------------------------------

-- Só quem não tem NADA do assunto recebe. No tenant da Origami é no-op nos centros (tem os
-- sete de PUL-217) e na linha de serviço (tem 'Serviços Prestados' desde o backfill de
-- 20260625000000); pode não ser no-op no perfil de encargos, e é justamente o ponto —
-- quem hoje depende do fallback em código passa a ter a linha no banco, com o MESMO valor.
DO $$
DECLARE t uuid;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_tenant_cost_centers(t);
    PERFORM public.seed_tenant_service_lines(t);
    PERFORM public.seed_tenant_payroll_profile(t);
  END LOOP;
END $$;
