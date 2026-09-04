-- PUL-211 — as três policies de escrita do bucket `employee-photos` autorizavam checando
-- apenas o papel:
--
--     bucket_id = 'employee-photos'
--     AND EXISTS (SELECT 1 FROM user_roles
--                 WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
--
-- Sem `tenant_id` e sem restrição de path. Como `user_roles` tem uma linha por
-- (user_id, tenant_id, role), o EXISTS é satisfeito por um papel de admin em QUALQUER
-- tenant — então admin do tenant A grava, substitui ou apaga foto de funcionário de
-- qualquer outro tenant. Mesma classe do PUL-207 (currículos): as policies vizinhas
-- carregam `(ur.tenant_id)::text = (storage.foldername(name))[1]`, esta não. Omissão.
--
-- A correção exige que o objeto esteja na pasta do tenant de quem escreve, como
-- `curriculos` já faz. A comparação é em TEXTO, não cast para uuid, pelo motivo
-- documentado em 20260902150000: excecao em policy nao nega, quebra a consulta — path com
-- segmento que nao seja uuid deve ser NEGADO, silenciosamente.
--
-- Sobre os 28 objetos que já existem: todos estão na raiz do bucket (nenhum tem barra no
-- nome), portanto nenhum deles satisfaz o predicado novo e a escrita neles passa a ser
-- negada. Isso é seguro porque:
--   1. a LEITURA não muda — o bucket é público e as fotos seguem sendo exibidas;
--   2. o fluxo da aplicação nunca sobrescreve nem apaga foto: troca de foto sobe um objeto
--      novo com nome aleatório e regrava `employees.foto_url`. Não há caminho de produto
--      que dependa de escrever num objeto antigo.
-- Os objetos antigos não referenciados por nenhum `foto_url` (8 dos 28) ficam como
-- limpeza registrada em TD-0020 — remoção exige a API de storage, não SQL.
--
-- O papel continua sendo `admin`: trocar por `pessoa:editar` daria a gerente o que hoje é
-- só de admin. A virada por capacidade deste bucket está registrada em TD-0019.

DROP POLICY IF EXISTS "Admins can upload employee photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update employee photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete employee photos" ON storage.objects;

CREATE POLICY "Admins can upload employee photos in their tenant"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-photos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id::text = (storage.foldername(name))[1]
      AND ur.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update employee photos in their tenant"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'employee-photos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id::text = (storage.foldername(name))[1]
      AND ur.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can delete employee photos in their tenant"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-photos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id::text = (storage.foldername(name))[1]
      AND ur.role = 'admin'::app_role
  )
);

COMMENT ON POLICY "Admins can upload employee photos in their tenant" ON storage.objects IS
  'PUL-211: exige que o objeto esteja na pasta do tenant de quem escreve. Sem isso, admin '
  'de um tenant escrevia em foto de outro. Comparacao em texto de proposito.';
