# Integração: base da Receita na VPS

- Status: **em desenvolvimento** desde 16/11/2026 (US-0001, US-0002, ADR-0053).
- Onde: tela Comercial > Empresas, aba "A classificar".
- Código: preparação em `scripts/receita/vps/preparar-vps.sql`; carga em
  `scripts/receita/sincronizar-base.ts`; leitura pela Edge Function
  `supabase/functions/empresas-receita`; tela em `src/components/prospeccao/receita/`.
- **O Supabase não guarda nada da base** (plano gratuito, 500 MB).

## Origem

PostgreSQL 16 `cnpj`, em Docker numa VPS do Victor, com os dados abertos da Receita
(empresas, estabelecimentos, sócios), a RAIS 2025 e o resumo da dívida ativa da PGFN.
Mapa das tabelas, volumes e índices em `.harness/prd/README.md` ("A base mapeada").
Atualização da base original: processo do Victor, fora do Pulse.

## Usuários do banco

| Usuário | Para quê | Por onde entra |
|---|---|---|
| `pulse_leitura` | o script lê a base original (`public.*`) | só pelo túnel SSH |
| `pulse_carga` | o script grava o recorte (`pulse.*`, dono do schema) | só pelo túnel SSH |
| `pulse_api` | a Edge Function lê `pulse.*` e `public.cnaes`; só leitura, 5 s por consulta, até 20 conexões | da internet, **só por TLS, com certificado conferido** |

Credenciais locais em `~/.config/og-pulse/receita-db.env` (leitura) e
`~/.config/og-pulse/receita-carga.env` (carga), permissão 600, fora do repositório. A senha
do `pulse_api` só existe no segredo `RECEITA_DB_URL` da Edge Function.

## Contrato

O script grava o recorte abaixo em `pulse.empresas`, numa transação só.

| `pulse.empresas` | Base original | Observação |
|---|---|---|
| `cnpj`, `cnpj_basico` | `estabelecimentos` | só `situacao_codigo = '02'` (Ativa), `matriz_filial = 'Matriz'`, `uf <> 'EX'` |
| `razao_social`, `natureza_juridica`, `capital_social` | `empresas` (`capital_social_valido`) | a base só tem porte "Demais" |
| `nome_fantasia`, `nome_exibicao` | `estabelecimentos.nome_fantasia` | exibição = fantasia, senão razão social |
| `cnae_principal`, `cnaes_secundarios` | `estabelecimentos` | a descrição vem de `public.cnaes` na consulta |
| `data_inicio_atividade`, `municipio`, `uf` | `estabelecimentos` | |
| `funcionarios`, `unidades_com_funcionarios` | `empresas_funcionarios_total` | nulo = sem RAIS (cerca de 80% da base) |
| `filiais_ativas` | contagem em `estabelecimentos` | filiais com situação Ativa |
| `socios` | contagem em `socios` | **só a quantidade**: nada de nome, CPF ou faixa etária (ADR-0041) |
| `divida_total`, `divida_em_cobranca`, `divida_ajuizada`, `inscricoes_divida` | `pgfn_resumo` | nulo = sem inscrição |
| `tem_email`, `tem_telefone` | `estabelecimentos.email`, `telefone_1` | só se existe; o contato em si não é copiado |
| `fit_previo`, `fit_frente` | calculado pelo script | `src/lib/prospecting/fit.ts`, sem regime nem site (ADR-0042) |
| `faturamento_estimado` | — | US-0006, ainda vazio |

A Edge Function recebe `{ ordem, crescente, pagina }` e devolve
`{ total, carregada_em, linhas[] }`. Ordens: `fit`, `nome`, `funcionarios`, `idade`.
Páginas de 25, até a 400ª (10 mil empresas). Sem sessão: 401. Sem `prospeccao:ler`: 403.
Base fora do ar ou lenta: 503.

## Preparação da VPS (uma vez)

Feita pelo Victor, que tem acesso de root. Nada disso roda pelo Pulse.

```bash
# 0. Nome do container e portas publicadas
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'

# 1. Schema pulse e usuários (rodar como postgres)
docker cp scripts/receita/vps/preparar-vps.sql <container>:/tmp/
docker exec -it <container> psql -U postgres -d cnpj -f /tmp/preparar-vps.sql
docker exec -it <container> psql -U postgres -d cnpj   # e dentro:
#   \password pulse_carga
#   \password pulse_api

# 2. TLS: uma autoridade própria emite o certificado do servidor, com o IP da VPS.
#    Rodar na sua máquina; guarde ac.key fora da VPS e do repositório.
IP=<ip-da-vps>
openssl req -new -x509 -days 3650 -nodes -subj "/CN=AC Pulse" -keyout ac.key -out ac.crt
openssl req -new -nodes -subj "/CN=$IP" -keyout server.key -out server.csr
printf "subjectAltName=IP:$IP\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n" > ext.cnf
openssl x509 -req -in server.csr -CA ac.crt -CAkey ac.key -CAcreateserial -days 825 -extfile ext.cnf -out server.crt
scp server.key server.crt root@$IP:/tmp/
# na VPS:
docker cp /tmp/server.key <container>:/var/lib/postgresql/data/
docker cp /tmp/server.crt <container>:/var/lib/postgresql/data/
docker exec <container> sh -c 'cd /var/lib/postgresql/data && chown postgres:postgres server.key server.crt && chmod 600 server.key'
docker exec <container> psql -U postgres -c "ALTER SYSTEM SET ssl = on" -c "SELECT pg_reload_conf()"
rm /tmp/server.key /tmp/server.crt
```

O certificado do servidor vale 825 dias. A função confere o certificado contra `ac.crt`;
sem ele, a conexão é recusada.

**3. Regras de acesso (`pg_hba.conf`).** A primeira regra que casa vale. Trocar as linhas
`host` existentes por estas, nesta ordem, e recarregar com `SELECT pg_reload_conf()`:

```
# túnel SSH e rede do Docker: todos os usuários
host    all     all        127.0.0.1/32    scram-sha-256
host    all     all        172.16.0.0/12   scram-sha-256
# da internet: só pulse_api, só no banco cnpj, só por SSL
hostssl cnpj    pulse_api  0.0.0.0/0       scram-sha-256
hostssl cnpj    pulse_api  ::/0            scram-sha-256
# o resto que vier de fora é recusado
host    all     all        0.0.0.0/0       reject
host    all     all        ::/0            reject
```

```bash
docker cp <container>:/var/lib/postgresql/data/pg_hba.conf ./pg_hba.conf   # editar
docker cp ./pg_hba.conf <container>:/var/lib/postgresql/data/pg_hba.conf
docker exec <container> sh -c 'chown postgres:postgres /var/lib/postgresql/data/pg_hba.conf'
docker exec <container> psql -U postgres -c "SELECT pg_reload_conf()"
```

**4. Porta.** Se o passo 0 mostrar `127.0.0.1:5432->5432`, a porta só existe dentro da
VPS. Publicar como `0.0.0.0:5432->5432` exige recriar o container com a nova porta (o
volume de dados continua). Liberar no firewall da VPS (`ufw allow 5432/tcp`) e no painel
do provedor, se houver.

**5. Conferir de fora**, de outra máquina:

```bash
psql "postgres://pulse_api@<ip-da-vps>:5432/cnpj?sslmode=verify-full&sslrootcert=ac.crt" -c "select total from pulse.base"
psql "postgres://pulse_api@<ip-da-vps>:5432/cnpj?sslmode=disable" -c "select 1"   # deve ser recusado
psql "postgres://postgres@<ip-da-vps>:5432/cnpj?sslmode=require" -c "select 1"     # deve ser recusado
```

**6. Edge Function.**

```bash
npx supabase secrets set RECEITA_DB_URL='postgres://pulse_api:<senha>@<ip-da-vps>:5432/cnpj'
npx supabase secrets set RECEITA_DB_CA="$(cat ac.crt)"
npx supabase functions deploy empresas-receita
```

## Carga

```bash
# túnel aberto num terminal
ssh -N -L 5433:localhost:5432 root@<vps>
# simulação: lê e resume, não grava
npx vite-node scripts/receita/sincronizar-base.ts
# carga em pulse.empresas (fora do horário comercial; levou 15 minutos)
npx vite-node scripts/receita/sincronizar-base.ts -- --aplicar
```

`~/.config/og-pulse/receita-carga.env` tem o mesmo formato do arquivo de leitura, com
`PGUSER=pulse_carga` e a senha dele. O script usa o `psql` da máquina; sem ele, o do
container `postgres:16-alpine`.

## Falhas

- **Túnel fechado ou VPS fora, na carga:** o script falha na leitura, antes de qualquer escrita.
- **Estrutura da base mudou:** o script falha com o erro do Postgres; a tela continua com a
  carga anterior.
- **VPS fora, na tela:** a função desiste em 5 s e responde 503, e a tela mostra "A base da Receita está
  indisponível agora", com "Tentar de novo".
- **Durante a carga:** o `TRUNCATE` segura a tabela; a consulta passa de 5 s e a tela mostra
  "indisponível" até o `COMMIT`.
- Os logs do script e da função só trazem contagens e o nome do erro, nunca dado de
  empresa, endereço da VPS ou senha.
