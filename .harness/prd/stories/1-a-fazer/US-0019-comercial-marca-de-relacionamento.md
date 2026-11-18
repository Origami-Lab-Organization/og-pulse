# US-0019 — Ver a relação da Origami com cada empresa

- **Status:** A fazer
- **Tipo:** história
- **Prontidão:** NÃO PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0002, US-0007, US-0008, US-0020, ADR-0040

## Descrição

**Como** pessoa do comercial,
**quero** ver se a empresa já foi cliente, se tem projeto em andamento com a Origami, se está
sendo abordada ou se já abordamos e deu errado,
**para** definir a forma de abordar e quem abordar.

### Contexto

Passo 3 do fluxo do Victor (18/11/2026): antes de abordar, avaliar o status da empresa com a
Origami. A empresa não some da lista depois de ir para A abordar: cada linha e a ficha mostram
a relação, calculada pelas oportunidades, pelos clientes, pelos projetos e pelo andamento das
atividades no Pulse. A tela Empresas não tem abas desde 18/11/2026 (US-0008): a marca é o
que diz, na lista, quem já está no Pipeline.

### Escopo (rascunho, a refinar depois da US-0008)

| Relação | Quando aparece |
|---|---|
| Cliente ativo | é cliente da Origami e tem projeto em andamento |
| Já foi cliente | já teve projeto ou Ganho, sem projeto em andamento agora |
| Sendo abordada | tem oportunidade em andamento no Pipeline (com etapa e quem cuida) |
| Abordada sem sucesso | teve oportunidade encerrada em Perda ou sem resposta (com o motivo e a data) |
| Nunca abordada | nada no Pulse |

- Na ficha: o histórico resumido (oportunidades anteriores, motivo da perda, projetos, quem
  conduziu), para decidir a forma de abordar.
- Na linha: a marca, e talvez um filtro.

## Pontos em aberto

### Decisões pendentes

- Regra exata de "cliente ativo" e "já foi cliente": cliente cadastrado, Ganho, projeto em
  andamento ou contrato vigente.
- Onde a marca aparece na linha e se vira filtro.
- Como a lista da VPS recebe a marca: os dados ficam no Supabase, por tenant, e a base da
  Receita fica na VPS (ADR-0053); a Edge Function já lê dados do tenant com a sessão da
  pessoa (faturamento do time, oportunidades da ficha).

## Contexto técnico

- **Superfícies prováveis:** Edge Function `empresas-receita`, ficha (US-0007), tabela da
  lista; clientes e projetos ligados à empresa da Prospecção (`prospect_companies.client_id`).
- **Fora do escopo:** colocar para abordar (US-0008); estudo da conta (US-0020).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
