-- PUL-207 (divergência D6 de .harness/capability-matrix.md) — leitura de currículo
-- deixa de ser cross-tenant.
--
-- Problema:
--   A policy "Recruiters can read curriculos" (20260817230000) autoriza a leitura
--   checando apenas o papel:
--
--     bucket_id = 'curriculos'
--     AND EXISTS (SELECT 1 FROM user_roles ur
--                 WHERE ur.user_id = auth.uid()
--                   AND ur.role IN ('admin','manager','rh'))
--
--   Sem `tenant_id`. Como `user_roles` tem uma linha por (user_id, tenant_id, role), o
--   EXISTS é satisfeito por QUALQUER papel que a pessoa tenha em QUALQUER tenant — então
--   admin, gerente ou RH de um tenant lê currículo de candidato de todos os outros.
--
--   Todas as policies vizinhas da mesma migration carregam o predicado com tenant; esta
--   não. É omissão, não decisão. Viola boundaries.md ("não expor dados entre tenants") e o
--   dado exposto é pessoal de terceiro que nem é usuário do sistema: nome, contato,
--   histórico profissional e, pelo escopo do PUL-168, potencialmente CPF.
--
-- Decisão:
--   O tenant vem do próprio path do objeto. O upload sempre gravou
--   `{tenant_id}/{timestamp}-{nome}` (src/services/jobApplicationService.ts), e essa linha
--   nunca mudou desde o commit que criou o módulo — então não há path legado nem backfill.
--   `jobApplicationService` é o único produtor no bucket, e nenhuma Edge Function o toca.
--
--   A comparação é feita em TEXTO, não com cast para uuid:
--
--     ur.tenant_id::text = (storage.foldername(name))[1]
--
--   Castar o segmento do path (`(...)[1]::uuid`) lançaria `invalid input syntax for type
--   uuid` num objeto de path inesperado, e exceção dentro de policy não nega o acesso:
--   quebra a consulta inteira. Comparando texto com texto, path fora do formato
--   simplesmente não casa e o acesso é negado — falha fechada, sem erro.
--
-- Fora do escopo, registrado:
--   A policy de INSERT ("Anyone can upload curriculo", 20260324120000) só verifica
--   `bucket_id`. O formulário público Trabalhe Conosco é anônimo por decisão do PUL-168,
--   mas isso significa que qualquer um pode gravar em qualquer path — inclusive no de
--   outro tenant, plantando arquivo que o recrutador daquele tenant veria como currículo
--   legítimo. Não é vazamento (só recrutador do próprio tenant lê, após esta migration) e
--   corrigir exigiria validar o tenant no INSERT anônimo, o que arrisca quebrar o
--   formulário público sem prova. Fica como item próprio.

DROP POLICY IF EXISTS "Recruiters can read curriculos" ON storage.objects;

CREATE POLICY "Recruiters can read curriculos in their tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'curriculos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id::text = (storage.foldername(name))[1]
      AND ur.role IN ('admin'::app_role, 'manager'::app_role, 'rh'::app_role)
  )
);
