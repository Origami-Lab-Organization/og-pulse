# AI Review Checklist

- A mudanca respeita RLS, tenant e roles?
- Feature, tela ou rota nova: a capacidade que governa quem acessa foi declarada em
  `capabilities` (migration) e mapeada em `.harness/capability-matrix.md`, no mesmo
  commit? Nao existe entrega sem resposta para "quem acessa isto?" (ADR-0027).
- A autorizacao confere com `.harness/capability-matrix.md`? Se a mudanca cria ou altera
  uma capacidade, a matriz foi atualizada no mesmo commit? (ADR-0027)
- Toda capacidade que esconde dado sensivel tem policy de RLS equivalente ou mais
  restritiva? Esconder campo na tela sem policy de leitura nao protege nada (ADR-0027).
- A capacidade e mais permissiva que a RLS? Se sim, a tela mostra controle que o banco
  recusa — corrigir antes do merge (ADR-0027).
- Rota nova usa `<RoleProtectedRoute requireCapability=...>` e o item de menu declara
  `requiresCapability`? Desde o grupo 5 da PUL-201 **nenhuma** rota e nenhum item de menu
  decide por papel — `requireAdmin` e `requiresAdmin` nao existem mais nessas pecas. Rota
  nova por papel nao passa. Capacidade nova exige migration; atribui-la a um papel, nao.
- A mudanca le `employees.is_gerente` ou `employees.system_role`? Sao legado em remocao
  (ADR-0027, TD-0012 / PUL-206). Durante a transicao, usar `user_roles`; apos a virada de
  PUL-201, `has_capability`. Capacidade nova exige migration; atribui-la a um papel, nao.
- A mudanca altera regra de ESCRITA de dominio que o MCP tambem escreve? Hoje Oportunidade
  tem duas implementacoes — `src/services/leadService.ts` (tela) e
  `apps/mcp-drive/src/writes.ts` (chat). Mexer em uma sem a outra cria divergencia silenciosa,
  porque os dois continuam "funcionando" (TD-0022).
- Predicado de policy inclui `tenant_id`? Policy de storage tambem (ver TD-0011).
- Existe risco de vazamento de dados pessoais, financeiros ou comerciais?
- Regras de negocio alteradas tem teste ou validacao documentada?
- Arquivo de reversao NAO traz `BEGIN`/`COMMIT` proprio, e o ensaio nao o le com `\i`
  dentro de um `BEGIN ... ROLLBACK`? O `COMMIT` de dentro do arquivo fecha a transacao de
  fora e grava em producao o que era para ser descartado — o `ROLLBACK` seguinte cai no
  vazio. O psql avisa ("there is already a transaction in progress" / "there is no
  transaction in progress"); esses dois WARNING sao erro, nao ruido. Envolver por fora com
  `psql --single-transaction`. (Aprendido em 08/09: um ensaio de ida e volta gravou a
  reversao em producao e exigiu a migration de reparo 20260908170000.)
- Remocao de funcao SQL: o inventario incluiu o CORPO das outras funcoes, e nao so
  policies, triggers e `src/`? Chamada dentro de funcao so falha em RUNTIME — o `DROP`
  passa, o deploy passa, e a quebra aparece para o usuario dias depois. Query que fecha o
  inventario: `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE p.prokind='f' AND n.nspname='public' AND pg_get_functiondef(p.oid) ILIKE '%<nome>%'`.
  (Aprendido em PUL-206: `has_role` foi derrubada com cinco funcoes ainda chamando —
  incluindo o trigger de hora planejada e as duas de ferias, que deixaram a aprovacao de
  ferias erroando em producao por quatro dias sem ninguem reportar.)
- Mensagem de erro que chega ao usuario foi escrita PARA ele? `error.message` cru no toast
  entrega texto do Postgres ("function public.has_role(uuid, uuid, unknown) does not
  exist") a quem so queria salvar. Regra: RAISE destinado ao usuario usa `ERRCODE 'PU001'`
  e diz o que fazer; a tela passa o erro por `mensagemParaUsuario`
  (`src/lib/errors/userMessage.ts`), que so deixa passar `PU001` e traduz o resto.
- Funcao nova ou alterada respeita complexidade <= 7? O hook do harness avisa no Write,
  mas so no arquivo tocado.
- Migration que escreve em tabela com TRIGGER de protecao foi provada com o trigger
  presente? Stub que reproduz colunas e policies mas nao triggers prova o comportamento de
  uma tabela que nao existe. (Aprendido em PUL-203: a reconciliacao passou no harness e
  quebrou o deploy de producao com "Permission denied: cannot modify system_role" — o
  trigger `prevent_employee_self_escalation` recusa a mudanca quando `auth.uid()` nao e
  admin, e numa migration `auth.uid()` e nulo.) Alem do stub, migration que toca dado
  existente vale um ensaio contra o schema real dentro de `BEGIN ... ROLLBACK`.
- Migration REMOVE tabela, coluna ou funcao que o frontend hoje le? Entao ela nao pode
  ir no mesmo deploy que o frontend que parou de ler. Nesta topologia a migration roda
  DENTRO do build da Vercel (ADR-0026), antes de o frontend novo ser publicado: durante o
  build, e em toda aba ja aberta, o frontend ANTIGO conversa com o schema NOVO. Expandir
  (criar o novo, manter o antigo) num deploy; contrair (remover o antigo) no deploy
  seguinte, depois de o frontend que nao depende mais dele estar no ar. (Aprendido em
  PUL-206: `user_roles` foi removida no mesmo deploy que tirou a leitura dela; o front
  antigo passou a ler zero papel, `isAdmin` e `is_gerente` viraram falso e um admin abriu
  projeto vendo duas abas de dez.)
- A tela trata "nao consegui confirmar permissao" diferente de "nao tem permissao"? Falha
  de consulta que devolve lista vazia rebaixa acesso em silencio e e indistinguivel de
  restricao legitima. `fetchMyCapabilities` devolve `null` na falha justamente para essa
  distincao — quem consome cai no ultimo conjunto conhecido e avisa (ADR-0027).
- Teste de tela mocka `useAuth`? Entao o mock precisa expor `can`, e nao so `employee`.
  Mock sem `can` derruba o componente com "can is not a function" — e, quando o teste
  afirma sobre texto de codigo (`readFileSync` do App.tsx), a assercao envelhece a cada
  troca de mecanismo. Preferir assercao de comportamento sobre a config exportada
  (`NAV_ITEMS`, `NAV_SECTIONS`, `HELP_GROUPS`).
- A mudanca EDITA migration que ja foi mergeada? **Nunca.** Migration que saiu do branch e
  imutavel: o Supabase nao reaplica versao ja registrada em `schema_migrations`, entao o
  arquivo passa a mentir sobre o estado do banco e a migration seguinte quebra. Toda
  correcao vira migration NOVA — e com timestamp anterior ao da migration que a consome,
  senao a ordem de aplicacao nao resolve nada. (Aprendido em PUL-200: a
  20260902130000 foi editada de 46 para 48 capacidades depois do merge; producao ficou com
  46 e o seed estourou a foreign key de role_capabilities no deploy.)
- Migrations Supabase sao versionadas, revisaveis e incluem policies quando necessario?
- Edge Functions validam entrada e tratam erros de forma segura?
- Componentes possuem estados de loading, empty e error quando consomem dados?
- Mutations invalidam ou atualizam cache corretamente?
- A UI segue padroes existentes de shadcn/Radix/Tailwind?
- O codigo evita duplicacao relevante e usa helpers/hooks existentes?
- Lint, test e build foram executados ou a impossibilidade foi registrada?
