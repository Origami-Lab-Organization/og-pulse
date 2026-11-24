-- Rollback de 20261124195000_excecao_recalcula_papel.sql
--
-- Remove só o gatilho. A reconciliação não é desfeita: ela gravou o papel que a capacidade
-- efetiva já determinava, e voltar ao valor antigo reintroduziria a divergência.
DROP TRIGGER IF EXISTS trg_sync_display_role_for_override ON public.user_capability_overrides;
