-- PUL-246 — projeto que guarda texto legado em `service_line` passa a apontar para o serviço.
--
-- CONTEXTO. `projects.service_line` é `text` e, apesar do nome, guarda `service_id` (ADR-0031).
-- 21 dos 23 projetos do tenant real já guardam o id; 2 guardam o texto legado `product_studio`,
-- herdado da base Lovable, que não resolve para serviço nenhum.
--
-- POR QUE AGORA. A decisão de 17/09 (PUL-246) é que a hora de projeto herda o centro de custo
-- DO SERVIÇO que o projeto vende. Projeto cujo `service_line` não resolve para um serviço fica
-- sem centro — e o custo dele some da leitura por centro, silenciosamente, na linha
-- "Sem centro de custo". Consertar o vínculo antes do backfill é o que evita nascer torto.
--
-- COMO RESOLVE. Nada por id fixo. Para cada projeto com o texto legado, procura no MESMO tenant
-- um serviço cujo nome normalizado seja "product studio", e só troca quando há EXATAMENTE um
-- candidato. Dois candidatos (o catálogo permite mesmo nome em linhas de serviço diferentes,
-- ADR-0031 decisão 6) ou nenhum: não toca no dado e registra o motivo. Migration não adivinha
-- vínculo comercial.
--
-- IDEMPOTENTE. Depois da troca o valor vira UUID e deixa de casar com o filtro; rodar de novo
-- não faz nada.
--
-- ACESSO. Não há policy nova. `projects` mantém as suas; a tabela de rastro é de auditoria
-- técnica, escrita só por migration, sem policy de propósito — mesmo tratamento de
-- `catalog_merge_log` (20260910130000).
--
-- Rollback: supabase/rollback/20260917100000_project_service_line_legacy_text_rollback.sql

-- ---------------------------------------------------------------------------------------
-- 1. Rastro
-- ---------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_service_link_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_at         timestamptz NOT NULL DEFAULT now(),
  tenant_id        uuid        NOT NULL,
  project_id       uuid        NOT NULL,
  project_name     text        NOT NULL,
  old_value        text        NOT NULL,
  new_service_id   uuid,
  new_service_name text,
  resolved         boolean     NOT NULL,
  reason           text        NOT NULL
);

COMMENT ON TABLE public.project_service_link_log IS
  'Rastro da troca de texto legado por service_id em projects.service_line (PUL-246). Uma linha '
  'por projeto avaliado, inclusive os não resolvidos. Guarda old_value, que é o que o rollback '
  'usa para restaurar. Escrita só por migration; sem policy de propósito.';

ALTER TABLE public.project_service_link_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_service_link_log FROM anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 2. Troca do texto legado pelo id do serviço
-- ---------------------------------------------------------------------------------------

DO $$
DECLARE
  -- `service_line` guarda id OU texto legado. Isto separa os dois casos sem depender de cast,
  -- que estouraria a migration no primeiro valor não-UUID.
  c_uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

  v_project    record;
  v_matches    integer;
  v_service_id uuid;
  v_service_nm text;
  v_fixed      integer := 0;
  v_unresolved integer := 0;
  v_leftover   integer := 0;
BEGIN
  FOR v_project IN
    SELECT p.id, p.name, p.tenant_id, p.service_line
      FROM public.projects p
     WHERE p.service_line IS NOT NULL
       AND btrim(p.service_line) <> ''
       AND p.service_line !~ c_uuid_re
       -- 'product_studio', 'Product Studio', 'product studio' — a mesma coisa escrita de
       -- três jeitos ao longo da vida da base.
       AND lower(btrim(replace(p.service_line, '_', ' '))) = 'product studio'
     ORDER BY p.tenant_id, p.name
  LOOP
    -- Contagem e escolha em dois passos de propósito: `min()` não existe para `uuid`, e
    -- agregar para depois descartar esconderia o caso ambíguo, que é o que mais importa aqui.
    SELECT count(*)
      INTO v_matches
      FROM public.services s
     WHERE s.tenant_id = v_project.tenant_id
       AND lower(btrim(s.name)) = 'product studio';

    IF v_matches = 1 THEN
      SELECT s.id, s.name
        INTO v_service_id, v_service_nm
        FROM public.services s
       WHERE s.tenant_id = v_project.tenant_id
         AND lower(btrim(s.name)) = 'product studio';

      UPDATE public.projects
         SET service_line = v_service_id::text
       WHERE id = v_project.id;

      INSERT INTO public.project_service_link_log
        (tenant_id, project_id, project_name, old_value, new_service_id, new_service_name, resolved, reason)
      VALUES
        (v_project.tenant_id, v_project.id, v_project.name, v_project.service_line,
         v_service_id, v_service_nm, true, 'texto legado trocado pelo id do servico do mesmo tenant');

      v_fixed := v_fixed + 1;

    ELSE
      -- O não resolvido é registrado uma vez por projeto e valor. Sem esta guarda, cada
      -- reexecução empilharia a mesma linha e o rastro viraria ruído — o dado é idempotente,
      -- o log também precisa ser.
      INSERT INTO public.project_service_link_log
        (tenant_id, project_id, project_name, old_value, new_service_id, new_service_name, resolved, reason)
      SELECT
        v_project.tenant_id, v_project.id, v_project.name, v_project.service_line,
        NULL, NULL, false,
        CASE
          WHEN v_matches = 0 THEN 'nenhum servico chamado "Product Studio" neste tenant'
          ELSE v_matches || ' servicos chamados "Product Studio" neste tenant — ambiguo, precisa de escolha humana'
        END
      WHERE NOT EXISTS (
        SELECT 1
          FROM public.project_service_link_log l
         WHERE l.project_id = v_project.id
           AND NOT l.resolved
           AND l.old_value = v_project.service_line
      );

      v_unresolved := v_unresolved + 1;
    END IF;
  END LOOP;

  -- Outros textos legados continuam existindo e não são tratados aqui de propósito: cada um
  -- precisa de um destino decidido. Reportar impede que sumam junto com o `product_studio`.
  SELECT count(*)
    INTO v_leftover
    FROM public.projects p
   WHERE p.service_line IS NOT NULL
     AND btrim(p.service_line) <> ''
     AND p.service_line !~ c_uuid_re;

  RAISE NOTICE 'PUL-246: % projeto(s) vinculado(s), % nao resolvido(s), % com outro texto legado remanescente',
    v_fixed, v_unresolved, v_leftover;
END $$;
