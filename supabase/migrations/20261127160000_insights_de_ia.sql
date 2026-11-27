-- US-0057 — insights de IA no Estudo da conta (ADR-0057, variação da fase 1 do ADR-0054).
--
-- O botão grava um pedido numa fila; um runner no Mac de quem gera (hoje só o Victor) puxa os
-- pedidos DELE, roda o Claude Code com a assinatura dele e grava os insights e as propostas de
-- porte com o login dele (chave publicável, RLS). Ninguém chama o Mac.
--
-- 1. Capacidade `prospeccao:gerar-insights`: em nenhum papel; ligada só no perfil do Victor, por
--    exceção individual (o runner atende só o dono da assinatura, ADR-0057).
-- 2. `prospect_insights_runners`: o sinal de vida do runner de cada pessoa.
-- 3. `prospect_insights_pedidos`: a fila. Pedido só entra com o runner de quem pede ativo.
-- 4. `prospect_company_insights`: cada geração é uma versão; item sem fonte não fica.
-- 5. `prospect_porte_propostas`: faixa de funcionários e de faturamento propostas, com fonte. A
--    proposta NUNCA muda a empresa por gatilho: o aceite é da pessoa, na tela, que grava a faixa
--    pelo caminho da US-0056 e marca a proposta (ADR-0054).
--
-- Rollback: supabase/rollback/20261127160000_insights_de_ia_rollback.sql

-- 1. Capacidade -------------------------------------------------------------------------------------

INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('prospeccao:gerar-insights', 'prospeccao', 'Gerar insights de IA',
   'Pede os insights de IA da empresa (produtos e serviços, clientes, concorrentes, notícias e a '
   'proposta de porte), gerados pelo runner local de quem pede, com a assinatura do Claude dele.',
   false)
ON CONFLICT (key) DO NOTHING;

-- Só o Victor, no tenant da Origami (decisão de 27/11/2026). Em outro banco a pessoa não existe e
-- nada entra. Acrescentar capacidade não tira a de ninguém: a guarda do último admin não se aplica.
INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT u.id, t.id, 'prospeccao:gerar-insights', true,
       'US-0057: o runner local roda com a assinatura do Claude dele (ADR-0057, 27/11/2026)'
  FROM auth.users u, public.tenants t
 WHERE u.id = '181b9c3c-b82a-4152-bc63-fce44e6e2252'
   AND t.id = '93e40db0-4946-48ba-b40f-7ee9d02734e0'
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

-- 2. Sinal de vida do runner -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prospect_insights_runners (
  user_id   uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visto_em  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prospect_insights_runners IS
  'US-0057: quando o runner de insights de cada pessoa deu sinal pela última vez.';

ALTER TABLE public.prospect_insights_runners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quem gera insights vê o próprio runner"
  ON public.prospect_insights_runners FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "O runner dá sinal com o login do dono"
  ON public.prospect_insights_runners FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
              AND public.has_capability(auth.uid(), tenant_id, 'prospeccao:gerar-insights'));

CREATE POLICY "O runner renova o próprio sinal"
  ON public.prospect_insights_runners FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid()
              AND public.has_capability(auth.uid(), tenant_id, 'prospeccao:gerar-insights'));

GRANT SELECT, INSERT, UPDATE ON public.prospect_insights_runners TO authenticated;

-- O sinal vale por 90 s; o runner manda a cada 30 s. Conta só o runner de quem pergunta.
CREATE OR REPLACE FUNCTION public.insights_runner_disponivel()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.prospect_insights_runners r
     WHERE r.user_id = auth.uid()
       AND r.visto_em > now() - interval '90 seconds'
  );
$$;

REVOKE ALL ON FUNCTION public.insights_runner_disponivel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insights_runner_disponivel() TO authenticated;

-- 3. Fila de pedidos -------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prospect_insights_pedidos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id   uuid        NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  pedido_por   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'na_fila'
                           CHECK (status IN ('na_fila', 'gerando', 'pronto', 'falhou')),
  erro         text        CHECK (erro IS NULL OR char_length(erro) <= 300),
  pedido_em    timestamptz NOT NULL DEFAULT now(),
  iniciado_em  timestamptz,
  concluido_em timestamptz
);

COMMENT ON TABLE public.prospect_insights_pedidos IS
  'US-0057: pedidos de insights de IA; o runner de quem pediu os processa (ADR-0057).';

CREATE UNIQUE INDEX IF NOT EXISTS prospect_insights_pedidos_um_aberto
  ON public.prospect_insights_pedidos (company_id) WHERE status IN ('na_fila', 'gerando');
CREATE INDEX IF NOT EXISTS prospect_insights_pedidos_empresa_idx
  ON public.prospect_insights_pedidos (company_id, pedido_em DESC);
CREATE INDEX IF NOT EXISTS prospect_insights_pedidos_fila_idx
  ON public.prospect_insights_pedidos (pedido_por, pedido_em) WHERE status = 'na_fila';

-- Quem pede é a sessão; o tenant é o da empresa; o runner de quem pede precisa estar ativo. Na
-- mudança, só o status anda (fila → gerando → pronto ou falhou) e as datas vêm daqui.
CREATE OR REPLACE FUNCTION public.prospect_insights_pedidos_guarda()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.pedido_por := auth.uid();
    NEW.status := 'na_fila';
    NEW.pedido_em := now();
    SELECT pc.tenant_id INTO NEW.tenant_id FROM public.prospect_companies pc WHERE pc.id = NEW.company_id;
    IF NOT public.insights_runner_disponivel() THEN
      RAISE EXCEPTION 'Runner indisponível.' USING ERRCODE = 'PU001';
    END IF;
    RETURN NEW;
  END IF;

  NEW.tenant_id := OLD.tenant_id;
  NEW.company_id := OLD.company_id;
  NEW.pedido_por := OLD.pedido_por;
  NEW.pedido_em := OLD.pedido_em;
  IF NOT ((OLD.status = 'na_fila' AND NEW.status IN ('gerando', 'falhou'))
          OR (OLD.status = 'gerando' AND NEW.status IN ('pronto', 'falhou'))) THEN
    RAISE EXCEPTION 'Mudança de status inválida.' USING ERRCODE = '22023';
  END IF;
  IF NEW.status = 'gerando' THEN
    NEW.iniciado_em := now();
  ELSE
    NEW.concluido_em := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_insights_pedidos_guarda ON public.prospect_insights_pedidos;
CREATE TRIGGER prospect_insights_pedidos_guarda
  BEFORE INSERT OR UPDATE ON public.prospect_insights_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.prospect_insights_pedidos_guarda();

ALTER TABLE public.prospect_insights_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comercial vê os pedidos de insights"
  ON public.prospect_insights_pedidos FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Quem gera insights pede"
  ON public.prospect_insights_pedidos FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:gerar-insights'));

CREATE POLICY "O runner de quem pediu anda com o pedido"
  ON public.prospect_insights_pedidos FOR UPDATE TO authenticated
  USING (pedido_por = auth.uid()
         AND public.has_capability(auth.uid(), tenant_id, 'prospeccao:gerar-insights'))
  WITH CHECK (pedido_por = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.prospect_insights_pedidos TO authenticated;

-- 4. Insights --------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prospect_company_insights (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid        NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  pedido_id  uuid        REFERENCES public.prospect_insights_pedidos(id) ON DELETE SET NULL,
  temas      jsonb       NOT NULL CHECK (jsonb_typeof(temas) = 'object'),
  gerado_por uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gerado_em  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prospect_company_insights IS
  'US-0057: cada geração de insights da empresa é uma versão. temas = {produtos, clientes, '
  'concorrentes, noticias}: listas de {texto, fontes: [{titulo, url}]}; item sem fonte não fica.';

CREATE INDEX IF NOT EXISTS prospect_company_insights_empresa_idx
  ON public.prospect_company_insights (company_id, gerado_em DESC);

-- Fica só o tema conhecido, e nele só o item com ao menos uma fonte http(s) (ADR-0054).
CREATE OR REPLACE FUNCTION public.insights_so_com_fonte(p_temas jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_object_agg(t.chave, t.itens), '{}'::jsonb)
    FROM (
      SELECT k.chave,
             coalesce((
               SELECT jsonb_agg(i)
                 FROM jsonb_array_elements(
                        CASE WHEN jsonb_typeof(p_temas -> k.chave) = 'array' THEN p_temas -> k.chave ELSE '[]'::jsonb END
                      ) i
                WHERE jsonb_typeof(i -> 'texto') = 'string'
                  AND btrim(i ->> 'texto') <> ''
                  AND jsonb_typeof(i -> 'fontes') = 'array'
                  AND EXISTS (SELECT 1 FROM jsonb_array_elements(i -> 'fontes') f
                               WHERE f ->> 'url' ~ '^https?://')
             ), '[]'::jsonb) AS itens
        FROM unnest(ARRAY['produtos', 'clientes', 'concorrentes', 'noticias']) AS k(chave)
    ) t;
$$;

CREATE OR REPLACE FUNCTION public.prospect_company_insights_guarda()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.gerado_por := auth.uid();
  NEW.gerado_em := now();
  SELECT pc.tenant_id INTO NEW.tenant_id FROM public.prospect_companies pc WHERE pc.id = NEW.company_id;
  NEW.temas := public.insights_so_com_fonte(NEW.temas);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_company_insights_guarda ON public.prospect_company_insights;
CREATE TRIGGER prospect_company_insights_guarda
  BEFORE INSERT ON public.prospect_company_insights
  FOR EACH ROW EXECUTE FUNCTION public.prospect_company_insights_guarda();

ALTER TABLE public.prospect_company_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comercial lê os insights da empresa"
  ON public.prospect_company_insights FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Quem gera insights grava a versão"
  ON public.prospect_company_insights FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:gerar-insights'));

GRANT SELECT, INSERT ON public.prospect_company_insights TO authenticated;

-- 5. Propostas de porte ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prospect_porte_propostas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id   uuid        NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  insight_id   uuid        NOT NULL REFERENCES public.prospect_company_insights(id) ON DELETE CASCADE,
  tipo         text        NOT NULL CHECK (tipo IN ('funcionarios', 'faturamento')),
  de           numeric     NOT NULL CHECK (de >= 0),
  ate          numeric     NOT NULL,
  confianca    text        NOT NULL CHECK (confianca IN ('baixa', 'media', 'alta')),
  fonte        text        NOT NULL CHECK (fonte ~ '^https?://' AND char_length(fonte) <= 1000),
  estado       text        NOT NULL DEFAULT 'proposta' CHECK (estado IN ('proposta', 'aceita', 'recusada')),
  decidida_por uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  decidida_em  timestamptz,
  criada_em    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_porte_propostas_faixa CHECK (ate >= de),
  CONSTRAINT prospect_porte_propostas_uma_por_tipo UNIQUE (insight_id, tipo)
);

COMMENT ON TABLE public.prospect_porte_propostas IS
  'US-0057: faixa de funcionários (pessoas) ou de faturamento (reais por ano) proposta pela IA, '
  'com fonte. Só a pessoa aceita ou recusa; o aceite grava a faixa na empresa pela tela (US-0056).';

CREATE INDEX IF NOT EXISTS prospect_porte_propostas_empresa_idx
  ON public.prospect_porte_propostas (company_id, criada_em DESC);

-- Nasce proposta; depois só muda de proposta para aceita ou recusada, com quem e quando.
CREATE OR REPLACE FUNCTION public.prospect_porte_propostas_guarda()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.estado := 'proposta';
    NEW.decidida_por := NULL;
    NEW.decidida_em := NULL;
    NEW.criada_em := now();
    SELECT pc.tenant_id INTO NEW.tenant_id FROM public.prospect_companies pc WHERE pc.id = NEW.company_id;
    RETURN NEW;
  END IF;
  IF OLD.estado <> 'proposta' OR NEW.estado NOT IN ('aceita', 'recusada') THEN
    RAISE EXCEPTION 'Esta proposta já foi decidida.' USING ERRCODE = 'PU001';
  END IF;
  NEW.tenant_id := OLD.tenant_id;
  NEW.company_id := OLD.company_id;
  NEW.insight_id := OLD.insight_id;
  NEW.tipo := OLD.tipo;
  NEW.de := OLD.de;
  NEW.ate := OLD.ate;
  NEW.confianca := OLD.confianca;
  NEW.fonte := OLD.fonte;
  NEW.criada_em := OLD.criada_em;
  NEW.decidida_por := public.prospect_employee_da_sessao(OLD.tenant_id);
  NEW.decidida_em := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_porte_propostas_guarda ON public.prospect_porte_propostas;
CREATE TRIGGER prospect_porte_propostas_guarda
  BEFORE INSERT OR UPDATE ON public.prospect_porte_propostas
  FOR EACH ROW EXECUTE FUNCTION public.prospect_porte_propostas_guarda();

ALTER TABLE public.prospect_porte_propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comercial lê as propostas de porte"
  ON public.prospect_porte_propostas FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Quem gera insights grava a proposta"
  ON public.prospect_porte_propostas FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:gerar-insights'));

-- Aceitar ou recusar é de quem edita a empresa: o aceite grava a faixa nela (US-0056).
CREATE POLICY "Quem edita a empresa decide a proposta"
  ON public.prospect_porte_propostas FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

GRANT SELECT, INSERT, UPDATE ON public.prospect_porte_propostas TO authenticated;
