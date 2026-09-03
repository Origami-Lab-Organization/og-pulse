-- PUL-209 — `user_tenant_roles` deixa de ser fotografia e passa a espelhar `user_roles`.
--
-- Problema, encontrado pelo relatório de paridade contra produção:
--   O seed (20260902140000) mapeou cada pessoa para um papel às 14:16. Às 14:29 alguém
--   recebeu `admin` em `user_roles` pelo cadastro de funcionário — e `user_tenant_roles`
--   não acompanhou. Resultado: `user_roles` diz admin, o modelo novo diz Gerente.
--
--   Se a virada (PUL-201) acontecesse assim, essa pessoa PERDERIA o acesso de admin,
--   porque as policies passariam a resolver por `user_tenant_roles`.
--
--   E não é caso isolado: enquanto os dois mecanismos coexistem, toda alteração de perfil
--   pelo cadastro de funcionário cria uma divergência nova. Re-semear corrigiria por um
--   instante; o relatório voltaria a acusar no dia seguinte.
--
-- Decisão:
--   Enquanto `user_roles` é a fonte de verdade — e é, porque é o que as policies leem até
--   PUL-201 — `user_tenant_roles` é derivado dela. Trigger de espelhamento, com a MESMA
--   precedência do seed, mantém a paridade estável sem tocar tela nenhuma.
--
--   Isso é deliberadamente temporário. A direção final é o inverso: o cadastro de
--   funcionário passa a gravar em `user_tenant_roles` e `user_roles` é removida (PUL-206).
--   Até lá, derivar é o que impede a divergência de crescer todo dia.
--
-- Efeito colateral aceito e documentado:
--   A aba Pessoas da tela de perfis grava direto em `user_tenant_roles`. Um movimento
--   feito por lá é sobrescrito na próxima alteração de `user_roles` da mesma pessoa. É
--   coerente com quem manda hoje (as policies leem `user_roles`), mas significa que mover
--   alguém para um papel CUSTOMIZADO — que não tem equivalente em `app_role` — não
--   sobrevive a uma mexida no cadastro. Papel customizado só passa a ser durável em
--   PUL-201, quando a fonte inverte.

-- 1. A precedência, isolada numa função ----------------------------------------
--
-- Mesma regra do passo 3 do seed: o papel mais abrangente ganha. Extraída para função
-- porque agora tem dois chamadores — o trigger e a reconciliação abaixo — e regra de
-- precedência duplicada é regra que divergirá.
CREATE OR REPLACE FUNCTION public.tenant_role_for_app_roles(_user_id uuid, _tenant_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tr.id
  FROM public.user_roles ur
  JOIN public.tenant_roles tr
    ON tr.tenant_id = ur.tenant_id
   AND tr.name = CASE ur.role
                   WHEN 'admin'   THEN 'Admin'
                   WHEN 'manager' THEN 'Gerente'
                   WHEN 'rh'      THEN 'RH'
                   ELSE 'Colaborador'
                 END
  WHERE ur.user_id = _user_id
    AND ur.tenant_id = _tenant_id
  ORDER BY CASE ur.role
             WHEN 'admin'   THEN 1
             WHEN 'manager' THEN 2
             WHEN 'rh'      THEN 3
             ELSE 4
           END
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.tenant_role_for_app_roles(uuid, uuid) IS
  'Papel de tenant equivalente aos app_role que a pessoa acumula em user_roles, pela '
  'precedencia admin > manager > rh > user. Temporaria: sai com user_roles em PUL-206.';

-- 2. O espelhamento -------------------------------------------------------------
--
-- SECURITY DEFINER de propósito: `user_tenant_roles` tem RLS, e a policy de escrita exige
-- `user_id <> auth.uid()` para barrar auto-promoção. Um admin alterando o PRÓPRIO papel em
-- `user_roles` faria o espelho bater nessa policy e a transação falharia. Sincronização
-- não é ação de usuário — é consequência —, então roda com os privilégios da função.
CREATE OR REPLACE FUNCTION public.mirror_user_roles_to_tenant_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id   uuid;
  _tenant_id uuid;
  _role_id   uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _user_id := OLD.user_id;  _tenant_id := OLD.tenant_id;
  ELSE
    _user_id := NEW.user_id;  _tenant_id := NEW.tenant_id;
  END IF;

  -- Tenant em cascata (removido) não tem o que espelhar.
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RETURN NULL;
  END IF;

  _role_id := public.tenant_role_for_app_roles(_user_id, _tenant_id);

  -- Sem nenhum app_role restante: cai no papel padrão do tenant, não fica sem vínculo.
  -- Ficar sem vínculo é o que deixaria a pessoa sem acesso a nada depois de PUL-201.
  IF _role_id IS NULL THEN
    SELECT id INTO _role_id
    FROM public.tenant_roles
    WHERE tenant_id = _tenant_id AND is_default
    LIMIT 1;
  END IF;

  IF _role_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.user_tenant_roles (user_id, tenant_id, role_id, updated_at, updated_by)
  VALUES (_user_id, _tenant_id, _role_id, now(), NULL)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
    SET role_id    = EXCLUDED.role_id,
        updated_at = now(),
        -- updated_by nulo marca "veio do espelhamento", distinguindo de alteração humana.
        updated_by = NULL
    WHERE public.user_tenant_roles.role_id <> EXCLUDED.role_id;

  -- Acumulação preservada por override, como o passo 4 do seed fazia.
  --
  -- A precedência escolhe UM papel, e o escolhido pode não cobrir tudo que os outros
  -- davam: quem tem `manager` + `rh` vira Gerente, e Gerente não concede as capacidades
  -- de ponto que RH concede. Sem este bloco a pessoa perderia acesso em silêncio — foi
  -- o que o teste do harness pegou.
  --
  -- Em produção hoje as três acumulações existentes são `admin+manager+user`, e Admin é
  -- superconjunto, então nada é gerado. O bloco existe para o caso que ainda não ocorreu.
  DELETE FROM public.user_capability_overrides
  WHERE user_id = _user_id
    AND tenant_id = _tenant_id
    AND reason = 'espelhamento de user_roles (PUL-209)';

  INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
  SELECT DISTINCT _user_id, _tenant_id, rc.capability, true,
         'espelhamento de user_roles (PUL-209)'
  FROM public.user_roles ur
  JOIN public.tenant_roles tr
    ON tr.tenant_id = ur.tenant_id
   AND tr.name = CASE ur.role
                   WHEN 'admin'   THEN 'Admin'
                   WHEN 'manager' THEN 'Gerente'
                   WHEN 'rh'      THEN 'RH'
                   ELSE 'Colaborador'
                 END
  JOIN public.role_capabilities rc ON rc.role_id = tr.id AND rc.enabled
  WHERE ur.user_id = _user_id
    AND ur.tenant_id = _tenant_id
    AND NOT EXISTS (
      SELECT 1 FROM public.role_capabilities chosen
      WHERE chosen.role_id = _role_id
        AND chosen.capability = rc.capability
        AND chosen.enabled
    )
  -- DO NOTHING protege exceção criada por pessoa: ela tem precedência sobre o espelho.
  ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.mirror_user_roles_to_tenant_role() IS
  'Mantem user_tenant_roles derivado de user_roles enquanto os dois coexistem (PUL-209). '
  'updated_by nulo indica origem no espelhamento, nao alteracao humana.';

CREATE TRIGGER trg_user_roles_mirror
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.mirror_user_roles_to_tenant_role();

-- 3. Reconciliação do que já divergiu -------------------------------------------
--
-- Corrige quem está com papel diferente do que `user_roles` indica hoje — incluindo o caso
-- que o relatório de paridade encontrou. Só toca quem realmente diverge.
UPDATE public.user_tenant_roles utr
SET role_id    = esperado.role_id,
    updated_at = now(),
    updated_by = NULL
FROM (
  SELECT utr2.user_id, utr2.tenant_id,
         public.tenant_role_for_app_roles(utr2.user_id, utr2.tenant_id) AS role_id
  FROM public.user_tenant_roles utr2
) AS esperado
WHERE utr.user_id = esperado.user_id
  AND utr.tenant_id = esperado.tenant_id
  AND esperado.role_id IS NOT NULL
  AND utr.role_id <> esperado.role_id;

-- 4. Quem tem conta e ficou sem vínculo ------------------------------------------
--
-- Pessoa cadastrada depois do seed não tem linha em user_tenant_roles se nunca recebeu
-- app_role — e depois de PUL-201 isso significa acesso a nada.
INSERT INTO public.user_tenant_roles (user_id, tenant_id, role_id)
SELECT DISTINCT e.auth_id, e.tenant_id, tr.id
FROM public.employees e
JOIN public.tenant_roles tr ON tr.tenant_id = e.tenant_id AND tr.is_default
WHERE e.auth_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;
