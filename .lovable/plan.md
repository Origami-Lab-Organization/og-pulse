

# Plano: CRUD de Fornecedores

## Visao Geral

Criar um modulo completo de cadastro de fornecedores no sistema, seguindo o mesmo padrao do modulo de clientes. Os fornecedores cadastrados poderao ser vinculados a orcamentos e projetos para lancamento de custos de servicos externos.

---

## 1. Nova Tabela no Banco de Dados

### Tabela: `suppliers`

```text
+-------------------+------------------------+-------------+
| Coluna            | Tipo                   | Descricao   |
+-------------------+------------------------+-------------+
| id                | UUID (PK)              | Identificador unico |
| tenant_id         | UUID (FK tenants)      | Isolamento multi-tenant |
| company_name      | TEXT                   | Razao social (obrigatorio) |
| trading_name      | TEXT                   | Nome fantasia |
| cnpj              | TEXT                   | CNPJ do fornecedor |
| category          | TEXT                   | Categoria (ex: Tecnologia, Marketing) |
| contact_name      | TEXT                   | Nome do contato principal |
| contact_email     | TEXT                   | Email do contato |
| contact_phone     | TEXT                   | Telefone do contato |
| cep               | TEXT                   | CEP |
| logradouro        | TEXT                   | Endereco |
| numero            | TEXT                   | Numero |
| complemento       | TEXT                   | Complemento |
| bairro            | TEXT                   | Bairro |
| cidade            | TEXT                   | Cidade |
| estado            | TEXT(2)                | UF |
| notes             | TEXT                   | Observacoes |
| status            | TEXT                   | 'active' ou 'inactive' |
| created_at        | TIMESTAMPTZ            | Data criacao |
| updated_at        | TIMESTAMPTZ            | Data atualizacao |
+-------------------+------------------------+-------------+
```

### Politicas RLS

- SELECT: `user_belongs_to_tenant(auth.uid(), tenant_id)`
- INSERT/UPDATE/DELETE: `is_admin_or_manager(auth.uid(), tenant_id)`

---

## 2. Arquivos a Serem Criados

### Estrutura (seguindo padrao de clientes)

| Arquivo | Descricao |
|---------|-----------|
| `src/types/supplier.ts` | Tipos TypeScript (SupplierDB, Supplier, CreateSupplierInput) |
| `src/services/supplierService.ts` | CRUD operations com Supabase |
| `src/hooks/useSuppliers.ts` | React Query hooks (useSuppliers, useCreateSupplier, etc.) |
| `src/pages/Suppliers.tsx` | Pagina principal de listagem |
| `src/components/suppliers/SuppliersTable.tsx` | Colunas da tabela |
| `src/components/suppliers/SupplierFormDialog.tsx` | Formulario de criacao/edicao |
| `src/components/suppliers/DeleteSupplierDialog.tsx` | Confirmacao de exclusao |
| `src/components/suppliers/SupplierStats.tsx` | Cards de estatisticas |

---

## 3. Alteracoes em Arquivos Existentes

### `src/components/layout/AppSidebar.tsx`

Adicionar item de navegacao "Fornecedores" no grupo "Gestao", abaixo de "Clientes":

```tsx
{
  label: 'Gestao',
  requiresAdmin: true,
  items: [
    { title: 'Funcionarios', url: '/', icon: Users, requiresAdmin: true },
    { title: 'Clientes', url: '/clients', icon: Building2, requiresAdmin: true },
    { title: 'Fornecedores', url: '/suppliers', icon: Truck, requiresAdmin: true },  // NOVO
  ],
}
```

### `src/App.tsx`

Adicionar rota protegida para fornecedores:

```tsx
<Route 
  path="/suppliers" 
  element={
    <RoleProtectedRoute requireAdmin>
      <Suppliers />
    </RoleProtectedRoute>
  } 
/>
```

---

## 4. Detalhes da Implementacao

### Tipo: `src/types/supplier.ts`

```tsx
export interface SupplierDB {
  id: string;
  tenant_id: string;
  company_name: string;
  trading_name: string | null;
  cnpj: string | null;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  companyName: string;
  tradingName: string | null;
  cnpj: string | null;
  category: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  companyName: string;
  tradingName?: string;
  cnpj?: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  notes?: string;
  status: 'active' | 'inactive';
}
```

### Formulario: `SupplierFormDialog.tsx`

Campos organizados em secoes:

1. **Dados da Empresa**
   - Razao Social (obrigatorio)
   - Nome Fantasia
   - CNPJ (com mascara)
   - Categoria (select: Tecnologia, Marketing, Consultoria, Infraestrutura, Outros)
   - Status (Ativo/Inativo)

2. **Contato**
   - Nome do Contato
   - Email
   - Telefone

3. **Endereco**
   - CEP (com busca automatica)
   - Logradouro, Numero, Complemento
   - Bairro, Cidade, Estado

4. **Observacoes**
   - Campo de texto livre

### Colunas da Tabela: `SuppliersTable.tsx`

| Coluna | Descricao |
|--------|-----------|
| Fornecedor | Nome + Nome Fantasia com Avatar |
| CNPJ | Formatado |
| Categoria | Badge colorido |
| Contato | Nome + Email |
| Localizacao | Cidade/UF |
| Status | Badge Ativo/Inativo |
| Acoes | Editar, Excluir |

### Estatisticas: `SupplierStats.tsx`

- Total de Fornecedores
- Fornecedores Ativos
- Fornecedores Inativos
- Taxa de Ativacao

---

## 5. Integracao Futura

Apos a criacao do cadastro de fornecedores, sera possivel:

1. **Orcamentos**: Selecionar fornecedores cadastrados ao inves de digitar manualmente
2. **Projetos**: Vincular fornecedores a projetos para controle de custos
3. **Relatorios**: Gerar relatorios de gastos por fornecedor

---

## Resumo das Alteracoes

| Tipo | Arquivo | Descricao |
|------|---------|-----------|
| Database | Migration SQL | Nova tabela `suppliers` com RLS |
| Novo | `src/types/supplier.ts` | Tipos TypeScript |
| Novo | `src/services/supplierService.ts` | CRUD Supabase |
| Novo | `src/hooks/useSuppliers.ts` | React Query hooks |
| Novo | `src/pages/Suppliers.tsx` | Pagina principal |
| Novo | `src/components/suppliers/SuppliersTable.tsx` | Colunas tabela |
| Novo | `src/components/suppliers/SupplierFormDialog.tsx` | Formulario |
| Novo | `src/components/suppliers/DeleteSupplierDialog.tsx` | Confirmacao exclusao |
| Novo | `src/components/suppliers/SupplierStats.tsx` | Cards estatisticas |
| Modificar | `src/components/layout/AppSidebar.tsx` | Adicionar item menu |
| Modificar | `src/App.tsx` | Adicionar rota |

