
# Plano: Cadastro de Empresa na Tela de Login

## Resumo
Adicionar um botão "Cadastrar Empresa" na tela de login que permitirá que novos usuários registrem suas empresas (criando um novo tenant) de forma self-service.

## Funcionalidade

O novo fluxo permitirá:
1. Usuário clica em "Cadastrar Empresa" na tela de login
2. Preenche formulário com dados da empresa e do administrador
3. Sistema cria automaticamente:
   - Novo tenant (empresa)
   - Conta de usuário autenticado
   - Registro de funcionário (administrador)
   - Role de admin para o usuário

## Mudanças Necessárias

### 1. Nova Página de Registro
**Arquivo:** `src/pages/Register.tsx`

Formulário com os campos:
- **Dados da Empresa:**
  - Nome da empresa (obrigatório)
  
- **Dados do Administrador:**
  - Nome completo (obrigatório)
  - Email (obrigatório)
  - Senha (obrigatório, mínimo 6 caracteres)
  - Confirmar senha (obrigatório)

### 2. Atualização da Tela de Login
**Arquivo:** `src/pages/Login.tsx`

- Adicionar link/botão "Cadastrar Empresa" abaixo do botão de login
- Navegação para `/register`

### 3. Nova Edge Function para Registro
**Arquivo:** `supabase/functions/register-tenant/index.ts`

A Edge Function irá:
1. Receber dados da empresa e do admin
2. Criar o tenant na tabela `tenants`
3. Criar usuário no Supabase Auth
4. Criar registro de funcionário (como admin/gerente)
5. Atribuir role `admin` na tabela `user_roles`
6. Retornar sucesso ou erro com rollback em caso de falha

### 4. Configuração de Rotas
**Arquivo:** `src/App.tsx`

- Adicionar rota `/register` apontando para a página de registro

### 5. Atualização do AuthContext
**Arquivo:** `src/contexts/AuthContext.tsx`

- Adicionar função `signUp` para registro de novos usuários

## Fluxo de Dados

```text
[Tela de Registro]
        |
        v
[Edge Function: register-tenant]
        |
        +-- 1. Criar tenant
        |
        +-- 2. Criar auth.user
        |
        +-- 3. Criar employee (is_gerente=true)
        |
        +-- 4. Criar user_role (role=admin)
        |
        v
[Login automático e redirect para dashboard]
```

## Segurança

- A Edge Function usa `SECURITY DEFINER` para criar registros em tabelas protegidas por RLS
- Validação de entrada com Zod no frontend
- Senha validada com requisitos mínimos
- Email único verificado antes da criação

## Detalhes Técnicos

### Schema de Validação (Zod)
```typescript
const registerSchema = z.object({
  companyName: z.string().min(2, 'Nome da empresa é obrigatório'),
  adminName: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
});
```

### Edge Function - Lógica Principal
```typescript
// 1. Criar tenant
const { data: tenant } = await adminClient
  .from('tenants')
  .insert({ name: companyName })
  .select()
  .single();

// 2. Criar usuário autenticado
const { data: authUser } = await adminClient.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

// 3. Criar employee como admin
const { data: employee } = await adminClient
  .from('employees')
  .insert({
    nome: adminName,
    email,
    cargo: 'Administrador',
    data_admissao: new Date().toISOString().split('T')[0],
    is_gerente: true,
    tenant_id: tenant.id,
    auth_id: authUser.user.id,
    must_change_password: false,
  })
  .select()
  .single();

// 4. Atribuir role admin
await adminClient
  .from('user_roles')
  .insert({
    user_id: authUser.user.id,
    tenant_id: tenant.id,
    role: 'admin',
  });
```

## Resultado Esperado

Após a implementação, a tela de login terá um link "Cadastrar Empresa" que leva a um formulário simples onde o usuário pode criar sua empresa e se tornar automaticamente o administrador, com acesso completo ao sistema.
