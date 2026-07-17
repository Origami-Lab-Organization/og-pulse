-- Módulo Jornada/Ponto — reconhecimento facial real (on-device, via face-api.js
-- no navegador). Dado biométrico sensível (LGPD Art. 5º, II): ver ADR-0009.
--
-- Modelo de dados minimalista: só o descriptor numérico (embedding facial) é
-- armazenado, nunca a foto de cadastro. Comparação acontece no navegador do
-- colaborador; nada é enviado a serviço externo.

CREATE TABLE public.time_punch_face_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  descriptor JSONB NOT NULL,
  consentimento_versao TEXT NOT NULL,
  consentimento_aceito_em TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id)
);

CREATE TRIGGER update_time_punch_face_profiles_updated_at
BEFORE UPDATE ON public.time_punch_face_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.time_punch_face_profiles ENABLE ROW LEVEL SECURITY;

-- Leitura: o próprio dono (precisa buscar o descriptor para comparar no
-- navegador) ou admin/rh (suporte/auditoria — nunca escrevem por ele).
CREATE POLICY "time_punch_face_profiles_select"
ON public.time_punch_face_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = time_punch_face_profiles.employee_id AND e.auth_id = auth.uid()
  )
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

-- Sem INSERT/UPDATE/DELETE direto para authenticated — cadastro e exclusão
-- passam pelas Edge Functions enroll-face-profile / delete-face-profile, que
-- validam consentimento e registram auditoria (não dá pra confiar em payload
-- de cliente para um dado biométrico sem essa camada).

COMMENT ON TABLE public.time_punch_face_profiles IS 'Descriptor facial (embedding) para verificação de identidade opcional no ponto. Dado biométrico — ver ADR-0009.';
COMMENT ON COLUMN public.time_punch_face_profiles.descriptor IS 'Array de 128 floats (face descriptor do face-api.js) — nunca a foto original.';
COMMENT ON COLUMN public.time_punch_face_profiles.consentimento_versao IS 'Versão do texto de consentimento aceito pelo colaborador (rastreabilidade LGPD).';

-- Resultado da verificação facial em cada marcação (soft — nunca bloqueia o
-- registro de ponto, só sinaliza para revisão de admin/RH).
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS face_match_status TEXT
    CHECK (face_match_status IN ('confirmado', 'nao_confirmado', 'sem_verificacao')),
  ADD COLUMN IF NOT EXISTS face_match_score NUMERIC;

ALTER TABLE public.time_tracking_settings
  ADD COLUMN IF NOT EXISTS exigir_reconhecimento_facial BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.time_entries.face_match_status IS 'Resultado da verificação facial on-device: confirmado, não confirmado (revisar) ou sem verificação (sem perfil cadastrado).';
COMMENT ON COLUMN public.time_tracking_settings.exigir_reconhecimento_facial IS 'Quando true, a UI insiste na verificação facial — mas nunca bloqueia o registro de ponto por falha de reconhecimento.';
