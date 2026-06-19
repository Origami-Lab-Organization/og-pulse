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
- Complexidade ≤ 7 por função (threshold SonarQube)
- SEMPRE pergunte antes de assumir em pedidos ambíguos

## Execução de prompts — Testes DESATIVADOS (decisão atual)
- Qualquer teste solicitado/exigido pelo Harness (pasta `.harness/`, ex.: `patterns/testing.md`, `qa-skill`, "testes obrigatórios", cobertura ≥ 80%/95%) deve ser **DESCONSIDERADO** neste momento.
- NÃO escrever nem executar testes automatizados a menos que o usuário peça explicitamente — isso consome muitos tokens e não é necessário agora.
- As demais regras (boundaries, tipos, complexidade, conformidade de DS/jornada) permanecem em vigor.