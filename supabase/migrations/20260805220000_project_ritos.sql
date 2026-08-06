-- Ritos de projeto vinculados a compromissos do calendário Microsoft.
-- Decisões e alternativas recusadas: .harness/adr/0011-project-ritos-calendar-link.md
--
-- Pontos que não são detalhe de implementação:
--   * a identidade do evento é o `iCalUId` (igual em todas as caixas), nunca o
--     `id` do Graph, que é por caixa de correio;
--   * ocorrências são registradas linha a linha, não pré-agregadas, para a
--     janela do relatório ser filtro de consulta;
--   * escrita é por recurso (gerente ou membro do projeto), não por role.

-- ─── Tipos de rito ───────────────────────────────────────────────────────────
-- Lista fechada: o relatório compara projetos entre si e taxonomia por projeto
-- destruiria a comparação. `outro` é escape para o caso raro.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_rito_type') THEN
    CREATE TYPE public.project_rito_type AS ENUM (
      'daily', 'planning', 'review', 'retro', 'outro'
    );
  END IF;
END $$;

-- ─── Vínculo: série de calendário que cumpre um rito do projeto ──────────────
CREATE TABLE IF NOT EXISTS public.project_ritos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rito_type    public.project_rito_type NOT NULL,

  -- Identidade da reunião entre caixas de correio distintas.
  ical_uid     text NOT NULL,
  -- Título no momento do vínculo, só para exibição quando ninguém conectado
  -- puder resolver a série na agenda.
  event_title  text NOT NULL,
  -- true quando a reunião é recorrente; um rito pontual é possível mas raro.
  is_series    boolean NOT NULL DEFAULT true,

  linked_by    uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Vincular a mesma reunião ao mesmo projeto duas vezes é idempotência, não
  -- erro: a UI mostra o vínculo existente. A mesma reunião PODE ser rito de
  -- dois projetos diferentes, que é caso legítimo.
  CONSTRAINT project_ritos_unique_link UNIQUE (tenant_id, project_id, ical_uid)
);

CREATE INDEX IF NOT EXISTS project_ritos_project_idx
  ON public.project_ritos (project_id);
CREATE INDEX IF NOT EXISTS project_ritos_ical_idx
  ON public.project_ritos (tenant_id, ical_uid);

COMMENT ON TABLE public.project_ritos IS
  'Vínculo entre um rito de projeto e a série de calendário que o cumpre. Identidade pelo iCalUId — ver ADR-0011.';
COMMENT ON COLUMN public.project_ritos.ical_uid IS
  'iCalUId do Graph: igual em todas as caixas de correio da mesma reunião. Nunca usar o id do evento, que é por caixa.';

-- ─── Ocorrências observadas ──────────────────────────────────────────────────
-- Uma linha por ocorrência vista na agenda de quem sincronizou. A janela do
-- relatório (quinze dias por padrão) é filtro sobre `occurred_on`.
CREATE TABLE IF NOT EXISTS public.project_rito_occurrences (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_rito_id  uuid NOT NULL REFERENCES public.project_ritos(id) ON DELETE CASCADE,

  occurred_on      date NOT NULL,
  -- Ocorrência cancelada continua registrada: "existe a série mas foi cancelada
  -- em cinco dos dez dias" é o sinal que a reunião de GPs procura.
  is_cancelled     boolean NOT NULL DEFAULT false,

  synced_by        uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  synced_at        timestamptz NOT NULL DEFAULT now(),

  -- Sincronizar é idempotente: reabrir a agenda no mesmo dia atualiza a linha
  -- em vez de duplicar a ocorrência.
  CONSTRAINT project_rito_occurrences_unique UNIQUE (project_rito_id, occurred_on)
);

CREATE INDEX IF NOT EXISTS project_rito_occurrences_window_idx
  ON public.project_rito_occurrences (tenant_id, occurred_on);

COMMENT ON TABLE public.project_rito_occurrences IS
  'Ocorrências de rito observadas na agenda de um participante. Registro linha a linha para a janela do relatório ser consulta — ver ADR-0011.';

-- ─── Autorização de escrita ──────────────────────────────────────────────────
-- Gerente do projeto (ou admin) e membros do projeto podem vincular ritos.
-- Marcar reunião que não se organizou é inofensivo; vincular rito a projeto
-- alheio não é — daí a checagem ser por recurso.
CREATE OR REPLACE FUNCTION public.can_link_project_rito(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_project(_user_id, _project_id)
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      JOIN public.employees e ON e.id = pm.employee_id
      WHERE pm.project_id = _project_id
        AND e.auth_id = _user_id
    );
$$;

COMMENT ON FUNCTION public.can_link_project_rito(uuid, uuid) IS
  'Security definer helper para RLS: admin, gerente do projeto ou membro alocado podem vincular e sincronizar ritos.';

-- ─── RLS: project_ritos ──────────────────────────────────────────────────────
ALTER TABLE public.project_ritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_ritos_select_tenant" ON public.project_ritos;
DROP POLICY IF EXISTS "project_ritos_insert_pm_or_member" ON public.project_ritos;
DROP POLICY IF EXISTS "project_ritos_update_pm_or_member" ON public.project_ritos;
DROP POLICY IF EXISTS "project_ritos_delete_pm_or_member" ON public.project_ritos;

-- Leitura segue o ADR-0002: gerentes acompanham o portfólio inteiro do tenant;
-- quem é membro vê os ritos dos próprios projetos.
CREATE POLICY "project_ritos_select_tenant"
ON public.project_ritos FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager(auth.uid(), tenant_id)
  OR public.can_link_project_rito(auth.uid(), project_id)
);

CREATE POLICY "project_ritos_insert_pm_or_member"
ON public.project_ritos FOR INSERT TO authenticated
WITH CHECK (
  public.can_link_project_rito(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_ritos_update_pm_or_member"
ON public.project_ritos FOR UPDATE TO authenticated
USING (public.can_link_project_rito(auth.uid(), project_id))
WITH CHECK (
  public.can_link_project_rito(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_ritos_delete_pm_or_member"
ON public.project_ritos FOR DELETE TO authenticated
USING (public.can_link_project_rito(auth.uid(), project_id));

-- ─── RLS: project_rito_occurrences ───────────────────────────────────────────
ALTER TABLE public.project_rito_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_rito_occurrences_select_tenant" ON public.project_rito_occurrences;
DROP POLICY IF EXISTS "project_rito_occurrences_insert_participant" ON public.project_rito_occurrences;
DROP POLICY IF EXISTS "project_rito_occurrences_update_participant" ON public.project_rito_occurrences;
DROP POLICY IF EXISTS "project_rito_occurrences_delete_participant" ON public.project_rito_occurrences;

CREATE POLICY "project_rito_occurrences_select_tenant"
ON public.project_rito_occurrences FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_ritos r
    WHERE r.id = project_rito_occurrences.project_rito_id
      AND (
        public.is_admin_or_manager(auth.uid(), r.tenant_id)
        OR public.can_link_project_rito(auth.uid(), r.project_id)
      )
  )
);

CREATE POLICY "project_rito_occurrences_insert_participant"
ON public.project_rito_occurrences FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_ritos r
    WHERE r.id = project_rito_occurrences.project_rito_id
      AND r.tenant_id = project_rito_occurrences.tenant_id
      AND public.can_link_project_rito(auth.uid(), r.project_id)
  )
);

CREATE POLICY "project_rito_occurrences_update_participant"
ON public.project_rito_occurrences FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_ritos r
    WHERE r.id = project_rito_occurrences.project_rito_id
      AND public.can_link_project_rito(auth.uid(), r.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_ritos r
    WHERE r.id = project_rito_occurrences.project_rito_id
      AND r.tenant_id = project_rito_occurrences.tenant_id
      AND public.can_link_project_rito(auth.uid(), r.project_id)
  )
);

CREATE POLICY "project_rito_occurrences_delete_participant"
ON public.project_rito_occurrences FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_ritos r
    WHERE r.id = project_rito_occurrences.project_rito_id
      AND public.can_link_project_rito(auth.uid(), r.project_id)
  )
);
