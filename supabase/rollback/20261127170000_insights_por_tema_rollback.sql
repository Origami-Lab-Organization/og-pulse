-- Rollback de 20261127170000_insights_por_tema.sql: volta a um pedido aberto por empresa, sem tema.
-- Pedidos abertos de temas diferentes da mesma empresa viram falha antes, para caber no índice.

UPDATE public.prospect_insights_pedidos p
   SET status = 'falhou', erro = 'Desfeito o pedido por tema.'
 WHERE p.status IN ('na_fila', 'gerando')
   AND EXISTS (SELECT 1 FROM public.prospect_insights_pedidos o
                WHERE o.company_id = p.company_id AND o.status IN ('na_fila', 'gerando')
                  AND o.pedido_em < p.pedido_em);

DROP INDEX IF EXISTS public.prospect_company_insights_empresa_tema_idx;
DROP INDEX IF EXISTS public.prospect_insights_pedidos_um_aberto_por_tema;
CREATE UNIQUE INDEX IF NOT EXISTS prospect_insights_pedidos_um_aberto
  ON public.prospect_insights_pedidos (company_id) WHERE status IN ('na_fila', 'gerando');

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

ALTER TABLE public.prospect_company_insights DROP COLUMN IF EXISTS tema;
ALTER TABLE public.prospect_insights_pedidos DROP COLUMN IF EXISTS tema;
