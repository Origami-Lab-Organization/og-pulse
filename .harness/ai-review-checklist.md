# AI Review Checklist

- A mudanca respeita RLS, tenant e roles?
- A autorizacao confere com `.harness/capability-matrix.md`? Se a mudanca cria ou altera
  uma capacidade, a matriz foi atualizada no mesmo commit? (ADR-0027)
- Toda capacidade que esconde dado sensivel tem policy de RLS equivalente ou mais
  restritiva? Esconder campo na tela sem policy de leitura nao protege nada (ADR-0027).
- A capacidade e mais permissiva que a RLS? Se sim, a tela mostra controle que o banco
  recusa — corrigir antes do merge (ADR-0027).
- A mudanca le `employees.is_gerente` ou `employees.system_role`? Sao legado em remocao
  (ADR-0027, TD-0012 / PUL-206). Durante a transicao, usar `user_roles`; apos a virada de
  PUL-201, `has_capability`. Capacidade nova exige migration; atribui-la a um papel, nao.
- Predicado de policy inclui `tenant_id`? Policy de storage tambem (ver TD-0011).
- Existe risco de vazamento de dados pessoais, financeiros ou comerciais?
- Regras de negocio alteradas tem teste ou validacao documentada?
- Migrations Supabase sao versionadas, revisaveis e incluem policies quando necessario?
- Edge Functions validam entrada e tratam erros de forma segura?
- Componentes possuem estados de loading, empty e error quando consomem dados?
- Mutations invalidam ou atualizam cache corretamente?
- A UI segue padroes existentes de shadcn/Radix/Tailwind?
- O codigo evita duplicacao relevante e usa helpers/hooks existentes?
- Lint, test e build foram executados ou a impossibilidade foi registrada?
