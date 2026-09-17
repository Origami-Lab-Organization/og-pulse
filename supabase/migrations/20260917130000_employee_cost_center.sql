-- PUL-218 — quem não lança hora tem centro de custo vinculado.
--
-- REGRA (decisão do Italo, 17/09): o custo de uma pessoa entra na leitura por centro por UM
-- caminho só —
--
--   lança hora      -> custo lido pelos centros dos itens que ela lançou
--   NÃO lança hora  -> custo 100% no centro de lotação dela, obrigatório
--
-- Como o vínculo só existe para quem não lança, não há como o mesmo salário aparecer duas
-- vezes: a regra se defende no dado, não na disciplina de quem lê. E fecha o buraco que a
-- regra "custo = horas × custo/hora" deixava — administrativo puro nunca lança hora, e sumia
-- inteiro da leitura de custo (PUL-182).
--
-- O FLAG JÁ EXISTE, e é `aloca_em_projetos` (ADR-0010). Não se cria um segundo: a descrição
-- dele em tela já diz "desative para colaboradores que NÃO LANÇAM TIMESHEET (RH, financeiro,
-- backoffice)". Dois flags para a mesma pergunta acabariam discordando, e aí ninguém sabe
-- qual vale. Decisão do Italo em 17/09, ao ver que o campo já dizia isso.
--
-- O CHECK É `NOT VALID`, de propósito (expand-contract). Pode existir funcionário com
-- `aloca_em_projetos = false` e sem centro — não dá para saber daqui, e chutar um centro para
-- essas pessoas seria inventar dado financeiro. `NOT VALID` faz a regra valer para toda
-- escrita nova sem recusar as linhas que já estão lá. Validar (`VALIDATE CONSTRAINT`) é o
-- contract, quando todos tiverem centro.
--
-- Consequência conhecida: editar uma pessoa antiga sem centro passa a exigir que se escolha
-- um. É o comportamento desejado — a tela pede antes, e o banco é a barreira de quem chama a
-- API direto.
--
-- Rollback: supabase/rollback/20260917130000_employee_cost_center_rollback.sql

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.employees.cost_center_id IS
  'Centro de lotação, obrigatório para quem NÃO lança hora (PUL-218). O custo mensal dessa '
  'pessoa é lido 100% neste centro. Quem lança hora deixa nulo: o custo vem dos centros dos '
  'itens lançados. O flag que decide é `aloca_em_projetos` (ADR-0010).';

CREATE INDEX IF NOT EXISTS employees_cost_center_idx
  ON public.employees (cost_center_id)
  WHERE cost_center_id IS NOT NULL;

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_no_timesheet_needs_cost_center;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_no_timesheet_needs_cost_center
  CHECK (aloca_em_projetos OR cost_center_id IS NOT NULL)
  NOT VALID;

-- ---------------------------------------------------------------------------------------
-- Backfill de quem já está na base sem centro
-- ---------------------------------------------------------------------------------------
--
-- Leitura de produção em 17/09: quatro pessoas com `aloca_em_projetos = false`, todas na
-- Origami. Uma delas está EM DESLIGAMENTO — sem este backfill, o CHECK barraria a conclusão
-- do desligamento, porque ele recusa qualquer UPDATE na linha, não só a mudança de centro.
--
-- O destino vem do CARGO, decisão do Italo em 17/09. Casar por cargo é heurística sobre texto
-- livre, e é por isso que ela é conservadora: quem não casar fica sem centro em vez de receber
-- um chute. Concretamente, o Engenheiro de Software marcado como "não aloca em projetos" fica
-- de fora — cargo assim sugere flag errado no cadastro, não backoffice, e inventar um centro
-- para ele esconderia o problema.
--
-- O centro é buscado no MESMO tenant da pessoa, então isto vale para qualquer cliente que
-- tenha os centros padrão, e não só para a Origami.

DO $$
DECLARE
  v_marketing integer;
  v_admin     integer;
BEGIN
  UPDATE public.employees e
     SET cost_center_id = c.id
    FROM public.cost_centers c
   WHERE c.tenant_id = e.tenant_id
     AND c.is_active
     AND NOT e.aloca_em_projetos
     AND e.cost_center_id IS NULL
     AND e.cargo ILIKE '%marketing%'
     AND lower(c.name) LIKE '%comercial%';
  GET DIAGNOSTICS v_marketing = ROW_COUNT;

  UPDATE public.employees e
     SET cost_center_id = c.id
    FROM public.cost_centers c
   WHERE c.tenant_id = e.tenant_id
     AND c.is_active
     AND NOT e.aloca_em_projetos
     AND e.cost_center_id IS NULL
     AND (e.cargo ILIKE '%financ%' OR e.cargo ILIKE '%limpeza%' OR e.cargo ILIKE '%administrativ%')
     AND lower(c.name) LIKE '%administrativo%';
  GET DIAGNOSTICS v_admin = ROW_COUNT;

  RAISE NOTICE 'PUL-218: backfill por cargo — % para comercial/marketing, % para administrativo',
    v_marketing, v_admin;
END $$;

DO $$
DECLARE
  v_sem_centro integer;
BEGIN
  SELECT count(*) INTO v_sem_centro
    FROM public.employees
   WHERE NOT aloca_em_projetos
     AND cost_center_id IS NULL;

  -- Estas são as pessoas cujo custo continua fora da leitura por centro até alguém escolher
  -- o centro delas. Não some calado: é o número que diz quanto falta para o VALIDATE.
  RAISE NOTICE 'PUL-218: % pessoa(s) que nao lancam hora ainda sem centro de custo', v_sem_centro;
END $$;
