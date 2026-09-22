# ADR-0038 — Pagamento pendente não impede a conclusão do projeto

- **Data:** 22/09/2026
- **Status:** aceita
- **Relacionadas:** [ADR-0004](0004-installment-nf-admin-alerts.md) (alertas de parcela e NF), [ADR-0024](0024-project-total-value-child-table.md)

## Contexto

O guardrail de conclusão (`validate_project_completion`, migration
`20260518000000_portfolio_completion_guardrails`) exigia três coisas para mover um projeto
para Concluído: data real de conclusão, cronograma inteiro concluído e **todas as parcelas
recebidas**. A mesma regra era repetida no front, em `checkCompletionReadiness`.

Na prática a última condição travava o kanban. Entrega e recebimento correm em ritmos
diferentes: o time termina o trabalho, o cliente paga a última parcela semanas depois. Até
lá o projeto ficava preso em "Aprendizado e Case" ou "Apresentação de Resultados", com a
coluna Concluído mentindo sobre o que realmente acabou.

O efeito era pior do que atraso de coluna: o dado de entrega ficava refém do dado
financeiro, e quem olhava o portfólio via um retrato errado da operação.

## Decisão

**Conclusão é um fato de entrega. Recebimento é um fato financeiro. O primeiro não espera o
segundo.**

O trigger continua exigindo data real de conclusão não futura e cronograma sem etapa
pendente — isso é o que define que a entrega acabou. A verificação de parcelas sai do
bloqueio, no banco e no front.

No front, a parcela pendente vira **aviso no diálogo de conclusão**, mostrado antes de
confirmar: quantas de quantas seguem em aberto, com a instrução de que o recebimento é
registrado depois, no projeto já concluído. `checkCompletionReadiness` passa a devolver
`warnings` além de `missing`; só `missing` bloqueia.

**A cobrança não se perde.** `notify-installment-alerts` filtra parcela por vencimento e
status, nunca por estágio do projeto — parcela em aberto de projeto concluído continua
alertando o admin exatamente como antes.

## Consequências

**Ganhos**

- O portfólio passa a refletir a entrega real, sem depender do calendário do cliente.
- O GP conclui na hora certa e atualiza o recebimento quando ele acontece.
- O aviso aparece antes de confirmar: a decisão é consciente, não silenciosa.

**Custos e riscos**

- Projeto concluído pode ter receita em aberto. Qualquer leitura que tenha assumido
  "concluído ⇒ quitado" fica errada — nenhuma faz isso hoje, mas o pressuposto some.
- O único lugar que ainda cobra o recebimento é o alerta de parcela. Se ele for desligado
  ou passar a ignorar projeto concluído, a parcela pendente fica sem dono.

## Alternativas descartadas

**Liberar só para admin.** Quem conhece o estado do projeto é o GP, e o bloqueio já era
contornável mudando a parcela à mão — a permissão viraria burocracia sem ganho de controle.

**Concluir e marcar as parcelas como recebidas.** Falsearia o financeiro para arrumar o
kanban, exatamente o acoplamento que esta decisão desfaz.
