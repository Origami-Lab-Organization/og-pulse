# ADR 0003: Biblioteca de confetti no fechamento comercial

- Status: aceito
- Data: 2026-06-19
- Decisores: Origami Lab / operacao interna

## Contexto

A jornada GP-J8 exige celebracao visual no sucesso do fechamento de uma oportunidade. A alternativa sem dependencia reduziria superficie tecnica, mas exigiria implementar e manter animacao propria. Como a celebracao deve ser entregue rapidamente e sem bloquear o fluxo de criacao do projeto, foi avaliada uma biblioteca pequena e focada.

## Decisao

Usar `canvas-confetti` no frontend para disparar a animacao pos-sucesso do `CloseBusinessDialog`. A biblioteca fica restrita a feedback visual local, sem acesso a dados sensiveis, sem chamadas externas e sem alterar regras de negocio.

## Consequencias

- Beneficios:
  - Entrega mais rapida de uma animacao consistente.
  - Menos codigo proprio para manter.
  - Falha de animacao nao impacta a criacao do projeto.
- Custos:
  - Nova dependencia runtime e tipos em desenvolvimento.
  - Precisa ser mockada em testes de componente.
- Riscos:
  - Aumento pequeno no bundle do frontend.
  - Mudancas futuras da biblioteca podem afetar a celebracao.
- Como reverter:
  - Remover `canvas-confetti`, substituir a chamada por animacao CSS/local e remover a dependencia dos manifests.

## Evidencias

- Historia: `jornadas/tasks/gp-comercial/J8-negocio-fechado.md`
- Componentes esperados: `src/components/crm/CloseBusinessDialog.tsx`
- Testes esperados: Vitest para sucesso com chamada de confetti e falha sem celebracao.
