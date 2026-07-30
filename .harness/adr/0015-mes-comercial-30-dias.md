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
- **Gabriel Arantes Silva** (marco financeiro CLT com `effective_from =
  2026-07-01`, salário R$ 1.690,00): holerite mostra 29 dias, R$ 1.633,67 —
  não reconciliável pela mesma fórmula (dá 30 dias, R$ 1.690,00, mês cheio).
  Investigado: é um problema de **dado**, não de fórmula — o Gabriel começou
  fisicamente em 02/07/2026, um dia depois do registro administrativo do
  novo contrato (30/06, 21h, seis tentativas de salvar em ~7 minutos,
  histórico já limpo em sessão anterior — ver
  `supabase/_verification/fix-gabriel-clt-transition-date.sql` e
  `fix-gabriel-menor-aprendiz-benefits.sql`). Cogitou-se adiantar o marco
  para 02/07, mas isso abriria uma lacuna de 1 dia (01/07) sem nenhum marco
  cobrindo, preenchida pelo fallback de dados atuais do cadastro — resultando
  em R$ 1.690,00 ou R$ 1.746,33 conforme esse dia se funde ou não com o
  segmento CLT seguinte (ver `mergeAdjacentIdenticalSegments` abaixo),
  nenhum dos dois igual ao holerite. **Decisão final do Admin: manter CLT a
  partir de 01/07, sem lacuna** — aceita a divergência de julho como
  conhecida, não bloqueia esta decisão (ver memória `gabriel-admissao-pendente`).

Confirmado pelo Admin: a fórmula correta é `salário ÷ 30 × dias trabalhados`,
onde "dias trabalhados" conta os dias corridos reais do calendário (incluindo
o dia da admissão) entre o início e o fim do período no mês — só o **divisor**
é sempre fixo em 30, não os dias reais do mês.

**Segunda causa, descoberta depois do primeiro deploy (mesmo dia):** o Admin
reportou o Salário Base do Adryan em agosto (regime de caixa = salário de
julho) como R$ 2.066,66, contra R$ 2.000,00 do cadastro. Investigação (tela
"Histórico de Versões" do Adryan): havia um marco financeiro CLT registrado
de 2026-07-17 a 2026-07-22, com **exatamente os mesmos dados** de antes e
depois (mesmo salário, cargo, benefícios, ferramentas, jornada) — um marco
"fantasma", sem nenhuma mudança real, provavelmente um clique duplicado ao
salvar. Isso fatia julho em 3 segmentos (01-16, 17-21, 22-31 — 16+5+10 = 31
dias reais). Cada segmento é limitado a 100% individualmente
(`Math.min(1, ...)` em `calendarFractionForWindow`), mas nenhum sozinho
chega a 100% — a SOMA das frações passa de 100% (31 dias reais ÷ 30 dividido
em pedaços, em vez de um único ÷30), inflando o salário. Verificado rodando
o código real: reproduz `2066,67` com o marco fantasma presente e `2000,00`
sem ele.

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
4. **Dado do Adryan corrigido**: removido o marco financeiro fantasma
   (2026-07-17 → 2026-07-22, id `66908401-5ae8-4e40-ae90-36c26c683364`) via
   `supabase/_verification/fix-adryan-remove-spurious-version.sql`. Não havia
   nenhuma outra versão adjacente a reconciliar — bastou apagar; julho volta
   a ser um único segmento contínuo (fallback de dados atuais do cadastro).
5. **Código robusto contra recorrência**: `resolveVersionSegments`
   (`src/lib/payrollAnalysis.ts`) agora chama
   `mergeAdjacentIdenticalSegments()` antes de retornar — junta segmentos
   adjacentes e contíguos que tenham EXATAMENTE os mesmos dados (tipo de
   contratação, salário, pró-labore, jornada, bolsa-auxílio, valor de
   contrato PJ, dividendos, benefícios e ferramentas totais) num só, antes
   de calcular a fração de cada um. Assim, se outro marco "fantasma" (sem
   mudança real) for criado no futuro para qualquer colaborador, ele deixa
   de fatiar o mês e não reproduz esse vazamento — não depende de disciplina
   manual pra nunca duplicar um marco sem mudança.

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
    O segundo caso (Gabriel) não reconcilia, mas por dado/decisão de negócio
    (marco mantido sem lacuna, aceitando a divergência), não por fórmula —
    ainda assim, é só 1 confirmação positiva; vale cruzar mais holerites de
    admissão/desligamento no meio do mês (inclusive de rescisão, que usa
    `terminationCalcs.ts` e não foi testado com holerite real nesta sessão)
    se aparecer nova divergência.
  - `mergeAdjacentIdenticalSegments` compara os campos financeiros do
    segmento, não `id`/datas — dois marcos genuinamente diferentes que por
    coincidência tenham EXATAMENTE os mesmos valores (ex.: um reajuste que
    zera e volta ao valor anterior) seriam mergeados, perdendo a
    granularidade histórica entre eles. Aceito como trade-off: o caso comum
    (marco fantasma sem mudança real) é mais provável que essa coincidência,
    e o efeito prático (custo/hora) é idêntico de qualquer forma quando os
    dados são iguais.
  - Sem teste automatizado (testes desativados nesta sessão por instrução
    explícita). Validação foi `tsc`, `eslint`, `npm run build`, e scripts
    Node ad-hoc reproduzindo a fórmula corrigida contra o caso da Aline e o
    marco fantasma do Adryan (com e sem o fix de merge, e uma regressão
    confirmando que um reajuste real de salário no meio do mês continua
    sendo dividido corretamente, não mergeado).
- Como reverter:
  - Reintroduzir o parâmetro `daysInMonth` em `calendarFractionForWindow`
    (voltando a `monthEnd.getDate()` nos dois pontos de chamada) e trocar
    `DIAS_MES_COMERCIAL` de volta para `daysInMonthOf(termDate)` em
    `terminationCalcs.ts` restaura o comportamento do divisor. Remover a
    chamada a `mergeAdjacentIdenticalSegments()` no `return` de
    `resolveVersionSegments` restaura o comportamento de segmentação
    anterior (reabre o risco de marco fantasma).

## Evidências

- Holerites reais de julho/2026 (Recibo de Pagamento (7).pdf) de 9
  colaboradores, fornecidos pelo Admin — usados Aline e Gabriel como casos de
  admissão no meio do mês; os demais (mês cheio) confirmaram que o bug não os
  afeta.
- Fórmula confirmada explicitamente pelo Admin: `salário ÷ 30 × dias corridos
  reais (inclusive o dia da admissão)`.
- Explicação e decisão final do caso Gabriel (manter CLT em 01/07, sem
  lacuna, aceitando a divergência) confirmadas pelo Admin — ver memória
  `gabriel-admissao-pendente.md` (resolvida, sem ação pendente).
- Marco fantasma do Adryan: achado e correção de dado via
  `supabase/_verification/fix-adryan-remove-spurious-version.sql`
  (executado e confirmado pelo Admin — `SELECT` final mostrou só a versão
  "Cadastro inicial" remanescente, inofensiva).
- Implementação: `src/lib/payrollAnalysis.ts` (`calendarFractionForWindow`
  e os 2 pontos de chamada; `sameSegmentData`/`mergeAdjacentIdenticalSegments`
  aplicado no retorno de `resolveVersionSegments`), `src/lib/terminationCalcs.ts`
  (`DIAS_MES_COMERCIAL`, 2 pontos de uso).
