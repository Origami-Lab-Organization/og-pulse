-- Hora planejada não sobrevive à saída da pessoa nem ao fim do projeto.
--
-- O PROBLEMA. `project_role_allocations` guarda horas planejadas por (pessoa, projeto, ano,
-- mês). Quando alguém é desalocado ou desligado, e quando um projeto é concluído, o planejado
-- dos meses SEGUINTES continua lá. Ninguém vai lançar hora contra ele, então:
--
--   * a Alocação GPO do projeto fica permanentemente abaixo da faixa saudável, porque o
--     denominador tem horas que nunca serão realizadas — alarme falso que não tem conserto;
--   * o custo planejado do projeto segue contando gente que não está mais nele;
--   * a aba Equipe mostra 160h planejadas em NOV/26 para quem saiu em setembro.
--
-- A REGRA (decisão do Italo, 17/09): a pessoa PERMANECE no projeto até a data de saída, e o
-- volume de horas para frente é zerado. Idem para projeto concluído com horas previstas.
--
-- O MÊS DA SAÍDA FICA INTEIRO. A granularidade do planejamento é o mês, e quem sai no dia 14
-- trabalhou metade dele. Zerar o mês da saída apagaria trabalho real que ainda vai ser
-- apontado — o mesmo raciocínio do lançamento de hora até a data de saída. Zera-se do mês
-- SEGUINTE em diante.
--
-- ZERA, NÃO APAGA. A linha continua existindo com `planned_hours = 0`. Apagar perderia o
-- registro de que aquela pessoa esteve planejada ali, e a aba Equipe deixaria de mostrar a
-- linha — que é justamente o que a regra quer preservar ("deve permanecer no projeto").

-- ---------------------------------------------------------------------------------------
-- 1. A operação, num lugar só
-- ---------------------------------------------------------------------------------------
--
-- SECURITY DEFINER porque roda de dentro de triggers disparados por quem desaloca, desliga
-- ou conclui — e essa pessoa pode não ter escrita em `project_role_allocations`. O escopo é
-- fechado pelos parâmetros: só zera, nunca cria nem aumenta, e só para frente.
CREATE OR REPLACE FUNCTION public.zerar_planejado_apos(
  p_project_id uuid,
  p_employee_id uuid,
  p_ate date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_afetadas integer;
BEGIN
  IF p_ate IS NULL THEN RETURN 0; END IF;

  UPDATE public.project_role_allocations a
     SET planned_hours = 0
   WHERE (p_project_id IS NULL OR a.project_id = p_project_id)
     AND (p_employee_id IS NULL OR a.employee_id = p_employee_id)
     AND a.planned_hours > 0
     -- Comparação por (ano, mês) e não por data: o mês da saída fica inteiro.
     AND make_date(a.year, a.month, 1) > date_trunc('month', p_ate)::date;

  GET DIAGNOSTICS v_afetadas = ROW_COUNT;
  RETURN v_afetadas;
END;
$$;

COMMENT ON FUNCTION public.zerar_planejado_apos(uuid, uuid, date) IS
  'Zera planned_hours dos meses POSTERIORES ao mês da data informada. Projeto ou pessoa nulo = todos. O mês da data fica intacto, porque quem sai no dia 14 trabalhou metade dele.';

REVOKE ALL ON FUNCTION public.zerar_planejado_apos(uuid, uuid, date) FROM anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 2. Desalocação: saiu deste projeto
-- ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.zerar_planejado_ao_desalocar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.row_type = 'member_status'
     AND NEW.status = 'deallocated'
     AND NEW.employee_id IS NOT NULL THEN
    PERFORM public.zerar_planejado_apos(
      NEW.project_id,
      NEW.employee_id,
      COALESCE(NEW.deallocated_at::date, CURRENT_DATE)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zerar_planejado_ao_desalocar ON public.project_team_rows;
CREATE TRIGGER zerar_planejado_ao_desalocar
AFTER INSERT OR UPDATE OF status, deallocated_at ON public.project_team_rows
FOR EACH ROW EXECUTE FUNCTION public.zerar_planejado_ao_desalocar();

-- ---------------------------------------------------------------------------------------
-- 3. Desligamento: saiu da empresa, logo de TODOS os projetos
-- ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.zerar_planejado_ao_desligar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Projeto nulo de propósito: desligamento não é sobre um projeto.
  PERFORM public.zerar_planejado_apos(NULL, NEW.employee_id, NEW.termination_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zerar_planejado_ao_desligar ON public.employee_terminations;
CREATE TRIGGER zerar_planejado_ao_desligar
AFTER INSERT OR UPDATE OF termination_date ON public.employee_terminations
FOR EACH ROW EXECUTE FUNCTION public.zerar_planejado_ao_desligar();

-- ---------------------------------------------------------------------------------------
-- 4. Conclusão do projeto: acabou para todo mundo
-- ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.zerar_planejado_ao_concluir_projeto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.portfolio_stage = 'completed' THEN
    -- Sem `completed_date` o fim é hoje: projeto marcado como concluído não tem planejado
    -- futuro, e deixar de zerar por falta de uma data seria o pior dos dois mundos.
    PERFORM public.zerar_planejado_apos(
      NEW.id,
      NULL,
      COALESCE(NEW.completed_date, CURRENT_DATE)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zerar_planejado_ao_concluir_projeto ON public.projects;
CREATE TRIGGER zerar_planejado_ao_concluir_projeto
AFTER UPDATE OF portfolio_stage, completed_date ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.zerar_planejado_ao_concluir_projeto();

-- ---------------------------------------------------------------------------------------
-- 5. O passado: o que já está lá
-- ---------------------------------------------------------------------------------------
--
-- Os triggers só valem daqui para frente. Quem já saiu, já foi desligado ou já teve o projeto
-- concluído continuaria com o planejado residual — que é exatamente a distorção relatada.
-- As três passagens abaixo são idempotentes: rodar de novo não muda nada, porque só tocam
-- linha com `planned_hours > 0` em mês posterior à saída.

-- 5a. Desalocados
UPDATE public.project_role_allocations a
   SET planned_hours = 0
  FROM public.project_team_rows t
 WHERE t.project_id = a.project_id
   AND t.employee_id = a.employee_id
   AND t.row_type = 'member_status'
   AND t.status = 'deallocated'
   AND a.planned_hours > 0
   AND make_date(a.year, a.month, 1)
       > date_trunc('month', COALESCE(t.deallocated_at::date, CURRENT_DATE))::date;

-- 5b. Desligados
UPDATE public.project_role_allocations a
   SET planned_hours = 0
  FROM public.employee_terminations e
 WHERE e.employee_id = a.employee_id
   AND a.planned_hours > 0
   AND make_date(a.year, a.month, 1) > date_trunc('month', e.termination_date)::date;

-- 5c. Projetos concluídos
UPDATE public.project_role_allocations a
   SET planned_hours = 0
  FROM public.projects p
 WHERE p.id = a.project_id
   AND p.portfolio_stage = 'completed'
   AND a.planned_hours > 0
   AND make_date(a.year, a.month, 1)
       > date_trunc('month', COALESCE(p.completed_date, CURRENT_DATE))::date;
