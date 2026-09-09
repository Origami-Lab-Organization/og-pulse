-- PUL-217, correção — o seed dos centros foi para o tenant Origami ERRADO.
--
-- O QUE ACONTECEU. Existem DOIS tenants chamados "Origami Lab" em produção:
--   * c9a28f6e-03ad-4cee-8368-8b1c874a164d — criado 21/01, 3 pessoas, 0 projeto, 0 serviço;
--   * 93e40db0-4946-48ba-b40f-7ee9d02734e0 — criado 27/01, 20 pessoas, 23 projetos, 10
--     serviços, 7 atividades internas, 68 oportunidades. É o tenant real da casa.
-- A migration 20260910100000 localizou o tenant por `name ILIKE '%origami%' ORDER BY
-- created_at LIMIT 1` e acertou o primeiro pela data: o vazio. Os sete centros nasceram
-- onde ninguém trabalha, e o tenant real ficou sem nenhum.
--
-- LIÇÃO, que vale para toda migration futura: `name ILIKE '%origami%'` NÃO identifica o
-- tenant da casa. As migrations 20260615120000 (feriado de 20/04) e 20260411230000
-- (checklists) usam o mesmo critério com `LIMIT 1` sem ordenação — acertaram por sorte da
-- ordem física das linhas. Aqui o alvo passa a ser o tenant Origami com MAIS funcionários,
-- que é verificável em qualquer cópia do banco e não depende de id fixo nem de sorte.
--
-- O QUE ESTA MIGRATION FAZ.
--   1. Renomeia "SL04 - Consultoria" (criado à mão pelo Italo em 09/09, ao conferir a tela
--      no tenant certo) para o nome oficial da lista, para não ficarem dois SL04. Nada é
--      apagado: é a mesma linha, com o nome que a casa usa.
--   2. Semeia no tenant real os sete centros da lista de 09/09, idempotente.
--   3. Remove do tenant vazio os sete centros criados por engano. Só eles, por nome exato,
--      e só porque nada os referencia (as FKs de item e pessoa chegam em PUL-218/219/221).
--      Não é perda de histórico: nenhuma hora, item ou pessoa aponta para centro ainda.
--
-- Rollback: supabase/rollback/20260910110000_cost_centers_seed_fix_tenant.down.sql

DO $$
DECLARE
  v_real    uuid;
  v_wrong   uuid;
  v_names   text[] := ARRAY[
    'OG001_Administrativo',
    'OG001_Comercial/Marketing',
    '105 Coworking',
    'SL01 Financiamento de Inovação',
    'SL02 Studio de Produto',
    'SL03 Ventures',
    'SL04 Consultoria Estratégica'
  ];
  v_removed integer;
BEGIN
  -- Tenant real: o Origami com mais funcionários. Desempate pela data de criação.
  SELECT t.id INTO v_real
  FROM public.tenants t
  WHERE t.name ILIKE '%origami%'
  ORDER BY (SELECT count(*) FROM public.employees e WHERE e.tenant_id = t.id) DESC, t.created_at
  LIMIT 1;

  IF v_real IS NULL THEN
    RAISE NOTICE 'cost_centers: nenhum tenant Origami; correção ignorada';
    RETURN;
  END IF;

  -- 1. O SL04 criado à mão passa a usar o nome oficial, se o oficial ainda não existir.
  UPDATE public.cost_centers c
     SET name = 'SL04 Consultoria Estratégica'
   WHERE c.tenant_id = v_real
     AND lower(btrim(c.name)) = 'sl04 - consultoria'
     AND NOT EXISTS (
       SELECT 1 FROM public.cost_centers x
       WHERE x.tenant_id = v_real AND lower(btrim(x.name)) = 'sl04 consultoria estratégica'
     );

  -- 2. Os sete centros no tenant real.
  INSERT INTO public.cost_centers (tenant_id, name, description)
  SELECT v_real, v.name, v.description
  FROM (VALUES
    ('OG001_Administrativo',           'Gestão, financeiro e operação interna'),
    ('OG001_Comercial/Marketing',      'Prospecção, propostas e marketing'),
    ('105 Coworking',                  'Operação do espaço de coworking'),
    ('SL01 Financiamento de Inovação', 'Captação e gestão de recursos de fomento à inovação'),
    ('SL02 Studio de Produto',         'Produtos digitais próprios e de clientes'),
    ('SL03 Ventures',                  'Participações e novos negócios'),
    ('SL04 Consultoria Estratégica',   'Projetos de consultoria de gestão e estratégia')
  ) AS v(name, description)
  ON CONFLICT (tenant_id, lower(btrim(name))) DO NOTHING;

  -- 3. Limpa o tenant vazio: só os sete nomes semeados por engano, e só lá.
  FOR v_wrong IN
    SELECT t.id FROM public.tenants t
    WHERE t.name ILIKE '%origami%' AND t.id <> v_real
  LOOP
    DELETE FROM public.cost_centers c
     WHERE c.tenant_id = v_wrong
       AND c.name = ANY (v_names);
    GET DIAGNOSTICS v_removed = ROW_COUNT;
    IF v_removed > 0 THEN
      RAISE NOTICE 'cost_centers: % centro(s) semeado(s) por engano removido(s) do tenant %', v_removed, v_wrong;
    END IF;
  END LOOP;
END $$;
