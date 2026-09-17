-- Quem já é stakeholder de um projeto passa a existir também na conta do cliente.
--
-- POR QUE. A migration anterior (20260917150000) abriu o modelo: a pessoa pode pertencer ao
-- cliente, e não só ao projeto. Mas o dado que já existe continuava só dentro dos projetos —
-- abrir a aba do cliente mostraria gente listada como "no projeto", sem ficha da conta, e o
-- cadastro da conta nasceria vazio numa base cheia de stakeholders. Esta migration promove o
-- que já existe.
--
-- O VÍNCULO COM O PROJETO CONTINUA. Nada é movido nem apagado: a linha do projeto fica onde
-- está, com a influência, o interesse e a ação que o GP anotou ali. O projeto pode ter
-- stakeholder que a conta não tem (alguém que entrou só naquela frente); o cliente é que
-- passa a sempre ter os seus.
--
-- O QUE SOBE E O QUE NÃO SOBE. Sobe a identidade da pessoa: nome, cargo, papel, organização,
-- e-mail, telefone e observações. NÃO sobem influência, interesse, patrocínio e ação — essas
-- quatro são leitura DAQUELE projeto, e quem é promotor num pode ser detrator no seguinte.
-- Achatar as quatro numa ficha só inventaria um número que ninguém decidiu.

-- Uma pessoa por cliente, identificada por nome+e-mail — a mesma chave que a tela já usa para
-- não listar o patrocinador de quatro projetos quatro vezes. `DISTINCT ON` com a ordenação
-- abaixo escolhe a linha MAIS RECENTE de cada pessoa: é a ficha com maior chance de estar
-- atualizada.
INSERT INTO public.project_stakeholders
  (client_id, project_id, name, job_title, role, organization, email, phone, notes)
SELECT DISTINCT ON (s.client_id, lower(btrim(s.name)), lower(btrim(coalesce(s.email, ''))))
       s.client_id,
       NULL::uuid,
       s.name,
       s.job_title,
       s.role,
       s.organization,
       s.email,
       s.phone,
       s.notes
  FROM public.project_stakeholders s
 WHERE s.client_id IS NOT NULL
   AND s.project_id IS NOT NULL
   -- Já promovida numa execução anterior: a migration precisa poder rodar duas vezes sem
   -- duplicar a conta inteira.
   AND NOT EXISTS (
     SELECT 1
       FROM public.project_stakeholders c
      WHERE c.client_id = s.client_id
        AND c.project_id IS NULL
        AND lower(btrim(c.name)) = lower(btrim(s.name))
        AND lower(btrim(coalesce(c.email, ''))) = lower(btrim(coalesce(s.email, '')))
   )
 ORDER BY s.client_id,
          lower(btrim(s.name)),
          lower(btrim(coalesce(s.email, ''))),
          s.created_at DESC;
