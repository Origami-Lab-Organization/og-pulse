# ADR 0014: Modal de detalhamento de custo do funcionário — redesenho e decomposição de rescisão

- Status: aceito
- Data: 2026-07-30
- Decisores: Origami Lab / operação interna

## Contexto

O Admin trouxe um mockup de referência (funcionário Sócio, "Composição do Custo"
com barra proporcional + legenda, painel "Lançamento | Valor" por categoria) e
pediu para redesenhar o `EmployeeDetailDialog` (o modal que abre ao clicar num
colaborador na Folha de Pagamento / Custo x Hora) seguindo esse modelo.

Isso ficou dependente de uma decisão pendente do ADR-0012/0013: como exibir os
valores de rescisão (saldo de salário, 13º/férias proporcionais, encargos, INSS
retido) agora que sabemos que eles já estão CONTIDOS dentro de Remuneração/
Encargos/Provisões — não são uma fatia extra. Confirmado pelo Admin: manter as 5
categorias fixas na barra de composição (sem uma 6ª categoria "Rescisão") e
decompor a rescisão como sublinhas DENTRO de cada categoria no painel direito,
não num card separado.

O layout anterior (cards 2 colunas com `SplittableLine` — uma linha "normal" +
uma linha "rescisão" por campo) tinha dois problemas que motivaram esta troca,
não só estética:
- O rótulo "INSS retido rescisão, informativo (dd/mm)" cortava no espaço
  disponível do card.
- Misturava rescisão do saldo de salário com rescisão do 13º numa única linha
  somada, escondendo que são duas incidências de INSS distintas (ver ADR-0013).

## Decisão

1. **Dados novos em `PayrollAnalysisRow`** (`payrollAnalysis.ts`): `status` e
   `dataAdmissao`, repassados de `PayrollAnalysisEmployeeInput` nos 3 pontos que
   constroem a linha (`calculatePayrollAnalysisRow`,
   `calculatePayrollAnalysisRowsByContractType`, `buildCashRows` em
   `payrollHistory.ts`) — usados no cabeçalho novo (badge de status via
   `EmployeeStatusBadge` já existente, Admissão, Tempo de casa calculado).
2. **Composição do Custo**: barra vertical proporcional (`flexGrow` por valor,
   piso `min-h-9` só pra segmento não desaparecer quando zerado) + legenda
   solta da barra, distribuída igualmente no espaço vertical (`justify-between`)
   — a legenda não precisa bater linha por linha com o segmento da barra,
   só ficar na mesma ordem e cor.
3. **Cores**: reaproveitada a ordem já estabelecida em `PayrollEvolutionChart.tsx`
   (chart-1 Remuneração, chart-2 Encargos, chart-4 Benefícios, chart-5
   Ferramentas, chart-3 Provisões) — não é a ordem sequencial 1-2-3-4-5, é a
   convenção que já existe no app pra essas mesmas 5 categorias.
4. **Rescisão decomposta por categoria** (não é mais card separado): dentro de
   Remuneração aparece "Salário" + "Rescisão (dd/mm)"; dentro de Encargos
   Patronais aparece "FGTS" + "FGTS s/ saldo, rescisão (dd/mm)" e, na seção
   itálica informativa, "INSS retido (informativo)" +
   "INSS s/ saldo, rescisão (dd/mm) — informativo" +
   "INSS s/ 13º, rescisão (dd/mm) — informativo" (as duas últimas exigiram os
   campos novos `rescissionInssRetidoSaldoAmount`/
   `rescissionInssRetidoDecimoTerceiroAmount`, mesma origem do ADR-0013);
   dentro de Provisões aparecem as sublinhas de 13º/férias/recesso/encargos
   normais + suas contrapartes de rescisão.
5. **Notas de categoria vazia por tipo de contratação**: quando Encargos ou
   Provisões dá zero para Sócio/PJ (esperado — sem incidência trabalhista),
   mostra uma nota em itálico ("Retirada de sócio — sem encargos trabalhistas
   incidentes.") em vez de só "R$ 0,00" sem contexto.
6. **Card não estica mais para acompanhar a altura do card ao lado**
   (`items-start` no grid de 2 colunas) — a Composição do Custo termina logo
   após "Custo Total do Mês", sem espaço em branco sobrando.

## Consequências

- Benefícios:
  - Resolve o corte de texto do rótulo de INSS retido de rescisão.
  - Deixa explícito que o INSS retido do 13º é uma incidência própria, não
    embutida silenciosamente no INSS do saldo de salário.
  - Reaproveita convenções já existentes no app (cores do chart, badge de
    status) em vez de introduzir novas.
- Custos:
  - Layout mais complexo (barra proporcional + legenda solta + categorias com
    notas condicionais) do que o anterior (cards simples com split).
  - `Referência` no cabeçalho mostra só o mês (ex. "Jul"), sem o ano — o
    componente não recebe o ano hoje; gap conhecido, não implementado nesta
    rodada.
- Riscos:
  - A paleta `--chart-1..6` do projeto falha o validador de acessibilidade de
    cor da skill de dataviz em alguns pares adjacentes (contraste/CVD) — achado
    pré-existente, usado em 15 outros componentes do app, fora do escopo desta
    tarefa. Mitigado aqui por rótulo de texto em toda categoria (nunca só cor).
  - Não foi possível validar visualmente num navegador real (sem credenciais
    de login no Supabase do Admin) — validação foi `tsc`, `eslint` e
    `npm run build` completo (confirmando que as classes Tailwind `bg-chart-*`
    e `min-h-*` geram corretamente), mais 3 rodadas de ajuste a partir de
    screenshots reais enviadas pelo Admin (alinhamento da barra, altura do
    card, distribuição da legenda).
  - Sem teste automatizado (testes desativados nesta sessão por instrução
    explícita).
- Como reverter:
  - `EmployeeDetailDialog.tsx` é uma reescrita completa — reverter o arquivo
    para a versão anterior (cards com `SplittableLine`) desfaz o redesenho.
    Os campos novos em `PayrollAnalysisRow`/`payrollHistory.ts`
    (`status`, `dataAdmissao`, `rescissionInssRetidoSaldoAmount`,
    `rescissionInssRetidoDecimoTerceiroAmount`) podem ficar — são aditivos e
    não quebram nenhum outro consumidor.

## Evidências

- Mockup de referência (funcionário Sócio) e 3 rodadas de screenshot real
  (Lorraine Aparecida de Oliveira, Luis Miguel de Sousa Silva) enviadas pelo
  Admin nesta sessão, usadas para corrigir NaN, alinhamento da barra e altura
  do card.
- Decisão de layout (5 categorias + decomposição por categoria, sem card
  separado de rescisão) confirmada explicitamente pelo Admin.
- Implementação: `src/components/employees/EmployeeDetailDialog.tsx`,
  `src/lib/payrollAnalysis.ts`, `src/lib/payrollHistory.ts`.
- Relacionado: ADR-0012, ADR-0013 (cálculo de INSS que esta tela agora exibe
  decomposto).
