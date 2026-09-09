-- PUL-217 — Centro de custo: cadastro-base do tenant (épico PUL-215).
--
-- Decisão de 08/09 (Italo): o centro de custo é a âncora de custo e receita. Itens do
-- catálogo (PUL-219/221) e pessoas (PUL-218) passam a apontar para ele nas histórias
-- seguintes; esta migration cria só o cadastro.
--
-- Regras:
--   * leitura para todo membro do tenant: quem lança hora precisa ver os centros;
--   * escrita por `configuracao:editar`, a capacidade dos cadastros-base do tenant
--     (feriados, benefícios, ferramentas — migration 20260904140000). No seed é só Admin;
--   * não existe DELETE: centro sai de uso por `is_active = false`, preservando histórico
--     (o mesmo espírito de ADR-0003 para o catálogo);
--   * nome único por tenant, sem diferenciar caixa nem espaços nas pontas;
--   * seed dos sete centros do tenant Origami, com os códigos que a casa já usa no nome
--     (lista do Italo, 09/09/2026). Tenant novo nasce sem centros e a tela orienta o
--     cadastro; seed padrão para tenants novos fica como decisão de produto em PUL-217.
--
-- Rollback: supabase/rollback/20260910100000_cost_centers.down.sql

CREATE TABLE public.cost_centers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cost_centers_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT cost_centers_name_length CHECK (char_length(name) <= 80)
);

COMMENT ON TABLE public.cost_centers IS
  'Centros de custo do tenant (PUL-217, épico PUL-215). Âncora de custo e receita: serviços, '
  'atividades internas e pessoas apontam para um centro. Não se apaga: inativa-se.';

-- Um nome por tenant, ignorando caixa e espaços nas pontas ("Comercial" = " comercial ").
CREATE UNIQUE INDEX cost_centers_tenant_name_key
  ON public.cost_centers (tenant_id, lower(btrim(name)));

CREATE INDEX cost_centers_tenant_active_idx
  ON public.cost_centers (tenant_id)
  WHERE is_active;

CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- Explícito, embora os privilégios padrão do projeto já concedam (lição registrada pelo time:
-- policy que passa e privilégio que falta dão "permission denied" difícil de diagnosticar).
GRANT SELECT, INSERT, UPDATE ON public.cost_centers TO authenticated;

CREATE POLICY "Members can view cost centers" ON public.cost_centers
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Config editors can insert cost centers" ON public.cost_centers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'));

-- USING e WITH CHECK: quem edita não pode mover a linha para outro tenant.
CREATE POLICY "Config editors can update cost centers" ON public.cost_centers
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'));

-- Seed do tenant Origami. Mesmo critério de localização das migrations anteriores
-- (20260615120000, 20260411230000): nome. Sem o tenant (ambiente local), só avisa.
DO $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT id INTO v_tenant
  FROM public.tenants
  WHERE name ILIKE '%origami%'
  ORDER BY created_at
  LIMIT 1;

  IF v_tenant IS NULL THEN
    RAISE NOTICE 'cost_centers: tenant Origami não encontrado; seed ignorado';
    RETURN;
  END IF;

  -- Nomes exatamente como a casa os usa hoje, código incluído. Se o código virar campo
  -- próprio algum dia, é migration de dado, não mudança de modelo.
  INSERT INTO public.cost_centers (tenant_id, name, description) VALUES
    (v_tenant, 'OG001_Administrativo',        'Gestão, financeiro e operação interna'),
    (v_tenant, 'OG001_Comercial/Marketing',   'Prospecção, propostas e marketing'),
    (v_tenant, '105 Coworking',               'Operação do espaço de coworking'),
    (v_tenant, 'SL01 Financiamento de Inovação', 'Captação e gestão de recursos de fomento à inovação'),
    (v_tenant, 'SL02 Studio de Produto',      'Produtos digitais próprios e de clientes'),
    (v_tenant, 'SL03 Ventures',               'Participações e novos negócios'),
    (v_tenant, 'SL04 Consultoria Estratégica','Projetos de consultoria de gestão e estratégia')
  ON CONFLICT (tenant_id, lower(btrim(name))) DO NOTHING;
END $$;
