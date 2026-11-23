-- Prospecção — histórico do faturamento informado na empresa (US-0018, 23/11/2026).
--
-- Pedido do Victor: o faturamento colocado pela equipe aparece com o selo verde e diz quem
-- da equipe colocou o valor, com data e hora, para histórico. Até aqui `prospect_companies`
-- guardava só o valor e a base, sem autor nem momento.
--
-- Cada mudança de `faturamento_anual` ou `faturamento_anual_base` (pela tela, pelo MCP ou ao
-- mover para qualificação, que grava o "calculado") vira uma linha nova, gravada pelo próprio
-- banco: valor e base depois da mudança, a pessoa (employee do tenant pela sessão; nula quando
-- não há sessão, ex.: script) e o momento. Valor nulo = o faturamento foi apagado.
--
-- Leitura: quem lê a empresa (`prospeccao:ler`), no tenant dela. Escrita: só o gatilho; sem
-- policy de INSERT, UPDATE ou DELETE, então ninguém altera nem apaga o histórico pela API.
-- Os valores já gravados antes desta migration ficam sem histórico (não há como saber quem).
--
-- Rollback: supabase/rollback/20261123120000_historico_do_faturamento_rollback.sql

CREATE TABLE IF NOT EXISTS public.prospect_company_faturamentos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id     uuid        NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  valor          numeric(16, 2),
  base           text,
  informado_por  uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  informado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_company_faturamentos_base_valida
    CHECK (base IS NULL OR base IN ('estimado', 'apurado', 'calculado')),
  CONSTRAINT prospect_company_faturamentos_com_base
    CHECK ((valor IS NULL) = (base IS NULL))
);

CREATE INDEX IF NOT EXISTS prospect_company_faturamentos_empresa_idx
  ON public.prospect_company_faturamentos (company_id, informado_em DESC);

COMMENT ON TABLE public.prospect_company_faturamentos IS
  'Histórico do faturamento informado na empresa da Prospecção: valor, base, quem e quando (US-0018). Gravado só pelo gatilho.';

-- Gatilho: SECURITY DEFINER porque a tabela não tem policy de escrita. O tenant vem da linha
-- de prospect_companies, que já passou pela RLS de quem editou (ADR-0021); a pessoa é o
-- employee da sessão naquele tenant.
CREATE OR REPLACE FUNCTION public.prospect_companies_registra_faturamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.prospect_company_faturamentos (tenant_id, company_id, valor, base, informado_por)
  VALUES (
    NEW.tenant_id,
    NEW.id,
    NEW.faturamento_anual,
    NEW.faturamento_anual_base,
    (SELECT e.id FROM public.employees e WHERE e.auth_id = auth.uid() AND e.tenant_id = NEW.tenant_id LIMIT 1)
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prospect_companies_registra_faturamento() FROM PUBLIC;

DROP TRIGGER IF EXISTS prospect_companies_faturamento_criado ON public.prospect_companies;
CREATE TRIGGER prospect_companies_faturamento_criado
  AFTER INSERT ON public.prospect_companies
  FOR EACH ROW
  WHEN (NEW.faturamento_anual IS NOT NULL)
  EXECUTE FUNCTION public.prospect_companies_registra_faturamento();

DROP TRIGGER IF EXISTS prospect_companies_faturamento_mudou ON public.prospect_companies;
CREATE TRIGGER prospect_companies_faturamento_mudou
  AFTER UPDATE OF faturamento_anual, faturamento_anual_base ON public.prospect_companies
  FOR EACH ROW
  WHEN (OLD.faturamento_anual IS DISTINCT FROM NEW.faturamento_anual
     OR OLD.faturamento_anual_base IS DISTINCT FROM NEW.faturamento_anual_base)
  EXECUTE FUNCTION public.prospect_companies_registra_faturamento();

ALTER TABLE public.prospect_company_faturamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prospeccao readers can view company revenue history"
  ON public.prospect_company_faturamentos
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

GRANT SELECT ON public.prospect_company_faturamentos TO authenticated;
