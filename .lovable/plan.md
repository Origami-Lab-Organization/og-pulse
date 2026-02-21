

## Sugerir stakeholders de projetos anteriores ao selecionar cliente existente

### O que muda

Quando o usuario seleciona um cliente existente no formulario de criacao de lead, o sistema buscara os stakeholders cadastrados em projetos anteriores daquele cliente. Esses contatos aparecerao em um seletor logo abaixo do campo de cliente, permitindo preencher automaticamente os campos de contato (nome, email, telefone) com um clique.

### Como funciona

1. **Busca de stakeholders** - Ao selecionar um cliente, uma query buscara stakeholders de todos os projetos vinculados aquele `client_id`, eliminando duplicatas por nome
2. **Seletor de contato** - Um Select opcional aparecera com a lista de stakeholders encontrados (nome + cargo). Ao selecionar um, os campos contato, email e telefone serao preenchidos automaticamente
3. **Preenchimento opcional** - O usuario pode ignorar a sugestao e preencher manualmente

### Detalhes tecnicos

**Novo hook ou query inline no `LeadFormDialog.tsx`:**

Quando `client_id` mudar e `clientType === 'existing'`, executar:

```sql
SELECT DISTINCT ON (name) ps.name, ps.email, ps.phone, ps.job_title
FROM project_stakeholders ps
JOIN projects p ON p.id = ps.project_id
WHERE p.client_id = '<selected_client_id>'
ORDER BY name, ps.created_at DESC
```

Isso retorna os stakeholders mais recentes de cada nome unico.

**Alteracoes no `LeadFormDialog.tsx`:**

- Adicionar `useQuery` com a busca de stakeholders, habilitado quando `clientType === 'existing'` e `clientId` estiver preenchido
- Adicionar um Select condicional entre o campo de cliente e os campos de contato, com label "Contato de projeto anterior" e placeholder "Selecione ou preencha manualmente"
- Ao selecionar um stakeholder, chamar `form.setValue` para `contact_name`, `contact_email` e `contact_phone`

**Fluxo visual:**

```text
[Cliente *]          -> Seleciona "Empresa ABC"
[Contato anterior]   -> Select com: "João Silva — Decisor", "Maria — Sponsor"
                     -> Seleciona "João Silva"
[Contato] João Silva    [Email] joao@abc.com
[Telefone] (11)...      [Origem] ...
```

Nenhuma migracao de banco necessaria - os dados ja existem nas tabelas `project_stakeholders` e `projects`.
