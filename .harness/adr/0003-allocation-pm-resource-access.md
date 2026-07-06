# ADR 0003: Allocation PM resource access

- Status: aceito
- Data: 2026-05-26
- Decisores: Origami Lab / operacao interna

## Contexto

A pagina de alocacao precisa dar visao operacional ampla aos PMs, mas horas planejadas e correcoes de horas realizadas afetam projetos, custos e capacidade. Antes desta decisao, parte da tela e das policies ainda usava a regra ampla "admin ou manager", permitindo escrita gerencial em projetos de outros PMs.

## Decisao

PMs podem visualizar a alocacao completa do tenant em `/alocacao`. Admins podem editar qualquer item. PMs podem editar horas planejadas e corrigir horas realizadas apenas em projetos onde `projects.manager_id` aponta para o proprio employee.

Atividades internas nao pertencem a um PM especifico; portanto, PMs podem visualiza-las na alocacao, mas apenas admins podem alterar planejamento ou corrigir lancamentos internos. Lancamentos proprios de timesheet seguem cobertos pelas policies especificas de "own unlocked" existentes.

## Consequencias

- Beneficios:
  - A visao de capacidade fica completa para PMs sem ampliar escrita indevida.
  - A regra mitiga OWASP A01 porque autoriza pelo projeto especifico.
  - RLS protege o backend mesmo se a UI for manipulada.
- Custos:
  - Novas superficies de alocacao precisam reutilizar `can_manage_project` para escrita gerencial.
  - Atividades internas exigem fluxo admin para ajustes fora do apontamento proprio.
- Riscos:
  - Ambientes precisam aplicar a migration de RLS antes da validacao fim a fim.
  - Componentes antigos que assumem "manager edita tudo" podem precisar de revisao.
- Como reverter:
  - Criar nova migration restaurando escrita gerencial por tenant e remover as travas por projeto na UI.

## Evidencias

- Migration: `supabase/migrations/20260526130000_allocation_pm_resource_access.sql`
- Testes esperados: Vitest para leitura ampla de PM, edicao apenas em projeto proprio e bloqueio de atividades internas para PM.
