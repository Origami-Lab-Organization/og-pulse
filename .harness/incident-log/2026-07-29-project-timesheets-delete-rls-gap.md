# Incidente: "Limpar" da timesheet não apagava horas de projeto (RLS sem policy de DELETE própria)

- **Data**: 2026-07-29
- **Módulo**: Timesheet semanal (`/my-timesheet`, `WeeklyTimesheetGrid.tsx`)
- **Sintoma**: botão "Limpar" removia as horas de atividades internas, mas as horas de projeto continuavam lá após o clique — sem nenhum erro visível na tela.

## Causa raiz

`project_timesheets` **nunca teve** uma RLS policy de `DELETE` para o próprio colaborador — só existe `project_timesheets_delete_admin_or_pm` (via `can_manage_project`). O front-end (`useClearWeekProjectTimesheets`, em `src/hooks/useProjectTimesheets.ts`) sempre chamou `DELETE ... WHERE project_member_id IN (...) AND is_locked = false` corretamente; a RLS simplesmente filtrava a linha do `WHERE` antes do delete rodar, resultando em **0 linhas afetadas e nenhum erro** — o comportamento padrão de RLS em `USING` para linhas que não passam na policy (diferente de uma falha em `WITH CHECK`, que gera erro explícito).

`activity_timesheets` tinha o comportamento correto porque a migration `20260330212021_...sql` criou `activity_timesheets_delete_own_unlocked` (própria + não travada) além da policy de admin/manager — `project_timesheets` nunca ganhou o equivalente.

## Evidência de que o padrão já era conhecido

`supabase/migrations/20260615120000_fix_feriado_20_abril_origami.sql` já documentava o mesmo sintoma para outro caso de uso (correção manual de feriado), com o comentário:

> "RLS em project_timesheets bloqueia DELETE silenciosamente se rodado como usuário comum" — e contornava rodando a migration como service role com `SET LOCAL row_security = OFF`.

Ou seja, o gap já tinha mordido o time uma vez (via migration administrativa) antes de aparecer como bug de produto no botão "Limpar".

## Correção

`supabase/migrations/20260729120000_project_timesheets_delete_own_unlocked.sql` — cria `"Employees can delete own timesheets"` em `project_timesheets`, espelhando exatamente a mesma checagem de posse/tenant já usada em `"Employees can update own timesheets"`, restrita a `is_locked = false`.

## Lição / como aplicar

Quando um botão de escrita (insert/update/**delete**) "não faz nada" sem erro no console nem toast de falha — sobretudo em tabela com RLS e múltiplas policies por operação — **suspeitar primeiro de policy ausente para aquela combinação (role × operação)** antes de assumir bug de lógica no front-end. `DELETE`/`UPDATE` com `USING` que não casa nenhuma policy permissiva simplesmente não afeta a linha; não lança exceção. Checklist rápido: `grep -n "CREATE POLICY\|DROP POLICY" supabase/migrations/*.sql | grep -i "<tabela>"` para reconstruir o conjunto de policies vigente antes de debugar o componente.
