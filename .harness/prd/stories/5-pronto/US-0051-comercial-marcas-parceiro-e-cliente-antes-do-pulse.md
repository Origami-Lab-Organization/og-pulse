# US-0051 — Marcas Parceiro e Cliente antes do Pulse

- **Status:** Pronto
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

## Implementação (27/11/2026)

- **Onde a marca mora:** `prospect_marcas_da_empresa`, uma linha por raiz do CNPJ e tenant, como as
  decisões da Base (US-0010): vale para a empresa toda e também para a que só está na Base. Nome,
  cidade e UF vão junto para a carteira (migration 20261127120000, com rollback).
- **Quem marca:** Parceiro com `prospeccao:editar`; "Cliente antes do Pulse" com a capacidade nova
  `cliente:marcar-antes-do-pulse`, que nasce com quem tem `configuracao:editar` (Admin). O gatilho
  `prospect_marcas_da_empresa_guarda` confere a capacidade de cada marca e grava quem e quando.
- **Onde se marca:** no "⋮" da página da empresa: "Marcar como Parceiro" / "Tirar marca de Parceiro"
  e "Cliente antes do Pulse" (modal com o ano, de 1950 a 2026, e "Tirar marca").
- **Relação:** "Cliente antes do Pulse" entra no cálculo como o cadastro de cliente (US-0019):
  projeto aberto e Oportunidade em andamento vêm antes; o detalhe do selo mostra "Antes do Pulse ·
  ano". Parceiro não muda a relação: aparece como selo próprio ao lado dela.
- **Onde aparece:** lista da Base (coluna Relação), cabeçalho da página da empresa e carteira (aba
  Clientes), que passa a trazer Parceiros e clientes de antes do Pulse (US-0049, cenário 2). O filtro
  de relação da Base e o da carteira ganham "Parceiro".

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1. Cliente antes do Pulse | Victor no localhost: marcar uma empresa sem Ganho nem projeto e ver "Já foi cliente" com "Antes do Pulse · ano" |
| 2. O cálculo prevalece | `relacaoDaEmpresa` (supabase/functions/_shared/relacao.ts): projeto aberto e Oportunidade em andamento são conferidos antes da marca |
| 3. Parceiro | Victor no localhost: marcar, ver o selo na lista e na página, filtrar por "Parceiro" |
