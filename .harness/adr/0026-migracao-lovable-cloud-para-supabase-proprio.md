# ADR 0026: Sair do Lovable Cloud para um Supabase próprio

- Status: aceito
- Data: 2026-08-31
- Decisores: Italo Castro

## Contexto

O backend do Pulse era um Supabase gerenciado pelo Lovable Cloud. Isso custava
três coisas concretas, todas verificadas:

1. **Sem acesso à API de plataforma.** `supabase gen types typescript
   --project-id vkriobpmolgopbbpqeky` respondia `Your account does not have the
   necessary privileges`, e o projeto não aparecia em `supabase projects list`.
   É a causa raiz comum de TD-0008, TD-0011 e TD-0015 — todos "cast `as any`
   até rodar gen types", abertos há meses.
2. **Providers de Auth bloqueados.** O ADR-0016 existe porque o painel do
   Lovable listava Microsoft como "Coming soon" (`"azure": false` em
   `/auth/v1/settings`), o que obrigou a escrever a Edge Function
   `microsoft-sso` validando JWKS, `aud`, `iss` e `tid` à mão — 200 linhas na
   porta de entrada do sistema.
3. **Config de produção invisível no repo.** A publication de realtime e alguns
   buckets existiam só no painel, e dois cron jobs dependiam de um
   `ALTER DATABASE ... SET` documentado apenas como comentário. Mesma família do
   TD-0009.

O gatilho foi a pergunta "conseguimos migrar sem perder nada?". A resposta
dependia de conseguir extrair schema e dados, o que parecia bloqueado.

### Alternativas descartadas

- **Transferir o projeto.** Não existe: a doc do Supabase é explícita — o Cloud
  não pode ser desconectado nem apontado para outra conta, e o "Project
  Transfer" move entre organizações, não entre regiões nem entre contas.
- **Role de leitura temporário + `pg_dump` pelo pooler.** Elegante e inviável:
  `pg_read_all_data` não ignora RLS, e `BYPASSRLS` exige superuser — o
  `postgres` do Supabase não é (`current_setting('is_superuser') = off`,
  medido). O dump sairia com as tabelas com RLS **vazias ou parciais, sem erro
  nenhum**. Dump que parece ter funcionado e não tem os dados é pior que dump
  que falha.
- **Emitir a service key a partir do `jwt_secret`.**
  `current_setting('app.settings.jwt_secret', true)` devolveu `false`.
- **Ficar e esperar** que o Lovable liberasse dashboard e providers. Rejeitado:
  três defeitos silenciosos em produção (abaixo) foram descobertos justamente
  por olhar o schema de fora, e nenhum deles era visível pelo painel.

## Decisao

Criar um projeto Supabase próprio em **`sa-east-1`** e migrar por dump nativo.

**Extração:** o botão *Export data* do painel do Lovable produz um `pg_dump`
custom completo (`auth`, `storage`, `cron`, `vault`, `supabase_migrations`
incluídos). Foi o caminho, porque é o Lovable que roda o dump com privilégio.
Duas armadilhas registradas: o export **não regenera sob demanda** — confira o
`Archive created at` do cabeçalho antes de usar — e o `pg_restore` do `libpq` do
Homebrew não tem zstd; é preciso `postgresql@17`.

**Região `sa-east-1`, não a default.** O primeiro projeto nasceu em `us-west-1`
e foi recriado. Medido no restore: pre-data 13s contra 108s, dados 6s contra
54s, post-data 27s contra 243s. Região é imutável — recriar vazio custa
minutos, depois custa uma segunda migração.

**Segredos dos cron jobs no Vault, não em GUC.** Os jobs passam a ler por
`public.cron_secret()`, que levanta exceção quando o segredo falta. Dois
motivos: um GUC de banco é legível por qualquer role que conecte, e o setup
manual se perde em todo projeto novo — foi o que manteve os jobs quebrados.

**Frontend na Vercel**, com as env vars do projeto sobrepondo o
`.env.production` commitado (verificado no bundle: só o ref novo aparece). O
`.env.production` **não foi alterado de propósito**, para não fazer o Lovable
rebuildar e trocar o backend da produção antiga sem ninguém pedir.

O processo é reexecutável: `scripts/migration/01-restore.sh <dump> todas` roda
o restore inteiro em menos de dois minutos, com oito armadilhas codificadas.

## Consequencias

- **Beneficios:**
  - CLI e API de plataforma funcionando: `gen types` volta a rodar e destrava
    TD-0008, TD-0011 e TD-0015.
  - Provider Azure nativo disponível (`external_azure_enabled` existe, hoje
    `false`) — abre caminho para aposentar a `microsoft-sso` e revisar o
    ADR-0016. Exige client secret; o app hoje é SPA com PKCE sem secret.
  - Latência de São Paulo em vez da costa oeste dos EUA.
  - Realtime do Inbox e cron jobs **funcionando pela primeira vez**.
  - Nenhuma function depende mais do Lovable: a `parse-cnpj-card` passou a
    chamar a Anthropic direto, com schema em `output_config` em vez de raspar
    markdown do texto de resposta.

- **Custos:**
  - Supabase Pro no lugar dos créditos do Lovable.
  - Domínio próprio (`origamipulse.com.br`), DNS e certificado a manter.
  - Perde-se o fluxo prompt→preview→commit do Lovable. O time já trabalhava por
    IDE, então o custo real é baixo.
  - O PWA instalado está preso à origem antiga: quem bate ponto pelo celular
    precisa reinstalar no endereço novo.

- **Riscos:**
  - **Janela de dados.** O dump é um retrato. Apontamento feito no sistema
    antigo depois do export não existe no novo. Mitigação: `Pause` no Lovable
    Cloud antes do export final.
  - **Split-brain.** Anunciar o endereço novo antes do cutover faz hora e ponto
    entrarem em dois bancos — justo nas tabelas que alimentam custo e margem.
  - **Falhas silenciosas de e-mail.** Sem SMTP configurado, `generateLink`
    responde 200 e o convite não sai. E sem `RESEND_FROM_EMAIL` o código cai no
    fallback `noreply@resend.dev`, que só entrega para o dono da conta
    (`send-invite-email/index.ts:136`).
  - **Deployment Protection da Vercel** cobre as URLs `*.vercel.app`. Medido: o
    domínio próprio fica público, então o time não bate em login — mas se a
    proteção virar "All Deployments", bate.

- **Como reverter:** enquanto o Lovable Cloud existir pausado, o rollback é
  trocar o DNS de volta e dar `Unpause`. O `Remove Lovable Cloud` é
  irreversível e só deve ser usado depois de dias de operação estável.

## Evidencias

- `scripts/migration/` — kit reexecutável: preflight, restore em 8 etapas,
  storage idempotente, verificação, e `verify-catalog.sql` para comparar
  catálogo entre origem e destino.
- `supabase/migrations/20260831120000_realtime_publication_and_cron_via_vault.sql`
- Restore validado: 120 tabelas, 428 policies (390 em `public` + 38 em
  `storage`), 94 functions, 35 usuários com hash preservado, 16.063 linhas,
  362 arquivos de storage (105 MB), 3 cron jobs ativos.
- Cadeia dos crons provada ponta a ponta: `cron_secret` → `net.http_post` →
  Edge Function → HTTP 200 registrado em `net._http_response`.
- Margem, custo/hora e timesheet conferidos manualmente no ambiente novo.

### Defeitos preexistentes descobertos pela migração

Nenhum era visível pelo painel do Lovable. Ver TDs correspondentes:

1. **Três cron jobs nunca funcionaram.** `cron.job_run_details` mostrava
   `failed` com `42704 unrecognized configuration parameter "app.supabase_url"`.
   `pg_db_role_setting` não tinha nenhum `app.*` em escopo algum. Alerta de
   parcela/NF parado desde 22/06, lembrete de ponto desde 17/07, follow-up de
   oportunidade desde 10/08.
2. **Realtime do Inbox nunca funcionou.** `CREATE PUBLICATION
   supabase_realtime` estava vazia; o `postgres_changes` de
   `public.notifications` nunca recebeu evento. Passou desapercebido porque o
   TanStack Query refaz a query no foco.
3. **`20260721250000_employee_versions_no_overlap_constraint.sql` nunca foi
   aplicada.** Nem o `btree_gist`, nem a constraint `EXCLUDE`. É a invariante
   que impede duas versões sobrepostas do mesmo colaborador — a proteção da
   linha do tempo financeira. Provável causa: o `ALTER TABLE` falha se já
   houver sobreposição, exatamente como a própria migration avisa.
4. **`public._backup_cost_per_hour_20260721` sem RLS e com `GRANT ALL` para
   `anon`.** Comprovado ao vivo com a chave publishable: 66 linhas legíveis sem
   login, `INSERT` respondendo 201 e `DELETE` respondendo 204. Todas as linhas
   têm `cost_per_hour` nulo, então não há custo vazando — o problema é
   integridade, não confidencialidade.
5. **Policy do bucket `curriculos` sem filtro de tenant.** Qualquer
   admin/gerente/RH de **qualquer** tenant lê os 259 currículos de todos.
6. **Histórico de migrations incompleto.** `supabase_migrations` só registra
   até 17/07; o Lovable parou de gravar depois disso. O schema é a única fonte
   confiável de drift.
7. **Quatro tenants, dois chamados "Origami Lab".** O real é `93e40db0` (20
   colaboradores, 24 projetos). O outro, de 21/01, tem três registros de teste.
8. **Dez arquivos ilegíveis no bucket `contracts`.** Os paths começam com id de
   projeto e a policy de leitura exige `tenant_id` no primeiro segmento — a
   condição nunca casa. São legados do contrato removido pelo ADR-0019.
