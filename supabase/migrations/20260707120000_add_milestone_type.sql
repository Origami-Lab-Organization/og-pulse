-- Adiciona o tipo de item de roadmap (marco pontual, release, épico ou
-- entrega interna). Default 'marco' preserva o comportamento atual e
-- retrocompatibiliza os registros existentes sem UPDATE explícito.
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS milestone_type TEXT NOT NULL DEFAULT 'marco';

COMMENT ON COLUMN public.project_milestones.milestone_type IS
  'marco (pontual, visível ao cliente) | release (período, entrega ao cliente) | '
  'epico (período, trabalho interno) | entrega_interna (pontual, uso interno do GP). '
  'Sem CHECK constraint — validado no client via zod, mesmo padrão de status.';

CREATE INDEX IF NOT EXISTS idx_project_milestones_type
  ON public.project_milestones (project_id, milestone_type);
