# US-0032 — O card de forecast diz o que significa

- **Status:** A fazer
- **Tipo:** bug
- **Prontidão:** PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 8
- **Aprovada por / em:** —
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

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
