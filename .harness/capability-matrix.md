# Matriz de Perfis x Capacidades

- Status: **proposta — aguarda revisao do negocio**
- Data: 2026-09-02
- Epico: PUL-198
- Decisao de arquitetura: `.harness/adr/0027-capacidade-derivada-de-papel.md`

## Como ler

Esta e a resposta canonica para "quem ve custo?", "quem ve salario?", "quem edita
catalogo?". Nao consulte codigo nem migration para responder isso: consulte esta
tabela. Se a tabela e o codigo divergirem, um dos dois esta errado e a divergencia
esta na secao "Divergencias matriz x policies vigentes".

### Duas leituras, que nao podem se misturar

Esta matriz descreve **o estado atual** — o que as policies fazem hoje, divergencias
inclusive. Nessa leitura ela e o **seed** do modelo de capacidades (ADR-0027): vai para o
banco exatamente como esta, mesmo onde esta errado, para que a migracao possa ser provada
equivalente ao comportamento vigente (PUL-209).

O **estado desejado** — o que o negocio decidir nas pendencias P1 a P6 — nao entra no
seed. Vira **toggle aplicado depois** da virada, um a um, com autor e data.

Misturar as duas leituras torna impossivel diagnosticar uma falha de acesso: nao se sabe
se o mecanismo quebrou ou se a regra mudou. Excecao unica: **D6**, violacao de boundary,
corrigida em trilha propria (PUL-207).

### Perfis (colunas)

Perfis de sistema vem do enum `app_role` (`user_roles.role`):

| Coluna | `app_role` | Quem e |
|---|---|---|
| **Admin** | `admin` | Responsavel pela operacao e pelos numeros da empresa |
| **Gerente** | `manager` | Conduz projetos e time; ve o portfolio inteiro |
| **RH** | `rh` | Recrutamento, ponto e pessoas |
| **Colab.** | `user` | Colaborador sem perfil de gestao |

**PM nao e coluna.** PM e relacao com o registro (`projects.manager_id`), nao perfil
de sistema. Onde o PM muda a resposta, o escopo aparece na celula como `PM`. Ver
decisao pendente **P2**.

### Escopos (celulas)

| Simbolo | Significado |
|---|---|
| `sim` | Sim, no tenant inteiro |
| `—` | Nao |
| `proprio` | Apenas o proprio registro / os proprios dados |
| `PM` | Apenas projetos onde e `projects.manager_id` |
| `alocado` | Apenas projetos onde esta alocado |
| `!` | Divergencia entre esta matriz e a policy vigente — ver secao de divergencias |

---

## 1. Financeiro de projeto

| Capacidade | Admin | Gerente | RH | Colab. | Predicado vigente |
|---|---|---|---|---|---|
| `financeiro:ler` — custo, comissao, parcela, fornecedor | sim | sim | — | — | `is_admin_or_manager` (ADR-0022) |
| `financeiro:editar` | sim | PM | — | — | `can_manage_project` (ADR-0002) |
| `margem:ler` | sim | sim | — | — | derivado de `financeiro:ler` |
| `margem:ler-detalhe-mao-de-obra` | sim | PM `!` | — | — | UI: `canSeeLaborBreakdown`; RLS permite a qualquer gerente — **D8** |
| `horas-projeto:ler` | sim | sim | — | alocado | `can_read_project_hours` |
| `custo-hora:ler` — `role_rates`, `financial_settings` | sim | sim `!` | — | — | `is_admin_or_manager` — desvio do PUL-165, ver **P6** |
| `custo-hora:ler` — tela `/analises/custo-hora` | sim | — | — | — | rota `requireAdmin` |

## 2. Folha e remuneracao

| Capacidade | Admin | Gerente | RH | Colab. | Predicado vigente |
|---|---|---|---|---|---|
| `folha:ler` — tela `/analises/folha-pagamento` | sim | — | — | — | rota `requireAdmin` |
| `remuneracao-pessoa:ler` — `salario_mensal`, `pro_labore`, `dividendos` | sim | **sim** `!` | — | proprio | policy de linha em `employees` — **D1**, ver **P3** |
| `remuneracao-pessoa:editar` | sim | sim `!` | — | — | `has_role('admin') OR is_manager_in_tenant` — **D1** |
| `parametro-folha:ler` — `payroll_profiles` | sim | sim `!` | — | — | `is_admin_or_manager` — ver **P6** |

## 3. Pessoas

| Capacidade | Admin | Gerente | RH | Colab. | Predicado vigente |
|---|---|---|---|---|---|
| `pessoa:ler-identidade` — nome, cargo, foto | sim | sim | sim | sim | `get_employee_directory()` (ADR-0020) |
| `pessoa:ler-ficha-completa` — CPF, nascimento, banco/PIX | sim | sim `!` | — `!` | proprio | policy de linha — **D1**, **D4** |
| `pessoa:editar` | sim | sim | — `!` | proprio (campos seguros) | **D4** |
| `pessoa:editar-papel` — `system_role`, `user_roles` | sim | — | — | — | trigger `prevent_employee_self_escalation` |
| `pessoa:editar-elegibilidade-alocacao` | sim | — | — | — | trigger `enforce_aloca_em_projetos_admin_only` (ADR-0010) |
| `pessoa:administrar` — admitir, excluir, beneficio/ferramenta da pessoa, versao, desligar | sim | — | — | — | `has_role('admin')` em `employees` I/D, `employee_benefits`, `employee_tools`, `employee_versions`, `employee_terminations`, `payroll_adjustments`, `termination_documents` — capacidade criada no grupo 5b (TD-0019) |
| `desligamento:executar` — `/rh/desligamentos` | sim | sim | — `!` | — | rota `requireManager` — **D4** |

## 4. Pipeline e comercial

| Capacidade | Admin | Gerente | RH | Colab. | Predicado vigente |
|---|---|---|---|---|---|
| `pipeline:ler` | sim | sim | — | — | `is_admin_or_manager` (ADR-0023) |
| `pipeline:editar` — follow-up, interacao, servico da oportunidade | sim | sim | — | — | `is_admin_or_manager` (ADR-0023) |
| `orcamento:ler` | sim | sim | — | — | `is_admin_or_manager` (ADR-0023) |
| `orcamento:editar` | sim | sim | — | — | `is_admin_or_manager` (ADR-0023) |
| `catalogo:ler` — servicos, linhas de servico | sim | sim | sim | sim | SELECT tenant-wide **de proposito** (ADR-0023) |
| `catalogo:editar` | sim | sim | — | — | `is_admin_or_manager` (ADR-0023) |
| `cliente:ler` / `cliente:editar` | sim | sim | — | — | rota `requireManager` |

## 5. Projeto, portfolio e alocacao

| Capacidade | Admin | Gerente | RH | Colab. | Predicado vigente |
|---|---|---|---|---|---|
| `projeto:ler` | sim | sim | — | alocado `!` | `/projects/:id` sem guard de perfil — **D7** |
| `projeto:editar` | sim | PM | — | — | `can_manage_project` (ADR-0002) |
| `portfolio:ler` | sim | sim | — | — | rota `requireManager` (ADR-0002) |
| `alocacao:ler` | sim | sim | — | proprio | rota `requireManager` |
| `alocacao:editar` | sim | PM | — | — | `can_manage_project` (ADR-0003) |
| `arquivo-projeto:ler` | sim | sim | — | alocado | `can_view_project_document` |

## 6. Timesheet, ponto e ferias

| Capacidade | Admin | Gerente | RH | Colab. | Predicado vigente |
|---|---|---|---|---|---|
| `timesheet-proprio:apontar` | sim | sim | sim | sim | `/my-timesheet` sem guard |
| `timesheet-terceiro:ler` — `/analises/meu-time` | sim | sim | — | — | rota `requireManager` |
| `ponto:ler-proprio` — marcacao, resumo diario, banco de horas | sim | sim | sim | proprio | `e.auth_id = auth.uid()` |
| `ponto:ler-terceiro` | sim | **—** | sim | — | `has_role('admin') OR has_role('rh')` — **gerente nao entra** |
| `ponto:aprovar` | sim | — | — | — | rota `requireAdmin` |
| `ponto:relatorio:ler` | sim | — | sim | — | rota `requireRH` + RLS concede a `rh` |
| `ponto:auditar` | sim | — | sim | — | `time_tracking_audit_log_select_admin_rh` |
| `ponto:configurar` | sim | — | — | — | `time_tracking_settings_write_admin` |
| `ponto:travar-periodo` — fechar e reabrir competencia | sim | — | sim | — | `time_tracking_period_locks_write_admin_rh` — capacidade criada no grupo 5c (TD-0019) |
| `ferias:solicitar` | sim | sim | sim | sim | proprio registro |
| `ferias:aprovar` | sim | gestor designado | — | — | `is_vacation_approver` (ADR-0003 vacation) |
| `ferias:gerir` — `/rh/ferias` | sim | sim | — `!` | — | rota `requireManager` — **D4** |

## 7. Recrutamento

| Capacidade | Admin | Gerente | RH | Colab. | Predicado vigente |
|---|---|---|---|---|---|
| `vaga:editar` | sim | sim | sim `!` | — | RLS concede a `rh`; rota `/rh/vagas` e `requireManager` — **D5** |
| `candidatura:ler` | sim | sim | sim `!` | — | RLS concede a `rh`; rota `/rh/candidatos` e `requireManager` — **D5** |
| `curriculo:ler` | sim | sim | sim | — | policy **sem filtro de tenant** — **D6** |

## 8. Estrategia

| Capacidade | Admin | Gerente | RH | Colab. | Predicado vigente |
|---|---|---|---|---|---|
| `okr:editar` | sim | — | — | — | `canManageOkrs = isAdmin` |
| `iniciativa:editar` | sim | sim | — | — | `canManageInitiatives` (ADR-0001) |
| `guardrail-estrategia:editar` | sim | — | — | — | `strategy_guardrails_*_admin` (ADR-0023) |

## 9. Configuracao da empresa

Dominio criado no grupo 5 da virada (PUL-201 / TD-0019). A matriz nasceu forte em LEITURA
e quase muda em ESCRITA: 37 policies `has_role('admin')` nao tinham capacidade que as
representasse sem alargar acesso, porque `pessoa:editar` e `catalogo:editar` sao
Admin + Gerente. Faltava vocabulario, nao mecanismo.

| Capacidade | Admin | Gerente | RH | Colab. | Predicado vigente |
|---|---|---|---|---|---|
| `configuracao:editar` — encargos e perfil de folha, tabela de precos por cargo, config. financeira, feriados, beneficios e ferramentas do catalogo, modelos de receita, dados da empresa | sim | — | — | — | `has_role('admin')` em `payroll_profiles`, `role_rates`, `financial_settings`, `company_holidays`, `benefits`, `tools`, `service_revenue_models`, `tenants` UPDATE |

Nao entra aqui, de proposito: **governanca do proprio mecanismo** (`tenant_roles`,
`role_capabilities`, `user_tenant_roles`, `user_capability_overrides`, `user_roles`)
continua em `has_role('admin')`. Quem administra o mecanismo de capacidade nao deve ser
decidido pelo proprio mecanismo — configuracao ruim trancaria o tenant fora da propria
administracao, e a invariante do ultimo administrador cobre so `pessoa:editar-papel`. E o
mesmo raciocinio do ponto 7 do ADR-0027 (escopo e tenant nunca sao configuraveis).

---

## Cenario 1 — respostas diretas, sem abrir codigo

- **"Gerente ve margem de projeto que nao e dele?"** → **Sim.** Decidido em ADR-0022:
  restringir a leitura ao PM faria os analytics financeiros sub-reportarem
  silenciosamente. Gerente **le** o portfolio inteiro e **edita** apenas onde e PM.
- **"Gerente ve salario de colega?"** → **Hoje sim, pela API.** Nao e decisao — e a
  divergencia **D1**. Precisa da resposta do negocio (**P3**).
- **"Colaborador comum abre um projeto e ve custo?"** → **Nao.** Le o projeto, e o
  financeiro volta vazio (ADR-0022).
- **"RH edita ficha de funcionario?"** → **Nao, pela RLS de hoje.** RH so existe em
  recrutamento. Divergencia **D4**.

---

## Divergencias matriz x policies vigentes (Cenario 2)

Cada item vira ajuste de policy ou correcao desta matriz. Nenhum se resolve sozinho.

### D1 — Gerente le remuneracao e dado pessoal de qualquer pessoa (severidade: alta)

`"Admins and managers can view all employees in tenant"` (`20260301031026`) aprova a
**linha inteira** de `employees`. RLS e row-level: aprovado o `USING`, toda coluna fica
legivel — `salario_mensal`, `salario_liquido`, `pro_labore`, `dividendos`,
`total_monthly_cost_estimated`, `cpf`, `data_nascimento`, dados bancarios/PIX.

Enquanto isso a UI trata folha como exclusiva de admin: `/analises/folha-pagamento` e
`/analises/custo-hora` sao `requireAdmin`, e o item "Folha de Pagamento" do menu e
`requiresAdmin: true`. ADR-0020 fechou o vazamento para **co-membro de projeto** e
registrou de forma explicita que admin e gerente continuam lendo a linha inteira.

→ Se a resposta de **P3** for "gerente nao ve salario", o mecanismo ja existe no
projeto: projecao fixa via funcao `SECURITY DEFINER`, como `get_employee_directory()`.
Policy de linha nao sabe limitar coluna.

### D2 — `is_manager_in_tenant` nao e o que o nome diz (severidade: media)

Desde `20260331013008` seu corpo e **identico** a `is_admin_or_manager`:
`user_roles.role IN ('admin','manager')`. Quando a policy de `employees` foi escrita
(`20260301031026`), o corpo era `employees.is_gerente = true`. O predicado mudou por
baixo da policy, sem a policy mudar de nome.

→ Consolidar em um nome unico. Duas funcoes com o mesmo corpo e nomes que sugerem
recortes diferentes e armadilha de leitura para a onda inteira.

### D3 — Tres fontes de papel concorrentes, sem sincronia provada (severidade: alta)

| Fonte | Valores | Quem le |
|---|---|---|
| `user_roles.role` (`app_role`) | `admin`, `manager`, `rh`, `user` | `has_role`, `is_admin_or_manager`, `AuthContext` |
| `employees.system_role` (text) | `admin`, `manager`, `user` — **sem `rh`** | leitura de tela, versionamento |
| `employees.is_gerente` (boolean) | `true` / `false` | policies de reembolso, trigger de candidatura |

`is_gerente` continua sendo lido inline por `20260319150000` (reembolso) e pelo trigger
`notify_managers_new_job_application` (`20260325130000`). Um usuario `manager` em
`user_roles` com `is_gerente = false` **nao e notificado** de nova candidatura.

→ Esta e exatamente a flag booleana por usuario que o ADR-0027 recusa. Ela ja existe:
o ADR precisa registrar o plano de remocao, nao apenas a proibicao.


**Atualizacao 2026-09-04 (PUL-203):** duas das tres fontes deixaram de ser graváveis de
forma independente. `employees.system_role` e `employees.is_gerente` passaram a ser
DERIVADAS de `user_roles` por trigger, com precedencia admin > manager > user, e escrita
direta nessas colunas e ignorada por desenho — inclusive por script ou SQL na mao. A
reconciliacao corrigiu a divergencia que existia em producao (uma pessoa exibida como
`manager` com `admin` em `user_roles`) e normalizou cadastro sem conta que aparecia como
`admin`. Resta UMA fonte gravavel (`user_roles`), que a fase de contracao (PUL-206)
substitui por `user_tenant_roles`. O bug de notificacao de candidatura descrito abaixo
deixa de ser possivel: `is_gerente` nao pode mais ficar `false` para quem e `manager`.

### D4 — RH nao existe na RLS de pessoas nem de folha (severidade: media)

`rh` aparece em **duas** areas, ambas coerentes com a UI:

- **Recrutamento**: `job_openings` (escrita), `job_applications` (leitura/edicao),
  bucket `curriculos` (leitura).
- **Ponto eletronico**: `time_entries`, `time_daily_summary`, `time_bank_ledger` e
  `time_tracking_audit_log` concedem a `rh` por `has_role(auth.uid(), tenant_id, 'rh')`
  (`20260716120100`). As telas `requireRH` (`/jornada/relatorios`, `/jornada/auditoria`)
  **funcionam** para RH sem perfil de gerente — nao ha divergencia aqui.

O que **falta** a `rh` e acesso a `employees` (ficha de pessoa) e a folha. A UI
acompanha: `/rh/desligamentos`, `/rh/ferias` e `/employees/*` sao `requireManager`, nao
`requireRH`. Ou seja, hoje **RH nao gere pessoas** — gere recrutamento e ponto.

Achado colateral, mais relevante que a divergencia: **gerente nao le ponto de ninguem**
alem do proprio. `manager` nao aparece em nenhuma policy de ponto. Ponto e o unico
dominio onde `rh` e primeiro-classe e `manager` nao entra.

→ Isso e decisao implicita, nao defeito. **P5** precisa confirma-la: RH continua fora de
pessoas e folha? Gerente continua fora de ponto?

### D5 — Rotas de recrutamento bloqueiam RH (severidade: media)

`/rh/candidatos` e `/rh/vagas` sao `requireManager`. A RLS de `job_applications` e
`job_openings` concede a `rh`. RH puro tem permissao no banco e e barrado na tela — o
inverso do problema usual.

### D6 — Policy de curriculos nao filtra tenant (severidade: alta, boundary)

`"Recruiters can read curriculos"` (`20260817230000`) checa
`user_roles.role IN ('admin','manager','rh')` **sem `tenant_id`** e sem restricao de
path. Admin, gerente ou RH de um tenant le curriculo de candidato de **qualquer outro
tenant**. Todas as policies vizinhas da mesma migration carregam o predicado com tenant.

→ Viola `boundaries.md` ("Nao expor dados entre tenants"). Correcao independe da matriz
e nao deveria esperar a onda.

### D7 — `/projects/:id` nao tem guard de perfil (severidade: baixa — decidido)

Rota usa `ProtectedRoute` puro. A protecao do financeiro e a RLS (ADR-0022) mais
condicional de componente. Consistente com a decisao, mas a matriz precisa registrar
que `projeto:ler` para colaborador e "sim, com financeiro vazio" — nao "nao".

### D8 — UI de custo e mais restritiva que a RLS (severidade: baixa — intencional)

`ProjectCostsTab` esconde o detalhe de mao de obra com
`canSeeLaborBreakdown = isAdmin || project.manager_id === employee?.id`, enquanto a RLS
libera a qualquer gerente do tenant.

→ Aceitavel como UX, mas precisa estar na matriz: sem isso, a proxima historia "corrige"
a tela achando que e bug.

### D9 — PM e papel de projeto, nao perfil (severidade: estrutural)

`can_manage_project` usa `projects.manager_id`; `is_project_team_member` usa
`project_role_allocations` com fallback legado em `project_members` (ADR-0006).
Nenhum dos dois passa por `user_roles`.

→ Se **P2** virar "PM e perfil global", o recorte da onda inteira muda.

### D10 — Reembolso: policies vivas para modulo removido (severidade: baixa)

ADR-0007 removeu reembolsos do produto; nao existe `DROP TABLE`. As policies de
`20260319150000` seguem no ar lendo `employees.is_gerente`, e `20260817230000` registrou
a decisao de nao mexer ("tabela vestigial").

→ Sem linha de reembolso nesta matriz. O debito e remover a tabela.

---

## Decisoes pendentes do negocio

Sem estas respostas, as historias seguintes implementam vocabulario chutado.

| # | Pergunta | Impacto se ficar sem resposta |
|---|---|---|
| **P1** | Os 4 perfis bastam, ou e preciso separar **diretor / comercial / financeiro**? | Define as colunas. Muda o enum `app_role` e toda policy que usa `is_admin_or_manager`. |
| **P2** | **PM** continua papel de projeto (`projects.manager_id`) ou passa a perfil global? | Muda o recorte da onda inteira — **D9**. |
| **P3** | **Gerente ve salario individual** de colega? | **D1**. Se nao, exige projecao por coluna, nao ajuste de policy. |
| **P4** | Confirmar: **gerente le financeiro do portfolio inteiro**, edita so onde e PM? | Confirma ou derruba ADR-0002 + ADR-0022. |
| **P5** | Confirmar o escopo de **RH** = recrutamento + ponto, **fora** de pessoas e folha? E **gerente fora de ponto**? | **D4**, **D5**. Hoje e decisao implicita, nao escrita. |
| **P6** | Confirmar o desvio do PUL-165: `payroll_profiles`, `role_rates` e `financial_settings` legiveis por **gerente** (nao so admin)? | O desvio foi deliberado para nao quebrar telas de gerente. A matriz confirma ou corrige. |

---

## Metodo e limite de confianca

A coluna "predicado vigente" foi reconstruida por **leitura das migrations** — para cada
tabela, a ultima migration que cria ou substitui a policy entre as 349 existentes. Nao
houve consulta ao catalogo do banco.

Isso deixa uma classe de erro em aberto: **policies sobrepostas que se somam por OR**.
Duas migrations distintas podem deixar duas policies ativas na mesma tabela, e a mais
permissiva anula a restritiva sem que a leitura sequencial perceba. Nao e hipotetico —
`20260817230000` documenta exatamente isso em `lead_activity_log` e
`strategy_guardrails`, onde policies `tenant_isolation_*` antigas anulavam as restritivas
e precisaram ser removidas.

Portanto: as celulas desta matriz sao **PROVADAS quanto a intencao da migration** e
**INFERIDAS quanto ao estado efetivo do banco**. Fechar essa lacuna exige rodar contra o
banco alvo, antes de aprovar a matriz:

```sql
-- Policies efetivamente ativas, por tabela sensivel
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public','storage')
ORDER BY tablename, cmd, policyname;

-- Tabelas com mais de uma policy SELECT ativa: candidatas a anulacao por OR
SELECT tablename, count(*) AS policies_select, array_agg(policyname) AS quais
FROM pg_policies
WHERE schemaname = 'public' AND cmd IN ('SELECT','ALL')
GROUP BY tablename
HAVING count(*) > 1
ORDER BY 2 DESC;
```

O resultado da segunda query e o que confirma ou derruba as celulas de leitura desta
matriz. Enquanto ela nao rodar, trate a matriz como a **intencao documentada**, nao como
o comportamento medido.

## Evidencias

| Afirmacao | Classificacao | Fonte |
|---|---|---|
| Enum `app_role` = `admin`, `user`, `manager`, `rh` | PROVADO | `20260121002930`, `20260121005324`, `20260716120000`, `20260717203747` |
| `is_admin_or_manager` = `is_manager_in_tenant` (corpo identico) | PROVADO | `20260331013008` |
| Gerente le linha inteira de `employees` | PROVADO | `20260301031026` + `20260817200000` (linhas 96-99) |
| Financeiro de projeto: leitura = escrita = `is_admin_or_manager` | DECIDIDO | ADR-0022, `20260817220000` |
| Gerente edita apenas projeto onde e PM | DECIDIDO | ADR-0002, `can_manage_project` |
| `curriculos` sem filtro de tenant | PROVADO | `20260817230000`, policy `Recruiters can read curriculos` |
| `employees.system_role` nao aceita `rh` | PROVADO | `20260202231437`, `employees_system_role_check` |
| `is_gerente` vivo em policy de reembolso e trigger de candidatura | PROVADO | `20260319150000`, `20260325130000` |
| 373 checagens de papel em 97 arquivos de `src/` | PROVADO | `grep -rcE 'isAdmin\|isRH\|isManager\|is_gerente\|hasRole'` |
| RLS de ponto concede a `rh`; `manager` fora | PROVADO | `20260716120100`, policies `time_*` |
| RH sem acesso a `employees` e a folha | PROVADO | `20260301031026` (so `admin` + `is_manager_in_tenant`) |
| Necessidade de perfis diretor/comercial/financeiro | PENDENTE | decisao de negocio (**P1**) |
