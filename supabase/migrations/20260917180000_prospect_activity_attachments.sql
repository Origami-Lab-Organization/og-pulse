-- Prospecção — anexos no registro de atividade.
--
-- Decisão de 17/09/2026 (Guilherme): o registro de atividade virou uma caixa de texto com
-- anexo, no rodapé da linha do tempo. Print de conversa, proposta enviada e ata de reunião
-- são o que dá sentido ao registro meses depois; sem lugar para eles, viram descrição solta
-- ou ficam fora do sistema.
--
-- Convenção de path: {tenant_id}/{prospect_id}/{uuid}-{arquivo}. O isolamento entre tenants
-- é garantido pelo 1º segmento da pasta.
--
-- DIFERENÇA DELIBERADA em relação ao bucket `lead-attachments` (20260619120000): lá a
-- policy de storage aceita QUALQUER membro do tenant (`user_belongs_to_tenant`), enquanto a
-- tabela exige `pipeline:ler` — o arquivo fica mais aberto que a linha que o referencia.
-- Aqui as duas barreiras batem: leitura por `prospeccao:ler`, escrita por
-- `prospeccao:editar`, iguais às policies de `prospect_activities`. O checklist de review
-- pede exatamente isso: policy de storage equivalente ou mais restritiva que a capacidade.
--
-- Rollback: supabase/rollback/20260917180000_prospect_activity_attachments_rollback.sql

ALTER TABLE public.prospect_activities
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.prospect_activities.attachments IS
  'Anexos da atividade: [{ path, name, size, type }] — arquivos no bucket prospect-attachments.';

-- Bucket privado. Limite e tipos também no servidor: a validação da tela é conveniência,
-- não barreira.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prospect-attachments', 'prospect-attachments', false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "prospect-attachments: readers can read" ON storage.objects;
CREATE POLICY "prospect-attachments: readers can read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'prospect-attachments'
    AND public.has_capability(
      auth.uid(), ((storage.foldername(name))[1])::uuid, 'prospeccao:ler'
    )
  );

DROP POLICY IF EXISTS "prospect-attachments: editors can upload" ON storage.objects;
CREATE POLICY "prospect-attachments: editors can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'prospect-attachments'
    AND public.has_capability(
      auth.uid(), ((storage.foldername(name))[1])::uuid, 'prospeccao:editar'
    )
  );

DROP POLICY IF EXISTS "prospect-attachments: editors can delete" ON storage.objects;
CREATE POLICY "prospect-attachments: editors can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'prospect-attachments'
    AND public.has_capability(
      auth.uid(), ((storage.foldername(name))[1])::uuid, 'prospeccao:editar'
    )
  );
