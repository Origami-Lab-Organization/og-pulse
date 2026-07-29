# ADR 0013: INSS retido da rescisão soma a incidência própria sobre o 13º

- Status: aceito
- Data: 2026-07-29
- Decisores: Origami Lab / operação interna

## Contexto

Após o ADR-0012 (INSS retido trunca por faixa e por salário-base), o Admin
reportou que o INSS retido informativo da rescisão de Bruno Monteiro
Mestanza ainda estava incompleto: "seria R$ 304,58, no pulse está R$ 304,60
e precisa contemplar nesse cálculo o INSS do 13º que seria R$ 50,00".

Reconstrução a partir dos valores já exibidos nas telas (13º rescisão
R$ 666,67, férias+1/3 rescisão R$ 444,44, saldo de salário rescisão
R$ 3.466,67) apontou salário de R$ 4.000,00, rescisão em 26/06 (mês de 30
dias). Rodando o `calculateINSS()` real (já corrigido pelo ADR-0012)
sobre os dois valores:

- INSS sobre o saldo de salário (`calculateINSS(3.466,67)`) = **R$ 304,58**
  — já batia, corrigido de graça pelo ADR-0012.
- INSS sobre o 13º proporcional (`calculateINSS(666,67)`) = **R$ 49,99**
  ≈ R$ 50,00 citado pelo Admin.

Ou seja, o R$ 304,58/60 mostrado na tela era só a fatia do saldo de
salário — o INSS retido sobre o 13º proporcional nunca entrava na conta,
mesmo a legislação tratando-o como incidência própria e separada da do
salário (não é a mesma base progressiva, é um cálculo `calculateINSS`
independente sobre o valor do 13º).

Investigação de código: `terminationCalcs.ts` (`calculateRealTerminationVerbas`)
já computava os dois corretamente — `inssRetidoSaldoSalario` e
`inssRetidoDecimoTerceiro`, cada um via `calculateINSS()` independente
(fonte única, reaproveitada pelo wizard de desligamento e pela Folha de
Pagamento). Mas em `payrollHistory.ts`, as duas funções que corrigem o mês
da rescisão — `correctRescissionSegment` (regime de caixa) e
`correctCompetenceTerminationMonth` (regime de competência/Custo x Hora)
— já recalculavam as provisões de 13º/férias pelos avos reais, mas
deixavam `inssFuncionario` intocado, herdando o valor genérico do
segmento (`calculatePayrollAnalysisRowsByContractType` → só a fatia do
saldo de salário, por coincidência de fórmula). Um comentário no código
afirmava explicitamente que esse campo "não tem fórmula genérica
alternativa para divergir" — não era mais verdade: falta somar
`inssRetidoDecimoTerceiro`.

## Decisão

1. `correctRescissionSegment` e `correctCompetenceTerminationMonth`
   (`src/lib/payrollHistory.ts`) agora retornam
   `inssFuncionario: verbas.inssRetidoSaldoSalario + verbas.inssRetidoDecimoTerceiro`
   em vez de herdar o valor genérico do segmento.
2. Casos sem 13º retido (Estágio, PJ, Sócio, justa causa) não são afetados
   — `inssRetidoDecimoTerceiro` já fica em 0 nesses casos em
   `calculateRealTerminationVerbas` (sem incidência de INSS sobre
   bolsa-auxílio de estagiário nem sobre 13º perdido por justa causa,
   CLT Art. 482).
3. Campo é só informativo — não soma em `chargesAmount` nem
   `totalMonthlyCost` (ver `PayrollAnalysisRow.inssFuncionario`), então o
   fix não altera nenhum total de custo cobrado do cliente/projeto, só o
   valor exibido/informativo do desconto do funcionário.

## Consequências

- Benefícios:
  - "INSS retido (informativo)" da rescisão passa a refletir o valor
    total real (saldo de salário + 13º), batendo com a guia paga.
  - Reaproveita a mesma fonte única (`calculateRealTerminationVerbas`) já
    usada pelas provisões corrigidas — sem duplicar cálculo.
- Custos:
  - Qualquer mês de rescisão (passado ou futuro, recalculado ao vivo)
    passa a mostrar o INSS retido informativo mais alto do que antes,
    somando a fatia do 13º.
- Riscos:
  - Validado numericamente contra só **1 caso real** (Bruno), reconstruído
    a partir dos valores exibidos na tela (salário e avos inferidos, não
    confirmados diretamente no cadastro) — não há confirmação direta para
    férias com terço, recesso de estágio ou casos com múltiplos anos de
    avos acumulados.
  - Sem teste automatizado cobrindo `correctRescissionSegment`/
    `correctCompetenceTerminationMonth` (testes desativados nesta sessão
    por instrução explícita). Validação foi `tsc --noEmit` + `eslint`
    limpos e verificação manual do `calculateINSS` real contra os dois
    componentes (saldo e 13º) separadamente.
- Como reverter:
  - Remover a linha `inssFuncionario: verbas.inssRetidoSaldoSalario + ...`
    de ambas as funções restaura o comportamento anterior (INSS retido
    informativo da rescisão volta a mostrar só o saldo de salário).

## Evidências

- Relato original: Admin, comparando o INSS retido da rescisão de Bruno
  Monteiro Mestanza contra a guia real, apontando falta do INSS do 13º
  (~R$ 50,00).
- Investigação e implementação desta sessão: `src/lib/payrollHistory.ts`
  (`correctRescissionSegment`, `correctCompetenceTerminationMonth`),
  `src/lib/terminationCalcs.ts` (`calculateRealTerminationVerbas`, já
  correto, só não estava sendo consumido para este campo).
- Relacionado: ADR-0012 (`0012-inss-progressivo-trunca-por-faixa.md`) —
  o `calculateINSS()` usado aqui já reflete o truncamento por faixa e por
  salário-base decidido lá.
