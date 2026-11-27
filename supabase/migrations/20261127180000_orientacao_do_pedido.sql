-- US-0057 — o que buscar ao gerar de novo (decisão do Victor, 27/11/2026).
--
-- Ao pedir de novo um bloco do Estudo da conta, a pessoa pode dizer por que pediu ou o que buscar;
-- o runner leva isso ao Claude. Guardado no pedido, sem mudar depois, e mostrado com a versão.
--
-- Rollback: supabase/rollback/20261127180000_orientacao_do_pedido_rollback.sql

ALTER TABLE public.prospect_insights_pedidos
  ADD COLUMN IF NOT EXISTS orientacao text CHECK (orientacao IS NULL OR char_length(orientacao) <= 1000);

COMMENT ON COLUMN public.prospect_insights_pedidos.orientacao IS
  'US-0057: o que quem pediu quer que a IA busque nesta geração (opcional).';

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
    NEW.orientacao := nullif(btrim(NEW.orientacao), '');
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
  NEW.orientacao := OLD.orientacao;
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
