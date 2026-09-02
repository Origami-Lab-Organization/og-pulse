-- PUL-200 / PUL-209 (ADR-0027) — seed do ESTADO ATUAL: o dia 1 é idêntico ao dia 0.
--
-- Este seed reproduz o comportamento vigente, **divergências incluídas** — inclusive as
-- que .harness/capability-matrix.md aponta como provavelmente indesejadas (D1: gerente lê
-- remuneração individual). Isso é deliberado: se a migração de mecanismo carregasse
-- também correção de política, uma falha de acesso em produção ficaria sem diagnóstico —
-- não se saberia se o mecanismo quebrou ou se a regra mudou.
--
-- As correções vêm depois, como toggle, uma a uma, com autor e data (decisão 8 do
-- ADR-0027). Elas dependem das respostas P1–P6 do negócio.
--
-- Três regras de transcrição, porque a matriz tem células que não são booleanas:
--
--   1. Célula com ESCOPO (`PM`, `alocado`) vira `enabled = true`. Escopo é relação com o
--      registro e continua na policy (can_manage_project, alocação) — nunca entra em
--      role_capabilities, que não tem como expressá-lo (decisão 7 do ADR-0027).
--
--   2. Célula `proprio` vira `enabled = false` quando a capacidade trata de dado de
--      TERCEIROS: ler a própria remuneração ou a própria ficha vem de ownership na policy
--      ("Employees can view own record"), não de capacidade. Concedê-la daria ao
--      colaborador a capacidade de ler remuneração, e o "só a própria" passaria a
--      depender apenas do escopo. Exceção: capacidade cujo nome já é sobre o próprio
--      (`ponto:ler-proprio`, `timesheet-proprio:apontar`, `ferias:solicitar`) — essas são
--      `true` para todos.
--
--   3. Célula marcada com `!` segue o PREDICADO VIGENTE (coluna da direita da matriz), não
--      o desejado. Ex.: margem:ler-detalhe-mao-de-obra fica true para Gerente porque a RLS
--      libera a qualquer gerente; a restrição a PM existe só na UI (D8) e continua lá, o
--      que a decisão 5 do ADR permite quando declarado.
--
-- Nada aqui altera policy: as tabelas semeadas só passam a valer quando PUL-201 troca o
-- predicado, e só depois da paridade (PUL-209).

-- 1. Papéis por tenant ----------------------------------------------------------
--
-- Os 4 papéis equivalentes ao enum app_role atual. Se P1 responder que o negócio quer
-- diretor/comercial/financeiro, eles entram como papéis novos — sem migration, pela tela
-- da PUL-204. É justamente o que este modelo compra.
INSERT INTO public.tenant_roles (tenant_id, name, is_default)
SELECT t.id, r.name, r.is_default
FROM public.tenants t
CROSS JOIN (VALUES
  ('Admin',        false),
  ('Gerente',      false),
  ('RH',           false),
  ('Colaborador',  true)
) AS r(name, is_default)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- 2. Matriz papel × capacidade --------------------------------------------------
--
-- Só as habilitadas entram. Ausência = nega, por COALESCE em has_capability, então não é
-- preciso materializar 48 × 4 linhas para representar o estado atual.
INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT tr.id, m.capability, true
FROM public.tenant_roles tr
JOIN (VALUES
  -- ADMIN: todas as capacidades (a matriz dá "sim" para admin em todas as linhas)
  ('Admin', NULL::text),

  -- GERENTE
  ('Gerente', 'financeiro:ler'),
  ('Gerente', 'financeiro:editar'),                    -- escopo PM, na policy
  ('Gerente', 'margem:ler'),
  ('Gerente', 'margem:ler-detalhe-mao-de-obra'),       -- D8: RLS libera; UI restringe a PM
  ('Gerente', 'horas-projeto:ler'),
  ('Gerente', 'custo-hora:ler'),                       -- desvio deliberado do PUL-165 (P6)
  ('Gerente', 'remuneracao-pessoa:ler'),               -- D1: provavelmente indesejado (P3)
  ('Gerente', 'remuneracao-pessoa:editar'),            -- D1
  ('Gerente', 'parametro-folha:ler'),                  -- P6
  ('Gerente', 'pessoa:ler-identidade'),
  ('Gerente', 'pessoa:ler-ficha-completa'),            -- D1
  ('Gerente', 'pessoa:editar'),
  ('Gerente', 'desligamento:executar'),
  ('Gerente', 'pipeline:ler'),
  ('Gerente', 'pipeline:editar'),
  ('Gerente', 'orcamento:ler'),
  ('Gerente', 'orcamento:editar'),
  ('Gerente', 'catalogo:ler'),
  ('Gerente', 'catalogo:editar'),
  ('Gerente', 'cliente:ler'),
  ('Gerente', 'cliente:editar'),
  ('Gerente', 'projeto:ler'),
  ('Gerente', 'projeto:editar'),                       -- escopo PM
  ('Gerente', 'portfolio:ler'),
  ('Gerente', 'alocacao:ler'),
  ('Gerente', 'alocacao:editar'),                      -- escopo PM
  ('Gerente', 'arquivo-projeto:ler'),
  ('Gerente', 'timesheet-proprio:apontar'),
  ('Gerente', 'timesheet-terceiro:ler'),
  ('Gerente', 'ponto:ler-proprio'),
  ('Gerente', 'ferias:solicitar'),
  ('Gerente', 'ferias:aprovar'),                       -- escopo: gestor designado, na policy
  ('Gerente', 'ferias:gerir'),
  ('Gerente', 'vaga:editar'),
  ('Gerente', 'candidatura:ler'),
  ('Gerente', 'curriculo:ler'),
  ('Gerente', 'iniciativa:editar'),
  -- Gerente NÃO tem: folha:ler, custo-hora:ler-relatorio, pessoa:editar-papel,
  -- pessoa:editar-elegibilidade-alocacao, ponto:ler-terceiro (a RLS de ponto não inclui
  -- gerente), ponto:aprovar, ponto:ler-relatorio, ponto:auditar, ponto:configurar,
  -- okr:editar, guardrail-estrategia:editar

  -- RH: hoje a RLS só o alcança em recrutamento e ponto (divergências D4 e D5)
  ('RH', 'pessoa:ler-identidade'),
  ('RH', 'catalogo:ler'),
  ('RH', 'timesheet-proprio:apontar'),
  ('RH', 'ponto:ler-proprio'),
  ('RH', 'ponto:ler-terceiro'),
  ('RH', 'ponto:ler-relatorio'),
  ('RH', 'ponto:auditar'),
  ('RH', 'ferias:solicitar'),
  ('RH', 'vaga:editar'),
  ('RH', 'candidatura:ler'),
  ('RH', 'curriculo:ler'),

  -- COLABORADOR
  ('Colaborador', 'pessoa:ler-identidade'),
  ('Colaborador', 'catalogo:ler'),
  ('Colaborador', 'projeto:ler'),                      -- escopo: alocado (D7)
  ('Colaborador', 'horas-projeto:ler'),                -- escopo: alocado
  ('Colaborador', 'arquivo-projeto:ler'),              -- escopo: alocado
  ('Colaborador', 'timesheet-proprio:apontar'),
  ('Colaborador', 'ponto:ler-proprio'),
  ('Colaborador', 'ferias:solicitar')
  -- Colaborador NÃO tem, por serem `proprio` em capacidade de dado de terceiros (regra 2):
  -- remuneracao-pessoa:ler, pessoa:ler-ficha-completa, pessoa:editar, alocacao:ler
) AS m(role_name, capability) ON m.role_name = tr.name
WHERE m.capability IS NOT NULL
ON CONFLICT (role_id, capability) DO NOTHING;

-- Admin recebe o vocabulário inteiro
INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT tr.id, c.key, true
FROM public.tenant_roles tr
CROSS JOIN public.capabilities c
WHERE tr.name = 'Admin'
ON CONFLICT (role_id, capability) DO NOTHING;

-- 3. Papel de cada pessoa -------------------------------------------------------
--
-- user_roles permite N papéis por pessoa; o modelo novo tem UM. Onde há acumulação, a
-- precedência escolhe o mais abrangente — e o passo 4 devolve por override o que o papel
-- escolhido não cobre, para que ninguém perca acesso.
INSERT INTO public.user_tenant_roles (user_id, tenant_id, role_id)
SELECT DISTINCT ON (ur.user_id, ur.tenant_id)
       ur.user_id, ur.tenant_id, tr.id
FROM public.user_roles ur
JOIN public.tenant_roles tr
  ON tr.tenant_id = ur.tenant_id
 AND tr.name = CASE ur.role
                 WHEN 'admin'   THEN 'Admin'
                 WHEN 'manager' THEN 'Gerente'
                 WHEN 'rh'      THEN 'RH'
                 ELSE 'Colaborador'
               END
ORDER BY ur.user_id, ur.tenant_id,
         CASE ur.role WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 WHEN 'rh' THEN 3 ELSE 4 END
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 4. Acumulação de papéis preservada por override -------------------------------
--
-- Quem hoje tem manager E rh recebeu "Gerente" pela precedência, e Gerente não cobre
-- ponto:ler-terceiro nem ponto:auditar (que RH cobre). Sem este passo, essa pessoa
-- perderia acesso na migração — exatamente o que o princípio "dia 1 = dia 0" proíbe.
--
-- É também o uso legítimo do override descrito no ADR-0027: exceção sobre uma base
-- declarada. Se o resultado mostrar muita gente com o mesmo conjunto de overrides, falta
-- um papel — e a correção é criar o papel, não normalizar a exceção.
WITH tinha AS (
  -- capacidades de TODOS os papéis que a pessoa acumulava
  SELECT DISTINCT ur.user_id, ur.tenant_id, rc.capability
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
),
tem AS (
  -- capacidades do papel único que ficou
  SELECT utr.user_id, utr.tenant_id, rc.capability
  FROM public.user_tenant_roles utr
  JOIN public.role_capabilities rc ON rc.role_id = utr.role_id AND rc.enabled
)
INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT t.user_id, t.tenant_id, t.capability, true,
       'seed PUL-200: acumulacao de papeis em user_roles preservada (dia 1 = dia 0)'
FROM tinha t
WHERE NOT EXISTS (
  SELECT 1 FROM tem
  WHERE tem.user_id = t.user_id AND tem.tenant_id = t.tenant_id AND tem.capability = t.capability
)
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

-- 5. Pessoa sem papel em user_roles ---------------------------------------------
--
-- Quem tem employee ativo e nenhuma linha em user_roles hoje cai no `else` de qualquer
-- checagem, ou seja opera como colaborador comum. Recebe o papel padrão, para não ficar
-- sem vínculo quando PUL-201 virar o predicado.
INSERT INTO public.user_tenant_roles (user_id, tenant_id, role_id)
SELECT DISTINCT e.auth_id, e.tenant_id, tr.id
FROM public.employees e
JOIN public.tenant_roles tr ON tr.tenant_id = e.tenant_id AND tr.is_default
WHERE e.auth_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;
