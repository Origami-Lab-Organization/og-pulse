-- Fecha em definitivo a condição de corrida residual encontrada em revisão adversarial:
-- a correção anterior (20260721230000/20260721240000) tornou cancelScheduledVersion
-- atômico (SELECT ... FOR UPDATE trava a linha, tudo numa transação só), mas
-- createVersion() (employeeVersionService.ts, usado por TODA outra edição de marco
-- financeiro) continua sendo 3 chamadas Supabase separadas, sem lock. Um admin cancelando
-- um marco concorrentemente com outro admin criando um novo marco que se sobreponha ainda
-- podia, em teoria, corromper a linha do tempo silenciosamente (duas versões cobrindo o
-- mesmo período para o mesmo colaborador) — sem nenhum erro pra ninguém perceber.
--
-- Em vez de reescrever createVersion() inteiro para ser atômico (client-side, múltiplos
-- pontos de chamada em employeeService.ts — mudança maior, fica para depois se
-- necessário), esta migration impõe a invariante diretamente no banco: nenhum
-- colaborador pode ter duas versões com intervalos [effective_from, effective_until)
-- sobrepostos. Qualquer código (createVersion, cancel, edição manual, futuro código)
-- que tentar violar isso recebe um erro explícito do Postgres na hora, em vez de
-- silenciosamente corromper os dados — a proteção real passa a estar no dado, não em
-- disciplina de código em cada chamador.
--
-- IMPORTANTE: rode supabase/_verification/check-employee-versions-overlaps.sql ANTES
-- desta migration — se já existir alguma sobreposição real nos dados (corrupção antiga,
-- do tipo já visto e corrigido para outros colaboradores nesta sessão), o ALTER TABLE
-- abaixo falha com um erro claro em vez de aplicar silenciosamente. Corrija qualquer
-- sobreposição encontrada antes de rodar esta migration.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.employee_versions
  ADD CONSTRAINT employee_versions_no_overlap
  EXCLUDE USING gist (
    employee_id WITH =,
    daterange(effective_from, effective_until, '[)') WITH &&
  );
