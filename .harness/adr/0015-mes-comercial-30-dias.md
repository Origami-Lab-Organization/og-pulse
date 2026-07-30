# ADR 0015: Prorata salarial sempre usa mês comercial de 30 dias

- Status: aceito
- Data: 2026-07-30
- Decisores: Origami Lab / operação interna

## Contexto

O Admin anexou os holerites reais de julho/2026 (competência a ser paga em
agosto) e notou que os cálculos de proporcionalidade salarial no sistema usam
a quantidade REAL de dias do mês (28 a 31, via `monthEnd.getDate()`/
`daysInMonthOf`), quando a CLT sempre trata o mês, para fins de remuneração,
como tendo 30 dias — regra conhecida como "mês comercial".

Como julho tem 31 dias corridos reais, isso já é suficiente para divergir em
qualquer colaborador com admissão ou desligamento no meio do mês (funcionários
de mês cheio não são afetados: a fração dá 1 independente do divisor).

Verificação contra dois casos reais de admissão em julho/2026:

- **Aline Ferreira de Almeida** (admitida 07/07/2026, salário R$ 4.000,00):
  holerite mostra 25 dias trabalhados, R$ 3.333,33 pagos.
  `4.000 ÷ 30 × 25 = 3.333,33` — bate exatamente com divisor 30 e contagem de
  dias corridos reais (inclusive o dia da admissão) até o fim do mês.
- **Gabriel Arantes Silva** (cadastro: admissão 01/07/2026, salário
  R$ 1.690,00): holerite mostra 29 dias, R$ 1.633,67 — não reconciliável pela
  mesma fórmula (daria 30 dias, R$ 1.690,00, mês cheio). Investigado e explicado
  pelo Admin: é um problema de **dado**, não de fórmula — o Gabriel começou de
  fato em 02/07/2026, mas a mudança de vigência (programada em 30/06 pelo
  Admin para valer a partir de 01/07) não foi aplicada pelo sistema; a
  contabilidade está com o registro de admissão atrasado/desatualizado.
  Ajuste de dado fica pendente pra depois deste fix (ver memória
  `gabriel-admissao-pendente`), não bloqueia esta decisão.

Confirmado pelo Admin: a fórmula correta é `salário ÷ 30 × dias trabalhados`,
onde "dias trabalhados" conta os dias corridos reais do calendário (incluindo
o dia da admissão) entre o início e o fim do período no mês — só o **divisor**
é sempre fixo em 30, não os dias reais do mês.

## Decisão

1. `calendarFractionForWindow` (`src/lib/payrollAnalysis.ts`) não recebe mais
   `daysInMonth` como parâmetro — divide sempre por um `DIAS_MES_COMERCIAL = 30`
   fixo. A contagem de `workedDays` (dias corridos reais, inclusive) não muda.
   Afeta prorata de admissão/desligamento no salário do mês, tanto em regime de
   competência (Custo x Hora) quanto de caixa (Folha de Pagamento).
2. `calculateRealTerminationVerbas`/`calculateTerminationBreakdown`
   (`src/lib/terminationCalcs.ts`): `saldoSalario`, `pagamentoProporcionalPJ` e
   o rótulo de exibição de dias também passam a usar `DIAS_MES_COMERCIAL = 30`
   em vez de `daysInMonthOf(termDate)`.
3. **Não alterado de propósito**: `daysInMonthOf` continua usado, sem mudança,
   em `countCalendarMonthAvos` (avos de 13º/férias — Lei 4.090/1962, Súmula 261
   TST) — essa é uma regra distinta que conta ≥15 dias trabalhados no mês
   **real** do calendário para conceder avo cheio, não a proporcionalidade
   salarial do mês comercial. Confundir as duas regras seria um erro nesta
   correção.

## Consequências

- Benefícios:
  - Prorata de salário por admissão/desligamento no meio do mês agora bate com
    a guia/holerite real, em qualquer mês (não só abril/junho/setembro/
    novembro, que coincidentemente têm 30 dias reais e por isso nunca
    expunham o bug).
- Custos:
  - Nenhum — é uma correção de fórmula, mesma estrutura de código
    (`calendarFractionForWindow` só perdeu um parâmetro que não fazia mais
    sentido variar).
- Riscos:
  - Validado numericamente contra só **1 caso real que reconcilia** (Aline).
    O segundo caso (Gabriel) não reconcilia, mas por dado desatualizado
    confirmado pelo Admin, não por fórmula — ainda assim, é só 1 confirmação
    positiva; vale cruzar mais holerites de admissão/desligamento no meio do
    mês (inclusive de rescisão, que usa `terminationCalcs.ts` e não foi
    testado com holerite real nesta sessão) se aparecer nova divergência.
  - Sem teste automatizado (testes desativados nesta sessão por instrução
    explícita). Validação foi `tsc`, `eslint`, `npm run build` e um script
    Node ad-hoc reproduzindo a fórmula corrigida contra o caso da Aline.
- Como reverter:
  - Reintroduzir o parâmetro `daysInMonth` em `calendarFractionForWindow`
    (voltando a `monthEnd.getDate()` nos dois pontos de chamada) e trocar
    `DIAS_MES_COMERCIAL` de volta para `daysInMonthOf(termDate)` em
    `terminationCalcs.ts` restaura o comportamento anterior.

## Evidências

- Holerites reais de julho/2026 (Recibo de Pagamento (7).pdf) de 9
  colaboradores, fornecidos pelo Admin — usados Aline e Gabriel como casos de
  admissão no meio do mês; os demais (mês cheio) confirmaram que o bug não os
  afeta.
- Fórmula confirmada explicitamente pelo Admin: `salário ÷ 30 × dias corridos
  reais (inclusive o dia da admissão)`.
- Explicação do caso Gabriel (dado de admissão desatualizado, não fórmula)
  confirmada pelo Admin — ver memória `gabriel-admissao-pendente.md` para o
  ajuste de dado pendente.
- Implementação: `src/lib/payrollAnalysis.ts` (`calendarFractionForWindow` e
  os 2 pontos de chamada), `src/lib/terminationCalcs.ts` (`DIAS_MES_COMERCIAL`,
  2 pontos de uso).
