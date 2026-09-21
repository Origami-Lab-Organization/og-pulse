-- PUL-247 — o contract: centro de custo deixa de ser opcional no catálogo.
--
-- A migration `20260910120000` criou `services.cost_center_id` e `activity_types.cost_center_id`
-- ANULÁVEIS, por expand-contract, e deixou escrito que o `NOT NULL` "vira migration de
-- contract quando 100% dos itens de todos os tenants tiverem centro". Esta é essa migration.
--
-- POR QUE FECHAR AGORA. Hoje a obrigatoriedade existe só na tela (Zod em três formulários).
-- Quem chama a API direto grava item sem centro, e o efeito é silencioso: a hora lançada
-- nele some da leitura por centro, e a soma por centro deixa de fechar com o total da casa.
-- Coluna anulável "temporária" vira permanente exatamente quando o backfill termina e parece
-- que o problema acabou.
--
-- O QUE NÃO É TOCADO. `activity_timesheets.cost_center_id` continua anulável, e deve
-- continuar: a hora lançada ANTES da virada não tem centro e não pode ser reescrita
-- (ADR-0031, decisão 3 — o histórico não é reescrito). O contract é só dos dois cadastros.
--
-- ORDEM DAS DECISÕES (Italo, 21/09):
--   * Ausências (Folga, Férias, Licença Médica, Atestado Médico, Recesso) ganham centro
--     próprio. Jogá-las no Administrativo inflaria o custo administrativo com algo que é de
--     toda a empresa; ratear entre centros esconderia quanto a casa gasta com ausência, que
--     é justamente um número que vale ver separado.
--   * "Programa de Inovação" vai para SL04 Consultoria Estratégica.
--   * Tenant antigo sem centro nenhum nasce com os três padrões, e os itens órfãos dele caem
--     em Operação, que é onde hora de projeto mora.
--   * Órfão que nenhuma regra alcançar DERRUBA a migration, com a lista na mensagem. É de
--     propósito: classificar custo errado em silêncio é pior do que um deploy que para.

-- ---------------------------------------------------------------------------------------
-- 0. O que conta como ausência
-- ---------------------------------------------------------------------------------------
--
-- Função, e não uma lista repetida em cada UPDATE: ela é usada três vezes aqui e a lista vai
-- crescer (alguém cadastra "Licença Paternidade" amanhã). Com acento e sem, porque o nome é
-- digitado à mão no cadastro e as duas formas aparecem.
--
-- IMMUTABLE e sem acesso a tabela: é só classificação de texto.
CREATE OR REPLACE FUNCTION public.e_ausencia(p_nome text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(btrim(coalesce(p_nome, ''))) ~ '(folga|f[ée]rias|licen[çc]a|atestado|recesso|afastamento)';
$$;

COMMENT ON FUNCTION public.e_ausencia(text) IS
  'O nome da atividade interna descreve uma ausência (PUL-247). Hora que desconta, não que produz.';

REVOKE ALL ON FUNCTION public.e_ausencia(text) FROM anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 1. O centro das ausências
-- ---------------------------------------------------------------------------------------
--
-- Por tenant, e só onde faz falta: quem não tem atividade de ausência sem centro não ganha
-- um centro a mais na lista à toa.
--
-- O nome segue a convenção de quem recebe. No tenant da casa é `OG000 Ausências`, ao lado de
-- OG001_Administrativo; em qualquer outro é `Ausências`, porque o prefixo OG é da Origami.
DO $$
DECLARE
  v_origami uuid;
  v_tenant  uuid;
  v_nome    text;
BEGIN
  -- `name ILIKE '%origami%'` NÃO identifica o tenant da casa: existem dois com esse nome, e
  -- o vazio é o mais antigo (ver 20260910110000). O critério é MAIS FUNCIONÁRIOS, que é
  -- verificável em qualquer cópia do banco e não depende de id fixo nem da ordem das linhas.
  SELECT t.id INTO v_origami
    FROM public.tenants t
    LEFT JOIN public.employees e ON e.tenant_id = t.id
   WHERE t.name ILIKE '%origami%'
   GROUP BY t.id
   ORDER BY count(e.id) DESC
   LIMIT 1;

  FOR v_tenant IN
    SELECT DISTINCT a.tenant_id
      FROM public.activity_types a
     WHERE a.cost_center_id IS NULL
       AND public.e_ausencia(a.name)
  LOOP
    v_nome := CASE WHEN v_tenant = v_origami THEN 'OG000 Ausências' ELSE 'Ausências' END;
    INSERT INTO public.cost_centers (tenant_id, name, description)
    VALUES (
      v_tenant,
      v_nome,
      'Hora que desconta e não produz: folga, férias, licença e atestado. Separada para o '
        'custo de ausência da empresa ser legível sem inflar nenhuma outra frente.'
    )
    ON CONFLICT (tenant_id, lower(btrim(name))) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------
-- 2. As ausências vão para lá
-- ---------------------------------------------------------------------------------------
UPDATE public.activity_types a
   SET cost_center_id = c.id
  FROM public.cost_centers c
 WHERE a.cost_center_id IS NULL
   AND public.e_ausencia(a.name)
   AND c.tenant_id = a.tenant_id
   AND lower(btrim(c.name)) IN ('og000 ausências', 'ausências');

-- ---------------------------------------------------------------------------------------
-- 3. Programa de Inovação → SL04 Consultoria Estratégica (decisão de 21/09)
-- ---------------------------------------------------------------------------------------
UPDATE public.services s
   SET cost_center_id = c.id
  FROM public.cost_centers c
 WHERE s.cost_center_id IS NULL
   AND lower(btrim(s.name)) LIKE '%programa de inova%'
   AND c.tenant_id = s.tenant_id
   AND lower(btrim(c.name)) LIKE 'sl04%';

-- ---------------------------------------------------------------------------------------
-- 4. Tenant antigo sem centro NENHUM nasce com os três padrões
-- ---------------------------------------------------------------------------------------
--
-- A premissa que justificava a coluna anulável era "travaria a criação de serviço em cliente
-- novo antes de ele cadastrar um centro". Isso caiu com a PUL-249, que faz tenant novo nascer
-- com três centros. Sobra o passivo dos antigos — o "Pulse Demo Consultoria" tem 10 serviços
-- e zero centros. Sem esta passagem, o `SET NOT NULL` lá embaixo derruba o deploy por causa
-- deles.
INSERT INTO public.cost_centers (tenant_id, name, description)
SELECT t.id, d.name, d.description
  FROM public.tenants t
 CROSS JOIN public.default_cost_centers d
 WHERE NOT EXISTS (SELECT 1 FROM public.cost_centers c WHERE c.tenant_id = t.id)
   AND (
     EXISTS (SELECT 1 FROM public.services s WHERE s.tenant_id = t.id AND s.cost_center_id IS NULL)
     OR EXISTS (SELECT 1 FROM public.activity_types a WHERE a.tenant_id = t.id AND a.cost_center_id IS NULL)
   )
ON CONFLICT (tenant_id, lower(btrim(name))) DO NOTHING;

-- ---------------------------------------------------------------------------------------
-- 5. Órfão de tenant que acabou de ganhar os padrões cai em Operação
-- ---------------------------------------------------------------------------------------
--
-- Classificação genérica, e assumida: é onde hora de projeto mora. O cliente reclassifica
-- pela tela quando quiser — o que não pode é o dado ficar inválido.
UPDATE public.services s
   SET cost_center_id = c.id
  FROM public.cost_centers c
 WHERE s.cost_center_id IS NULL
   AND c.tenant_id = s.tenant_id
   AND lower(btrim(c.name)) = 'operação';

UPDATE public.activity_types a
   SET cost_center_id = c.id
  FROM public.cost_centers c
 WHERE a.cost_center_id IS NULL
   AND c.tenant_id = a.tenant_id
   AND lower(btrim(c.name)) = 'operação';

-- ---------------------------------------------------------------------------------------
-- 6. A guarda: sobrou alguém?
-- ---------------------------------------------------------------------------------------
--
-- DERRUBA a migration com a lista, em vez de jogar o resto num centro coringa. Classificar
-- custo errado em silêncio é pior do que um deploy que para: o coringa vira permanente no
-- dia em que ninguém olha, e a soma por centro passa a mentir sem avisar.
--
-- Quem cair aqui resolve pela tela (Admin > Serviços, Admin > Atividades) e roda de novo.
DO $$
DECLARE
  v_orfaos text;
BEGIN
  SELECT string_agg(linha, E'\n  - ' ORDER BY linha) INTO v_orfaos
    FROM (
      SELECT format('%s (serviço, tenant %s)', s.name, s.tenant_id) AS linha
        FROM public.services s WHERE s.cost_center_id IS NULL
      UNION ALL
      SELECT format('%s (atividade, tenant %s)', a.name, a.tenant_id)
        FROM public.activity_types a WHERE a.cost_center_id IS NULL
    ) AS t;

  IF v_orfaos IS NOT NULL THEN
    RAISE EXCEPTION E'Itens de catálogo sem centro de custo — defina o centro de cada um e rode de novo:\n  - %', v_orfaos
      USING ERRCODE = 'PU001';
  END IF;
END $$;

-- ---------------------------------------------------------------------------------------
-- 7. O contract
-- ---------------------------------------------------------------------------------------
--
-- Vale para a tabela INTEIRA, não só para o que está ativo: item inativo sem centro também
-- barra o ALTER. Por isso as passagens acima não filtram por `is_active` — o ADR-0031 já
-- previa dar centro aos inativos para o histórico ficar legível, e aqui isso vira requisito.
ALTER TABLE public.services       ALTER COLUMN cost_center_id SET NOT NULL;
ALTER TABLE public.activity_types ALTER COLUMN cost_center_id SET NOT NULL;

COMMENT ON COLUMN public.services.cost_center_id IS
  'Centro de custo do serviço (PUL-221, ADR-0031). Obrigatório desde PUL-247: a regra deixou '
  'de depender da tela e passou a valer também para quem chama a API direto.';
COMMENT ON COLUMN public.activity_types.cost_center_id IS
  'Centro de custo da atividade interna (PUL-221, ADR-0031). Obrigatório desde PUL-247.';
