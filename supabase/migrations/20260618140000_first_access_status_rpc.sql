-- FUNC-J1: detecção de convite pendente a partir do e-mail, ANTES de autenticar.
-- O usuário que não concluiu o primeiro acesso não tem sessão válida, então a RLS
-- de `employees` o impede de consultar o próprio status. Esta função SECURITY DEFINER
-- expõe apenas um rótulo de status (sem dados sensíveis) para a tela de login decidir
-- se redireciona para o reenvio do e-mail de primeiro acesso.
--
-- Retornos: 'pending' (existe e ainda precisa trocar a senha) | 'active' | 'not_found'.
-- Observação de segurança: é um vetor leve de enumeração de e-mail (revela se há um
-- convite pendente). Aceitável para ferramenta interna; considerar rate limiting no
-- futuro. Não retorna nome, id, tenant nem qualquer outro dado.
create or replace function public.first_access_status(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_must_change boolean;
begin
  select must_change_password
    into v_must_change
  from public.employees
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_must_change is null then
    return 'not_found';
  elsif v_must_change then
    return 'pending';
  else
    return 'active';
  end if;
end;
$$;

-- Chamada pela tela de login (usuário ainda não autenticado).
grant execute on function public.first_access_status(text) to anon, authenticated;
