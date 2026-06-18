# GP-J4 — Orçamentação por Modelo de Receita (Indicação, Equity, Combinações + Margem)
> Jornada: GP Comercial J4 · Estado auditado: 🟡 PARCIAL (~55%)
> Dependências externas: validação de **margem mínima** depende de **Admin J4 (Tsuru)** — migration do Catálogo de Serviços (`service_lines`, `service_revenue_models`, `minimum_margin`). Os modelos de receita em si (Indicação, Equity, Combinações) **NÃO** dependem.

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- 4 modelos de alta prioridade funcionando end-to-end: `BillingType = 'fixed_scope' | 'recurring' | 'success_fee' | 'no_revenue'` (`src/types/service.ts`)
- Wizard de orçamentação adaptado por tipo (`BudgetForm.tsx:54-74`), detalhe (`BudgetDetail.tsx`)
- Medidor de margem `MarginGauge.tsx` existente (cálculo de margem bruta % na UI)

**❌ Pendente:**
- Modelos de média prioridade: **Indicação**, **Equity**, **Combinações** (multi-modelo na mesma oportunidade)
- Integração do `MarginGauge` com `minimum_margin` do admin (verde/vermelho contra o limite real) — **depende de Admin J4 (Tsuru)**
- Fluxo de aprovação quando a margem fica abaixo do mínimo

## História de Usuário

**Como** GP Comercial montando uma proposta,
**quero** orçar qualquer modelo de receita (inclusive Indicação, Equity e combinações) com a margem validada em tempo real contra o limite do admin,
**para que** eu feche em menos de 10 minutos com confiança de que a margem está protegida, sem pedir aprovação para o que já está dentro do esperado.

## Contexto

Jornada J4. O wizard cobre os 4 modelos base; faltam os 3 de média prioridade e o vínculo da margem com o catálogo do admin. Os novos modelos são extensões de `BillingType` e do `BudgetForm` — não dependem do catálogo. Já a **validação de margem mínima** lê `minimum_margin` que vem da migration do Admin J4; enquanto a migration não existir, a parte de modelos avança e a de margem fica atrás de feature flag / fallback "sem limite definido". Respeitar `tenant_id`/RLS em qualquer leitura ou gravação de orçamento.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Modelo Indicação**
- Novo valor de `BillingType` `'referral'` (ou equivalente) com campos: % de comissão sobre a indicação e critério de pagamento (quando o indicado fechar / após X meses)
- Wizard `BudgetForm.tsx` renderiza a seção de campos própria do modelo; `BudgetDetail.tsx` exibe o resumo

**CA-02 — Modelo Equity**
- Novo `BillingType` `'equity'` com campos: % de participação societária, cronograma de vesting, cláusulas especiais (texto livre)
- Modelo **sem cronograma de parcelas**: a seção financeira adapta sem tabela de parcelas

**CA-03 — Combinações (multi-modelo)**
- GP seleciona mais de um modelo para a mesma oportunidade (ex.: Recorrência + Taxa de Sucesso)
- Sistema **soma os componentes** para receita bruta total; cada componente preserva seus próprios campos
- `BudgetDetail.tsx` lista os componentes e o total combinado

**CA-04 — Persistência por modelo**
- O orçamento grava o(s) modelo(s) selecionado(s) e os campos específicos, respeitando `tenant_id`/RLS
- Rascunho sem todos os campos é salvo e marcado visualmente como "rascunho" (cenário-limite da jornada)

### Parte B — Melhorias no existente (depois)

**CA-05 — Validação de margem contra o mínimo do admin** — **Depende de Admin J4 (Tsuru)**
- `MarginGauge.tsx` compara a margem bruta calculada com `minimum_margin` (vindo de `service_revenue_models`/catálogo do admin)
- Verde quando ≥ mínimo, vermelho quando < mínimo
- Painel mostra receita bruta, custos de labor (encargos do admin), outros custos estimados e margem bruta %

**CA-06 — Fluxo de aprovação abaixo do mínimo** — **Depende de Admin J4 (Tsuru)**
- Ao tentar salvar com margem < mínimo: GP escolhe (1) ajustar valor ou (2) enviar para aprovação do admin
- GP **não consegue finalizar** orçamento abaixo do mínimo sem aprovação

**CA-07 — Fallback sem mínimo definido** — **Depende de Admin J4 (Tsuru)**
- `minimum_margin` ausente/zerado: gauge funciona como hoje (sem bloqueio), sinalizando "limite não definido" em vez de falsa validação

## Fora do Escopo
- Migration do Catálogo de Serviços e o campo `minimum_margin` em si (entregue por Admin J4 / Tsuru)
- Renomeação de nomenclatura "CRM/Lead/Funil" (GP-J2 — task separada)
- Cálculo automático de encargos/labor (vem do admin)
- Resolução de componentes conflitantes em combinações além de somar (cenário-limite — avaliar depois)

## Notas Técnicas
- Tipos: `src/types/service.ts` (`BillingType`); ampliar sem quebrar os 4 valores atuais
- Wizard: `src/components/.../BudgetForm.tsx`; detalhe: `BudgetDetail.tsx`; margem: `MarginGauge.tsx`
- Combinações: modelar como lista de componentes; centralizar a soma em helper único (não duplicar por tipo)
- Parte B atrás de checagem da existência do catálogo do admin (feature flag / fallback) para não bloquear a Parte A
- Adicionar dependência nova só com ADR (boundary do projeto)

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Criar orçamento modelo Indicação | Campos de % comissão + critério de pagamento; salvo e exibido no detalhe |
| Criar orçamento modelo Equity | Sem tabela de parcelas; % participação + vesting + cláusulas salvos |
| Combinar Recorrência + Taxa de Sucesso | Componentes preservados; receita bruta = soma; total exibido no detalhe |
| Rascunho incompleto | Salvo e marcado como "rascunho" |
| Margem ≥ mínimo (com Admin J4) | Gauge verde; salva sem aprovação |
| Margem < mínimo (com Admin J4) | Gauge vermelho; salvar exige ajuste ou aprovação do admin |
| `minimum_margin` não definido | Gauge sem bloqueio; sinaliza "limite não definido" |
| Tenant diferente | RLS impede ver/salvar orçamento de outro tenant |
