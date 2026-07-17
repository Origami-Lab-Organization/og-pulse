# ADR 0008: Fundações do módulo de Jornada/Ponto

- Status: aceito
- Data: 2026-07-16
- Decisores: Aline (dev)

## Contexto

Foi solicitado um sistema completo de controle de ponto para colaboradores
(registro de entrada/saída, banco de horas, horas extras, aprovações, painéis
por perfil, relatórios, auditoria, exportação para folha), especificado
originalmente com stack própria: React/Vite no frontend e **NestJS + Prisma +
PostgreSQL separado** no backend.

O og-pulse não tem — e não deveria ganhar — um backend paralelo: hoje toda a
aplicação roda sobre Supabase (Postgres + RLS + Edge Functions) mais um
frontend React/Vite. Introduzir um segundo backend e um segundo banco só para
este módulo duplicaria autenticação, duplicaria dados de colaboradores e
manteria duas infraestruturas de dados em paralelo no mesmo produto —
contrariando a arquitetura já decidida do og-pulse e os `boundaries.md` do
projeto (não substituir padrões existentes sem decisão registrada).

Além disso, o schema atual de `employees` não tem hierarquia organizacional
formal (sem `manager_id`, departamento ou centro de custo); "gestor" só
existe hoje por projeto, via `projects.manager_id`. O fluxo de aprovação de
férias (ADR-0003, `vacation-accrual-and-multi-manager-approval`) já resolve
isso replicando a aprovação para todos os gestores de projetos ativos do
colaborador, com fallback para o admin.

## Decisão

1. **Arquitetura**: o módulo de Jornada/Ponto é implementado como parte do
   og-pulse, reaproveitando Supabase Auth/RLS/Edge Functions e a tabela
   `employees` existente (incluindo `jornada_diaria`/`jornada_mensal`, já
   usados no cálculo de custo). Nenhum backend ou banco de dados separado é
   introduzido.
2. **Perfil RH**: novo valor `'rh'` no enum `app_role` (antes só
   `admin`/`manager`/`user`), adicionado em migration isolada
   (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`), seguindo o mesmo padrão já
   usado para introduzir `'manager'`.
3. **Aprovação de ajustes de ponto e horas extras**: fluxo de uma etapa só,
   decidido exclusivamente pelo administrador — **sem** replicar o padrão
   multi-aprovador (gestor de projeto → admin) usado em férias. Motivo:
   decisão explícita do dev, dado que o módulo não depende de hierarquia
   formal de gestor e o volume de aprovações não justificava reaproveitar a
   complexidade do fluxo de férias.
4. **Escopo adiado (roadmap, sem lógica ativa por ora)**: motor de
   escalas/turnos (12x36 e afins), reconhecimento facial, QR code e fila de
   sincronização offline (registro de ponto sem internet). GPS, IP e
   user-agent das marcações **entram já** na Fase 1, por serem simples de
   capturar com APIs de browser padrão.

Implementação de referência (Fase 1 — fundação de dados + registro básico):
- `supabase/migrations/20260716120000_add_rh_role.sql`
- `supabase/migrations/20260716120100_time_tracking_schema.sql`
- `supabase/functions/record-time-punch/index.ts`
- `src/pages/Jornada.tsx`, `src/pages/JornadaConfiguracoes.tsx`
- `src/contexts/AuthContext.tsx` (`isRH`), `src/components/auth/RoleProtectedRoute.tsx` (`requireRH`)

Fases seguintes (banco de horas/horas extras visíveis; ajustes com aprovação
do admin e painéis de RH/admin; relatórios, auditoria e exportação) ficam
registradas como roadmap e exigem novo sinal de "pode seguir" antes de
começar cada uma.

## Consequências

- Benefícios: sem infraestrutura duplicada; reaproveita RLS, roles e
  colaboradores já existentes; menor superfície de risco de segurança
  (não há segundo sistema de auth); consistente com o restante do produto.
- Custos: sem hierarquia formal de gestor, futuras necessidades de
  aprovação por gestor direto (fora do escopo de projeto) exigiriam uma
  nova decisão de modelagem (ex.: `employees.manager_id`).
- Riscos: aprovação só-admin pode virar gargalo se o volume de ajustes/horas
  extras crescer — se isso acontecer, revisitar esta decisão e considerar
  reintroduzir uma etapa de gestor ou delegar a RH.
- Como reverter: as tabelas `time_*` são aditivas e isoladas (sem alterar
  tabelas existentes além do enum `app_role`); podem ser removidas via
  migration de rollback sem impacto em outros módulos.

## Evidências

- Plano de implementação desta sessão (Fase 1), aprovado em 2026-07-16.
- `supabase/migrations/20260716120000_add_rh_role.sql`
- `supabase/migrations/20260716120100_time_tracking_schema.sql`
- `.harness/adr/0003-vacation-accrual-and-multi-manager-approval.md` (padrão de referência considerado e não replicado para este módulo)
