-- Rollback de 20260917160000_stakeholder_de_projeto_sobe_para_o_cliente.sql.
--
-- Desfaz a PROMOÇÃO: apaga a ficha de conta de quem também existe em algum projeto do mesmo
-- cliente. Quem foi cadastrado direto na conta, e não tem linha de projeto nenhuma, FICA —
-- esse dado não veio desta migration e apagá-lo seria perder trabalho de alguém.
--
-- O vínculo com o projeto não é tocado, porque esta migration nunca o tocou.

DELETE FROM public.project_stakeholders c
 WHERE c.project_id IS NULL
   AND c.client_id IS NOT NULL
   AND EXISTS (
     SELECT 1
       FROM public.project_stakeholders s
      WHERE s.client_id = c.client_id
        AND s.project_id IS NOT NULL
        AND lower(btrim(s.name)) = lower(btrim(c.name))
        AND lower(btrim(coalesce(s.email, ''))) = lower(btrim(coalesce(c.email, '')))
   );
