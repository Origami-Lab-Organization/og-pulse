-- Reversão de 20260910130000_merge_duplicate_services.sql (PUL-219).
--
-- A consolidação apagou linhas de `services`. Esta reversão remove a TRAVA (o índice único)
-- e mantém `catalog_merge_log`, que é o rastro para reconstruir o que foi absorvido: cada
-- linha diz o id e o nome do serviço apagado, o sobrevivente e quanto foi movido.
-- Recriar os serviços absorvidos e devolver modelos, projetos e oportunidades é operação
-- manual guiada por esse log — não automática, porque exige decidir o que volta para quem.
DROP INDEX IF EXISTS public.services_tenant_line_name_key;
