# ADR 0012: INSS retido progressivo trunca cada faixa antes de somar

- Status: aceito
- Data: 2026-07-29
- Decisores: Origami Lab / operação interna

## Contexto

Após o ADR-0011 (truncar valores monetários na exibição), o Admin reportou
que o **valor calculado** de INSS retido (informativo) ainda divergia da
guia de INSS real paga pela empresa — não era mais um problema de exibição,
era o próprio cálculo:

- Adryan de Oliveira Marques (salário R$ 1.933,33, Jul/27): sistema mostrava
  R$ 149,68; guia real paga: **R$ 149,67**.
- Kauany Sebastiana Arantes (salário R$ 2.220,00, Jul/27): sistema mostrava
  R$ 175,49; guia real paga: **R$ 175,48**.

Investigação de código: `calculateINSS()` em `src/lib/netSalaryCalculator.ts`
(usado por `employeeCostCalculator.ts` para compor `inssFuncionario`, exibido
como "INSS retido (informativo)" no card de custo do funcionário) soma as 4
faixas progressivas em ponto flutuante puro e só arredonda (`Math.round`) o
**total final** — nunca cada faixa.

Verificação numérica com os salários reais (script ad-hoc, rodando o código
real transpilado com esbuild, não uma reimplementação):

- Adryan: faixa 1 = 1.621,00 × 7,5% = 121,575 (bruto); faixa 2 = 312,33 ×
  9% = 28,1097 (bruto). Soma bruta = 149,6847 → `Math.round` no total dá
  **149,68**.
- Truncando **cada faixa** para 2 casas antes de somar: faixa 1 = 121,57
  (não 121,58 — truncar, não arredondar), faixa 2 = 28,10. Soma =
  **149,67** — bate exatamente com a guia.
- Kauany: faixa 1 = 121,57 (truncado), faixa 2 = 599,00 × 9% = 53,91
  (exato). Soma = **175,48** — bate exatamente com a guia. (O algoritmo
  antigo somava 121,575 + 53,91 = 175,485 e `Math.round` arredondava para
  cima, **175,49**.)

Ou seja: a guia real de INSS (e, por extensão, o método correto de cálculo
progressivo) trunca o valor de **cada faixa** para centavos antes de somar
— não arredonda o total consolidado. É a mesma filosofia de "truncar, não
arredondar" do ADR-0011, só que aplicada dentro do cálculo em si, não na
exibição.

Alternativas consideradas:

1. **Arredondar cada faixa** (`Math.round` por faixa) em vez de truncar —
   testada e descartada: para faixa 1 (121,575 exato) o arredondamento
   padrão iria para 121,58, não 121,57, e não bateria com a guia real.
2. **Continuar arredondando só o total, mas em ponto fixo/inteiro** (sem
   ruído de float) — testada e descartada: eliminar o ruído de float não
   muda a matemática de fundo (149,6847 arredondado ainda dá 149,68, não
   149,67); o problema não é ruído de float, é a metodologia (total vs.
   por faixa).
3. **Truncar cada faixa antes de somar** (escolhida) — única abordagem que
   reproduziu os dois valores reais exatamente.

## Decisão

1. Em `calculateINSS()` (`src/lib/netSalaryCalculator.ts`), cada uma das 4
   faixas progressivas (`breakdown.bracket1..4`) é truncada para 2 casas
   decimais via `truncateToCents()` (mesmo helper do ADR-0011, importado de
   `src/lib/formatters.ts`) **antes** de ser somada ao total.
2. O total consolidado passa a ser a soma dos valores já truncados por
   faixa — não recebe mais um arredondamento próprio; só é truncado de novo
   como salvaguarda contra ruído de soma em ponto flutuante (somar vários
   números de 2 casas ainda pode gerar ruído binário residual).
3. O teto (`INSS_CEILING = 988,09`) é aplicado com `Math.min` depois da
   soma truncada — o teto já é um valor legal exato, não precisa de
   truncamento.
4. `calculateIRRF`/`calculateNetSalary` não mudam — já recebem `inss` como
   parâmetro, então herdam o valor corrigido automaticamente.
5. Todo consumidor de `calculateINSS()` (hoje: `employeeCostCalculator.ts`
   → `inssFuncionario`, exibido como "INSS retido (informativo)") passa a
   refletir o valor corrigido sem mudança adicional — é a mesma função,
   só com a matemática interna corrigida.

## Consequências

- Benefícios:
  - "INSS retido (informativo)" passa a bater com a guia real paga pela
    empresa — elimina a divergência de 1 centavo relatada.
  - Mesma filosofia de truncamento do ADR-0011 aplicada de forma
    consistente também dentro do cálculo, não só na exibição.
- Custos:
  - Qualquer folha/mês recalculado ao vivo (a função é sempre recalculada
    na renderização, nunca persistida arredondada — mesma situação do
    ADR-0011) vai mostrar o INSS retido informativo 1 centavo mais baixo
    do que antes, para a maioria dos salários que caem no meio de uma
    faixa.
- Riscos:
  - Validado numericamente contra só **2 funcionários reais** (Adryan e
    Kauany) — não há confirmação para faixas 3 e 4 (12%/14%) nem para
    salários no teto (R$ 988,09). O padrão matemático (truncar por faixa)
    generaliza para as 4 faixas da mesma forma, mas fica como validação
    pendente se o Admin cruzar mais guias.
  - `inssFuncionario` é só informativo (não soma em `chargesAmount` nem em
    `totalMonthlyCost` — ver comentário em `employeeCostCalculator.ts:25-28`
    e `payrollHistory.ts:59`), então este fix não altera nenhum total de
    custo cobrado do cliente/projeto — só corrige o valor exibido/
    informativo do desconto do funcionário.
  - Sem teste automatizado cobrindo `calculateINSS` (testes desativados
    nesta sessão por instrução explícita). Validação foi manual: rodei o
    arquivo real transpilado com esbuild (não uma reimplementação) contra
    os salários reais de Adryan e Kauany, batendo exatamente com a guia.
- Como reverter:
  - Reverter para `Math.round(total * 100) / 100` no total consolidado e
    remover o `truncateToCents` de cada faixa restaura o comportamento
    anterior (regressão para o bug relatado).

## Evidências

- Relato original: Admin, comparando "INSS retido (informativo)" exibido
  no sistema contra a guia de INSS efetivamente paga, para Adryan de
  Oliveira Marques e Kauany Sebastiana Arantes, competência Jul/27.
- Salários reais confirmados pelo Admin (print da grade de custos):
  Adryan R$ 1.933,33, Kauany R$ 2.220,00.
- Verificação: script Node ad-hoc rodando `src/lib/netSalaryCalculator.ts`
  e `src/lib/formatters.ts` reais (transpilados com `esbuild`, sem
  reimplementação), confirmando `calculateINSS(1933.33).total === 149.67`
  e `calculateINSS(2220.00).total === 175.48` após a correção.
- Implementação: `src/lib/netSalaryCalculator.ts` (`calculateINSS`).
- Relacionado: ADR-0011 (`0011-currency-truncation-no-rounding.md`) — mesma
  filosofia de truncamento, aplicada aqui ao cálculo em vez de à exibição.
