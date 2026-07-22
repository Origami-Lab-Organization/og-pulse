-- Move o cancelamento de marco agendado (cancelScheduledVersion, employeeVersionService.ts)
-- de uma sequência de 3 chamadas orquestradas em JS para uma única função atômica —
-- corrige dois problemas reais encontrados em revisão adversarial:
--
-- 1. CONDIÇÃO DE CORRIDA: a versão em JS lia effective_until num SELECT, e usava esse
--    valor (já em memória) num UPDATE separado momentos depois. Se outro admin criasse
--    uma nova versão para o mesmo colaborador nesse intervalo (fechando a versão sendo
--    cancelada numa data diferente da lida), o UPDATE de extensão usava o valor ANTIGO
--    (em cache), produzindo duas versões com intervalos sobrepostos — corrompendo a
--    linha do tempo. Aqui, `SELECT ... FOR UPDATE` trava a linha e tudo roda numa
--    transação só, native do Postgres.
--
-- 2. FALSO SUCESSO PARA GERENTES: a rota que expõe esta ação (EmployeeDetail, aba
--    Histórico) exige só `requireManager`, não `requireAdmin` — e a política de SELECT
--    de employee_versions já permite "Admins and managers". Mas as políticas de UPDATE/
--    DELETE continuam admin-only. Um gerente clicando em "Cancelar" fazia o UPDATE/DELETE
--    do lado do JS baterem no RLS e afetarem 0 linhas — e a Supabase/PostgREST não trata
--    isso como erro (retorna sucesso, 0 linhas afetadas), deixando o app mostrar "cancelado
--    com sucesso" quando NADA foi alterado. Esta função roda com SECURITY INVOKER (não
--    DEFINER) — ou seja, continua sujeita ao RLS do usuário que chama — e verifica
--    explicitamente quantas linhas o DELETE afetou, lançando um erro claro se for zero
--    (em vez de silenciar o RLS como o client Supabase faz por padrão).
CREATE OR REPLACE FUNCTION public.cancel_scheduled_employee_version(p_version_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_effective_from DATE;
  v_effective_until DATE;
  v_deleted_count INTEGER;
BEGIN
  SELECT employee_id, effective_from, effective_until
  INTO v_employee_id, v_effective_from, v_effective_until
  FROM public.employee_versions
  WHERE id = p_version_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão não encontrada ou sem permissão para acessá-la.';
  END IF;

  IF v_effective_from <= CURRENT_DATE THEN
    RAISE EXCEPTION 'Só é possível cancelar marcos agendados para uma data futura.';
  END IF;

  -- Versão imediatamente anterior na linha do tempo (fechada só por causa desta) volta a
  -- valer até onde a versão cancelada ia — sem deixar buraco nem sobreposição.
  UPDATE public.employee_versions
  SET effective_until = v_effective_until
  WHERE employee_id = v_employee_id
    AND effective_until = v_effective_from;

  DELETE FROM public.employee_versions WHERE id = p_version_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'Sem permissão para cancelar este marco — apenas administradores podem cancelar marcos agendados.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_scheduled_employee_version(UUID) TO authenticated;
