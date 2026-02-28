

## Plano: Filtrar clientes/projetos por vinculo do usuario e melhorar area de comprovantes

### Problema atual
1. No formulario de reembolso, o usuario ve **todos** os clientes e projetos ativos do tenant, mesmo os que nao tem relacao com ele.
2. O titulo do campo de comprovantes diz "Comprovantes * (minimo 1 arquivo)" -- verboso demais.
3. O botao "Anexar arquivo" e os textos auxiliares nao estao bem centralizados na area de drop.

### Solucao

#### 1. Filtrar clientes e projetos vinculados ao usuario

No `useEffect` que carrega clientes e projetos (linhas 109-126 do `ReimbursementFormDialog.tsx`):

- **Projetos**: buscar apenas projetos onde o employee e `manager_id` OU existe um registro em `project_members` com seu `employee_id`. Isso sera feito em dois passos:
  1. Buscar IDs dos projetos em `project_members` onde `employee_id = employee.id`
  2. Buscar projetos onde `manager_id = employee.id` OU `id in (IDs do passo 1)`
  3. Filtrar apenas projetos com status `active` ou `planning`

- **Clientes**: derivar a lista de clientes a partir dos `client_id` dos projetos retornados (em vez de buscar todos os clientes ativos). Assim, so aparecem clientes que possuem pelo menos um projeto vinculado ao usuario.

#### 2. Simplificar titulo de comprovantes

- Alterar o label de `"Comprovantes * (minimo 1 arquivo)"` para apenas `"Comprovantes *"`.

#### 3. Melhorar layout da area de drop

- Reorganizar o conteudo dentro da drop zone para que o icone de upload, o botao "Anexar arquivo" e o texto auxiliar fiquem centralizados verticalmente e horizontalmente.
- Mover o texto de formatos aceitos para dentro da area de drop, logo abaixo do botao, com fonte menor e cor `text-muted-foreground`.
- Layout: icone de upload no topo, botao no centro, texto auxiliar abaixo, tudo com `flex-col items-center`.

---

### Detalhes tecnicos

**Arquivo:** `src/components/reimbursements/ReimbursementFormDialog.tsx`

**Mudanca na query de dados (useEffect):**

```typescript
useEffect(() => {
  if (!open || !employee) return;

  // 1. Get project IDs where employee is a member
  const loadData = async () => {
    const { data: memberRows } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('employee_id', employee.id);
    
    const memberProjectIds = (memberRows || []).map(r => r.project_id);

    // 2. Get projects where user is manager OR member
    let projectQuery = supabase
      .from('projects')
      .select('id, name, client_id')
      .eq('tenant_id', employee.tenant_id)
      .in('status', ['active', 'planning'])
      .order('name');

    const { data: allProjects } = await projectQuery;
    
    const filtered = (allProjects || []).filter(p =>
      p.manager_id === employee.id || memberProjectIds.includes(p.id)
    );
    // Note: manager_id is not in the select, so we adjust the select to include it

    setProjects(filtered);

    // 3. Derive clients from filtered projects
    const clientIds = [...new Set(filtered.map(p => p.client_id).filter(Boolean))];
    if (clientIds.length > 0) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, company_name')
        .in('id', clientIds)
        .order('company_name');
      setClients(clientData || []);
    } else {
      setClients([]);
    }
  };
  loadData();
}, [open, employee]);
```

A query de projetos precisa incluir `manager_id` no select para poder filtrar localmente.

**Mudanca no label de comprovantes (linha ~507):**
- De: `Comprovantes * (minimo 1 arquivo)`
- Para: `Comprovantes *`

**Mudanca no layout da drop zone:**
- Adicionar padding vertical maior (`py-6`)
- Centralizar com `flex flex-col items-center gap-2`
- Colocar icone `Upload` acima do botao
- Texto auxiliar de formatos abaixo, centralizado

### Arquivos modificados
- `src/components/reimbursements/ReimbursementFormDialog.tsx`

