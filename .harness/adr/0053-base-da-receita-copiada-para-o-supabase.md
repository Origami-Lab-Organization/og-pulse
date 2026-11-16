# ADR 0053: A base da Receita chega ao Pulse por cópia periódica no Supabase

- Status: aceito
- Data: 2026-11-16
- Decisores: Victor Couto
- Histórias: US-0001, US-0002 (`.harness/prd/`)

## Contexto

A nova tela Comercial > Empresas lista as médias e grandes empresas ativas do país a
partir de uma base montada numa VPS: PostgreSQL `cnpj`, com os dados abertos da
Receita, a RAIS e a dívida ativa da PGFN (mapa em `.harness/prd/README.md`). O Pulse
precisa ler essa base com três exigências confirmadas pelo produto:

1. **A lista responde em até 2 segundos** depois de mudar um filtro.
2. **A triagem cruza a base com a Prospecção.** "A classificar" exclui as contas com
   oportunidade em andamento e as já classificadas; "Na Prospecção" lista as contas do
   tenant. Paginar uma lista que depende das duas fontes exige as duas no mesmo banco.
3. **Só quem tem `prospeccao:ler` lê**, e nenhuma credencial chega ao navegador.

Medido em 2026-11-15, direto na VPS: uma contagem sobre a base inteira levou de 30 a
45 segundos; o recorte útil tem 3.174.425 matrizes ativas.

### Alternativas descartadas

- **Edge Function consultando a VPS a cada filtro.** Exige abrir a porta do Postgres da
  VPS para a internet (os IPs de saída do Supabase não são fixos), soma a latência de
  rede a cada clique e não resolve a exigência 2: a exclusão das contas da Prospecção
  teria de viajar como lista de CNPJs a cada página.
- **API própria na VPS (PostgREST ou serviço HTTP).** Resolve a porta, mas cria uma
  segunda infraestrutura para operar e continua sem resolver a exigência 2.
- **Foreign data wrapper (`postgres_fdw`) do Supabase para a VPS.** Mesmo problema de
  porta exposta, e o planejador não empurra bem filtros e ordenação para o servidor
  remoto em tabelas desse tamanho.

## Decisão

**Um recorte da base é copiado para o Supabase** na tabela `public.receita_empresas`,
uma linha por matriz ativa, com tudo o que a tela lista e filtra já calculado:
funcionários, filiais ativas, número de sócios, dívida ativa, contato público e a
**nota de fit prévio**. As descrições de CNAE e de natureza jurídica ficam em tabelas
pequenas de apoio (`receita_cnaes`, `receita_naturezas`), para não repetir texto em
3 milhões de linhas. A data e o total da carga ficam em `receita_base`.

**A leitura é por RPC `SECURITY INVOKER`** (`listar_empresas_receita`), com RLS nas
tabelas: `has_capability(auth.uid(), get_user_tenant_id(auth.uid()), 'prospeccao:ler')`
dentro de `(SELECT ...)`, avaliado uma vez por consulta e não por linha. A base é
pública e igual para todos os tenants, por isso não tem `tenant_id`; o que separa os
tenants continua nas tabelas da Prospecção. Não é leitura entre tenants no sentido do
ADR-0033: nenhum dado de tenant mora nessas tabelas.

**A ordenação é feita pelo banco, com índice por coluna ordenável**, e a ordem vem de
uma lista fechada dentro da função (nada do cliente vira SQL).

**A carga é um script do repositório** (`scripts/receita/sincronizar-base.ts`), que:

1. lê o recorte da VPS com o usuário só de leitura `pulse_leitura`, pelo túnel SSH;
2. calcula a nota de fit prévio com o **mesmo módulo** da tela (`src/lib/prospecting/fit.ts`,
   ADR-0042), sem reimplementar a regra em SQL;
3. grava no Supabase numa transação só: `TRUNCATE` + `COPY` + atualização de `receita_base`.

Sem `--aplicar`, o script só lê, calcula e mostra o resumo, sem escrever nada.

## Consequências

- **Benefícios:**
  - Filtrar e ordenar ficam no mesmo banco das contas da Prospecção; a exclusão de
    "A classificar" é uma junção, não uma lista enviada pela rede.
  - A porta do Postgres da VPS continua fechada; o acesso segue pelo túnel SSH.
  - A nota de fit continua com regra única.
- **Custos:**
  - Espaço: **1,9 GB** medidos com a base real em 16/11/2026 (746 MB de dados e 1,17 GB
    de índices, 3.093.706 empresas), dentro do disco do plano Pro (ADR-0026).
  - **A navegação vai até as 10 mil primeiras de cada ordem.** Medido: a primeira página
    de qualquer ordem sai entre 2 e 6 ms; com 10 mil de deslocamento, até 0,7 s; com 250 mil,
    20 s. Passar disso pede paginação por cursor, que fica para quando os filtros (US-0003)
    não bastarem. A função recusa página além do limite.
  - **Durante a carga a tela espera.** O `TRUNCATE` segura a tabela até o `COMMIT`; uma
    consulta que passar do tempo limite mostra "base indisponível" (US-0001, cenário 3).
    Rodar fora do horário comercial.
  - A base no Pulse é tão atual quanto a última carga. A tela mostra a data da base.
  - A carga real levou 15 minutos (925 s) da VPS até o banco de ensaio.
  - O script precisa da connection string do banco do Supabase (`SUPABASE_DB_URL`),
    que não pode ir para o repositório nem para log.
- **Riscos:**
  - A carga é manual até virar rotina na VPS. Esquecer de rodar deixa a base velha.
  - Mudança de estrutura na base da VPS quebra o script, e não a tela. A falha é ruidosa
    e acontece antes de qualquer escrita.

## Revisitar quando

- A carga precisar ser diária, ou a base passar de 10 milhões de linhas.
- O Supabase oferecer IP de saída fixo, o que reabre a consulta direta.
