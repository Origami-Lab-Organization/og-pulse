-- Rollback de 20260917170000_zerar_horas_planejadas_apos_a_saida.sql.
--
-- ATENÇÃO: o zeramento NÃO tem volta. A migration gravou 0 por cima do planejado futuro de
-- quem saiu e dos projetos concluídos, e o valor anterior não foi guardado em lugar nenhum —
-- era planejamento que ninguém ia realizar. Este rollback só desliga a regra daqui para
-- frente; os números já zerados continuam zerados.
--
-- Se precisar dos valores antigos, a fonte é o backup do banco.

DROP TRIGGER IF EXISTS zerar_planejado_ao_concluir_projeto ON public.projects;
DROP FUNCTION IF EXISTS public.zerar_planejado_ao_concluir_projeto();

DROP TRIGGER IF EXISTS zerar_planejado_ao_desligar ON public.employee_terminations;
DROP FUNCTION IF EXISTS public.zerar_planejado_ao_desligar();

DROP TRIGGER IF EXISTS zerar_planejado_ao_desalocar ON public.project_team_rows;
DROP FUNCTION IF EXISTS public.zerar_planejado_ao_desalocar();

DROP FUNCTION IF EXISTS public.zerar_planejado_apos(uuid, uuid, date);
