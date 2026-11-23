# ADR 0053: A base da Receita fica na VPS e o Pulse lê por Edge Function

- Status: aceito
- Data: 2026-11-16
- Decisores: Victor Couto
- Histórias: US-0001, US-0002 (`.harness/prd/`)

## Contexto

A nova tela Comercial > Empresas lista as médias e grandes empresas ativas do país a
partir de uma base montada numa VPS: PostgreSQL 16 `cnpj`, em Docker, com os dados
abertos da Receita, a RAIS e a dívida ativa da PGFN (13 GB; mapa em
`.harness/prd/README.md`). Exigências confirmadas pelo produto:

1. **A lista responde em até 2 segundos** depois de mudar um filtro.
2. **Só quem tem `prospeccao:ler` lê**, e nenhuma credencial chega ao navegador.
3. **Nada da base vai para o Supabase.** O Victor montou a VPS justamente para não
   carregar esse volume no Supabase, que está no plano gratuito, com limite de 500 MB.

Medido em 2026-11-16, com a base real (3.093.706 matrizes ativas): o recorte que a tela
lê, com índices, ocupa 1,9 GB. Uma contagem sobre a base original levou de 30 a 45 s.

**Correção registrada.** A primeira versão deste ADR, nunca mergeada, copiava o recorte
para o Supabase, apoiada no ADR-0026 ("Supabase Pro no lugar dos créditos do Lovable").
O Victor corrigiu em 16/11/2026: o plano é gratuito. Antes de pôr dado volumoso no
Supabase, confirmar o plano com o dono da conta.

### Alternativas descartadas

- **Copiar o recorte para o Supabase.** Estoura o limite do plano gratuito.
- **API própria na VPS (serviço HTTP com HTTPS).** Mantém o Postgres fechado, mas exige
  domínio, certificado e mais um serviço para operar. Preterida pelo Victor em favor da
  conexão direta, com as proteções abaixo.
- **`postgres_fdw` do Supabase para a VPS.** Mesma exposição de porta, e o planejador não
  empurra bem filtros e ordenação para o servidor remoto em tabelas desse tamanho.

## Decisão

**O recorte mora na VPS**, no schema `pulse` (`pulse.empresas` e `pulse.base`), uma linha
por matriz ativa, com tudo o que a tela lista e ordena já calculado: funcionários,
filiais ativas, número de sócios, dívida ativa, contato público e a **nota de fit
prévio**. Preparação única: `scripts/receita/vps/preparar-vps.sql`.

**A carga é um script do repositório** (`scripts/receita/sincronizar-base.ts`), rodado
pelo túnel SSH: lê a base com `pulse_leitura`, calcula o fit com o **mesmo módulo** da tela
(`src/lib/prospecting/fit.ts`, ADR-0042) e grava em `pulse.empresas` com `pulse_carga`,
numa transação só (`TRUNCATE` + `COPY` + `pulse.base`). Sem `--aplicar`, só simula.

**A tela lê pela Edge Function `empresas-receita`.** Ela valida a sessão, confere
`has_capability(..., 'prospeccao:ler')` no tenant da pessoa e só então consulta a VPS com
`pulse_api`. A ordem vem de uma lista fechada; nada do cliente vira SQL. O navegador nunca
fala com a VPS.

**A porta do Postgres abre para a internet com quatro proteções:**

1. **TLS obrigatório e certificado conferido.** Quem vem de fora só entra por `hostssl`
   no `pg_hba`. O certificado do servidor é emitido por uma autoridade própria, criada só
   para isso, e a função confere esse certificado contra ela (segredo `RECEITA_DB_CA`).
   Um servidor que não tenha certificado emitido por essa autoridade é recusado.
2. **Só `pulse_api` entra de fora**, e só no banco `cnpj`. `postgres`, `pulse_leitura` e
   `pulse_carga` continuam só pelo túnel.
3. **`pulse_api` só lê** `pulse.*` e `public.cnaes`, com `default_transaction_read_only`,
   `statement_timeout` de 5 s e no máximo 20 conexões.
4. **Senha forte**, `scram-sha-256`, guardada só no segredo `RECEITA_DB_URL` da função.

**Driver nativo do Deno (`deno-postgres`).** O `npm:postgres` não abre TLS com o Postgres
no Deno: testado em 16/11/2026, estoura o tempo de conexão. O `deno-postgres` exige que o
certificado do servidor seja de uma autoridade conhecida, e não aceita um certificado
autoassinado que faça os dois papéis. Daí a autoridade própria. A função desiste em 5 s
se a VPS não responder.

**A navegação vai até as 10 mil primeiras de cada ordem.** Medido: a primeira página de
qualquer ordem sai entre 2 e 6 ms no banco; com 10 mil de deslocamento, até 0,7 s; com
250 mil, 20 s. Passar disso pede paginação por cursor, que fica para quando os filtros
(US-0003) não bastarem.

## Consequências

- **Benefícios:**
  - O Supabase não guarda nada da base; o plano gratuito não é afetado.
  - A nota de fit continua com regra única.
  - Quem lê é sempre conferido pelo Pulse antes de a consulta sair.
- **Custos:**
  - **O Postgres da VPS fica acessível da internet**, ainda que só para `pulse_api` e
    por SSL. Tentativas de acesso vão aparecer no log; vale `fail2ban` ou bloqueio por
    país no firewall da VPS.
  - A latência entre a Edge Function (`sa-east-1`) e a VPS soma a cada consulta. Medir
    depois da configuração.
  - **Durante a carga a tela espera.** O `TRUNCATE` segura a tabela até o `COMMIT`; a
    consulta passa dos 5 s e a tela mostra "base indisponível". Rodar fora do horário
    comercial. A carga real levou 15 minutos.
  - A VPS ganha 1,9 GB.
- **Riscos:**
  - A chave da autoridade própria fica com o Victor, fora da VPS e do repositório. Quem a
    tiver pode emitir um certificado que a função aceita. O certificado do servidor vence
    em 825 dias e precisa ser reemitido antes disso.
  - A carga é manual até virar rotina na VPS.
  - "A classificar" vai precisar excluir as contas da Prospecção (US-0011). Com a base em
    outro banco, a função manda a lista de CNPJs do tenant na consulta. Isso cabe enquanto
    a Prospecção tiver poucos milhares de contas.

## Revisitar quando

- A Prospecção passar de 10 mil contas por tenant (a lista de exclusão fica pesada).
- O Supabase sair do plano gratuito.
- O certificado do servidor estiver perto de vencer (825 dias a partir da emissão).
