# US-0032 — O card de forecast diz o que significa

- **Status:** Em desenvolvimento
- **Tipo:** bug
- **Prontidão:** PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 8
- **Aprovada por / em:** Victor Couto, 23/11/2026
- **Relacionadas:** US-0031

## Descrição

**Como** GP ou admin com `financeiro:ler`,
**quero** que o card "Forecast · fim do projeto" mude de cor só pelo próprio número e explique
a conta em português,
**para** ler de relance se o projeto vai terminar acima ou abaixo da meta.

### Contexto

Hoje o card fica vermelho em dois casos: quando o forecast está abaixo da meta **ou** quando
a margem *planejada* está abaixo da meta. No Paraíso, o card mostrava 88% com "acima da meta
✓" sobre fundo vermelho, porque a margem planejada era 15,5%. A cor contradizia o número.

O texto do card usa siglas e inglês: "margem projetada · EAC custo R$ X" e "burn-rate atual +
plan restante".

### Escopo

- Inclui: cor do card de forecast, texto do card e aviso de plano abaixo da meta.
- Não inclui: o cálculo do forecast (US-0031).

## Critérios de aceite

**Cenário 1: a cor segue o forecast, em três faixas**

- **Dado** um projeto com meta de margem de 55%;
- **Quando** o forecast está na meta ou acima (55% ou mais);
- **Então** o card fica no tom normal (verde no número);
- **E** com o forecast até 10% da meta abaixo dela (de 49,5% até 55%), o card fica amarelo;
- **E** com o forecast mais de 10% da meta abaixo dela (abaixo de 49,5%), o card fica
  vermelho, e só então aparece o aviso "Margem projetada abaixo da meta" no rodapé da aba.

**Cenário 2: plano abaixo da meta vira aviso, não cor**

- **Dado** um forecast acima da meta e a margem planejada abaixo dela;
- **Quando** abro o card;
- **Então** o card fica verde;
- **E** mostra o aviso escrito "Plano abaixo da meta (15,5%)", com a margem planejada do
  projeto.

**Cenário 3: o texto diz o estado, sem repetir custos**

- **Dado** um projeto com custo planejado;
- **Quando** abro o card;
- **Então** ele mostra a margem projetada e a meta com a faixa, por exemplo "meta 55% · até
  10% abaixo da meta";
- **E** não repete valores de custo, que já estão nos outros cards;
- **E** não usa "EAC", "burn-rate" nem "plan".

**Cenário 3b: projeto encerrado**

- **Dado** um projeto cuja data de fim já passou;
- **Quando** abro o card;
- **Então** ele informa "Projeto encerrado".

**Cenário 4: sem custo planejado**

- **Dado** um projeto sem custo planejado;
- **Quando** abro o card;
- **Então** ele mostra "—" e "sem custo planejado para projetar", no tom normal.

**Cenário 5: valores ocultos**

- **Dado** "ocultar valores" ligado;
- **Quando** abro o card;
- **Então** valores e percentuais ficam ocultos, inclusive no aviso.

## Decisões (Victor Couto, 23/11/2026)

- Forecast acima da meta com plano abaixo: card verde, com aviso escrito.
- O card não mostra valores de custo (já estão na tela); só informa quando o projeto está
  encerrado.
- Forecast até 10% da meta abaixo dela: amarelo; mais de 10%: vermelho. "10% da meta" é
  relativo ao valor da meta (meta 55% → limite 49,5%).

## Contexto técnico

- **Comportamento atual:** PROVADO — `FinancialKpiCards.tsx`:
  `forecastBelowTarget = hasCostPlanned && hasMarginTarget && (!forecastAboveTarget ||
  plannedBelowTarget)`; textos "margem projetada · EAC custo" e "burn-rate atual + plan
  restante"; aviso em `ProjectFinancialTab.tsx` (`alerts`, `FinancialAlertBanner`).
- **Restrições:** Design System Origami (`patterns/design-system.md`), sem hex avulso; texto
  legível em WCAG AA sobre o fundo do card.
- **Provas esperadas:** os cinco cenários.
- **Fora do escopo:** cálculo do forecast (US-0031).

## Implementação

`FinancialKpiCards.tsx`: a faixa do card vem de `forecastTone` (`src/lib/projectForecast.ts`):
`ok` (petróleo, número verde), `warning` (`bg-warning`, até 10% da meta abaixo), `critical`
(`bg-destructive`, mais de 10% abaixo) e `neutral` (sem meta ou sem custo planejado). O card
mostra a margem projetada, "Projeto encerrado" depois da data de fim e "meta N% · faixa";
com plano abaixo da meta na faixa verde, o aviso "Plano abaixo da meta (X%)". Sem valores de
custo, "EAC", "burn-rate" nem "plan". O aviso do rodapé da aba (`FinancialAlertBanner`) só
aparece na faixa vermelha.

**Teste desatualizado:** `src/test/financial-kpi-cards.test.tsx` ("Margem planejada abaixo
da meta") ainda espera fundo vermelho quando só o plano está abaixo da meta, que é a regra
antiga. Não foi reescrito porque os testes estão desativados no Harness; o CI não roda
`npm test`.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080). Script: 56% e 55% → verde; 53,3% e 49,5% → amarelo; 49,4% → vermelho; sem meta ou sem custo → neutro. |
| 2 | Pendente: conferir na tela num projeto com forecast acima da meta e plano abaixo. |
| 3 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080). |
| 3b | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080). |
| 4 | Pendente: conferir na tela num projeto sem custo planejado. |
| 5 | Pendente: conferir com "ocultar valores". |

Testes automatizados não escritos: testes desativados no Harness por decisão do time.
