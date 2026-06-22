-- ============================================================
-- MIGRATION + SEED: benefits e tools
-- Cole tudo no SQL Editor do Supabase e execute de uma vez.
-- ============================================================

-- ── 1. Tabela benefits ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.benefits (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  value       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'benefits' AND policyname = 'Users can view benefits in their tenant'
  ) THEN
    CREATE POLICY "Users can view benefits in their tenant"
    ON public.benefits FOR SELECT
    USING (user_belongs_to_tenant(auth.uid(), tenant_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'benefits' AND policyname = 'Admins can insert benefits'
  ) THEN
    CREATE POLICY "Admins can insert benefits"
    ON public.benefits FOR INSERT
    WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'benefits' AND policyname = 'Admins can update benefits'
  ) THEN
    CREATE POLICY "Admins can update benefits"
    ON public.benefits FOR UPDATE
    USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'benefits' AND policyname = 'Admins can delete benefits'
  ) THEN
    CREATE POLICY "Admins can delete benefits"
    ON public.benefits FOR DELETE
    USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS benefits_tenant_id_idx ON public.benefits(tenant_id);

-- ── 2. Tabela tools ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tools (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  value       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tools' AND policyname = 'Users can view tools in their tenant'
  ) THEN
    CREATE POLICY "Users can view tools in their tenant"
    ON public.tools FOR SELECT
    USING (user_belongs_to_tenant(auth.uid(), tenant_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tools' AND policyname = 'Admins can insert tools'
  ) THEN
    CREATE POLICY "Admins can insert tools"
    ON public.tools FOR INSERT
    WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tools' AND policyname = 'Admins can update tools'
  ) THEN
    CREATE POLICY "Admins can update tools"
    ON public.tools FOR UPDATE
    USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tools' AND policyname = 'Admins can delete tools'
  ) THEN
    CREATE POLICY "Admins can delete tools"
    ON public.tools FOR DELETE
    USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tools_tenant_id_idx ON public.tools(tenant_id);

-- ── 3. Seed: 3 benefícios + 3 ferramentas ───────────────────

DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.tenants
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum tenant encontrado — verifique a tabela tenants';
  END IF;

  RAISE NOTICE 'Inserindo mocks para tenant %', v_tenant_id;

  -- Benefícios
  INSERT INTO public.benefits (tenant_id, name, description, value, is_active)
  VALUES
    (v_tenant_id, 'Vale Refeição',  'Cartão de benefícios para refeições e alimentação (Alelo/Sodexo).', 800.00,  true),
    (v_tenant_id, 'Plano de Saúde', 'Plano médico coparticipativo — cobertura nacional (Unimed/Amil).',  450.00,  true),
    (v_tenant_id, 'Gympass',        'Acesso a academias e estúdios pelo app Gympass.',                    89.90,   false)
  ON CONFLICT DO NOTHING;

  -- Ferramentas
  INSERT INTO public.tools (tenant_id, name, description, value, is_active)
  VALUES
    (v_tenant_id, 'GitHub Copilot', 'Assistente de código com IA integrado ao VS Code e JetBrains.',    100.00, true),
    (v_tenant_id, 'Figma',          'Ferramenta de design de interfaces — plano Professional.',            75.00, true),
    (v_tenant_id, 'Slack Pro',      'Plano pago do Slack com histórico ilimitado e integrações.',          35.00, false)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed concluído para tenant %', v_tenant_id;
END $$;
