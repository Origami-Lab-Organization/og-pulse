-- PUL-202 — quem abre a ficha do colaborador passa a poder LER o perfil de acesso dela.
--
-- A ficha exibia "Perfil no Sistema" a partir de `employees.system_role`, que só sabe
-- dizer admin, manager ou user. Com papel customizado no tenant (PUL-204) esse campo passa
-- a mentir: alguém com o papel "Gerente de Pessoas" aparece como "Gerente de Projetos" ou
-- "Usuário", porque a coluna legada não tem como representar o papel real.
--
-- Para a ficha mostrar a verdade, precisa ler `user_tenant_roles`. Hoje a leitura dessa
-- tabela é só do admin (mais a própria pessoa), então gerente veria "sem perfil" para todo
-- mundo.
--
-- A policy nova é NEUTRA em informação: o mesmo público já lê `employees.system_role`, que
-- é a projeção legada exatamente deste dado — e é o público que abre a ficha, governado
-- por `pessoa:ler-ficha-completa`. Não amplia quem vê nada; corrige o que vê.
--
-- A ESCRITA continua restrita: `Admins can assign roles to others` segue exigindo admin e
-- recusando o próprio usuário. Ler o perfil de alguém e poder mudá-lo são coisas
-- diferentes, e só a primeira muda aqui.

CREATE POLICY "Quem le a ficha completa ve o perfil de acesso"
ON public.user_tenant_roles FOR SELECT
TO authenticated
USING (public.has_capability(auth.uid(), tenant_id, 'pessoa:ler-ficha-completa'));

COMMENT ON POLICY "Quem le a ficha completa ve o perfil de acesso" ON public.user_tenant_roles IS
  'PUL-202: a ficha do colaborador exibe o perfil real, inclusive papel customizado. '
  'Leitura apenas — atribuir perfil segue exigindo admin.';
