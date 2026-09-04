-- PUL-206, passo 3 — as funções de borda param de perguntar por papel.
--
-- Oito lugares em Edge Functions faziam a mesma pergunta de forma antiga: "quem neste tenant
-- é admin, ou admin e RH?", lendo `user_roles` direto. É o último consumidor de decisão
-- daquela tabela, e cada um reescrevendo o mesmo SELECT é a duplicação que faz a regra
-- divergir.
--
-- Uma função responde a pergunta certa: quem tem a capacidade. Com `SECURITY DEFINER` porque
-- quem chama é a Edge Function com credencial de serviço para NOTIFICAR — não é decisão de
-- acesso a dado, é lista de destinatário.
CREATE OR REPLACE FUNCTION public.users_with_capability(_tenant_id uuid, _capability text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT utr.user_id
  FROM public.user_tenant_roles utr
  WHERE utr.tenant_id = _tenant_id
    AND public.has_capability(utr.user_id, _tenant_id, _capability)
$$;

GRANT EXECUTE ON FUNCTION public.users_with_capability(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.users_with_capability(uuid, text) IS
  'Quem tem a capacidade no tenant. Substituiu oito consultas a user_roles espalhadas em '
  'Edge Functions (PUL-206).';

-- Capacidade num tenant identificado por TEXTO — para policy de storage.
--
-- As policies de storage tiram o tenant do primeiro segmento do path e comparavam em texto
-- de propósito: `(ur.tenant_id)::text = (storage.foldername(name))[1]`. Converter o path
-- para uuid seria o erro que a 20260902150000 documenta — exceção dentro de policy NÃO
-- nega, ela quebra a consulta, então path fora do formato viraria erro em vez de acesso
-- negado.
--
-- Esta função mantém a comparação em texto e só então resolve a capacidade, com o uuid que
-- veio da tabela. Path malformado simplesmente não casa, e o acesso é negado em silêncio,
-- que é o comportamento correto.
CREATE OR REPLACE FUNCTION public.has_capability_in_folder(
  _user_id uuid, _tenant_text text, _capability text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenant_roles utr
    WHERE utr.user_id = _user_id
      AND utr.tenant_id::text = _tenant_text
      AND public.has_capability(_user_id, utr.tenant_id, _capability)
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_capability_in_folder(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.has_capability_in_folder(uuid, text, text) IS
  'Capacidade no tenant cujo id chega como TEXTO, para policy de storage — compara em texto '
  'para nao estourar excecao com path malformado (PUL-206, licao da 20260902150000).';
