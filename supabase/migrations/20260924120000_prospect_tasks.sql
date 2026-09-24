-- Prospecção — tarefas: o que ainda precisa ser feito com o contato.
--
-- Pedido de 24/09/2026 (Guilherme): a linha do tempo de atividades registra para trás (o
-- que aconteceu). Faltava onde anotar para frente — "mandar proposta até sexta", "ligar
-- depois da feira". Tarefa é uma lista simples: texto, data de conclusão e se está feita.
--
-- Tabela própria, e não uma atividade com data futura, de propósito: atividade conta toque,
-- agenda a cadência e move a etapa (trigger `prospect_activities_advance`). Uma tarefa
-- anotada não pode virar toque registrado, senão a taxa de resposta por número de toque
-- passa a contar intenção.
--
-- O responsável é herdado do contato na criação: a tarefa é de quem conduz a conversa.
--
-- Acesso: mesmas capacidades do resto do módulo (prospeccao:ler / prospeccao:editar),
-- decididas pelo contato pai, como em prospect_activities (ADR-0022).
--
-- Rollback: supabase/rollback/20260924120000_prospect_tasks_rollback.sql

CREATE TABLE public.prospect_tasks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prospect_id  uuid        NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  description  text        NOT NULL,
  due_date     date        NOT NULL,
  owner_id     uuid        REFERENCES public.employees(id),
  done_at      timestamptz,
  done_by      uuid        REFERENCES public.employees(id),
  created_by   uuid        REFERENCES public.employees(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT prospect_tasks_description_valid
    CHECK (char_length(btrim(description)) BETWEEN 1 AND 2000)
);

COMMENT ON TABLE public.prospect_tasks IS
  'Tarefas futuras de um contato de prospecção (24/09/2026). Não contam como toque: não '
  'mexem em activity_count, next_activity_on nem etapa.';
COMMENT ON COLUMN public.prospect_tasks.owner_id IS
  'Responsável pela tarefa. Herdado do responsável do contato na criação.';
COMMENT ON COLUMN public.prospect_tasks.done_at IS
  'Quando foi marcada como concluída. NULL = pendente.';

CREATE INDEX prospect_tasks_prospect_idx
  ON public.prospect_tasks (prospect_id, due_date);

CREATE INDEX prospect_tasks_pending_idx
  ON public.prospect_tasks (tenant_id, owner_id, due_date)
  WHERE done_at IS NULL;

CREATE OR REPLACE FUNCTION public.prospect_tasks_inherit_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pai record;
BEGIN
  SELECT tenant_id, owner_id
    INTO pai
    FROM public.prospects
   WHERE id = NEW.prospect_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contato de prospecção não encontrado.' USING ERRCODE = 'PU001';
  END IF;

  -- O tenant vem SEMPRE do pai: tarefa não pode apontar para contato de outro tenant.
  NEW.tenant_id := pai.tenant_id;
  NEW.owner_id  := COALESCE(NEW.owner_id, pai.owner_id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospect_tasks_inherit_parent() IS
  'Herda tenant e responsável do contato, para a tela enviar só texto e data.';

CREATE TRIGGER prospect_tasks_inherit_parent
  BEFORE INSERT ON public.prospect_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_tasks_inherit_parent();

CREATE TRIGGER update_prospect_tasks_updated_at
  BEFORE UPDATE ON public.prospect_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS — decide pelo pai, como prospect_activities (ADR-0022)
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospect_tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_tasks TO authenticated;

CREATE POLICY "Prospeccao readers can view prospect tasks" ON public.prospect_tasks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:ler')
  ));

CREATE POLICY "Prospeccao editors can insert prospect tasks" ON public.prospect_tasks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ));

CREATE POLICY "Prospeccao editors can update prospect tasks" ON public.prospect_tasks
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ));

CREATE POLICY "Prospeccao editors can delete prospect tasks" ON public.prospect_tasks
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ));
