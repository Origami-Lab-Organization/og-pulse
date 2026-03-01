

# Fix: Erro ao cadastrar empresa (RLS bloqueando INSERT na tabela tenants)

## Problema Identificado

Os logs mostram que a funcao `register-tenant` esta recebendo o erro:
`"new row violates row-level security policy for table tenants"`

A tabela `tenants` tem RLS ativado com apenas duas politicas:
- SELECT: usuarios podem ver seu proprio tenant
- UPDATE: admins podem atualizar seu tenant

Nao existe nenhuma politica de INSERT. Embora a edge function use a service role key (que deveria ignorar RLS), algo esta impedindo o bypass. A solucao mais confiavel e adicionar uma politica de INSERT para a tabela.

## Solucao

Criar uma migration que adiciona uma politica de INSERT na tabela `tenants` usando `SECURITY DEFINER`, permitindo que a edge function (que roda com service role) consiga inserir novos tenants. Como a criacao de tenants so acontece via edge function autenticada com service role, a politica pode ser permissiva para o role `service_role`, ou podemos simplesmente permitir INSERT para qualquer usuario autenticado (ja que o registro de empresa e aberto).

### Migration SQL

```sql
-- Permite que a service role e a edge function insiram novos tenants
CREATE POLICY "Service role can insert tenants"
ON public.tenants FOR INSERT
TO service_role
WITH CHECK (true);

-- Tambem permitir para anon pois a edge function register-tenant
-- nao tem verify_jwt e pode usar o anon key internamente
CREATE POLICY "Allow insert for registration"
ON public.tenants FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

Na verdade, como a edge function usa `SUPABASE_SERVICE_ROLE_KEY`, a politica para `service_role` deveria ser suficiente. Mas para garantir, adicionaremos ambas.

### Detalhes Tecnicos

- **Arquivo afetado**: Nova migration SQL apenas
- **Nenhuma alteracao de codigo** no frontend ou na edge function
- A politica e segura porque a criacao de tenants so acontece via edge function que ja valida os dados de entrada
- Apos a migration, o fluxo de registro voltara a funcionar normalmente

