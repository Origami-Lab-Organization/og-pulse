# US-0006 — Ver o faturamento estimado de cada empresa

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** —
- **Relacionadas:** US-0002, US-0003, US-0007, US-0008, ADR-0011, ADR-0041

## Descrição

**Como** pessoa do comercial,
**quero** ver uma faixa de faturamento estimado para cada empresa,
**para** priorizar as contas pelo tamanho e reconhecer quem deve estar no Lucro Real.

### Contexto

A Receita não informa faturamento, e o capital social não serve como substituto
(glossário, "Faturamento anual"). A base traz os funcionários da RAIS, e cada setor
tem uma receita média por funcionário conhecida. Multiplicar os dois dá uma ordem de
grandeza útil para priorizar. Empresas com faturamento acima de R$ 78 milhões são
obrigadas ao Lucro Real, que é o sinal da Lei do Bem.

### Escopo

- Inclui: coluna "Faturamento estimado" como faixa ("R$ 20 a 47 mi"); ordenar pela
  coluna; filtro pelas faixas do tipo de conta (US-0003, US-0016); sugestão do tipo de
  conta ao abrir a oportunidade (US-0016); selo "Lucro Real provável" quando
  até o piso da faixa passa de R$ 78 milhões; a conta explicada na ficha (US-0007).
- Inclui: ao abrir a oportunidade, o valor entra na empresa com a base nova
  "Calculado" (US-0008).
- Não inclui: faturamento apurado, que continua informado pelo time.

## Critérios de aceite

**Cenário 1: faixa na tabela**

- **Dado** uma empresa com funcionários na RAIS;
- **Então** vejo a faixa estimada, com os dois valores na mesma unidade, truncados.

**Cenário 2: sem base para estimar**

- **Dado** uma empresa sem funcionários na RAIS;
- **Então** vejo "Sem base" no lugar da faixa;
- **E** ela não entra em nenhuma faixa do filtro.

**Cenário 3: sinal de Lucro Real**

- **Dado** que o piso da faixa passa de R$ 78 milhões;
- **Então** vejo o selo "Lucro Real provável";
- **E** a ficha explica que o regime ainda precisa ser confirmado na consulta da Receita.

**Cenário 4: transparência da conta**

- **Quando** abro a ficha;
- **Então** vejo a conta: funcionários × receita média por funcionário do setor, com
  a margem usada.

## Decisões (Victor Couto, 2026-11-16)

- O faturamento estimado fica na tabela, logo depois da empresa.
- Ao abrir a oportunidade, o valor entra na empresa com uma terceira base,
  "Calculado", separada de Estimado e Apurado. O time pode substituir pelo valor dele.
- A receita média por funcionário de cada setor vem da pesquisa industrial anual do
  IBGE (PIA-Empresa), com fonte e ano citados, e passa pela aprovação do Victor antes
  de entrar no código.
- A faixa vai de 40% abaixo a 40% acima do valor calculado; o valor gravado como
  Calculado é o do meio da faixa.

## Pontos em aberto

### Dependências

- **Tabela de receita por funcionário por setor**, levantada da PIA-Empresa do IBGE
  e aprovada pelo Victor. Setores fora da indústria (tecnologia, engenharia) não estão
  na PIA e precisam de outra fonte citada, como a pesquisa anual de serviços do IBGE.
- **Onde o valor é calculado** fica para o ADR da US-0001: com a cópia pré-calculada,
  o faturamento é gravado junto, o que permite filtrar e ordenar na base inteira.

### Provocações para produto

- Empresa com muitas filiais e funcionários fora da matriz — impacto possível: a
  estimativa sai baixa se só a matriz contar. A base soma as unidades em
  `empresas_funcionarios_total`.
- Setores com receita muito alta por pessoa (refino de petróleo) geram faixas enormes —
  impacto possível: o selo de Lucro Real aparece em quase todas.

## Contexto técnico

- **Objetivo observável:** coluna, filtro, selo e explicação do faturamento estimado.
- **Termos do domínio:** Faturamento anual com base Estimado ou Apurado
  (`prospect_companies.faturamento_anual`, `faturamento_anual_base`) — fonte: glossário;
  Sinal Lei do Bem — fonte: `src/lib/prospecting/receita.ts`.
- **Comportamento atual:** PROVADO — `descreverFaturamento` em
  `src/lib/prospecting/faturamento.ts` exibe o faturamento do time; não há estimativa
  por cálculo.
- **Mudança de regra:** a base "Calculado" entra no glossário (Faturamento anual) e
  numa migration, porque o banco hoje recusa base fora de Estimado e Apurado
  (migration 20261001200000). `descreverFaturamento` passa a exibir a terceira base.
- **Restrições e padrões aplicáveis:** moeda truncada, nunca arredondada — fonte:
  ADR-0011; faturamento não entra na nota de fit — fonte: ADR-0042; regra de negócio
  financeira exige teste — fonte: `../../../boundaries.md`.
- **Provas esperadas:** teste da faixa e da truncagem; teste do selo no limite de
  R$ 78 milhões; empresa sem RAIS.
- **Fora do escopo:** mudar a nota de fit (US-0014).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
