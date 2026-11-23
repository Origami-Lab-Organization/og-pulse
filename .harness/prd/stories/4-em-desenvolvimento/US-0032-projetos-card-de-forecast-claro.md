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

**Cenário 1: a cor segue o forecast**

- **Dado** um projeto com meta de margem;
- **Quando** o forecast está na meta ou acima;
- **Então** o card fica no tom normal (verde no número);
- **E** quando o forecast está abaixo da meta, o card fica em destaque negativo (vermelho).

**Cenário 2: plano abaixo da meta vira aviso, não cor**

- **Dado** um forecast acima da meta e a margem planejada abaixo dela;
- **Quando** abro o card;
- **Então** o card fica verde;
- **E** mostra o aviso escrito "Plano abaixo da meta (15,5%)", com a margem planejada do
  projeto.

**Cenário 3: o texto explica a conta**

- **Dado** um projeto com custo planejado;
- **Quando** abro o card;
- **Então** ele mostra o custo final estimado e de onde vem, no formato "Custo final
  estimado R$ X = R$ Y já gasto + R$ Z ainda planejado" (a conta é da US-0031);
- **E** mostra a meta, por exemplo "meta 55%";
- **E** não usa "EAC", "burn-rate" nem "plan".

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

`FinancialKpiCards.tsx`: o card de forecast fica vermelho só quando o forecast está abaixo da
meta. Com o forecast na meta ou acima e a margem planejada abaixo, o card fica verde e mostra
"Plano abaixo da meta (X%)". O texto passa a ser "margem projetada no fim do projeto" e
"Custo final estimado R$ X = R$ Y já gasto + R$ Z ainda planejado" (ou "· projeto encerrado"
depois da data de fim), seguido de "meta N% · na meta ou acima / abaixo da meta". Sem
"EAC", "burn-rate" nem "plan". As parcelas do custo vêm do forecast da US-0031
(`spent`, `remaining`, `projectEnded`).

**Teste desatualizado:** `src/test/financial-kpi-cards.test.tsx` ("Margem planejada abaixo
da meta") ainda espera fundo vermelho quando só o plano está abaixo da meta, que é a regra
antiga. Não foi reescrito porque os testes estão desativados no Harness; o CI não roda
`npm test`.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Pendente: conferir na tela (Paraíso: forecast 53,3% abaixo da meta de 55% → vermelho). |
| 2 | Pendente: conferir na tela num projeto com forecast acima da meta e plano abaixo. |
| 3 | Pendente: conferir o texto na tela. |
| 4 | Pendente: conferir na tela num projeto sem custo planejado. |
| 5 | Pendente: conferir com "ocultar valores". |

Testes automatizados não escritos: testes desativados no Harness por decisão do time.
