-- Corrige um bug reintroduzido pela própria correção anterior (20260721230000): o guard
-- de "só é possível cancelar marco futuro" passou a usar CURRENT_DATE (Postgres), que
-- resolve no fuso do banco — Supabase usa UTC por padrão, sem override de timezone em
-- nenhuma migration deste projeto (confirmado por grep). Isso reintroduz exatamente o
-- mesmo bug de fronteira de fuso horário que todayLocalDateString() (src/lib/formatters.ts)
-- foi criada para evitar: para Brasília (UTC-3), entre ~21h e meia-noite local, o UTC já
-- virou o dia seguinte, então CURRENT_DATE no servidor já bateria com uma data que ainda é
-- "amanhã" para o usuário — bloqueando um cancelamento legítimo com "só é possível cancelar
-- marcos futuros" mesmo a data sendo genuinamente futura no calendário do usuário.
--
-- Correção: a função passa a receber a data de "hoje" como parâmetro (calculada no cliente
-- via todayLocalDateString(), mesma fonte usada em todo o resto do app) em vez de usar
-- CURRENT_DATE. Isso é um guard de regra de negócio (evitar cancelar algo já em vigor),
-- não o limite de segurança real — esse continua sendo o RLS (UPDATE/DELETE admin-only),
-- que não depende de nenhuma data e não muda aqui.
DROP FUNCTION IF EXISTS public.cancel_scheduled_employee_version(UUID);

CREATE OR REPLACE FUNCTION public.cancel_scheduled_employee_version(p_version_id UUID, p_today DATE)
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

  IF v_effective_from <= p_today THEN
    RAISE EXCEPTION 'Só é possível cancelar marcos agendados para uma data futura.';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.cancel_scheduled_employee_version(UUID, DATE) TO authenticated;
