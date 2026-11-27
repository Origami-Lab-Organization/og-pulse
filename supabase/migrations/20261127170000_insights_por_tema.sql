-- US-0057 — insights de IA por tema (decisão do Victor, 27/11/2026, ao conferir a tela).
--
-- Como no Econodata, cada bloco (produtos e serviços, clientes, concorrentes, notícias) tem o seu
-- botão, a sua data e as suas versões; o porte ganha o seu "Gerar com IA" no cartão Porte. O pedido
-- e a versão passam a dizer o tema. Os de antes desta migration valem como 'todos' (os quatro
-- temas e o porte de uma vez).
--
-- Rollback: supabase/rollback/20261127170000_insights_por_tema_rollback.sql

ALTER TABLE public.prospect_insights_pedidos
  ADD COLUMN IF NOT EXISTS tema text NOT NULL DEFAULT 'todos'
  CHECK (tema IN ('todos', 'produtos', 'clientes', 'concorrentes', 'noticias', 'porte'));

ALTER TABLE public.prospect_company_insights
  ADD COLUMN IF NOT EXISTS tema text NOT NULL DEFAULT 'todos'
  CHECK (tema IN ('todos', 'produtos', 'clientes', 'concorrentes', 'noticias', 'porte'));

COMMENT ON COLUMN public.prospect_insights_pedidos.tema IS
  'US-0057: o bloco pedido (produtos, clientes, concorrentes, noticias ou porte); todos = os de antes do pedido por tema.';
COMMENT ON COLUMN public.prospect_company_insights.tema IS
  'US-0057: o bloco desta versão; todos = versão com os quatro temas e o porte.';

-- Um pedido aberto por empresa e tema: dá para gerar dois blocos ao mesmo tempo.
DROP INDEX IF EXISTS public.prospect_insights_pedidos_um_aberto;
CREATE UNIQUE INDEX IF NOT EXISTS prospect_insights_pedidos_um_aberto_por_tema
  ON public.prospect_insights_pedidos (company_id, tema) WHERE status IN ('na_fila', 'gerando');

CREATE INDEX IF NOT EXISTS prospect_company_insights_empresa_tema_idx
  ON public.prospect_company_insights (company_id, tema, gerado_em DESC);

-- O tema do pedido também não muda depois de criado.
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
  NEW.tema := OLD.tema;
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
