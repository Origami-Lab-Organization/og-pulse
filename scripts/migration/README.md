# Migração Lovable Cloud → Supabase próprio

Kit de execução da migração do backend do og-pulse. O objetivo é que a migração
seja **reexecutável**: você roda tudo contra um projeto sombra quantas vezes
quiser, e o cutover em produção é a repetição de algo já provado.

## Antes de tudo: credenciais

Copie `env.example` para `.env.migration` **na raiz do repo** (já ignorado pelo
git via `.env.*`) e preencha:

| Variável | Onde pegar |
|---|---|
| `ORIGIN_SUPABASE_URL` | já está no `.env` do projeto |
| `ORIGIN_SERVICE_KEY` | **ainda em aberto** — ver "Como obter a chave da origem" |
| `TARGET_SUPABASE_URL` | dashboard do projeto novo → Settings → API |
| `TARGET_SERVICE_KEY` | dashboard do projeto novo → Settings → API |
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens |

O `SUPABASE_ACCESS_TOKEN` é o que faz os comandos `supabase …` funcionarem
fora de um terminal interativo: sem ele o CLI tenta o keychain do macOS, não
alcança, e responde `Access token not provided`.

Os scripts leem **só de env** — nunca de argumento de linha de comando, que
vazaria no histórico do shell e em `ps`. Nenhum script imprime chave.

## Como obter a chave da origem

Não existe cópia dela no repo (só chaves `anon`), e o caminho mais óbvio já foi
descartado: `select current_setting('app.service_role_key')` responde
`42704 unrecognized configuration parameter` — o setting nunca foi aplicado.
Isso, por si, é um bug de produção em aberto: os três cron jobs de notificação
leem esse mesmo setting.

Em ordem do que tentar:

1. `pg_db_role_setting` — a chave pode estar setada em outro escopo (banco ou
   papel), e aí é só ler de lá
2. Emitir a chave a partir do segredo de JWT do projeto
   (`select current_setting('app.settings.jwt_secret', true)`) — é a chave do
   próprio projeto, só estamos assinando em vez de procurar
3. Painel do Lovable → Cloud → Secrets
4. Último recurso: Edge Function temporária de export, que recebe
   `SUPABASE_SERVICE_ROLE_KEY` injetada pela plataforma e serve de ponte

### Por que o role de leitura temporário NÃO resolve

Era o caminho mais elegante — o SQL editor roda como `postgres` com
`CREATEROLE`, então dava para criar um role com senha própria e rodar
`pg_dump` de fora pelo pooler. Mas tem um buraco:

`pg_read_all_data` **não** ignora RLS (é explícito na doc do Postgres), e o
atributo `BYPASSRLS` só pode ser concedido por superuser — que o `postgres`
daqui não é (`current_setting('is_superuser') = off`, medido). Resultado: um
role de leitura dumparia as tabelas com RLS **vazias ou parciais, sem erro
nenhum**. Dump que parece ter funcionado e não tem os dados é pior que dump que
falha.

Quem ignora RLS na prática: o **dono** da tabela (`postgres`, comportamento
padrão do Postgres) e o **`service_role`** do Supabase, que tem `BYPASSRLS`.
Ou seja, a extração passa por um dos dois — o botão "Export data" (o Lovable
roda privilegiado) ou a service key. Não há atalho por role novo.

## Ordem de execução

```bash
# 0. Prova que temos acesso aos dois lados e que o destino está vazio
node --env-file=.env.migration scripts/migration/00-preflight.mjs

# 1-2. Restore do dump  ← MANUAL, depende do formato do "Export data"
#      (ver "O que ainda falta" abaixo)

# 3. Storage  (psql/pg_dump em /opt/homebrew/opt/libpq/bin, versão 18.6) — 7 buckets, idempotente e retomável
node --env-file=.env.migration scripts/migration/03-storage.mjs --dry-run
node --env-file=.env.migration scripts/migration/03-storage.mjs

# 4. Functions e secrets
supabase link --project-ref <REF_NOVO>
supabase functions deploy                    # as 27, com o verify_jwt do config.toml
supabase secrets set --env-file .env.functions

# 99. Verificação
node --env-file=.env.migration scripts/migration/99-verify.mjs
# + rodar verify-catalog.sql nos DOIS SQL editors e comparar
```

## Passos que não têm script (e nem deveriam ter)

- Clicar em **Export data** no painel do Lovable — não tem API
- Criar o projeto no Supabase
- Gerar chave nova na Anthropic e no Resend (rotação é boa prática; não tente
  ler a chave mascarada do painel)
- Configurar **SMTP do Resend** no Auth do projeto novo
- Registrar o redirect URI novo no app do Entra ID
- DNS do domínio
- **Pause** / **Remove** do Lovable Cloud — só no fim, e o Remove é irreversível

## Regras que não são opcionais

**Sem cron no projeto sombra.** `notify-timesheet-reminder`,
`notify-lead-follow-ups` e `notify-installment-alerts` mandam e-mail para gente
real. Deploy das functions sim; `cron.schedule` só no cutover. Teste por invoke
manual.

**SMTP antes de testar convite.** Sem SMTP, `generateLink` responde 200 e o
e-mail não sai — você marca "primeiro acesso ok" e não está.

**Ninguém trabalha no sombra.** Ele é um retrato de um instante; ponto batido
lá é ponto perdido. No cutover se reexporta do zero com a escrita congelada
pelo `Pause`.

**O dump é material sensível.** Salário, custo, margem, contrato e hash de
senha dos 35 usuários. Fora do repo, disco cifrado, apagado no fim. Nunca em
ticket, chat ou pasta sincronizada.

## Validação, em ordem de risco

1. **RLS** — `verify-catalog.sql` nos dois lados. `tabelas public SEM RLS` tem
   que bater. Se subir, todo funcionário vê salário de todo mundo e o app
   parece perfeito.
2. **Login** — senha (hash bcrypt é autocontido, funciona de cara) e Microsoft
   (aponte o `.env` local para o projeto novo e teste em `localhost:8080`).
3. **Dado** — `99-verify.mjs` compara contagem tabela por tabela. Depois o
   julgamento humano: margem, custo/hora e timesheet continuam batendo?
4. **Functions** — uma a uma, por invoke manual.

## O que ainda falta escrever

- `01-restore.sh` / `02-data.sh` — dependem de saber o que o "Export data"
  produz (dump `pg_dump` completo → `psql` direto; só dados → extração por
  query no SQL editor)
- `05-post-config.sql` está escrito como **rascunho** (realtime + cron via
  Vault). Ele não é aplicado por ninguém: quando validado no sombra, é
  promovido a migration versionada em `supabase/migrations/`
- Troca do `ai.gateway.lovable.dev` por Anthropic direto em `parse-cnpj-card`
