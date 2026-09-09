# ADR 0028: Plano de teste por tenant, autocadastro aberto e bloqueio de teste expirado na RLS

- Status: aceito em 2026-09-09 por Italo Castro (decisões de produto e mecanismo técnico)
- Data: 2026-09-09
- Decisores: Italo Castro (produto); implementação registrada em PUL-224, PUL-227 e PUL-228

## Contexto

O primeiro cliente fora da Origami vai entrar no Pulse. Decisões de produto de 09/09/2026:
qualquer empresa pode se autocadastrar; o tenant nasce em **teste grátis de 14 dias**;
ao fim do teste a empresa fala com italo@origamilab.com.br para continuar; o plano vive
**no banco** como fonte de verdade.

Restrições que moldaram a solução:

- `boundaries.md`: dado sensível é protegido no banco, não na tela; toda mudança de policy
  exige justificativa, teste e ADR; tenant e escopo nunca são configuráveis pelo próprio
  mecanismo de capacidades (ADR-0027, ponto 7).
- O Pulse é uma SPA falando direto com o Postgres pelo JWT do usuário: um bloqueio só na
  tela é contornável por `curl` (lição de PUL-161).
- Não existe painel da Origami sobre tenants; a reativação precisa ser possível por SQL.
- A função `register-tenant` era pública sem qualquer proteção e criava usuário já
  confirmado; a rota `/register` estava desligada desde 06/03 sem motivo registrado.

Alternativas consideradas para o bloqueio pela API:

1. **Predicado de plano em cada policy.** Rejeitada: são dezenas de tabelas; alto custo e
   fácil esquecer uma.
2. **Auth Hook de access token** recusando tenant expirado. Rejeitada por ora: configura-se
   pelo painel, não por migration versionada, e não cobre sessões já emitidas.
3. **Plano dentro dos dois predicados canônicos** (`user_belongs_to_tenant` e
   `has_capability`), que todas as policies já chamam. Escolhida: um ponto de corte,
   versionado, reversível.

## Decisão

1. **Plano no banco** (`20260909120000`): `tenants.plan` (`trial` | `active`),
   `trial_ends_at`, `plan_changed_at`, `plan_changed_by`, com CHECKs. Tenants anteriores à
   migration são `active`. Tenant novo nasce `trial` com 14 dias corridos (trigger
   `tenants_default_trial`). As colunas de plano só mudam por service role ou sessão direta
   no banco (trigger `tenants_guard_plan_columns`); usuário autenticado recebe erro. **Plano
   não é capacidade**: quem libera é a Origami. Reativar = `UPDATE tenants SET plan = 'active',
   trial_ends_at = NULL, plan_changed_by = '<quem>' WHERE id = ...`.
2. **Autocadastro aberto e protegido** (`register-tenant`): corpo validado com zod; honeypot;
   limite por IP (5/h) e por e-mail (3/h) em `signup_attempts` (só hashes, sem policy, 24h);
   e-mail e CNPJ repetidos recusam sem revelar dados de outro tenant; usuário nasce **não
   confirmado** e a confirmação sai pelo SMTP do Auth; falha no meio desfaz tudo. Captcha
   (Turnstile) e constraint única de CNPJ ficam como pendências registradas em PUL-227.
3. **Bloqueio em duas camadas** (`20260909130000`):
   - `tenant_is_active(tenant_id)`: plano `active`, ou `trial` com prazo no futuro.
   - `user_belongs_to_tenant` = pertencimento **e** `tenant_is_active`;
     `has_capability` = `tenant_is_active` **e** a resolução por papel/override. Todas as
     policies herdam o corte; `my_capabilities` devolve vazio para tenant expirado.
   - **Exceções de bootstrap**, para a pessoa ver o fim do teste em vez de um erro seco:
     `employees` já tem policy de leitura da própria linha (`auth_id = auth.uid()`), que não
     usa os predicados; `tenants` passa a ser lida pelo pertencimento puro
     (`user_is_member_of_tenant`).
   - Camada de tela: `ProtectedRoute` redireciona para `/teste-encerrado`; o plano é relido
     do banco a cada carga e nunca entra no snapshot do PWA (mesma lição de PUL-200).

## Consequencias

- Beneficios: um ponto de corte para o plano; tenant expirado não lê nem escreve pela API;
  reativação imediata (próxima carga), sem cache; autocadastro sem fábrica de tenants falsos.
- Custos: cada avaliação de policy ganha uma consulta por PK em `tenants` (função `STABLE`,
  cacheada por statement). **Medição de desempenho antes/depois em consulta de lista grande
  ainda não feita** (sem acesso ao banco de produção nesta sessão) — é prova pendente de
  PUL-228, no mesmo espírito de PUL-200.
- Riscos: service role ignora RLS, então Edge Functions com service role (convite, lembretes
  de timesheet, crons) e os MCPs de saída continuam agindo para tenant expirado até checarem
  `tenant_is_active()` por conta própria; as policies de storage que escrevem o `EXISTS` na
  mão (`20260904275000`) não passam pelos predicados. Ambos registrados em PUL-228.
- Como reverter: recriar `user_belongs_to_tenant` (`20260121002930`) e `has_capability`
  (`20260902130000`) com os corpos anteriores e a policy de `tenants` com
  `user_belongs_to_tenant`; as colunas de plano podem ficar, são inertes sem os predicados.

## Evidencias

- Migrations: `20260909120000_tenant_plan_and_signup_attempts.sql`,
  `20260909130000_tenant_plan_enforced_in_rls.sql`.
- Função: `supabase/functions/register-tenant/index.ts`.
- App: `src/lib/tenantPlan.ts`, `src/contexts/AuthContext.tsx` (`tenantPlan`),
  `src/components/auth/ProtectedRoute.tsx`, `src/pages/TesteEncerrado.tsx`,
  `src/pages/Welcome.tsx`, `src/pages/Register.tsx`.
- Jira: PUL-223 (épico), PUL-224, PUL-227, PUL-228.
- Matriz: `.harness/capability-matrix.md`, seção 9 ("plano do tenant não é capacidade").
