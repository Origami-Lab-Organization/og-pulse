# ADR 0011: Valores monetários truncam, nunca arredondam, em toda a exibição

- Status: aceito
- Data: 2026-07-28
- Decisores: Origami Lab / operação interna

## Contexto

Relato do Admin: no card "Custo de [mês]" do funcionário (detalhe de custo,
seção Provisões/rescisão), a linha "Encargos sobre as provisões rescisão"
exibia **R$ 88,89** para um valor real de **R$ 88,88888...**. Esperado:
truncar em 2 casas decimais (88,88), nunca arredondar para cima.

Investigação de código nesta sessão:

- Os cálculos de custo/rescisão (`src/lib/employeeCostCalculator.ts`,
  `src/lib/payrollAnalysis.ts`, `src/lib/payrollHistory.ts`) já trabalham
  com float puro, sem nenhum arredondamento intermediário — somas e provisões
  (13º/12, férias/3 etc.) preservam todas as casas decimais.
- O arredondamento acontecia só na **exibição**: `formatCurrency`
  (`src/lib/formatters.ts`) usa `Intl.NumberFormat('pt-BR', { style:
  'currency', ... })`, que arredonda para o centavo mais próximo por padrão.
- Essa mesma função é usada em **107 arquivos** em todo o sistema (CRM,
  orçamentos, propostas, financeiro, portfólio etc.) — não é uma
  particularidade da Folha de Pagamento.
- Um segundo `formatCurrency` (`src/lib/masks.ts`, usado em 17 arquivos) e
  mais **9 implementações locais duplicadas** de formatação de moeda
  (geradores de PDF de Projetos/Comercial/Analytics, aba financeira de
  rescisão, modelo de receita de serviço, exportação de OKRs, input de
  moeda compartilhado `CurrencyInput`, diálogo de pagamento de custo de
  projeto, notificação de aprovação de margem em orçamento) tinham o mesmo
  padrão de arredondamento via `Intl.NumberFormat`/`toLocaleString`.

Alternativas consideradas:

1. **Corrigir só a tela de Folha de Pagamento/rescisão** — menor raio de
   impacto, mas deixaria o mesmo bug latente em todo o resto do sistema que
   compartilha os mesmos helpers. Rejeitada.
2. **Corrigir o sistema inteiro** (escolhida, confirmada explicitamente
   pelo Admin) — trunca em vez de arredondar em toda exibição monetária de
   2 casas decimais, centralizando a regra em um helper único.

Fora de escopo desta decisão: formatadores que **intencionalmente** exibem
valores monetários com 0 casas decimais para compactação visual
(`KpisDoMesWidget.tsx`, `financeUtils.fmtBRL0`, `ObjectiveDetailModal`
`formatValue` para OKRs) — isso é uma escolha de design de exibição
compacta, não a regra de precisão tratada aqui, e não foi alterado.

Também identificado nesta varredura, mas explicitamente deixado fora do
escopo (confirmado pelo Admin): a função SQL `simulate_allocation_margin_impact`
(`supabase/migrations/20260717203954_08b53855-699a-419f-893b-3c0b855739fd.sql`,
substitui as versões em `20260715120000_allocation_margin_simulation.sql` e
`20260715130000_allocation_margin_no_project_type.sql`) usa `round(v_est, 2)`
no Postgres para o custo estimado retornado pela simulação de margem de
alocação de projeto — arredonda, não trunca, e roda no backend. É um
domínio diferente (margem de alocação de projeto, não Folha de
Pagamento/rescisão) e alterá-lo exigiria nova migration. Decisão: **não
estender o truncamento até essa função nesta rodada** — permanece como
dívida/gap conhecido, não coberto por este ADR.

## Decisão

1. **Regra**: toda exibição de valor monetário no sistema usa até 2 casas
   decimais **truncadas**, nunca arredondadas. Ex.: `88.888888` → `88,88`;
   `99.999` → `99,99`; `5.333333` → `5,33`.
2. **Helper único**: `truncateToCents(value: number): number` em
   `src/lib/formatters.ts`. Implementação via string (`toFixed(8)` seguido
   de corte na 2ª casa) para não confundir ruído de ponto flutuante
   (ex.: `1.005 * 100 === 100.49999999999999`) com casas decimais reais.
3. **Pontos aplicados** (todos os locais que formatam moeda com 2 casas
   decimais identificados na varredura desta sessão):
   `src/lib/formatters.ts` (`formatCurrency`), `src/lib/masks.ts`
   (`formatCurrency`), `src/components/ui/currency-input.tsx`
   (`CurrencyInput`), `src/types/serviceRevenueModel.ts`
   (`modelValueText`), `src/components/projects/ProjectsRevenuePdfGenerator.ts`,
   `src/components/projects/detail/ProjectCostPayDialog.tsx`,
   `src/components/terminations/detail/TerminationDetailFinancialTab.tsx`,
   `src/components/commercial/CommercialPdfGenerator.ts`,
   `src/components/analytics/AnalyticsPdfGenerator.ts`,
   `src/lib/exportStrategy.ts` (`formatKrValue`, só ramo `unit === 'R$'`),
   `src/pages/BudgetForm.tsx` (notificação de aprovação de margem).
4. **Cálculo não muda**: nenhuma soma/provisão/rateio interno foi alterada
   — a correção é inteiramente na camada de exibição. O "Custo Total do
   Mês" continua somando os valores float exatos; só o texto exibido
   trunca.
5. **Convenção para código novo**: qualquer formatação monetária nova deve
   importar `formatCurrency`/`truncateToCents` de `src/lib/formatters.ts`
   em vez de reimplementar `Intl.NumberFormat`/`toLocaleString` local —
   evita reintroduzir arredondamento por duplicação.

## Consequências

- Benefícios:
  - Elimina a percepção de "conta que não fecha" quando o usuário soma as
    linhas exibidas manualmente — o valor mostrado nunca é maior que o
    valor real.
  - Regra única e testável (`truncateToCents`), reaproveitada em vez de
    duplicada.
- Custos:
  - Comportamento de exibição muda em todo o app: valores que antes
    arredondavam para cima (ex. `,xx5` ou mais) agora truncam para baixo —
    PDFs, propostas e relatórios já gerados anteriormente podem diferir em
    1 centavo de uma nova geração do mesmo período.
- Riscos:
  - A soma de linhas truncadas individualmente pode não bater, no centavo,
    com o total truncado separadamente (mesma limitação inerente de
    qualquer exibição por linha + total; antes existia também, só que para
    cima). Aceito como trade-off — não há re-cálculo de somas nesta
    decisão.
  - Código novo que reimplemente `Intl.NumberFormat`/`toLocaleString` local
    em vez de usar o helper central reintroduz arredondamento
    silenciosamente. Mitigação: revisar este ADR no checklist de PR quando
    a mudança tocar em exibição de valor monetário.
  - Sem teste automatizado cobrindo `truncateToCents` (testes desativados
    nesta sessão por instrução explícita) — validação foi manual
    (`tsc --noEmit`, `eslint`, script ad-hoc confirmando os casos do
    relato e bordas como negativo/`1.005`/inteiro).
- Como reverter:
  - Mudança é só de exibição, sem migration: remover `truncateToCents` e
    os `truncateToCents(...)` inseridos nos 11 arquivos do diff restaura o
    arredondamento nativo do `Intl.NumberFormat`.

## Evidências

- Relato original: card de custo do funcionário Bruno Monteiro Mestanza,
  linha "Encargos sobre as provisões rescisão" (Jun/26), 88,88889 exibido
  como 88,89.
- Investigação e implementação desta sessão: `src/lib/formatters.ts`
  (`truncateToCents`, `formatCurrency`), `src/lib/masks.ts`,
  `src/components/ui/currency-input.tsx`,
  `src/types/serviceRevenueModel.ts`,
  `src/components/projects/ProjectsRevenuePdfGenerator.ts`,
  `src/components/projects/detail/ProjectCostPayDialog.tsx`,
  `src/components/terminations/detail/TerminationDetailFinancialTab.tsx`,
  `src/components/commercial/CommercialPdfGenerator.ts`,
  `src/components/analytics/AnalyticsPdfGenerator.ts`,
  `src/lib/exportStrategy.ts`, `src/pages/BudgetForm.tsx`.
- Escopo (sistema inteiro vs. só Folha de Pagamento) confirmado
  explicitamente pelo Admin nesta sessão.
- Validação: `npx tsc --noEmit` limpo; `eslint` sem erros novos nos
  arquivos alterados (só avisos pré-existentes); script Node ad-hoc
  confirmando `truncateToCents(88.888888888889) === 88.88`,
  `truncateToCents(99.999) === 99.99`, `truncateToCents(5.333333) === 5.33`.
