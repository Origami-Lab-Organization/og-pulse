# US-0001 — O Pulse lê a base da Receita com segurança e rapidez

- **Status:** Em desenvolvimento
- **Tipo:** técnica
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 1
- **Aprovada por / em:** Victor Couto, 2026-11-16
- **Relacionadas:** US-0002, US-0003, ADR-0021, ADR-0026, ADR-0027

### Necessidade

A base de empresas mora num PostgreSQL numa VPS, fora do Supabase. O navegador não
pode falar com ela direto: a senha ficaria exposta e a porta do banco teria de abrir
para a internet. Além disso, consultas sobre a base inteira são lentas. Uma contagem
levou de 30 a 45 segundos em 2026-11-15, o que inviabiliza filtrar na hora.

### Resultado esperado

A tela Empresas consulta a base pelo Pulse, com o login e a capacidade de quem está
usando, e cada filtro responde rápido o bastante para a pessoa continuar a triagem
sem esperar.

### Escopo

- Inclui: caminho seguro do Pulse até a base; recorte só com matrizes ativas;
  índices para os filtros das histórias US-0003 e US-0005; contrato da integração
  em `.harness/integrations/`.
- Não inclui: telas (US-0002 em diante); atualizar a base com a Receita, que é
  processo da VPS.

## Critérios de aceite

**Cenário 1: só quem pode lê**

- **Dado** que a pessoa não tem `prospeccao:ler`;
- **Quando** a tela ou qualquer chamada tenta ler a base;
- **Então** a leitura é recusada;
- **E** nenhuma credencial da base chega ao navegador.

**Cenário 2: filtro responde rápido**

- **Dado** que a pessoa tem `prospeccao:ler`;
- **Quando** aplica qualquer combinação de filtros da US-0003;
- **Então** a lista e o total aparecem em até 2 segundos.

**Cenário 3: base fora do ar**

- **Dado** que a VPS não responde;
- **Quando** a pessoa abre a tela;
- **Então** vê que a base está indisponível, sem lista vazia que pareça "nenhuma empresa";
- **E** o restante do Pulse continua funcionando.

## Decisões (Victor Couto, 2026-11-16)

- As opções de filtro não mostram contagem. Só o total da lista aparece. Isso tira
  da tela a consulta mais cara, que era contar cada opção.
- A lista aparece em até 2 segundos depois de mudar um filtro.
- **A base fica na VPS; o Supabase não guarda nada dela** (plano gratuito). A tela lê
  pela Edge Function `empresas-receita`, que conecta direto no Postgres da VPS, por SSL,
  com um usuário que só lê (ADR-0053).

## Pontos em aberto

### Decisões pendentes

- Nenhuma. Ver "Decisões".

### Hipóteses para validar

- Um recorte pré-calculado só com matrizes ativas (cerca de 3,2 milhões de linhas),
  já juntando funcionários e dívida ativa, resolve a lentidão. Origem: medição de
  2026-11-15.

### Provocações para produto

- A base da VPS é atualizada por quem e com que frequência? Se ficar meses sem
  atualizar, a tela mostra empresa baixada como ativa — impacto possível: abordagem
  a empresa que não existe mais.

## Contexto técnico

- **Objetivo observável:** tela Empresas lista e filtra a base com o login do Pulse.
- **Termos do domínio:** matriz ativa, `cnpj_basico` (8 dígitos, a empresa), `cnpj`
  (14 dígitos, o estabelecimento).
- **Comportamento atual:** PROVADO — o banco `cnpj` existe na VPS, com usuário só de
  leitura `pulse_leitura` criado em 2026-11-15, acesso por túnel SSH; mapa das tabelas
  em `../../README.md`.
- **Superfícies conhecidas:** tabelas `estabelecimentos`, `empresas`,
  `empresas_funcionarios_total`, `pgfn_resumo`, `socios`; índices em `cnae_principal`,
  `(uf, municipio_codigo, situacao_codigo)` e `cnpj_basico`.
- **Restrições e padrões aplicáveis:** segredo só em ambiente de servidor — fonte:
  `../../../patterns/security.md`; RPC com tenant e capacidade — fonte: ADR-0021,
  ADR-0027; migration roda no build da Vercel — fonte: ADR-0026; nada de dado de
  empresa em log — fonte: `../../../boundaries.md`.
- **Riscos para investigar:** porta do Postgres exposta na VPS; senha do
  `pulse_leitura` apareceu num print em 2026-11-15 e deve ser trocada antes de produção;
  sócios com faixa etária e CPF mascarado na base, que o Pulse não pode ler (ADR-0041).
- **Provas esperadas:** teste de acesso negado sem capacidade; medição de tempo dos
  filtros; teste da mensagem de base indisponível.
- **Fora do escopo:** carga e atualização da base na VPS.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Evidência, 16/11/2026: a Edge Function rodou num Deno 2.1 contra um Supabase falso e um Postgres 16 com TLS e a base real. Sem login: 401. Sem `prospeccao:ler`: 403, sem tocar na base. Com a capacidade: 200. Conexão sem o certificado da autoridade: recusada. A conexão com a VPS só existe na função e no script, nunca no navegador. |
| 2 | Evidência parcial, 16/11/2026: pela Edge Function, contra a base real num Postgres local com TLS, as quatro ordens responderam entre 9 e 55 ms. A página 399 por nome levou 2,1 s com o banco frio, depois de reiniciar, e 0,7 s com ele aquecido. A página além das 10 mil é recusada. **Falta:** medir contra a VPS de verdade, com a latência de rede. |
| 3 | Evidência parcial, 16/11/2026: com a conexão falhando, a função desistiu em 5 s e respondeu 503 "A base da Receita está indisponível agora", sem expor o erro do banco. A tela mapeia o 503 para essa mensagem, com "Tentar de novo". **Falta:** ver a tela nesse estado. |

- **Decisão de engenharia:** ADR-0053 (base na VPS, leitura por Edge Function). A
  primeira versão copiava para o Supabase e foi refeita antes do merge: o plano do
  Supabase é gratuito.
- **Ensaio da carga, 16/11/2026:** banco falso no lugar da VPS, com a amostra real de 70
  empresas, mais uma filial e uma empresa baixada. A simulação não gravou nada; a carga
  gravou 70 empresas, com filiais, sócios, dívida e contato calculados. A baixada ficou de
  fora, e as tabelas de apoio foram preenchidas.
- **Carga real, 16/11/2026:** 3.093.706 empresas em 15 minutos, 1,9 GB entre dados e
  índices. Fit prévio: 72% das empresas com nota 55 e 98% com a maior nota em Consultoria,
  o que confirma a necessidade da US-0014.
- **Falta para Pronto:** preparar a VPS (SSL, `pg_hba`, porta, usuários), trocar a senha
  do `pulse_leitura`, publicar a função com o segredo, rodar a carga em `pulse.empresas` e
  medir o cenário 2 pela função.
- **Commits / PR:** branch `feat/empresas-base-receita`.
- **Implantada em:** —
