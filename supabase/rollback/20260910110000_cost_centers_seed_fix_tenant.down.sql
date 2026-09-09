-- Reversão de 20260910110000_cost_centers_seed_fix_tenant.sql (PUL-217).
-- Devolve o estado anterior: centros no tenant vazio, tenant real sem os sete.
-- O rename de "SL04 - Consultoria" NÃO é revertido: o nome oficial é o correto e voltar
-- atrás só recriaria a duplicata.
DO $$
DECLARE
  v_real  uuid;
  v_wrong uuid;
  v_names text[] := ARRAY[
    'OG001_Administrativo','OG001_Comercial/Marketing','105 Coworking',
    'SL01 Financiamento de Inovação','SL02 Studio de Produto','SL03 Ventures',
    'SL04 Consultoria Estratégica'
  ];
BEGIN
  SELECT t.id INTO v_real FROM public.tenants t WHERE t.name ILIKE '%origami%'
  ORDER BY (SELECT count(*) FROM public.employees e WHERE e.tenant_id = t.id) DESC, t.created_at LIMIT 1;
  SELECT t.id INTO v_wrong FROM public.tenants t WHERE t.name ILIKE '%origami%' AND t.id <> v_real
  ORDER BY t.created_at LIMIT 1;
  IF v_real IS NULL OR v_wrong IS NULL THEN RETURN; END IF;

  INSERT INTO public.cost_centers (tenant_id, name)
  SELECT v_wrong, unnest(v_names)
  ON CONFLICT (tenant_id, lower(btrim(name))) DO NOTHING;

  DELETE FROM public.cost_centers c WHERE c.tenant_id = v_real AND c.name = ANY (v_names);
END $$;
