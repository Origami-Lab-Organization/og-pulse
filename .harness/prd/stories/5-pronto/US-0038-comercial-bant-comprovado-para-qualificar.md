# US-0038 — Só o BANT comprovado qualifica a oportunidade

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 23/11/2026 ("pode seguir com a regra do BANT"; "Só evidências contam")
- **Relacionadas:** US-0014, US-0022, US-0024, ADR-0054

## Descrição

**Como** pessoa do comercial,
**quero** que a entrada em "Oportunidade qualificada" exija um BANT comprovado por evidências,
em qualquer caminho (tela, MCP ou gravação direta no banco),
**para** que "qualificada" queira dizer que alguém confirmou orçamento, decisor, necessidade e
momento, e não que o Pulse adivinhou.

### Contexto

A US-0022 exige nota 75 e nenhum "Não atende" para entrar em "Oportunidade qualificada", mas
só a tela e o MCP conferem; uma gravação direta no banco passa por cima. A nota soma também os
indícios automáticos do Pulse (B pelo faturamento, A pelo Decisor, N pelo fit), 1 ponto cada.

Em 23/11/2026 apareceu que o fit da empresa está saturado em 75 para quase toda empresa vinda
da Base (média ou grande, indústria, mais de 5 anos), então o indício N vale para todas — e o
banco nem consegue calculá-lo, porque o fit é calculado na tela. O refino do fit fica na
US-0014.

### Escopo

- Inclui: para entrar em "Oportunidade qualificada", a nota que conta é a **comprovada**: só as
  evidências aceitas (registradas pela pessoa, ou propostas pela IA e aceitas). Precisa de 75
  (6 de 8 pontos) e nenhum "Não atende" aceito.
- Inclui: os indícios do Pulse continuam nas letras e na nota mostrada, como pista; não somam
  para a entrada.
- Inclui: a regra no banco (gatilho em `prospects`), com a mesma conta da tela e do MCP; voltar
  de Ganho ou Perda para "Oportunidade qualificada" segue como correção, sem a regra.
- Inclui: a tela e o MCP dizem a nota comprovada e o que falta.
- Não inclui: refinar o fit (US-0014); mudar as metas por etapa.

## Critérios de aceite

**Cenário 1: indícios não qualificam**

- **Dado** uma oportunidade com nota 38 só de indícios do Pulse e nenhuma evidência;
- **Quando** tento movê-la para "Oportunidade qualificada";
- **Então** a tela recusa e diz "nota comprovada 0: para qualificar, 75 só com evidências
  aceitas".

**Cenário 2: evidências qualificam**

- **Dado** três letras confirmadas por evidências aceitas;
- **Quando** movo para "Oportunidade qualificada";
- **Então** ela entra.

**Cenário 3: "Não atende" barra**

- **Dado** uma letra com "Não atende" aceito, mesmo com nota comprovada 75;
- **Então** a entrada é recusada, com o motivo.

**Cenário 4: o banco também barra**

- **Dado** uma gravação direta de `stage = 'qualificado'` (script, MCP antigo, SQL) sem BANT
  comprovado;
- **Então** o banco recusa com a mesma mensagem.

**Cenário 5: correção**

- **Dado** uma oportunidade em Ganho ou Perda;
- **Quando** volto para "Oportunidade qualificada";
- **Então** o banco deixa, como a tela.

## Decisões (Victor Couto, 2026-11-23)

- Só as evidências aceitas contam para entrar em "Oportunidade qualificada"; os indícios do
  Pulse ficam como pista (recomendação aceita).
- O fit saturado em 75 é refinado na US-0014 (recomendação aceita).

## Contexto técnico

- **Comportamento atual:** PROVADO — `bantDaOportunidade` e `oQueFaltaParaQualificar` em
  `src/lib/prospecting/bant.ts`, usados por `exigirBantParaQualificar`
  (`src/services/prospectService.ts`) e pelo `move_contact_stage` do MCP; evidências em
  `prospect_bant_evidencias` (aceita, recusada, proposta).
- **Mudanças no banco:** migration nova, com rollback: função e gatilho `BEFORE UPDATE OF
  stage` em `prospects` que, na entrada em `qualificado` vinda de etapa que não é desfecho,
  soma a evidência aceita mais recente de cada letra (confirmado 2, indício 1) e recusa abaixo
  de 6 pontos ou com "Não atende".
- **Restrições:** a mesma conta na tela, no MCP e no banco (TD-0022); mensagem em português.
- **Provas esperadas:** os cinco cenários; o gatilho conferido no banco.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 3 | tela validada pelo Victor em 23/11/2026 ("testei, tudo passou"); testes desativados neste ciclo |
| 4 | no banco, em transação desfeita (23/11/2026): oportunidade em cadência sem evidências → recusada com "Nota comprovada 0: para qualificar, 75 só com evidências aceitas…" |
| 5 | no banco, em transação desfeita (23/11/2026): oportunidade em Ganho → "Oportunidade qualificada" passou |

- Regra: `notaComprovada` em `bantDaOportunidade` e `oQueFaltaParaQualificar` só com ela
  (`src/lib/prospecting/bant.ts`), usada pela tela (`exigirBantParaQualificar`) e pelo MCP
  (`move_contact_stage`); o painel do BANT e o `get_bant` mostram a nota comprovada.
- Banco: migration `20261124100000` (função `prospects_exige_bant_para_qualificar`, gatilho
  `BEFORE UPDATE OF stage` em `prospects`), com rollback.
  Aplicada em produção em 23/11/2026 com o ok do Victor, pela API de gestão do Supabase (HTTPS),
  porque a rede local recusava a porta 5432; registrada no histórico de migrations na mesma
  transação. Gatilho e função (definer) conferidos.
