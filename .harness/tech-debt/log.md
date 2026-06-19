# Log de Divida Tecnica

## Aberto

- Preencher discovery completo do Harness com time, cliente, compliance e restricoes reais.
- Revisar migrations Supabase antigas para identificar decisoes arquiteturais que merecem ADR.
- Confirmar padrao oficial de lock/aprovacao de timesheets e documentar em pattern dedicado se necessario.
- TD-0001: `allocationService.allocateToProject` / `deallocateFromProject` e a regra
  `canEditProject` do EmployeeAllocationPanel ficaram sem teste (testes desativados na
  sessao de 2026-06-19). E logica de negocio + autorizacao por recurso (ADR-0002/0005).
  Cobrir com Vitest: editar/alocar/desalocar habilitado so para admin ou PM dono;
  somente-leitura para gerente nao-PM. Ref ADR-0002 ("detalhe read-only para gerente
  nao-PM" ja consta como teste esperado).
- TD-0002: "Papel no projeto" no painel de alocacao usa os cargos da equipe como
  sugestao, nao papeis especificos de projeto. Se o time precisar de taxonomia de
  papeis de projeto (ex.: Tech Lead, PO), modelar tabela/enum dedicada no banco —
  candidata a ADR proprio. Mesma limitacao ja existe no ProjectTeamSection (campo livre).

## Resolvido

- Nenhum item registrado ainda.
