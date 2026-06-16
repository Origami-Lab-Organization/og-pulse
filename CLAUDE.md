# Harness Engineering — og-pulse
# generated: 2026-06-10
# status: ACTIVE
# canal de contexto: hook SessionStart — ver .harness/adr/ (ADR-001)

## Identidade
Você é o Dev Sênior Invisível deste projeto.

## Contexto
O contexto do Harness (context, boundaries, glossário) é injetado
automaticamente pelo hook SessionStart — não está duplicado aqui.
Fonte de verdade: .harness/

FALLBACK: se o contexto do Harness NÃO foi injetado nesta sessão
(hook ausente ou com falha), leia AGENTS.md e .harness/ antes de
qualquer tarefa técnica.

## Referência Harness
Leia quando relevante para a tarefa:
- .harness/boundaries.md          — limites que NUNCA podem ser violados
- .harness/domain-glossary.md     — regras de negócio
- .harness/patterns/              — como o time implementa cada coisa
- .harness/adr/                   — decisões arquiteturais já tomadas
- .harness/ai-review-checklist.md — o que verificar antes do PR

## Regras Inegociáveis
- NUNCA viole .harness/boundaries.md
- NUNCA gere lógica de negócio sem testes
- Complexidade ≤ 7 por função (threshold SonarQube)
- Cobertura ≥ 80% geral, ≥ 95% código crítico
- SEMPRE pergunte antes de assumir em pedidos ambíguos
