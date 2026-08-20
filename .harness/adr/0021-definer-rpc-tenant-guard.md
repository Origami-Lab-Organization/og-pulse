# ADR 0021: RPC SECURITY DEFINER valida o tenant do chamador em ponto único

- Status: aceito
- Data: 2026-08-17
- Decisores: Origami Lab / operacao interna

## Contexto

Funcao `SECURITY DEFINER` roda com privilegio do dono e **ignora RLS**. No Postgres,
`EXECUTE` e concedido a `PUBLIC` por padrao, e o PostgREST expoe toda funcao do schema
`public` como RPC. Logo, funcao definer que recebe `p_tenant_id` do cliente e nao
valida quem chamou permite trocar o UUID no payload e operar sobre outra empresa.

A varredura das 63 funcoes definer encontrou 10 que recebem tenant por parametro sem
validar o chamador. Classificando pelo que cada uma faz:

- **Vazamento real de leitura**: `get_crm_received_value` (soma de parcelas recebidas
  em R$), `get_allocation_employee_month_summary` (carga e capacidade por pessoa).
- **Escrita cross-tenant**: `apply_absence_period` — registra falta/abono. Era
  alcancavel por qualquer autenticado.
- **Baixo impacto, mas sem motivo para estar exposto**: `count_employee_cost_business_days`.
- **Numeracao**: `generate_budget_number`.
- **Helpers de policy** (`has_role`, `is_manager_in_tenant`, `project_child_tenant_matches`):
  recebem o usuario como parametro e respondem um booleano sobre ele. Nao devolvem dado
  e sao usados dentro das proprias policies — adicionar checagem de chamador seria
  circular. Mantidos como estao.

Duas afirmacoes da historia original (PUL-163) se mostraram incorretas na verificacao
e ficam registradas para nao se repetirem:

1. `get_allocation_employee_detail` **nao** e `SECURITY DEFINER` — e `SECURITY INVOKER`.
   RLS se aplica normalmente a ela, entao nao havia vazamento cross-tenant. Nao foi
   alterada. A confusao veio de contar ocorrencias de "SECURITY DEFINER" no arquivo da
   migration em vez de na clausula da funcao.
2. `get_employee_status` recebe `p_auth_id` (nao tenant) e devolvia o status de
   qualquer employee. Passa a exigir `p_auth_id = auth.uid()`.

## Decisao

**Ponto unico de negacao.** `assert_tenant_access(p_tenant_id)` falha com `42501`
quando `auth.uid()` nao pertence ao tenant, e com `22023` quando o tenant e nulo.
Negacao explicita, nao retorno vazio silencioso.

**Corpo original preservado por rename + wrapper.** As funcoes de leitura chamadas
pelo frontend tem corpos de 180 a 220 linhas com CTEs. Em vez de reescreve-los, cada
uma e renomeada para `*_unguarded` (revogada de `PUBLIC`) e a funcao publica passa a
ser um wrapper que valida e delega. Isso elimina dois riscos: erro de transcricao, e
a ambiguidade que surge ao converter `LANGUAGE sql ... RETURNS TABLE` para plpgsql,
onde as colunas do `RETURNS TABLE` viram variaveis e colidem com nomes de coluna do
proprio SELECT. As assinaturas publicas ficam identicas — **nenhuma alteracao no
frontend**.

Os blocos de rename usam `DO ... IF NOT EXISTS` para a migration ser reexecutavel.

**Funcoes internas saem de `PUBLIC`.** `apply_absence_period` e
`count_employee_cost_business_days` nao sao chamadas pelo cliente; seus chamadores
legitimos (Edge Functions com service role, triggers e outras funcoes) sao todos
`SECURITY DEFINER`, e portanto nao dependem do privilegio de `PUBLIC`.

**Escopo deliberadamente limitado ao tenant.** Nas RPCs de alocacao valida-se apenas
o pertencimento ao tenant. Nao se adiciona escopo por gerente ou projeto: a tela Meu
Time (ADR-0020 / PUL-170) depende de ler a carga total da pessoa, inclusive em
projetos de outros GPs, para nao sobre-alocar quem ja esta cheio. Cross-tenant e
vazamento; cross-projeto dentro do mesmo tenant e requisito de produto.

## Consequencias

- Beneficios:
  - Fecha leitura financeira e de alocacao cross-tenant e uma **escrita**
    cross-tenant (`apply_absence_period`), mitigando OWASP A01.
  - A validacao vira um unico ponto auditavel; nova RPC definer que receba tenant so
    precisa de uma linha (`PERFORM public.assert_tenant_access(...)`).
  - Nenhuma mudanca de contrato: assinaturas e tipos de retorno preservados.
- Custos:
  - Uma chamada a `user_belongs_to_tenant` por invocacao das funcoes guardadas.
    Irrelevante nelas, que sao chamadas poucas vezes por tela.
  - Passa a existir o sufixo `*_unguarded` no schema. Quem for alterar a logica
    dessas funcoes deve editar a `_unguarded`, nao o wrapper.
- Riscos:
  - Se algum consumidor nao mapeado chamar uma RPC guardada com tenant diferente do
    proprio, passa a receber erro 42501 em vez de dado. A varredura cobriu
    `src/` e `supabase/functions/`; Edge Functions com service role tem
    `auth.uid()` nulo e por isso **serao negadas** se chamarem as guardadas — nenhuma
    chama hoje, mas e um ponto de atencao para codigo futuro.
- Como reverter:
  - Para cada funcao: `DROP` do wrapper e `ALTER FUNCTION *_unguarded RENAME TO`
    nome original, restaurando `GRANT EXECUTE ... TO authenticated`.

## Residuo conhecido

`calculate_employee_hourly_cost_for_month(p_tenant_id, p_employee_id, p_month_start)`
tambem e definer, recebe tenant e devolve **custo/hora** de um colaborador. Nao foi
tratada nesta migration, por dois motivos concretos:

1. `simulate_allocation_margin_impact` e `SECURITY INVOKER` e a chama a partir do
   frontend. Revogar de `PUBLIC` quebraria o painel de impacto na margem.
2. Guardar por dentro exige guarda condicional: a funcao roda em trigger durante
   escrita do usuario (`auth.uid()` presente) e em cron/service role (`auth.uid()`
   nulo, que uma guarda estrita negaria). Alem disso e chamada por linha em
   recalculos em lote, onde um `user_belongs_to_tenant` por chamada tem custo.

Alternativa avaliada: tornar `simulate_allocation_margin_impact` definer com guarda
propria e entao revogar a funcao de custo. Muda o modo de seguranca de uma funcao que
hoje depende de RLS, o que exige decisao explicita — pendente com o time.

## Evidencias

- Migration: `supabase/migrations/20260817210000_definer_rpc_tenant_guard.sql`
- Jira: PUL-163 (epico PUL-161), com a ressalva herdada da PUL-172
- Relacionado: ADR-0020 (identidade por diretorio), PUL-164 (financeiro de projeto)
- Verificacao executada: nenhuma mudanca de frontend foi necessaria (assinaturas
  preservadas); `npx tsc --noEmit`, `npx eslint` e `npm run build` sem regressao.
- Prova pendente: teste negativo em banco (chamada com tenant alheio retorna 42501)
  depende de ambiente Supabase local, hoje bloqueado — ver TD do `supabase start`.
