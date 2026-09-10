-- PUL-250 — o guia de primeiros passos do dono da empresa.
--
-- O que este arquivo NÃO faz, de propósito: guardar em que passo a pessoa está.
--
-- O progresso é DERIVADO do dado que existe — tem pessoa cadastrada? tem cliente? tem
-- projeto com alguém alocado? A tela conta e sabe. Persistir "passo atual" criaria uma
-- segunda verdade que dessincroniza na primeira vez que alguém cadastra um cliente por
-- outro caminho, importa dado, ou apaga o que tinha. Progresso derivado nunca mente.
--
-- Só uma coisa não dá para derivar: a pessoa não quer mais ver o guia. Isso é preferência,
-- e é o que esta coluna guarda. Fica no banco e não em localStorage porque o dono abre o
-- Pulse no computador e no celular, e ver o guia de novo depois de dispensar parece defeito.
--
-- Mesmo padrão de 20260618150000_employee_onboarding.sql e 20260722000000_timesheet_onboarding.sql.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS owner_guide_dismissed_at timestamptz;

COMMENT ON COLUMN public.employees.owner_guide_dismissed_at IS
  'Quando a pessoa dispensou o guia de primeiros passos. NULL = ainda mostra, se houver '
  'passo pendente. O progresso em si nao e guardado: e derivado do dado real (PUL-250).';

-- Sem backfill, e a diferença importa: quem já usa o Pulse tem a casa montada, então o guia
-- não aparece para ninguém — todos os passos já estão concluídos pelo dado que existe. Não
-- é preciso marcar como dispensado quem nunca vai ver.

CREATE OR REPLACE FUNCTION public.dismiss_owner_guide()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employees
  SET owner_guide_dismissed_at = now()
  WHERE auth_id = auth.uid()
    AND owner_guide_dismissed_at IS NULL;
END;
$$;

-- Reabrir é apagar a marca. Existe porque dispensar sem volta é armadilha: o dono dispensa
-- na correria do primeiro dia e depois não tem como pedir a ajuda de novo.
CREATE OR REPLACE FUNCTION public.restore_owner_guide()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employees
  SET owner_guide_dismissed_at = NULL
  WHERE auth_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_owner_guide() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_owner_guide() TO authenticated;
