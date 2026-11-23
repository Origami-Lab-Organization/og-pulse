# US-0019 — Ver a relação da Origami com cada empresa

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 18/11/2026
- **Relacionadas:** US-0002, US-0003, US-0007, US-0008, US-0020, ADR-0040, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** ver na lista de empresas se a empresa é cliente da Origami, se já foi, se está sendo
abordada ou se já foi abordada sem sucesso,
**para** definir a forma de abordar e quem abordar antes de movê-la para abordar.

### Contexto

Passo 3 do fluxo do Victor (18/11/2026): antes de abordar, avaliar a relação da empresa com a
Origami. A tela Empresas é só o filtro da base da Receita, sem abas (US-0008), e a empresa não
some da lista depois de ir para A abordar: a coluna de relação é o que diz quem já está no
Pipeline ou já é cliente.

### Escopo

- Inclui: coluna "Relação" na lista da base, com uma marca por empresa, calculada pelos
  clientes, projetos e oportunidades do Pulse; empresa sem relação fica com "—".
- Inclui: o detalhe da marca ao passar o mouse (etapa e responsável, motivo e data da perda,
  projeto em andamento).
- Inclui: filtro "Relação com a Origami" no painel de filtros.
- Inclui: ordenar a lista pela relação e, no mesmo pedido do Victor (18/11/2026), pelo capital
  social.
- Inclui: na ficha da empresa (gaveta da tela Empresas), o histórico resumido da relação.
- Inclui: aviso de "Pediu para parar" na lista e na janela de "Mover para abordar", sem
  impedir.
- Não inclui: estudo da conta (US-0020); Métricas (US-0021); mudar a regra de "posso
  abordar?" da Prospecção.

### Relações

Quando mais de uma vale, a coluna mostra a primeira desta ordem (decisão de 18/11/2026):

| Ordem | Relação | Quando aparece |
|---|---|---|
| 1 | Cliente ativo | tem projeto em planejamento, em andamento ou pausado |
| 2 | Sendo abordada | tem oportunidade em andamento no Pipeline, de A abordar até antes de Ganho ou Perda |
| 3 | Já foi cliente | teve projeto (só concluídos ou cancelados) ou Ganho, sem projeto aberto agora |
| 4 | Abordada sem sucesso | a última oportunidade terminou em Perda nos últimos 12 meses |
| — | (vazio) | nada disso |

"Pediu para parar" aparece como alerta na marca de "Abordada sem sucesso" (ver cenário 5).

## Critérios de aceite

**Cenário 1: cliente ativo**

- **Dado** uma empresa com projeto em planejamento, em andamento ou pausado;
- **Então** a coluna "Relação" mostra "Cliente ativo";
- **E** ao passar o mouse vejo o projeto e o status;
- **E**, se ela também tem oportunidade em andamento, a marca continua "Cliente ativo" e o
  detalhe mostra a oportunidade, com a etapa e o responsável.

**Cenário 2: sendo abordada**

- **Dado** uma empresa com oportunidade em andamento (de A abordar até antes de Ganho ou
  Perda) e sem projeto aberto;
- **Então** a coluna mostra "Sendo abordada";
- **E** ao passar o mouse vejo a etapa e o responsável.

**Cenário 3: já foi cliente**

- **Dado** uma empresa com projetos só concluídos ou cancelados, ou com Ganho sem projeto
  aberto, e sem oportunidade em andamento;
- **Então** a coluna mostra "Já foi cliente";
- **E** ao passar o mouse vejo o último projeto ou Ganho e a data.

**Cenário 4: abordada sem sucesso**

- **Dado** uma empresa cuja última oportunidade terminou em Perda há menos de 12 meses, sem
  projeto nem oportunidade em andamento;
- **Então** a coluna mostra "Abordada sem sucesso";
- **E** ao passar o mouse vejo o motivo, a data e quem conduziu;
- **Dado** que a Perda foi há mais de 12 meses;
- **Então** a coluna fica com "—" e a perda continua no histórico da ficha.

**Cenário 5: pediu para parar**

- **Dado** que a última Perda da empresa foi "Pediu para parar", nos últimos 12 meses;
- **Então** a marca "Abordada sem sucesso" aparece em destaque de alerta, com "Pediu para
  parar";
- **E** ao movê-la para abordar, a janela de confirmação avisa, sem impedir.

**Cenário 6: filtro por relação**

- **Dado** que escolho uma ou mais relações no filtro "Relação com a Origami";
- **Então** a lista e o total mostram só as empresas com essas relações;
- **E** o filtro entra na contagem de filtros ativos e em "Limpar filtros", como os outros.

**Cenário 7: histórico na ficha**

- **Dado** uma empresa com relação;
- **Quando** abro a ficha na tela Empresas;
- **Então** vejo a relação atual e o histórico resumido: as oportunidades (etapa final, motivo
  da perda, data e quem conduziu) e os projetos (nome e status), com link para cada um.

**Cenário 8: relação muda**

- **Dado** que movo uma empresa para abordar (US-0008), ou devolvo para a lista;
- **Então** a coluna e a ficha mostram a relação nova ao voltar para a lista.

**Cenário 9: dados da relação indisponíveis**

- **Dado** que a consulta da relação falha;
- **Então** a lista aparece normalmente, com a coluna indicando que a relação não carregou;
- **E** o filtro por relação avisa que está indisponível.

**Cenário 10: ordenar por relação ou capital social**

- **Quando** clico em "Relação" no cabeçalho;
- **Então** as empresas com relação vêm primeiro, na ordem Cliente ativo → Sendo abordada →
  Já foi cliente → Abordada sem sucesso, e dentro de cada uma pelo fit prévio; depois, as sem
  relação;
- **Quando** clico de novo;
- **Então** a ordem se inverte: as sem relação primeiro;
- **Quando** clico em "Capital social";
- **Então** a lista vai do maior capital para o menor, e de novo, do menor para o maior;
  capital zero ou não informado fica no fim nos dois sentidos.

## Decisões (Victor Couto, 2026-11-18)

- Cliente ativo é quem tem projeto em planejamento, em andamento ou pausado; já foi cliente é
  quem teve projeto (só concluídos ou cancelados) ou Ganho, sem projeto aberto.
- A relação vem numa coluna própria, com filtro.
- Ordem quando mais de uma vale: Cliente ativo → Sendo abordada → Já foi cliente → Abordada
  sem sucesso.
- "Abordada sem sucesso" vale por 12 meses depois da Perda.
- "Pediu para parar" só avisa: não impede mover para abordar.
- A ficha da tela Empresas mostra o histórico resumido da relação.
- A lista ordena por relação e por capital social (pedido na validação, 18/11).
- Na validação, a barra da tela foi refeita: a busca à esquerda, o total à direita e, na
  ponta, só o ícone de filtros, com um selo da quantidade de filtros ativos. O ícone abre os
  filtros numa gaveta por cima da lista em qualquer tela (o painel ao lado espremia a tabela;
  revê a US-0004). "Importar CNPJs" virou um botão menor, de contorno (18/11).

## Pontos em aberto

### Hipóteses para validar

- A empresa é reconhecida como cliente pelo CNPJ do cadastro de clientes, além da ligação da
  empresa da Prospecção com o cliente. Origem: `clients.cnpj` e `prospect_companies.client_id`.
- Cliente cadastrado sem nenhum projeto nem Ganho aparece como "Já foi cliente". Origem:
  leitura da regra "já teve relação comercial".
- "Pediu para parar" avisa mesmo depois dos 12 meses, porque é pedido da empresa e não
  resultado de uma tentativa. Origem: regra atual da Prospecção (`companyProspectStatus`).
- O CNPJ do cliente pode ser de filial; a relação vale para a matriz (raiz do CNPJ), como a
  busca (US-0005). Origem: a base só tem matrizes.

### Provocações para produto

- Quem tem só `prospeccao:ler` passa a ver que a empresa é cliente e o status dos projetos
  dela — impacto possível: se o time comercial não deve ver projetos, o detalhe precisa
  esconder o nome do projeto e mostrar só a relação.
- A relação "Sendo abordada" inclui A abordar — impacto possível: empresa movida para
  abordar e esquecida fica marcada indefinidamente; o tempo em A abordar entra nas Métricas
  (US-0021).

## Contexto técnico

- **Objetivo observável:** coluna, detalhe, filtro e histórico da relação na tela Empresas.
- **Termos do domínio:** Oportunidade (`prospects`), etapas e Perda com motivo
  (`PROSPECT_DISCARD_REASONS`), cliente (`clients`), projeto e status (`projects`,
  `PROJECT_STATUS_LABELS`), empresa da Prospecção (`prospect_companies`) — fonte: glossário.
- **Comportamento atual:** PROVADO —
  - a situação da empresa cadastrada é calculada em `companyProspectStatus`
    (`src/lib/prospecting/companyStatus.ts`) com cliente ligado e etapas das oportunidades;
    não olha projetos nem a data da perda;
  - a Edge Function `empresas-receita` já cruza a página da VPS com dados do tenant, pela
    sessão da pessoa (faturamento do time, `comFaturamentoDoTime`; oportunidades da ficha,
    `oportunidadesDaEmpresa`);
  - a ficha da tela Empresas mostra "Já no Pipeline" com as oportunidades em andamento.
- **Superfícies conhecidas:** Edge Function `empresas-receita` (modos página, total e
  ficha), `EmpresasReceitaTable`, `PainelDeFiltros`/`filtrosReceita`,
  `FichaDaEmpresaReceita`, `ColocarParaAbordarDialog`.
- **Restrições e padrões aplicáveis:** a base da Receita fica na VPS e o Supabase não guarda
  nada dela (ADR-0053); dados do tenant lidos com a sessão da pessoa, sem cruzar tenants
  (boundaries); tela e MCP juntos quando a regra for compartilhada (TD-0022).
- **Riscos para investigar:**
  - leitura de `clients` e `projects` por quem tem só `prospeccao:ler` (ADR-0023, ADR-0046):
    se a RLS esconder projetos, a relação sai errada sem aviso;
  - filtro por relação sobre a base da VPS: a lista de CNPJs vem do Supabase e entra na
    consulta da VPS, com o limite de 5 s (`saoPoucas`);
  - reaproveitar ou estender `companyProspectStatus` sem mudar a regra de "posso abordar?"
    de outras telas.
- **Provas esperadas:** cada relação e a ordem entre elas; limite de 12 meses; pediu para
  parar com aviso na janela; filtro com contagem; histórico na ficha; falha da consulta sem
  derrubar a lista; cliente reconhecido pelo CNPJ.
- **Fora do escopo:** estudo da conta (US-0020); Métricas (US-0021).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 10 | validação na tela pelo Victor em 18/11/2026; testes desativados neste ciclo |

- **Regra:** `supabase/functions/_shared/relacao.ts` (`relacaoDaEmpresa`, ordem das relações,
  12 meses, "Pediu para parar" sem prazo) e os contratos em `relacaoTipos.ts`; a tela importa
  os tipos (`src/types/relacao.ts`) e os rótulos (`src/lib/prospecting/relacao.ts`).
- **Edge Function `empresas-receita`:** lê clientes, empresas da Prospecção, oportunidades e
  projetos do tenant com a sessão da pessoa (de mil em mil), junta pela raiz do CNPJ e devolve
  `relacao` em cada linha da página, `relacao_indisponivel` quando a leitura falha, e
  `relacao` + `historico` na ficha. O filtro `relacoes` vira a lista de raízes na consulta da
  VPS (`cnpj_basico`, com índice). Volume em 18/11/2026: 1.444 empresas com CNPJ, 26 clientes,
  197 oportunidades, 47 projetos.
- **Tela:** coluna "Relação" com selo e detalhe (`SeloDeRelacao`), grupo "Relação com a
  Origami" no painel de filtros (primeiro grupo; conta nos filtros ativos e fica guardado),
  aviso quando a relação não carrega, seção "Relação com a Origami" na ficha com projetos e
  oportunidades (substitui "Já no Pipeline"), aviso de "Pediu para parar" na janela de
  confirmação. Mover para abordar e Devolver para a lista atualizam a lista e o total.
- **Ordenação:** "relacao" em duas partes (com relação, pelo índice de `cnpj_basico`; sem
  relação, pelo índice do fit), com `grupo_relacao` calculado na página; "capital" por
  `nullif(capital_social, 0)`, com dois índices novos em `scripts/receita/vps/esquema.sql`
  (criados na VPS em 18/11/2026 com o ok do Victor, `CREATE INDEX CONCURRENTLY`, 28 s e 14 s; a
  primeira página por capital leva 7 ms; a próxima carga os mantém).
