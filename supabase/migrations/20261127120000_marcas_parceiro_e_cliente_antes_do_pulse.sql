-- US-0051 — marcas Parceiro e "Cliente antes do Pulse" (25/11/2026, Victor Couto).
--
-- A relação com a Origami é calculada (US-0019), mas o cálculo não vê dois casos:
--   * Parceiro (ex.: PIN): marca própria, separada de Cliente; a empresa pode ser as duas coisas.
--     Marca e desmarca quem tem `prospeccao:editar` (o admin tem).
--   * Cliente antes do Pulse: a operação começou no Pulse em 2026, e quem foi cliente antes não
--     tem Ganho nem projeto aqui. Só o admin marca, com o ano; a relação passa a "Já foi cliente"
--     enquanto o cálculo não disser mais (projeto aberto, Oportunidade em andamento).
--
-- Como as decisões da Base (US-0010), a marca mora aqui chaveada pela raiz do CNPJ: vale para a
-- empresa toda, como a relação, e serve também à empresa que só está na Base (ADR-0053). Nome,
-- cidade e UF vão junto para a carteira mostrar a empresa sem ler a VPS.
--
-- A carteira (`carteira_de_clientes`, US-0049) passa a trazer as empresas marcadas: Parceiro e
-- Cliente antes do Pulse aparecem na aba Clientes (US-0049, cenário 2).
--
-- Rollback: supabase/rollback/20261127120000_marcas_parceiro_e_cliente_antes_do_pulse_rollback.sql

-- 1. Capacidade ------------------------------------------------------------------------------------

INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('cliente:marcar-antes-do-pulse', 'cliente', 'Marcar cliente de antes do Pulse',
   'Marca a empresa como cliente de antes do Pulse, com o ano, e tira a marca. A relação passa '
   'a "Já foi cliente" enquanto o Pulse não calcular outra.',
   false)
ON CONFLICT (key) DO NOTHING;

-- Nasce com quem tem `configuracao:editar` (Admin): a decisão é do admin (US-0051). Mudar quem
-- tem depois é toggle de perfil. A guarda do último admin sai só neste trecho, como em
-- 20261001120000: acrescentar capacidade não tira `pessoa:editar-papel` de ninguém.
ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, 'cliente:marcar-antes-do-pulse', true
FROM public.role_capabilities rc
WHERE rc.capability = 'configuracao:editar' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, 'cliente:marcar-antes-do-pulse'
FROM public.default_role_capabilities drc
WHERE drc.capability = 'configuracao:editar'
ON CONFLICT (role_name, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, 'cliente:marcar-antes-do-pulse', o.enabled,
       'espelhamento de configuracao:editar (US-0051, 27/11/2026)'
FROM public.user_capability_overrides o
WHERE o.capability = 'configuracao:editar'
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;

-- 2. As marcas -------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prospect_marcas_da_empresa (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cnpj                   text        NOT NULL CHECK (cnpj ~ '^\d{14}$'),
  cnpj_raiz              text        GENERATED ALWAYS AS (left(cnpj, 8)) STORED,
  empresa_nome           text        NOT NULL CHECK (char_length(btrim(empresa_nome)) BETWEEN 1 AND 200),
  cidade                 text        CHECK (cidade IS NULL OR char_length(cidade) <= 100),
  estado                 text        CHECK (estado IS NULL OR estado ~ '^[A-Z]{2}$'),
  parceiro               boolean     NOT NULL DEFAULT false,
  -- O Pulse começou em 2026: "antes do Pulse" vai até 2026.
  cliente_antes_do_pulse smallint    CHECK (cliente_antes_do_pulse IS NULL OR cliente_antes_do_pulse BETWEEN 1950 AND 2026),
  atualizada_por         uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  atualizada_em          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_marcas_da_empresa_uma_por_raiz UNIQUE (tenant_id, cnpj_raiz)
);

COMMENT ON TABLE public.prospect_marcas_da_empresa IS
  'Marcas Parceiro e "Cliente antes do Pulse" da empresa, pela raiz do CNPJ, por tenant (US-0051).';

-- Cada marca com a sua capacidade; quem e quando vêm da sessão. O CNPJ e o tenant não mudam.
-- Sem sessão (chave de serviço, migration), a guarda deixa passar.
CREATE OR REPLACE FUNCTION public.prospect_marcas_da_empresa_guarda()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_parceiro_antes boolean := CASE WHEN TG_OP = 'UPDATE' THEN OLD.parceiro ELSE false END;
  v_ano_antes smallint := CASE WHEN TG_OP = 'UPDATE' THEN OLD.cliente_antes_do_pulse END;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.tenant_id := OLD.tenant_id;
    NEW.cnpj := OLD.cnpj;
  END IF;
  IF auth.uid() IS NOT NULL THEN
    IF NEW.parceiro IS DISTINCT FROM v_parceiro_antes
       AND NOT public.has_capability(auth.uid(), NEW.tenant_id, 'prospeccao:editar') THEN
      RAISE EXCEPTION 'Sem permissão para marcar Parceiro.' USING ERRCODE = '42501';
    END IF;
    IF NEW.cliente_antes_do_pulse IS DISTINCT FROM v_ano_antes
       AND NOT public.has_capability(auth.uid(), NEW.tenant_id, 'cliente:marcar-antes-do-pulse') THEN
      RAISE EXCEPTION 'Só o admin marca cliente de antes do Pulse.' USING ERRCODE = '42501';
    END IF;
  END IF;
  NEW.atualizada_por := public.prospect_employee_da_sessao(NEW.tenant_id);
  NEW.atualizada_em := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_marcas_da_empresa_guarda ON public.prospect_marcas_da_empresa;
CREATE TRIGGER prospect_marcas_da_empresa_guarda
  BEFORE INSERT OR UPDATE ON public.prospect_marcas_da_empresa
  FOR EACH ROW EXECUTE FUNCTION public.prospect_marcas_da_empresa_guarda();

-- RLS por tenant e capacidade; sem DELETE: tirar a marca é gravar falso ou nulo.
ALTER TABLE public.prospect_marcas_da_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comercial e carteira leem as marcas da empresa"
  ON public.prospect_marcas_da_empresa FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler')
         OR public.has_capability(auth.uid(), tenant_id, 'cliente:ler'));

CREATE POLICY "Quem marca grava as marcas da empresa"
  ON public.prospect_marcas_da_empresa FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
              OR public.has_capability(auth.uid(), tenant_id, 'cliente:marcar-antes-do-pulse'));

CREATE POLICY "Quem marca muda as marcas da empresa"
  ON public.prospect_marcas_da_empresa FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
         OR public.has_capability(auth.uid(), tenant_id, 'cliente:marcar-antes-do-pulse'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
              OR public.has_capability(auth.uid(), tenant_id, 'cliente:marcar-antes-do-pulse'));

GRANT SELECT, INSERT, UPDATE ON public.prospect_marcas_da_empresa TO authenticated;

-- 3. A carteira traz as marcas ---------------------------------------------------------------------
--
-- Muda o retorno (colunas `parceiro` e `antes_do_pulse`), por isso sai e volta. O front em
-- produção ignora as colunas novas. Entram, além das empresas com Ganho ou projeto:
--   * o cliente cadastrado cuja raiz está marcada (Parceiro ou antes do Pulse);
--   * a empresa marcada sem cliente cadastrado na mesma raiz (sem `client_id`).
-- Relação: com projeto aberto, Cliente ativo; com projeto, Ganho ou antes do Pulse, Já foi
-- cliente; só Parceiro, sem relação.

DROP FUNCTION IF EXISTS public.carteira_de_clientes(uuid);

CREATE FUNCTION public.carteira_de_clientes(p_tenant uuid)
RETURNS TABLE (
  client_id uuid,
  empresa_id uuid,
  nome text,
  razao_social text,
  cnpj text,
  cidade text,
  estado text,
  relacao text,
  projetos_ativos integer,
  projetos integer,
  projeto_id uuid,
  projeto_nome text,
  projeto_status text,
  projeto_data date,
  ganho_id uuid,
  ganho_titulo text,
  ganho_responsavel uuid,
  ganho_em date,
  parceiro boolean,
  antes_do_pulse smallint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  IF NOT (
    public.has_capability(auth.uid(), p_tenant, 'cliente:ler')
    OR public.has_capability(auth.uid(), p_tenant, 'prospeccao:ler')
  ) THEN
    RAISE EXCEPTION 'Sem acesso à carteira de clientes.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH marcas AS (
    SELECT m.cnpj_raiz, m.cnpj, m.empresa_nome, m.cidade, m.estado, m.parceiro, m.cliente_antes_do_pulse
      FROM public.prospect_marcas_da_empresa m
     WHERE m.tenant_id = p_tenant
       AND (m.parceiro OR m.cliente_antes_do_pulse IS NOT NULL)
  ),
  clientes AS (
    SELECT
      c.id AS client_id,
      emp.id AS empresa_id,
      coalesce(nullif(btrim(c.trading_name), ''), c.company_name) AS nome,
      c.company_name AS razao_social,
      c.cnpj,
      c.cidade,
      c.estado,
      CASE WHEN coalesce(pr.ativos, 0) > 0 THEN 'cliente_ativo'
           WHEN coalesce(pr.total, 0) > 0 OR gan.id IS NOT NULL OR mc.cliente_antes_do_pulse IS NOT NULL THEN 'ja_foi_cliente'
      END AS relacao,
      coalesce(pr.ativos, 0) AS projetos_ativos,
      coalesce(pr.total, 0) AS projetos,
      ult.id AS projeto_id,
      ult.name AS projeto_nome,
      ult.status::text AS projeto_status,
      ult.data AS projeto_data,
      gan.id AS ganho_id,
      gan.title AS ganho_titulo,
      gan.owner_id AS ganho_responsavel,
      gan.won_on AS ganho_em,
      coalesce(mc.parceiro, false) AS parceiro,
      mc.cliente_antes_do_pulse AS antes_do_pulse,
      left(nullif(regexp_replace(coalesce(c.cnpj, ''), '\D', '', 'g'), ''), 8) AS raiz,
      (coalesce(pr.total, 0) > 0 OR gan.id IS NOT NULL OR mc.cnpj_raiz IS NOT NULL) AS entra
    FROM public.clients c
    LEFT JOIN marcas mc
      ON mc.cnpj_raiz = left(nullif(regexp_replace(coalesce(c.cnpj, ''), '\D', '', 'g'), ''), 8)
    LEFT JOIN LATERAL (
      SELECT pc.id
        FROM public.prospect_companies pc
       WHERE pc.client_id = c.id
       ORDER BY (pc.cnpj IS NULL), pc.created_at
       LIMIT 1
    ) emp ON true
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE p.status IN ('planning', 'active', 'paused'))::integer AS ativos,
             count(*)::integer AS total
        FROM public.projects p
       WHERE p.client_id = c.id
    ) pr ON true
    LEFT JOIN LATERAL (
      SELECT p.id, p.name, p.status,
             CASE WHEN p.status IN ('planning', 'active', 'paused') THEN p.start_date
                  ELSE coalesce(p.completed_date, p.end_date, p.start_date) END AS data
        FROM public.projects p
       WHERE p.client_id = c.id
       ORDER BY (p.status IN ('planning', 'active', 'paused')) DESC,
                coalesce(p.completed_date, p.end_date, p.start_date) DESC NULLS LAST
       LIMIT 1
    ) ult ON true
    LEFT JOIN LATERAL (
      SELECT o.id, o.title, o.owner_id, o.won_on
        FROM public.prospects o
        JOIN public.prospect_companies pc ON pc.id = o.company_id
       WHERE pc.client_id = c.id
         AND o.stage = 'ganho'
       ORDER BY o.won_on DESC NULLS LAST
       LIMIT 1
    ) gan ON true
    WHERE c.tenant_id = p_tenant
  )
  SELECT cl.client_id, cl.empresa_id, cl.nome, cl.razao_social, cl.cnpj, cl.cidade, cl.estado, cl.relacao,
         cl.projetos_ativos, cl.projetos, cl.projeto_id, cl.projeto_nome, cl.projeto_status, cl.projeto_data,
         cl.ganho_id, cl.ganho_titulo, cl.ganho_responsavel, cl.ganho_em, cl.parceiro, cl.antes_do_pulse
    FROM clientes cl
   WHERE cl.entra
  UNION ALL
  SELECT NULL::uuid,
         (SELECT pc.id FROM public.prospect_companies pc
           WHERE pc.tenant_id = p_tenant AND left(pc.cnpj, 8) = m.cnpj_raiz
           ORDER BY pc.created_at LIMIT 1),
         m.empresa_nome, m.empresa_nome, m.cnpj, m.cidade, m.estado,
         CASE WHEN m.cliente_antes_do_pulse IS NOT NULL THEN 'ja_foi_cliente' END,
         0, 0, NULL::uuid, NULL::text, NULL::text, NULL::date, NULL::uuid, NULL::text, NULL::uuid, NULL::date,
         m.parceiro, m.cliente_antes_do_pulse
    FROM marcas m
   WHERE NOT EXISTS (SELECT 1 FROM clientes cl WHERE cl.raiz = m.cnpj_raiz)
   ORDER BY 3;
END;
$$;

COMMENT ON FUNCTION public.carteira_de_clientes(uuid) IS
  'US-0049 (ADR-0056) e US-0051: a carteira da aba Clientes de Empresas — empresas com Ganho ou '
  'projeto, Parceiros e clientes de antes do Pulse, com a relação e o projeto ou Ganho que a '
  'explica. Exige cliente:ler ou prospeccao:ler no tenant.';

REVOKE ALL ON FUNCTION public.carteira_de_clientes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.carteira_de_clientes(uuid) TO authenticated;
