# US-0034 — Indicadores do portfólio com o período e as metas

- **Status:** Pronto
- **Pronto em:** 27/11/2026, aprovado pelo Victor (PR #102 mesclado e testado por ele no localhost).
- **Tipo:** bug
- **Prontidão:** PRONTA
- **Épico:** Portfólio de projetos
- **Prioridade:** 1
- **Aprovada por / em:** Victor Couto, 23/11/2026 (pediu as US e o desenvolvimento da tela a partir do protótipo, versão 6)
- **Relacionadas:** US-0035, US-0036, US-0031

## Descrição

**Como** GP ou admin com `portfolio:ler`,
**quero** quatro indicadores com o período escrito, comparados às metas do ano,
**para** saber quanto o portfólio vale hoje, quanto entra no ano e com que margem.

### Contexto

O seletor de ano não filtrava nada: os indicadores somavam todos os anos ("Valor do
portfólio" R$ 2,38 mi, "Recebidos" R$ 1,75 mi em 23/11/2026), sem dizer de quando.
"Em planejamento" e "Total de projetos" não ajudavam quem gere o portfólio. Protótipo:
`prototipos/portfolio-de-projetos.html` (versão 6).

### Escopo

- Inclui: os quatro cards, cada um com o valor, uma linha com o dado principal e um ícone
  de informação com o resto; "Ocultar valores" acima dos cards, com o alcance e o ano.
- Não inclui: definir as metas (US-0036).

## Critérios de aceite

**Cenário 1: Carteira ativa** — mostra o contrato total dos projetos em andamento (tudo que
não está concluído) e "N projetos em andamento". Não depende do ano.

**Cenário 2: Receita esperada no ano** — mostra a soma das parcelas que vencem no ano e
"N% da meta", colorido: verde na meta, âmbar até 10% da meta abaixo, vermelho abaixo disso.
Sem meta definida: "Meta não definida".

**Cenário 3: Recebido no ano** — mostra o quanto dessas parcelas já foi recebido e "N% do
esperado"; no ícone de informação, quanto ainda falta receber no ano.

**Cenário 4: Margem bruta do portfólio** — mostra (receita − custo final estimado) ÷
receita dos projetos ativos com custo planejado, ponderada pelo contrato, colorida pela meta
de margem do portfólio, com "meta N%"; no ícone de informação, quantos projetos estão na meta
de margem deles. O custo final estimado de cada projeto é o mesmo do card Forecast da aba
Financeiro (US-0031).

**Cenário 5: o ano muda os números** — trocar o ano muda Receita esperada, Recebido, as
metas e o rótulo.

**Cenário 6: sem barras nem pontos** — os cards não têm barra de avanço nem ponto colorido;
a cor só aparece onde há meta.

**Cenário 7: ocultar valores** — esconde valores e percentuais dos cards e do quadro.

## Decisões (Victor Couto, 23/11/2026)

- Carteira ativa sem "ainda a faturar"; Receita esperada sem explicar "parcelas que vencem
  no ano"; Margem sem "receita − custo".
- Uma linha por card e o resto em tooltip; sem barras de avanço e sem pontos.
- Recebido no ano: parcelas que vencem no ano já recebidas (fecha com a Receita esperada).
