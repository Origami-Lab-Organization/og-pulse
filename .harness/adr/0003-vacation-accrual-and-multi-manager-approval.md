# ADR 0003: Acúmulo de férias e aprovação multi-gerente

- Status: aceito
- Data: 2026-06-19
- Decisores: Origami Lab / operação interna (Tiago)

## Contexto

O produto precisa de gestão de férias: o funcionário solicita, o gerente aprova as do funcionário,
e o admin aprova as do gerente (e tem auto-aprovação). Como o funcionário pode estar alocado em mais
de um projeto, surge a pergunta de quem aprova.

O modelo legal de férias CLT (período aquisitivo/concessivo, mínimo de 14 dias num período, limite de
três períodos, vedação a iniciar em 2 dias antes de feriado/DSR) é mais complexo do que o necessário
para a operação interna. O time optou por um modelo simplificado, validado explicitamente com o produto.

Alternativas consideradas para o acúmulo: (a) crédito proporcional mensal (2,5 dias/mês); (b) crédito
em bloco no aniversário de 12 meses. Para a aprovação: (a) um único gerente "direto" por funcionário
(campo inexistente no modelo atual); (b) os gerentes dos projetos onde o funcionário está alocado.

## Decisão

**Acúmulo (lump por aniversário).** A cada aniversário completo de 12 meses desde `employees.data_admissao`
o funcionário ganha 30 dias, de forma acumulativa. O saldo disponível é o total ganho acumulado menos o
que já foi reservado e usado:

```
saldoDisponível = (anosCompletos × 30) − diasReservados(pending) − diasUsados(approved)
                   └── total ganho ──┘
```

Exemplos:
- 1 ano completo, nada usado:        `1×30 − 0 − 0  = 30`
- 2 anos completos, nada usado:      `2×30 − 0 − 0  = 60` (acumulou)
- 2 anos completos, 30 dias já gozados: `2×30 − 0 − 30 = 30`
- 2 anos completos, 30 usados + 10 pendentes: `2×30 − 10 − 30 = 20`

Pedidos pendentes reservam saldo; cancelar libera. A regra vive em
`src/lib/vacationBalanceCalculator.ts` (função pura, testada) e é **replicada como invariante
server-side** no trigger `enforce_vacation_balance` da migration.

**Elegibilidade.** Apenas contratos `CLT` e `MENOR_APRENDIZ`. SÓCIO, PJ e ESTÁGIO não acessam a feature.
A regra é aplicada na UI, no service e no trigger do banco.

**Roteamento de aprovação (snapshot na criação).**
- `user` (funcionário): aprovadores = gerentes **distintos** (`projects.manager_id`) de todos os projetos
  ativos onde está alocado (`project_members`). Sem projeto ativo / sem gerente válido → admin(s).
- `manager` (gerente): aprovado por admin(s).
- `admin`: auto-aprovado.
- O próprio solicitante é **excluído** da lista de aprovadores.

**Agregação.** Cada aprovador exigido vira uma linha em `vacation_request_approvals`. O pedido fica
`approved` quando **todas** as linhas estão `approved`; **qualquer** rejeição torna o pedido `rejected`
(linhas pendentes restantes são encerradas). Lógica pura em `src/lib/vacationApproval.ts`.

**Dias livres.** O funcionário escolhe qualquer quantidade de dias por solicitação (períodos diferentes),
limitada ao saldo. Não aplicamos os limites de fracionamento da CLT.

## Consequências

- Benefícios:
  - Reaproveita o padrão de reembolsos (aprovador = `projects.manager_id`, notificações via `notifications`)
    e o helper RLS `can_manage_project`/`has_role`, reduzindo superfície nova.
  - Saldo e elegibilidade protegidos no banco (trigger), não só no cliente — atende `boundaries.md`.
  - Aprovação por recurso (linhas explícitas de aprovação) mitiga OWASP A01; RLS impede auto-aprovação
    (linhas nascem `pending`; só o `approver_id` ou admin as move; o solicitante só pode `cancelled`).
- Custos:
  - Duplicação consciente da constante de acúmulo (30 dias / ano completo) entre TS e SQL — comentada nos dois lados.
  - Snapshot de aprovadores na criação: se a alocação do funcionário mudar depois, o pedido mantém os aprovadores originais.
- Riscos:
  - O modelo simplificado diverge da CLT; não usar como fonte para folha/rescisão sem revisão jurídica.
  - Projeto sem `manager_id` não gera aprovador; o fallback para admin evita pedidos sem revisor.
  - **Armadilha de RLS (recursão)**: policies de `vacation_requests` e `vacation_request_approvals` não podem
    se referenciar mutuamente em subqueries diretas — o Postgres acusa recursão infinita (42P17).
    Toda busca cruzada entre as duas tabelas passa por helpers `SECURITY DEFINER`
    (`is_vacation_approver`, `vacation_request_owner_or_admin`, `vacation_request_is_admin`).
  - **Armadilha de RLS (visibilidade)**: a aprovação é multi-gerente, então um aprovador precisa enxergar
    TODAS as linhas de `vacation_request_approvals` do pedido (progresso 1/2, 2/2) — não só a própria.
    Caso contrário a contagem fica /1 e o `approve()` agrega o status com dados parciais, aprovando cedo
    demais. A policy de SELECT inclui `is_vacation_approver(request_id, auth.uid())`.
- Como reverter:
  - Migration de rollback removendo `vacation_requests`, `vacation_request_approvals`, o trigger e a função;
    remover rotas/itens de navegação e os arquivos de domínio (`src/{types,lib,services,hooks,components,pages}` de vacation).

## Evidências

- Migration: `supabase/migrations/20260619120000_vacation_management.sql`
- Correção de RLS (recursão): `supabase/migrations/20260619130000_fix_vacation_rls_recursion.sql`
- Correção de RLS (visibilidade do painel de aprovação): `supabase/migrations/20260619140000_fix_vacation_approval_visibility.sql`
- Domínio: `src/lib/vacationBalanceCalculator.ts`, `src/lib/vacationApproval.ts`, `src/types/vacation.ts`
- Service/hooks: `src/services/vacationService.ts`, `src/hooks/useVacations.ts`
- Testes: `src/test/vacationBalanceCalculator.test.ts`, `src/test/vacationApproval.test.ts`
- Glossário: termo "Férias" adicionado em `.harness/domain-glossary.md`
