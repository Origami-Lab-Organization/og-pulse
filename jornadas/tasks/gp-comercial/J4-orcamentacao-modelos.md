# GP-J4 — Orçamentação por Modelo de Receita (Guarda-chuva)

> Jornada: GP Comercial J4 · Estado auditado: 🟡 PARCIAL (~55%)
> Esta task foi **quebrada em 6 documentos** (um por modelo de receita). Este arquivo é o **índice/guarda-chuva**: mantém o que é **transversal** (validação de margem) e a **base multi-modelo** compartilhada.
> Escopo: **6 modelos** (Equity e Indicação **fora**, por decisão do time).

## Os 6 modelos (1 doc cada)

| # | Modelo | Estado | Complexidade | Doc |
|---|--------|--------|--------------|-----|
| J4.1 | Escopo Fixo | ✅ existe | Baixa | [J4.1](J4.1-escopo-fixo.md) |
| J4.2 | Recorrente | ✅ existe | Baixa | [J4.2](J4.2-recorrente.md) |
| J4.3 | Taxa de Sucesso | ✅ existe | Baixa–Média | [J4.3](J4.3-taxa-de-sucesso.md) |
| J4.4 | Escopo Fixo + Taxa de Sucesso | ❌ novo | **Alta** (introduz a base multi-modelo) | [J4.4](J4.4-escopo-fixo-taxa-sucesso.md) |
| J4.5 | Escopo Fixo + Recorrência | ❌ novo | Média (reusa base) | [J4.5](J4.5-escopo-fixo-recorrencia.md) |
| J4.6 | Recorrência + Taxa de Sucesso | ❌ novo | Média (reusa base) | [J4.6](J4.6-recorrencia-taxa-sucesso.md) |

> Os 3 modelos base já funcionam end-to-end (`BillingType = 'fixed_scope' | 'recurring' | 'success_fee'`). Os 3 combinados **não existem** e exigem uma **base multi-modelo** (lista de componentes + helper único de soma), introduzida em **J4.4** e reutilizada por J4.5/J4.6.

## Dependências entre as tasks
- **J4.4 é pré-requisito** de J4.5 e J4.6 (entrega a base multi-modelo).
- J4.1/J4.2/J4.3 são independentes entre si (modelos já implementados; foco em expor no seletor + refinos).
- Seletor novo "**Modelo de Receita**" (dropdown "Tipo de modelo") deve listar os 6.

## Sugestão de divisão para 2 devs (peso equilibrado)
- **Dev A** (dono da base): **J4.4** (Alta) + **J4.1** + **J4.3** — constrói a base multi-modelo primeiro, que destrava as combinações.
- **Dev B**: **J4.2** (independente, começa já) + **J4.5** + **J4.6** — pega as duas combinações assim que a base de J4.4 estiver pronta.
- Peso ~equivalente: A = Alta + Baixa + Baixa-Média; B = Baixa + Média + Média.

## Transversal — Validação de margem (Parte B) — depende de Admin J4 (Tsuru)

Aplica-se a **todos** os modelos; não é por modelo. Depende da migration do Catálogo de Serviços (`service_lines`, `service_revenue_models`, `minimum_margin`).

**CA-M1 — Margem contra o mínimo do admin**
- `MarginGauge.tsx` compara a margem bruta calculada com `minimum_margin` (do catálogo do admin)
- Verde quando ≥ mínimo, vermelho quando < mínimo; painel mostra receita bruta, custos de labor (encargos do admin), outros custos e margem %

**CA-M2 — Fluxo de aprovação abaixo do mínimo**
- Ao salvar com margem < mínimo: GP escolhe (1) ajustar valor ou (2) enviar para aprovação do admin; **não finaliza** abaixo do mínimo sem aprovação

**CA-M3 — Fallback sem mínimo definido**
- `minimum_margin` ausente/zerado: gauge funciona como hoje (sem bloqueio), sinalizando "limite não definido"

## Fora do escopo (de toda a GP-J4)
- **Equity** e **Indicação** (removidos por decisão do time)
- Migration do Catálogo de Serviços / `minimum_margin` (entregue por Admin J4 / Tsuru)
- Renomeação "CRM/Lead/Funil" (GP-J2)
- Cálculo automático de encargos/labor (vem do admin)

## Notas Técnicas (compartilhadas)
- Tipos: `src/types/service.ts` (`BillingType`), `src/types/budget.ts` — ampliar para **componentes** sem quebrar os 4 valores atuais
- Wizard: `src/pages/BudgetForm.tsx` (`WIZARD_STEPS_BY_TYPE`); detalhe: `BudgetDetail.tsx`; margem: `MarginGauge.tsx`
- Cálculos existentes por modelo: `calculateBudgetTotals` (fixo), `calculateRecurringTotals` (recorrente), `calculateSuccessFeeTotals` (taxa)
- Combinações: **centralizar a soma em helper único** (não duplicar por tipo)
- Parte B (margem) atrás de checagem da existência do catálogo do admin (feature flag / fallback) para não bloquear os modelos
- Respeitar `tenant_id`/RLS em qualquer leitura/gravação de orçamento; dependência nova só com ADR
