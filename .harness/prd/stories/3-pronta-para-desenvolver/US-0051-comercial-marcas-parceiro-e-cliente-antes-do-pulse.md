# US-0051 — Marcas Parceiro e Cliente antes do Pulse

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 2.1 do roadmap, antes da US-0052
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("vamos passar as ressalvas para estarem prontas")
- **Depende de:** US-0045
- **Relacionadas:** US-0019, US-0049, US-0052

## Descrição

**Como** admin ou pessoa do comercial,
**quero** marcar a empresa como Parceiro ou como cliente de antes do Pulse,
**para** que a relação com a Origami fique certa também no que o cálculo não enxerga.

### Contexto

A relação é calculada pelo Pulse (US-0019), mas há dois casos que o cálculo não vê:

- **Parceiro** (ex.: PIN): marca própria, separada de Cliente (Victor, 25/11/2026). Uma empresa
  pode ser cliente e parceira ao mesmo tempo.
- **Cliente antes do Pulse:** a operação começou no Pulse em 2026. Quem foi cliente antes não tem
  Ganho nem projeto no sistema (Victor, 25/11/2026).

## Critérios de aceite

**Cenário 1: cliente antes do Pulse**

- **Dado** uma empresa sem Ganho nem projeto no Pulse;
- **Quando** o admin a marca como "Cliente antes do Pulse", com o ano;
- **Então** a relação mostra "Já foi cliente";
- **E** ao passar o mouse vejo "Antes do Pulse" e o ano.

**Cenário 2: o cálculo prevalece**

- **Dado** uma empresa marcada como cliente antes do Pulse;
- **Quando** ela ganha um projeto ou um Ganho novo;
- **Então** a relação segue o cálculo (ex.: "Cliente ativo").

**Cenário 3: Parceiro**

- **Dado** uma empresa;
- **Quando** eu, com `prospeccao:editar` ou como admin, a marco como Parceiro;
- **Então** a marca aparece na lista e na ficha, ao lado da relação;
- **E** o filtro de relação permite ver só os Parceiros.

## Decisões (Victor Couto, 25/11/2026)

- Parceiro é marca própria, separada de Cliente.
- Cliente de antes do Pulse é marcado na ficha pelo admin, com o ano.
- Parceiro é marcado e desmarcado por quem tem `prospeccao:editar` e pelo admin.

## Contexto técnico

- **Comportamento atual:** PROVADO: a relação é calculada em
  `supabase/functions/_shared/relacao.ts` (`relacaoDaEmpresa`) e o filtro existe na tela Empresas
  (US-0019). NÃO LOCALIZADO: marca de parceiro na empresa.
- **Restrições:** migration versionada; capacidade para marcar (ADR-0027).
- **Provas esperadas:** cenários 1 a 3.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
