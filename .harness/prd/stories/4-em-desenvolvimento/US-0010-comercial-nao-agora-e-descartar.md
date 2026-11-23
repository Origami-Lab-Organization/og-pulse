# US-0010 — Descartar a empresa ou marcar "Não agora"

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 23/11/2026 ("aprovo a US-0010, pode começar")
- **Relacionadas:** US-0007, US-0008, US-0019, US-0021, US-0023, ADR-0051, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** descartar da Base de empresas o que não serve e marcar "Não agora", com data para
voltar, o que é boa conta no momento errado,
**para** o time não avaliar a mesma empresa duas vezes e não esquecer de voltar a quem vale a
pena.

### Contexto

A história nasceu em 16/11/2026 para a tela com abas ("A classificar", "Não agora",
"Descartadas"). Desde então o fluxo mudou: a tela Empresas tem a "Base de empresas" e a aba
"Em qualificação" (US-0023), e a Qualificação sai para A abordar, para a Perda com motivo ou
volta para a lista. A Base marca "Abordada sem sucesso" por 12 meses depois de uma Perda
(US-0019).

Sobram dois buracos (revisão de 23/11/2026):

1. **Descartar sem estudar.** Para tirar da lista uma empresa que claramente não serve, hoje
   é preciso movê-la para qualificação e registrar a Perda — uma oportunidade criada só para
   perder, que conta nas Métricas (US-0021).
2. **Momento errado sem volta.** "Momento errado / adiado" vira Perda e ninguém é lembrado de
   voltar.

### Escopo

- Inclui: **Descartar** na Base de empresas (uma pela ficha, várias pela seleção da lista),
  com motivo obrigatório da lista própria, sem criar oportunidade. Vale para o time.
- Inclui: **"Não agora"** com data para voltar (3, 6 ou 12 meses, ou uma data; padrão 3
  meses), em dois lugares:
  - na Base de empresas, sem oportunidade;
  - como saída da Qualificação (e do Pipeline): a Perda "Momento errado / adiado" pede a data
    para voltar.
- Inclui: marcas novas na relação da empresa (US-0019): **Descartada**, **Não agora até
  dd/mm** e **Retomar** (a data chegou). Descartada e "Não agora" saem da lista por padrão e
  voltam pelo filtro de relação; "Retomar" fica na lista e tem filtro próprio.
- Inclui: na data, **aviso no sino** (ADR-0051) para quem marcou "Não agora" (ou para o
  responsável da oportunidade, quando veio da Qualificação).
- Inclui: **Desfazer** na mensagem e na ficha, por qualquer pessoa com `prospeccao:editar`,
  mesmo de outra pessoa. Mover a empresa para qualificação de novo encerra o "Não agora".
- Não inclui: os motivos de Perda da oportunidade (seguem como estão); descartar ou marcar
  "Não agora" pelo MCP (o MCP não lê a Base de empresas; ver Pontos em aberto).

## Critérios de aceite

**Cenário 1: descartar na base**

- **Dado** uma ou mais empresas na Base de empresas, sem oportunidade em andamento;
- **Quando** uso "Descartar" e escolho o motivo (Sem fit, Já é cliente ou parceiro,
  Concorrente, Dados inválidos ou Outro motivo, este com texto obrigatório);
- **Então** elas saem da lista para todo o time, sem criar oportunidade;
- **E** a mensagem diz "[empresa] descartada" (ou "N empresas descartadas"), com Desfazer.

**Cenário 2: ver e desfazer o descarte**

- **Dado** uma empresa descartada;
- **Quando** marco "Descartada" no filtro de relação;
- **Então** ela aparece com a marca, o motivo, quem descartou e quando (no hover e na ficha);
- **E** qualquer pessoa com `prospeccao:editar` pode desfazer, e ela volta para a lista.

**Cenário 3: "Não agora" na base**

- **Dado** uma empresa na Base de empresas, sem oportunidade em andamento;
- **Quando** marco "Não agora" (padrão 3 meses);
- **Então** ela sai da lista até a data, com a marca "Não agora até dd/mm".

**Cenário 4: "Não agora" na Qualificação**

- **Dado** uma oportunidade em Qualificação (ou no Pipeline);
- **Quando** registro a Perda com o motivo "Momento errado / adiado";
- **Então** escolho quando voltar (padrão 3 meses);
- **E** a oportunidade termina em Perda, como hoje;
- **E** a empresa fica com a marca "Não agora até dd/mm" na Base de empresas.

**Cenário 5: a data chega**

- **Dado** uma empresa em "Não agora" cuja data chegou;
- **Então** quem marcou (ou o responsável da oportunidade) recebe o aviso no sino: "Hora de
  retomar [empresa]", que abre a ficha;
- **E** a empresa volta para a lista com a marca "Retomar", e o filtro "Retomar" mostra só
  essas.

**Cenário 6: retomar**

- **Dado** uma empresa com "Retomar" ou em "Não agora";
- **Quando** a movo para qualificação (ou reabro a oportunidade perdida);
- **Então** a marca sai, e ela segue o fluxo normal.

**Cenário 7: empresa em andamento**

- **Dado** uma empresa com oportunidade em andamento;
- **Então** "Descartar" e "Não agora" não aparecem para ela na base; o caminho é a Perda na
  oportunidade.

**Cenário 8: sem permissão**

- **Dado** que tenho só `prospeccao:ler`;
- **Então** vejo as marcas, mas não os botões; o banco recusa a gravação.

## Decisões (Victor Couto)

- 16/11/2026: o descarte vale para o time inteiro, mostra quem descartou e o motivo, e
  qualquer pessoa com `prospeccao:editar` pode desfazer. Motivos do descarte: Sem fit, Já é
  cliente ou parceiro, Concorrente, Dados inválidos e Outro motivo (com texto) — lista própria,
  separada dos motivos de Perda. "Não agora" volta depois de 90 dias.
- 23/11/2026: descartar direto na Base de empresas, sem criar oportunidade (recomendação
  aceita).
- 23/11/2026: "Não agora" na Qualificação **e** na base.
- 23/11/2026: na data, aviso no sino e marca "Retomar" na base; nada reabre sozinho
  (recomendação aceita).

## Pontos em aberto

### Hipóteses para validar

- Prazo padrão de 3 meses no "Não agora" (os 90 dias de 16/11), com 6 e 12 meses e data livre.
- A marca vale pela raiz do CNPJ, como a relação (US-0019): descartar a matriz descarta a
  empresa toda.
- Prioridade das marcas na relação: Cliente ativo → Sendo abordada → Já foi cliente →
  Retomar → Não agora → Descartada → Abordada sem sucesso.

### Provocações para produto

- Empresa descartada que muda na Receita (entra no Lucro Real, troca de sócio) — impacto
  possível: oportunidade perdida se ninguém olhar. O `company-watch` só vigia empresas da
  Prospecção.
- O MCP não lê a Base de empresas (nem a relação); descartar e "Não agora" pelo chat ficam
  para depois — impacto possível: quem faz a triagem pelo Claude não consegue descartar ali.

## Contexto técnico

- **Comportamento atual:** PROVADO —
  - relação calculada em `supabase/functions/_shared/relacao.ts` (`RELACOES`, por raiz do
    CNPJ, dados do tenant pela sessão) e filtrada na VPS pela lista de raízes
    (`empresas-receita`, ADR-0053);
  - Perda em `discardUpdate` (`src/lib/prospecting/transitions.ts`) e
    `DiscardProspectDialog`, com `PROSPECT_DISCARD_REASONS` (`momento_errado` já existe);
  - sino: `public.notifications`, alimentado por tarefas agendadas no banco (`pg_cron`, como
    os lembretes do Meu Kanban em `20261021135000`);
  - não existe registro de decisão sobre empresa da base fora da Prospecção.
- **Mudanças no banco (migration nova, com rollback):**
  - tabela `prospect_decisoes_da_base`: tenant, raiz do CNPJ, decisão (`descartada` |
    `nao_agora`), motivo e texto (descarte), `voltar_em` (não agora), oportunidade de origem
    (quando veio da Qualificação), quem decidiu e quando, quem desfez e quando; uma decisão
    ativa por empresa e tenant;
  - RLS: leitura com `prospeccao:ler`, gravação e desfazer com `prospeccao:editar`, no tenant;
  - tarefa diária no `pg_cron` que avisa no sino quem marcou "Não agora" no dia da data.
- **Restrições e padrões aplicáveis:** base da Receita só na VPS (ADR-0053) — a decisão mora
  no Supabase, chaveada pela raiz do CNPJ; capacidade e linha na matriz (ADR-0027); RLS por
  tenant (ADR-0023); nomes Oportunidade/Pipeline.
- **Riscos para investigar:** lista de raízes escondidas crescendo (o filtro passa as raízes
  para a VPS); o "Não agora" da Qualificação gravado junto com a Perda (mesma ação).
- **Provas esperadas:** descartar (uma e várias), desfazer por outra pessoa, não agora na base
  e na Qualificação, aviso no sino na data, "Retomar", RLS.
- **Fora do escopo:** motivos de Perda; ações pelo MCP.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 4, 6 a 8 | tela validada pelo Victor em 23/11/2026 ("testei, tudo passou"); testes desativados neste ciclo |
| 5 | aviso no sino: a confirmar em 24/11/2026 às 8h (primeira execução da tarefa agendada) |

- Banco: migration `20261123200000`, aplicada em produção em 23/11/2026 com o ok do Victor (RLS, três políticas, três gatilhos e a tarefa das 8h conferidos); (tabela `prospect_decisoes_da_base` com RLS por
  capacidade, gatilho de guarda — quem decidiu e quem desfez vêm da sessão, a decisão não muda
  depois de gravada —, gatilho em `prospects` que encerra a decisão quando a empresa volta ao
  fluxo, aviso diário às 8h no sino pelo `pg_cron`), com rollback.
- Relação: marcas `retomar`, `nao_agora` e `descartada` em `_shared/relacao.ts`
  (`pelaDecisao`, `ESCONDIDAS_POR_PADRAO`); a `empresas-receita` lê as decisões do tenant e
  esconde da lista (e do total) as descartadas e em "Não agora" quando não há filtro de relação.
- Tela: `BarraDeSelecao` e rodapé da ficha com "Não agora" e "Descartar"
  (`DecisaoNaBaseDialog`, `useDecisoesDaBase`, `useDecidirNaSelecao`); detalhe e Desfazer na
  ficha (`DecisaoNaFicha`); "Voltar em" compartilhado (`CampoVoltarEm`) na Base e na Perda
  "Momento errado" (`DiscardProspectDialog`); selo "Não agora até dd/mm" e "Retomar"
  (`SeloDeRelacao`); `?cnpj=` abre a ficha pelo aviso do sino.
