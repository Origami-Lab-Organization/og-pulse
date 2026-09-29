# ADR 0040: A Prospecção absorve as Oportunidades

- Status: aceito
- Data: 2026-09-29
- Decisores: Italo Castro

## Contexto

Desde 28/09/2026 a Prospecção é o quadro comercial de ponta a ponta: cada contato termina
em Ganho ou em Perda (migration `20260928200000`). Com isso, o Pipeline de Oportunidades
(`/pipeline`, tabela `leads`) virou um segundo quadro para o mesmo negócio. As duas telas
contavam a mesma venda de jeitos diferentes. O banco guardava a passagem de uma para a
outra (`prospects.converted_lead_id` e `leads.prospect_id`), mas ninguém mais convertia.

Alternativas consideradas:

- **Esconder o menu e manter as tabelas**: sem risco imediato, mas deixa duas fontes de
  valor comercial e o custo de manter o código morto.
- **Remover tudo já, migrando os dados** (escolhida): uma fonte de verdade só.

## Decisão

1. O item "Oportunidades" e a tela `/analises/comercial` saem. As rotas antigas redirecionam
   para `/comercial/prospeccao`, e as métricas comerciais passam a ser as da aba Métricas.
2. Cada oportunidade vira contato da Prospecção. A que tinha vindo da Prospecção volta para
   dentro do contato de origem, e as demais viram contato novo. A empresa é reaproveitada
   pela ordem cliente → CNPJ do cliente → nome idêntico (só com candidato único); se não
   houver, é criada. Os de-paras de etapa, motivo e origem estão no cabeçalho da migration.
3. O contato ganha o essencial da oportunidade: `estimated_value`, `notes` e
   `competitor_name`. Título, serviços, Stand By e a observação da perda vão como texto
   para `notes`.
4. O **orçamento** nasce do contato (`budgets.prospect_id`, um por contato), e o **Ganho**
   oferece criar o projeto (`projects.prospect_id`, no fluxo do antigo "Fechar negócio").
5. O valor do contato segue o ADR-0017, agora nesta ordem: valor vendido, depois orçamento
   com total maior que 0, depois valor estimado (`src/lib/prospecting/value.ts`).
6. `leads` e `lead_*`, as RPCs `get_crm_received_value` e `_unguarded`, o cron
   `notify-lead-follow-ups-daily` e as capacidades `pipeline:*` são removidos. Antes disso,
   quem tinha `pipeline:*` recebe o `prospeccao:*` equivalente, sem sobrescrever uma
   Prospecção desligada de propósito.
7. Os anexos continuam no bucket `lead-attachments`: cada anexo migrado leva
   `bucket: "lead-attachments"`. A policy do bucket passa a exigir `prospeccao:ler` e
   `prospeccao:editar`; antes bastava ser membro do tenant.

## Consequências

- **Benefícios:** uma única fonte de valor e de etapa comercial. O MCP da Prospecção passa
  a cobrir tudo o que era Oportunidade.
- **Custos:**
  - "Proposta Enviada" e "Negociação" se fundem em "Oportunidade qualificada".
  - Previsão ponderada por etapa, lembrete diário de follow-up e o dashboard comercial
    deixam de existir.
- **Riscos:**
  - `prospeccao:ler` passa a ver o valor estimado. O orçamento continua exigindo
    `orcamento:ler`.
  - A migration derruba tabelas no mesmo deploy que troca o front: por alguns minutos, o
    front antigo pode dar erro para quem estiver com a tela aberta.
- **Como reverter:** `supabase/rollback/20260929120000_prospeccao_absorve_oportunidades_rollback.sql`,
  que parte do schema `legado_oportunidades`, uma cópia fiel feita antes do drop. Tem perda
  de dado para tudo o que for criado depois (ver o cabeçalho do rollback). Apagar o schema
  de arquivo fica para uma onda seguinte.

## Evidências

- Migration: `supabase/migrations/20260929120000_prospeccao_absorve_oportunidades.sql`
- Ensaio em 29/09/2026 sobre o schema de produção (`supabase db dump`, sem dados), com dados
  de exemplo cobrindo contato convertido, homônimo, Stand By, arquivada sem motivo, anexo,
  orçamento e projeto. Ida, volta e ida de novo sem erro, e a volta restaurou o estado
  inicial exato.
- O dump revelou `get_crm_received_value_unguarded`, que existe só em produção (drift).
- Substitui a separação "prospecção não tem valor" de `20260915120000_prospects.sql`, que
  `20260928200000` (Ganho com valor) já tinha relativizado.
