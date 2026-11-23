-- Responsáveis de uma oportunidade (18/11/2026, pedido do Victor na validação da US-0020):
-- só quem está ativo e pode editar a Prospecção. Hoje isso é Admin e Gerente; como a regra é a
-- capacidade (ADR-0027) e não o nome do papel, outro papel que ganhar `prospeccao:editar`
-- entra sem mudar código. Desligados e quem ainda não confirmou o cadastro ficam de fora.
--
-- Segurança (mesmo desenho de get_employee_directory, ADR-0020 e ADR-0021): o tenant é
-- derivado de auth.uid(), não é parâmetro; projeção fixa, sem remuneração, custo nem dado
-- pessoal sensível.
--
-- Rollback: supabase/rollback/20261118210000_responsaveis_da_prospeccao_rollback.sql

CREATE OR REPLACE FUNCTION public.get_prospeccao_responsaveis()
RETURNS TABLE (
  id       uuid,
  nome     text,
  cargo    text,
  foto_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.nome, e.cargo, e.foto_url
  FROM public.employees e
  WHERE e.tenant_id = public.get_user_tenant_id(auth.uid())
    AND e.status = 'ativo'
    AND e.auth_id IS NOT NULL
    AND public.has_capability(e.auth_id, e.tenant_id, 'prospeccao:editar')
  ORDER BY e.nome;
$$;

COMMENT ON FUNCTION public.get_prospeccao_responsaveis() IS
  'Quem pode ser responsável por uma oportunidade: funcionários ativos do tenant do chamador com '
  'prospeccao:editar (hoje Admin e Gerente). Projeção fixa: id, nome, cargo e foto (18/11/2026).';

REVOKE ALL ON FUNCTION public.get_prospeccao_responsaveis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_prospeccao_responsaveis() TO authenticated;
