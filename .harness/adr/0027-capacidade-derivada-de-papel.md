# ADR 0027: Capacidade por papel, configuravel em dado e aplicada na RLS

- Status: proposto
- Data: 2026-09-02
- Decisores: Origami Lab / operacao interna
- Epico: PUL-198
- Matriz canonica: `.harness/capability-matrix.md`
- Apresentacao para o negocio: `.harness/docs/capability-matrix.html`

> **Nota de revisao (02/09).** A primeira versao deste ADR, escrita mais cedo no mesmo
> dia, decidia o oposto em dois pontos: a matriz papel x capacidade viveria em **codigo**
> (derivada, imutavel em runtime) e **nao existiria excecao por pessoa**. A discussao
> seguinte trouxe dois fatos que derrubaram esse recorte — o requisito de ligar uma
> capacidade sem deploy e a existencia de um modelo equivalente ja em producao no
> projete.app. O historico da alternativa recusada esta preservado em "Alternativas
> consideradas (c)", porque o raciocinio continua valido para quem revisitar a decisao.

## Contexto

Nao existe hoje um lugar que responda "quem ve custo?", "quem ve salario?", "quem edita
catalogo?". A resposta esta distribuida em **373 checagens** de `isAdmin` / `isRH` /
`is_gerente` / `hasRole` espalhadas por **97 arquivos** de `src/`, mais os predicados de
RLS das migrations.

O levantamento (PUL-198) encontrou quatro problemas estruturais.

### 1. Tres fontes de papel concorrentes

| Fonte | Valores | Consumidores |
|---|---|---|
| `user_roles.role` (`app_role`) | `admin`, `manager`, `rh`, `user` | `has_role`, `is_admin_or_manager`, `AuthContext` |
| `employees.system_role` (text) | `admin`, `manager`, `user` — **sem `rh`** | telas de pessoas, `employee_versions` |
| `employees.is_gerente` (boolean) | `true` / `false` | policies de reembolso, trigger de candidatura |

`20260331013008` migrou `is_admin_or_manager` e `is_manager_in_tenant` para `user_roles`,
mas as policies que leem `employees.is_gerente` **inline** permaneceram
(`20260319150000`, `20260325130000`). Um usuario `manager` em `user_roles` com
`is_gerente = false` nao e alcancado pelo trigger `notify_managers_new_job_application`.

A flag booleana solta por usuario, portanto, **nao e uma proposta futura: ela ja existe no
schema** e ja produz divergencia observavel. Este ADR a substitui — nao a introduz.

### 2. Vocabulario de checagem nao e vocabulario de negocio

O codigo pergunta "e admin?". O negocio pergunta "ve margem?". Sao perguntas diferentes,
e a traducao entre elas vive na cabeca de quem escreveu cada tela. Consequencia direta:
`payroll_profiles`, `role_rates` e `financial_settings` foram para `is_admin_or_manager`
em PUL-165 num desvio deliberado da historia (que pedia "somente admin"), porque
restringir a admin quebraria telas de gerente que calculam custo e margem. A decisao foi
correta e ficou registrada em comentario de migration — nao num lugar que o negocio leia.

### 3. Papel de sistema x papel de recurso

`can_manage_project` decide por `projects.manager_id`; `is_project_team_member` decide por
`project_role_allocations`. Nenhum passa por `user_roles`. "PM" nao e perfil de sistema, e
relacao com o registro — mas a UI chama de papel, o que confunde o recorte.

### 4. Mudar quem ve o que exige deploy — e vai exigir por cliente

Hoje qualquer alteracao de acesso e migration mais release. Dois fatos tornam isso
insustentavel:

- **operacional:** "liberar custo para tal perfil" e decisao de negocio, com prazo de
  negocio. Enfileirar isso atras de um deploy transforma ajuste de rotina em demanda de
  engenharia;
- **de produto:** o PUL-122 projeta **80 a 100 clientes** ate dezembro. Cliente A vai
  querer que gerente veja margem; cliente B vai considerar isso inaceitavel. Um enum
  global de perfis com predicado fixo na policy nao expressa isso.

### Alternativas consideradas

**(a) Flag booleana solta por usuario** (`employees.can_see_salary`, ...). Cada capacidade
nova e uma coluna e uma migration. Nao ha como responder "quem ve custo?" sem varrer a
tabela de usuarios, e a resposta muda por pessoa sem regra auditavel. E a generalizacao do
defeito que `is_gerente` demonstra. **Recusada.**

**(b) Checagem direta de papel na tela** (o estado atual). Espalha a regra pelos 97
arquivos; responder ao negocio exige leitura de codigo. **Recusada.**

**(c) Matriz papel x capacidade em codigo, derivada e imutavel em runtime.** Era a decisao
da primeira versao deste ADR. Resolve o vocabulario e a dispersao, e tem uma vantagem real
que a opcao escolhida perde: **toda mudanca de acesso passa por PR revisado**. Foi
superada porque nao atende ao problema 4 — qualquer ajuste continua exigindo deploy, e a
matriz por cliente seria impossivel sem ramificar codigo por tenant. **Superada, nao
errada:** se o produto voltasse a ser instalacao unica interna, esta seria a escolha certa.

**(d) Matriz como dado, aplicada na RLS** — escolhida. Espelha o modelo em producao no
projete.app, com a adaptacao obrigatoria de enforcement descrita no ponto 3 da decisao.

## Decisao

### 1. Vocabulario em codigo, atribuicao em dado

A autorizacao se expressa em **capacidades** com vocabulario de negocio
(`financeiro:ler`, `remuneracao-pessoa:ler`, `pipeline:ler`, `orcamento:editar`). A linha
entre o que e codigo e o que e dado e a peca central do desenho:

| Elemento | Onde vive | Como muda |
|---|---|---|
| vocabulario de capacidades | **codigo** | migration + deploy |
| papeis do tenant | **dado** | tela de administracao |
| papel x capacidade (`habilitado`) | **dado** | **um clique** |
| excecao por pessoa (`habilitado` concede ou revoga) | **dado** | um clique, com trilha |

Em uma frase: **capacidade nova exige deploy; quem tem cada capacidade e clique.**

O modelo e o do projete.app — `enum Permissao`, `Papel`, `PapelPermissao` e
`UsuarioPermissaoOverride` em `prisma/schema.prisma`, resolvidos por `calcularPermissoes`
em `src/lib/permissoes.ts` (capacidades habilitadas do papel, depois overrides por cima).
A migration `20260721010000_portfolio_flag_e_permissao` daquele projeto e o exemplo da
regra acima: adicionar `GERIR_PORTFOLIO` foi migration; concede-la aos papeis foi INSERT.

**Sobre a excecao por pessoa.** A versao anterior deste ADR a proibia. A proibicao estava
certa sobre o alvo errado: o defeito de `is_gerente` nao e ser por pessoa, e ser **flag
ad-hoc inventada por tela, competindo com o papel**. Um override sobre vocabulario fechado,
com `habilitado` explicito e listagem de quem tem excecao, **compoe** com o papel em vez
de competir. E permitido, com duas condicoes:

- override e para excecao, nunca para suprir papel que falta. Se muitas pessoas tem o
  mesmo override, falta um papel — e a correcao e criar o papel;
- override sem listagem nao existe. Excecao invisivel e o defeito de `is_gerente` com
  outro nome.

### 2. Papel e por tenant, com nome livre, e a pessoa tem um so

`app_role` (enum global) da lugar a papeis como registro por tenant, com nome definido
pelo cliente. E o que atende ao problema 4.

Uma pessoa tem **exatamente um papel**, como `Usuario.papelId` no projete.app. Acumulacao
de funcoes ("gerente que tambem faz RH") se resolve por papel customizado ou por override —
nao por N papeis. Isso elimina a pergunta de precedencia entre papeis e a ambiguidade sobre
qual papel a interface exibe.

### 3. O enforcement vive na RLS — e este e o ponto que nao porta do projete.app

O projete.app e Next.js com Prisma e server actions: `requirePermissao()` roda no servidor
e o navegador nunca fala com o banco. Naquele arranjo, autorizacao em TypeScript **e** a
barreira.

O og-pulse e Supabase: `supabase.from(...)` sai do navegador direto para o Postgres com o
JWT do usuario. **Nao existe servidor no meio.** Portar `permissoes.ts` como esta entregaria
uma tela correta e um banco aberto a `curl` — desfazendo o que PUL-161 acabou de fechar.

Portanto:

- **a resolucao e uma funcao SQL** — `has_capability(capacidade)`, `STABLE`, resolvendo
  papel mais override do `auth.uid()`, chamada **dentro das policies**, no lugar de
  `is_admin_or_manager()`;
- **o front e espelho** — `useCan` decide o que renderizar, nunca o que proteger;
- **os dois leem a mesma fonte.** E isso que faz o toggle ser real: liga na tela e o banco
  passa a permitir de fato. Se apenas o front lesse a tabela, o toggle seria decoracao.

Corolario de implementacao: `has_capability` entra em predicado avaliado linha a linha.
Exige `STABLE` e indice, com medicao antes e depois — um toggle que funciona e derruba a
performance da lista nao e uma entrega.

### 4. Capacidade nunca e a unica barreira de dado sensivel

> **Capacidade decide o que a interface mostra. RLS decide o que o banco entrega.**

Com a decisao 3 as duas passam a derivar da mesma fonte, mas a assimetria permanece
obrigatoria:

- toda capacidade que protege dado sensivel **precisa** de predicado de RLS equivalente ou
  mais restritivo. Esconder a aba de custo sem policy de leitura nao protege nada — foi
  exatamente o defeito corrigido por ADR-0022;
- a capacidade **pode** ser mais restritiva que a RLS quando isso serve a clareza da tela
  (o detalhe de mao de obra em `ProjectCostsTab` e mais restrito que a policy). Esse caso
  precisa estar declarado na matriz, senao e lido como bug e "corrigido";
- a capacidade **nunca** pode ser mais permissiva que a RLS. Se for, a tela oferece
  controle que o banco recusa, e o usuario ve erro em vez de ausencia.

### 5. RLS de linha nao limita coluna

`employees` guarda identidade, remuneracao e dado pessoal na mesma linha. Policy de linha
aprova a linha inteira. Quando uma capacidade recorta **coluna** e nao linha, o mecanismo e
projecao fixa via funcao `SECURITY DEFINER` com tenant derivado de `auth.uid()` — o padrao
de `get_employee_directory()` (ADR-0020) e `assert_tenant_access` (ADR-0021). E o caso da
divergencia D1: "gerente nao ve salario" nao se resolve com policy, se resolve com projecao.

### 6. Escopo por registro e isolamento de tenant nunca sao configuraveis

Esta e a fronteira do que o toggle alcanca:

- **escopo** (`PM`, `proprio`, `alocado`) e relacao com o registro, definida em ADR-0002,
  ADR-0003 e ADR-0022. Um toggle pode dizer "este papel ve financeiro"; nao pode dizer "de
  qualquer projeto". Capacidade e escopo compoem — a capacidade nao substitui o escopo;
- **tenant** nunca entra em tabela de configuracao. A divergencia D6 (policy de
  `curriculos` sem `tenant_id`) mostra o que acontece quando o predicado de tenant sai de
  uma policy: some em silencio e ninguem percebe.

### 7. A migracao carrega o estado atual; a correcao vem depois, visivel

O modelo novo nasce ao lado do antigo e so o substitui contra prova de equivalencia
(expand/contract):

1. esquema e `has_capability` criados **sem trocar policy** — `user_roles`, `app_role` e
   `has_role` intactos;
2. seed reproduzindo o comportamento de hoje, **divergencias inclusive**;
3. relatorio de paridade comparando `has_capability` ao predicado vigente para cada usuario
   real — reexecutavel, porque os dois lados sao funcoes chamaveis;
4. viradas por grupo, do menos sensivel ao mais sensivel, com rollback **executado** ao
   menos uma vez, nao apenas escrito;
5. remocao do mecanismo antigo por ultimo, apos periodo sem divergencia.

**O dia 1 do modelo novo e identico ao dia 0.** Ninguem ganha nem perde acesso na
migracao. Mudanca de politica e toggle posterior, um a um, com autor e data — misturar as
duas coisas torna impossivel diagnosticar uma falha de acesso: nao se sabe se o mecanismo
quebrou ou se a regra mudou.

Excecao unica: a divergencia **D6**, que e violacao de boundary e segue em trilha propria
(PUL-207), sem esperar a onda.

## Consequencias

### Beneficios

- "Liberar custo para tal perfil" passa de migration mais release para um clique — e
  vale no banco, nao so na tela.
- Cada cliente monta os proprios papeis, o que e pre-requisito para os 80 a 100 clientes
  do PUL-122.
- "Quem ve salario?" tem resposta escrita, revisada pelo negocio, sem abrir codigo.
- As 373 checagens deixam de ser 373 decisoes independentes.
- As divergencias entre UI e RLS ficam visiveis em lista (10 itens hoje), em vez de
  aparecerem como incidente.
- `is_gerente` — flag ad-hoc que ja causa defeito observavel — sai de circulacao.

### Custos

- **Perde-se a revisao por PR em toda mudanca de acesso.** E o custo mais caro desta
  decisao, e o que a alternativa (c) preservava. A compensacao e a trilha de auditoria:
  toda alteracao de papel, capacidade ou override registra autor e data. Configuracao sem
  trilha troca revisao de codigo por clique anonimo, e ai o custo nao tem compensacao
  nenhuma.
- `has_capability` em predicado avaliado por linha custa mais que um booleano compilado na
  policy. Exige `STABLE`, indice e medicao.
- A migracao e cirurgia em sistema em producao: exige paridade provada e rollback testado
  antes de qualquer virada.
- Duas camadas para cada dado sensivel: capacidade e policy.

### Riscos

- **Configuracao permissiva por engano.** Um clique errado em `remuneracao-pessoa:ler`
  expoe salario de todo mundo, e o registro e uma linha de tabela. Mitigacao: auditoria
  obrigatoria, protecao contra auto-promocao no banco, e o cuidado de que capacidades de
  dado sensivel sejam as ultimas a migrar.
- **Capacidade tratada como seguranca.** Se alguem esconder um campo apenas por capacidade
  e nao criar a policy, o dado continua saindo pela API. Mitigacao:
  `ai-review-checklist.md` exige policy para toda capacidade de dado sensivel.
- **Tenant trancado fora da propria administracao.** Remover a capacidade de gerir perfis
  do unico papel que a tem, ou rebaixar a ultima pessoa que o tem, deixa o cliente sem
  caminho de volta pela interface. Mitigacao: bloqueio explicito do ultimo administrador.
- **Override como muleta.** Se override virar o jeito normal de dar acesso, volta-se ao
  estado de permissao por pessoa sem regra — o defeito que a decisao pretende resolver.
  Sinal de alerta: mesma capacidade em override para mais de duas ou tres pessoas.
- **Matriz aprovada sem as decisoes pendentes.** P1 a P6 estao abertas. Aprovar a matriz
  com elas em branco congela o comportamento de hoje como decisao — inclusive "gerente ve
  salario de colega" (**D1**), que provavelmente nao e o desejado.
- **Papel demais.** Se cada cliente criar dez papeis, a matriz deixa de ser legivel.
  Sinal de alerta: papeis que diferem em uma unica capacidade — provavelmente eram um papel
  mais um override.

### Como reverter

Cada fase e revertivel de forma diferente, e por isso a ordem importa:

- **fases 1 e 2** (esquema e seed) nao alteram comportamento: as tabelas novas ficam
  inertes enquanto nenhuma policy as consulta. Reverter e dropar o que foi criado;
- **fase 4** (viradas) reverte por grupo, restaurando o predicado anterior. E o motivo de o
  rollback precisar ser executado antes, e nao apenas escrito;
- **fase 5** (remocao) e o ponto sem volta barata — remover valor de enum no Postgres nao e
  operacao trivial. Por isso vem por ultimo, com periodo de graca.

Reverter a decisao como um todo significa voltar a predicado fixo na policy, o que reintroduz
o problema 4. A recusa da flag ad-hoc por usuario (alternativa **a**) nao e reversivel sem
reintroduzir o defeito que `is_gerente` demonstra.

## Evidencias

- `.harness/capability-matrix.md` — matriz, as 10 divergencias e as 6 decisoes pendentes
- `projete.app`: `prisma/schema.prisma` (`enum Permissao`, `Papel`, `PapelPermissao`,
  `UsuarioPermissaoOverride`), `src/lib/permissoes.ts` (`calcularPermissoes`,
  `requirePermissao`), `prisma/migrations/20260721010000_portfolio_flag_e_permissao`
- `supabase/migrations/20260121002930` — `CREATE TYPE app_role`, `employees.is_gerente`
- `supabase/migrations/20260202231437` — `employees.system_role` (CHECK sem `rh`)
- `supabase/migrations/20260331013008` — `is_admin_or_manager` e `is_manager_in_tenant`
  migradas para `user_roles`, com corpos identicos
- `supabase/migrations/20260817200000` — diretorio com projecao fixa (ADR-0020)
- `supabase/migrations/20260817220000` — financeiro de projeto (ADR-0022)
- `supabase/migrations/20260817230000` — leitura e escrita por perfil (ADR-0023)
- `supabase/migrations/20260319150000`, `20260325130000` — consumidores vivos de
  `is_gerente`
- `src/contexts/AuthContext.tsx:132` — `roleSet` reduzido a tres booleanos
- `src/services/employeeService.ts:390-410` — sincronia manual de `system_role` e
  cardinalidade 1 imposta em codigo
- Jira: PUL-198 (epico), PUL-199 (matriz), PUL-200 (esquema), PUL-201 (virada),
  PUL-202 (acumulacao), PUL-203 (`system_role`), PUL-204 (tela), PUL-205 (escopo),
  PUL-206 (contracao), PUL-207 (D6), PUL-208 (D2), PUL-209 (paridade)
- ADR-0002 (portfolio: le tudo, edita o proprio), ADR-0020, ADR-0021, ADR-0022, ADR-0023
