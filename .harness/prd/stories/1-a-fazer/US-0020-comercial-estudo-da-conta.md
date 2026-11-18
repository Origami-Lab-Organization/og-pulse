# US-0020 — Estudar a conta antes de abordar

- **Status:** A fazer
- **Tipo:** história
- **Prontidão:** NÃO PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0007, US-0008, US-0019, ADR-0041, ADR-0042

## Descrição

**Como** pessoa do comercial,
**quero** levantar as pessoas da empresa, o nível de influência de cada uma e o que se fala da
empresa e delas,
**para** definir quem abordar e como, antes do primeiro contato.

### Contexto

Passo 4 do fluxo do Victor (18/11/2026): com a empresa em A abordar, fazer o estudo da conta.
Levantar pessoas além dos sócios, confirmar o número de funcionários (pelo LinkedIn, por
exemplo), anotar o @ das pessoas no Instagram, definir o nível de influência de cada uma na
decisão de um projeto e rodar um desk research da empresa e das pessoas (notícias, postagens
no LinkedIn e no Instagram).

### Escopo (rascunho, a refinar depois da US-0019)

- Na oportunidade em A abordar, uma área "Estudo da conta" com:
  - **pessoas a abordar:** os sócios da Receita (já na rede da empresa, ADR-0041) e outras
    pessoas acrescentadas à mão, cada uma com cargo, LinkedIn, @ do Instagram, telefone e
    nível de influência na decisão;
  - **funcionários confirmados:** número informado pelo time (ex.: pelo LinkedIn), que
    prevalece sobre a RAIS, como o faturamento do time;
  - **desk research com IA:** um botão gera um resumo da empresa e das pessoas a abordar,
    com notícias, postagens e as fontes citadas; o time revisa e edita;
  - **canal de abordagem (alavanca):** definido aqui, ao abordar (decisão de 18/11/2026).

## Pontos em aberto

### Decisões pendentes

- **IA no Pulse:** o Victor escolheu em 18/11/2026 o desk research gerado por IA dentro do
  Pulse. Isso revisa o ADR-0042 ("inteligência de prospecção por regra, sem IA") e pede um
  ADR novo: modelo, busca na web, custo por uso, onde fica a chave, o que é guardado e a
  revisão humana.
- Lista do nível de influência (ex.: Decide, Influencia, Usa, Bloqueia).
- O estudo é obrigatório para sair de A abordar?
- Onde ficam as pessoas acrescentadas à mão: na rede da empresa (`prospect_company_partners`)
  ou como contatos (`prospect_contacts`).

### Provocações para produto

- Postagens e notícias de pessoas físicas são dados pessoais — impacto possível: a base legal
  do ADR-0041 (interesse legítimo, minimização) precisa cobrir o que a IA traz e o que fica
  guardado.

## Contexto técnico

- **Comportamento atual:** PROVADO — a rede da empresa guarda sócios com LinkedIn, Instagram e
  telefone preenchidos à mão, e "Virar contato" cria a pessoa (ADR-0041); não há nível de
  influência nem número de funcionários informado pelo time.
- **Fora do escopo:** mover para abordar (US-0008); relacionamento (US-0019).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
