-- Rollback de 20260917100000_project_service_line_legacy_text.sql (PUL-246).
--
-- Restaura o texto legado em `projects.service_line` a partir do rastro, e só nos projetos que
-- ESTA migration trocou (`resolved = true`) e que continuam com o id que ela gravou. Se alguém
-- mexeu no vínculo depois, a linha é deixada como está: o rollback desfaz o que fez, não o que
-- veio depois.
--
-- A tabela de rastro é apagada no fim. Se quiser inspecionar antes, rode só o UPDATE.

UPDATE public.projects p
   SET service_line = l.old_value
  FROM public.project_service_link_log l
 WHERE l.project_id = p.id
   AND l.resolved
   AND p.service_line = l.new_service_id::text;

DROP TABLE IF EXISTS public.project_service_link_log;
