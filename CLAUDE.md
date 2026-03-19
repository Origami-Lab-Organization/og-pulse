# CLAUDE.md — og-pulse

Este arquivo ajuda o Claude Code a entender o projeto og-pulse rapidamente. Leia-o antes de fazer qualquer alteração.

---

## O que é o og-pulse?

**Origami Pulse** é um SaaS multi-tenant para gestão de projetos e orçamentos, desenvolvido para a Origami, uma agência de consultoria brasileira. É usado internamente pela equipe para gerenciar:

- **Pipeline comercial**: leads (CRM), orçamentos/propostas, catálogo de serviços
- **Projetos**: acompanhamento de execução, alocação de equipe (timesheets), controle financeiro (parcelas, custos, comissões)
- **RH**: cadastro de colaboradores, custeio de folha, desligamentos, reembolsos
- **Analytics**: utilização, breakdowns de custo, dashboards comerciais

O idioma alvo para todo texto visível ao usuário é **Português Brasileiro (pt-BR)**. Identificadores de código são em inglês.

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| UI Framework | React 18 + TypeScript 5 + Vite |
| Roteamento | React Router DOM v6 |
| Estado Servidor | TanStack React Query v5 |
| Formulários | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Componentes UI | shadcn/ui (primitivos Radix) + Tailwind CSS v3 |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Analytics | Amplitude |
| Drag & Drop | @dnd-kit |
| Geração de Documentos | jsPDF, docx |
| Testes | Vitest + @testing-library/react |

O strict mode do TypeScript está **DESATIVADO**. Não ative.

---

## Estrutura de Diretórios

```
src/
├── App.tsx                  # Raiz: providers + todas as rotas
├── components/
│   ├── ui/                  # Primitivos base do shadcn/ui (não modificar)
│   ├── layout/              # AppLayout, AppNavbar, AppSidebar
│   ├── auth/                # ProtectedRoute, RoleProtectedRoute
│   ├── budgets/             # Componentes de orçamento
│   ├── crm/                 # Kanban e dialogs do CRM
│   ├── projects/            # Lista e abas de detalhe de projetos
│   ├── employees/           # Gestão de colaboradores + wizard de desligamento
│   ├── timesheets/          # Timesheets e alocação
│   ├── reimbursements/      # Formulários e inbox de reembolsos
│   ├── analytics/           # Gráficos KPI e tabelas
│   └── [outros domínios]/
├── pages/                   # Componentes de página por rota (orquestradores finos)
├── contexts/                # AuthContext (React Context, não React Query)
├── hooks/                   # React Query hooks (useXxx.ts por domínio)
├── services/                # Camada de serviço Supabase (xxxService.ts)
├── types/                   # Tipos TypeScript por domínio
├── lib/
│   ├── formatters.ts        # formatCurrency, formatDate, formatPercent, etc.
│   ├── utils.ts             # cn() (clsx + tailwind-merge)
│   └── [calculators]        # employeeCostCalculator, netSalaryCalculator
├── integrations/supabase/
│   ├── client.ts            # Singleton do cliente Supabase
│   └── types.ts             # Tipos gerados automaticamente (NÃO editar)
└── test/                    # Arquivos de teste Vitest
```

---

## Entidades de Negócio

### Employee
Representa um colaborador. Possui `contract_type` (CLT, PJ, SOCIO, ESTAGIO, MENOR_APRENDIZ), role no sistema (`admin` | `manager` | `user`) e `tenant_id`. Colaboradores têm custos horários usados em cálculos de orçamento e projeto.

### Lead (CRM)
Uma oportunidade de venda avançando por um pipeline kanban: `screening → qualification → proposal → negotiation → closed`. Pode ser vinculado a um Orçamento e eventualmente convertido em Projeto.

### Budget (Orçamento)
Uma proposta de precificação para um cliente ou lead. Possui `billing_type` que orienta um wizard multi-etapas e fórmulas de cálculo distintas:
- `fixed_scope`: projeto one-time com fórmula de markup
- `recurring`: contrato mensal (`is_recurring = true`)
- `success_fee`: receita vinculada a % de resultado externo
- `no_revenue`: projeto interno sem receita

Orçamentos contêm **Roles** (horas × taxa horária), **Suppliers** (custos externos mensais) e **Materials** (custos pontuais). A fórmula de precificação é um divisor de markup: `Preço de Venda = Custo Total / (1 - soma_dos_percentuais)`.

### Project
Um contrato ativo derivado de um Orçamento. Possui `ProjectMember` (alocação de colaborador por mês), `ProjectInstallment` (cronograma de pagamentos), `ProjectSupplier`, `ProjectMaterial` e `ProjectCommission`. Os tipos de projeto espelham os tipos de faturamento (`fixed_scope`, `continuous`, `success_fee`, `non_revenue`).

### RoleRate
Catálogo de cargos faturáveis com níveis de senioridade e taxas horárias — fonte da verdade para precificação em orçamentos e projetos.

### FinancialSettings
Defaults por tenant: `admin_expenses_percent`, `taxes_percent`, `commission_percent`, `net_margin_percent`. Carregados no wizard de orçamento.

---

## Padrões Core

### 1. Camada de Serviço

Serviços são wrappers async finos sobre o Supabase. Sempre recebem `tenantId` e lançam erro em caso de falha.

```typescript
// src/services/clientService.ts
export const clientService = {
  async getAll(tenantId: string): Promise<ClientDB[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('company_name');
    if (error) throw error;
    return data || [];
  },
};
```

### 2. React Query Hooks

Todo domínio tem um arquivo de hook dedicado em `src/hooks/`. Os hooks envolvem serviços com `useQuery` / `useMutation` e gerenciam feedback via toast.

```typescript
// src/hooks/useClients.ts
export const useClients = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['clients', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return clientService.getAll(tenantId);
    },
    enabled: !!tenantId,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: CreateClientInput) =>
      clientService.create(input, employee!.tenant_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Cliente cadastrado' });
    },
    onError: () => {
      toast({ title: 'Erro', variant: 'destructive' });
    },
  });
};
```

Convenções de query key:
- Lista: `['resource', tenantId]`
- Item único: `['resource', id]`
- Filtrado/busca: `['resource', 'search', query, tenantId]`

### 3. Tipos TypeScript

Siga este padrão de nomenclatura estritamente:

| Padrão | Significado |
|---|---|
| `XxxDB` | Tipo bruto da linha Supabase (snake_case) |
| `Xxx` | Tipo frontend (camelCase, opcional) |
| `CreateXxxInput` | Tipo de entrada para formulário/mutation |
| `UpdateXxxInput` | Tipo para atualização parcial |
| `XxxWithRelations` | Tipo DB estendido com dados de joins |
| `dbToXxx()` | Função de conversão DB → frontend |
| `xxxSchema` | Schema de validação Zod |

Nem todos os tipos precisam de variante frontend `Xxx` — use `XxxDB` diretamente quando não houver mapeamento necessário.

### 4. Estrutura de Componentes

Componentes de página em `src/pages/` são orquestradores finos: controlam estado, chamam hooks e delegam renderização a componentes de domínio.

```typescript
// Padrão: pages/Clients.tsx
const Clients = () => {
  const { employee } = useAuth();
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  // ... estado local de UI (dialogs abertos/fechados, selectedItem)
  return (
    <AppLayout title="Clientes" actions={<Button>Novo Cliente</Button>}>
      <DataTable columns={columns} data={clients} />
      <ClientFormDialog ... />
    </AppLayout>
  );
};
```

Componentes de feature ficam em `src/components/[domain]/`. Props são tipadas com `interface ComponentProps` explícita.

### 5. Formulários

Todos os formulários usam React Hook Form + Zod. Padrão:

```typescript
const schema = z.object({
  name: z.string().min(1, 'Campo obrigatório'),
  value: z.coerce.number().min(0),
});
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({ resolver: zodResolver(schema) });
```

Use os wrappers `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormMessage>` do shadcn/ui para todos os campos.

### 6. Auth & Multi-tenancy

```typescript
const { employee, user, loading } = useAuth();
// employee.tenant_id  → sempre passe para chamadas de serviço
// employee.is_gerente → acesso nível manager
// employee.isAdmin    → acesso nível admin
```

- **Toda** query Supabase deve filtrar por `tenant_id` — esta é a fronteira do multi-tenancy.
- `useAuth()` deve ser usado dentro do `<AuthProvider>` (garantido pela árvore de rotas).
- Nunca acesse `supabase.auth` diretamente em componentes; use `useAuth()`.

### 7. Layout

Envolva todas as páginas autenticadas com `AppLayout`:

```typescript
<AppLayout
  title="Título da Página"
  description="Descrição opcional"
  actions={<Button>Ação</Button>}
>
  {/* conteúdo da página */}
</AppLayout>
```

A sidebar (`AppSidebar`) gerencia automaticamente a visibilidade de itens de nav por role.

### 8. Estilização

- Tailwind CSS apenas — sem CSS modules, sem `style={}` inline (exceto valores dinâmicos impossíveis de expressar em Tailwind).
- Use `cn()` de `@/lib/utils` para classes condicionais: `cn('classe-base', condicao && 'classe-condicional')`.
- Tokens de tema: use tokens semânticos do Tailwind (`text-foreground`, `bg-muted`, `border`, etc.), não cores brutas.
- Dark mode é suportado via CSS variables — sempre use tokens semânticos.

### 9. Toast Notifications

```typescript
const { toast } = useToast();
toast({ title: 'Sucesso', description: 'Operação realizada.' });
toast({ title: 'Erro', description: 'Algo deu errado.', variant: 'destructive' });
```

Mutations gerenciam seus próprios toasts nos callbacks `onSuccess` / `onError`.

### 10. Roteamento

Todas as rotas são declaradas em `src/App.tsx`. Controle de acesso é aplicado no nível da rota:

```typescript
// Qualquer usuário autenticado
<ProtectedRoute><MinhaPagina /></ProtectedRoute>

// Manager ou Admin
<RoleProtectedRoute requireManager><PaginaManager /></RoleProtectedRoute>

// Somente Admin
<RoleProtectedRoute requireAdmin><PaginaAdmin /></RoleProtectedRoute>
```

Ao adicionar nova rota, adicione **acima** do `<Route path="*" element={<NotFound />} />`. Adicione o item de nav em `AppSidebar.tsx` se a rota deve aparecer no menu.

---

## Receitas para Funcionalidades Comuns

### Receita 1: Novo CRUD completo (ex: "Contratos")

1. **Types** — crie `src/types/contract.ts`:
   - `ContractDB` (espelha colunas do DB, snake_case)
   - `Contract` (shape frontend camelCase, se necessário)
   - `CreateContractInput`
   - `dbToContract()` se os shapes diferirem

2. **Service** — crie `src/services/contractService.ts`:
   - `getAll(tenantId)`, `getById(id)`, `create(input, tenantId)`, `update(id, updates)`, `delete(id)`
   - Sempre `.eq('tenant_id', tenantId)` em queries de lista
   - `throw error` em caso de falha

3. **Hooks** — crie `src/hooks/useContracts.ts`:
   - `useContracts()` → `useQuery` com key `['contracts', tenantId]`
   - `useCreateContract()` → `useMutation` + `invalidateQueries(['contracts'])` + toast
   - `useUpdateContract()`, `useDeleteContract()` no mesmo padrão

4. **Componentes** — crie em `src/components/contracts/`:
   - `ContractFormDialog.tsx` — formulário criar/editar com React Hook Form + Zod
   - `ContractsTable.tsx` — definição de colunas TanStack Table
   - `DeleteContractDialog.tsx` — dialog de confirmação

5. **Page** — crie `src/pages/Contracts.tsx`:
   - Use `AppLayout` com `title` e `actions`
   - Use `DataTable` de `src/components/data-table/DataTable`
   - Gerencie `formDialogOpen`, `deleteDialogOpen`, `selectedContract` localmente

6. **Rota** — adicione em `src/App.tsx` (acima do `<Route path="*">`):
   ```typescript
   <Route path="/contracts" element={<RoleProtectedRoute requireManager><Contracts /></RoleProtectedRoute>} />
   ```

7. **Navegação** — adicione no grupo adequado em `src/components/layout/AppSidebar.tsx`

8. **Banco de dados** — crie um novo arquivo de migration em `supabase/migrations/`

### Receita 2: Novo campo em entidade existente

1. Escreva e aplique a migration Supabase (ALTER TABLE)
2. Atualize a interface `XxxDB` em `src/types/xxx.ts`
3. Atualize `CreateXxxInput` / `UpdateXxxInput` com o novo campo
4. Atualize `dbToXxx()` se existir mapeamento frontend
5. Atualize os métodos `create()` e `update()` do serviço para incluir o campo
6. Atualize o componente de formulário (schema Zod + FormField)
7. O cache do React Query invalida automaticamente na próxima mutation

### Receita 3: Nova página para todos os usuários autenticados

Siga a Receita 1, mas envolva a rota com `<ProtectedRoute>` em vez de `<RoleProtectedRoute>`.

Coloque o item de nav no grupo "Meu Espaço" no `AppSidebar.tsx` (sem `requiresManager` ou `requiresAdmin`).

### Receita 4: Analytics/gráficos em página existente

1. Crie um hook em `src/hooks/useXxxData.ts` que busca e agrega os dados
2. Crie um componente de gráfico usando `recharts` em `src/components/[domain]/`
3. Use `ResponsiveContainer` para dimensionamento responsivo
4. Use `formatCurrency` / `formatPercent` de `src/lib/formatters.ts` para labels de eixo e tooltips

---

## Dos and Don'ts

### Faça

- Sempre passe `tenant_id` em toda query Supabase que acessa dados do tenant.
- Use `useAuth()` para obter `tenant_id` e role do usuário atual — nunca hardcode.
- Use `queryClient.invalidateQueries({ queryKey: ['resource'] })` após mutations.
- Use `cn()` para toda composição dinâmica de className.
- Use `formatCurrency()`, `formatDate()`, `formatPercent()` de `@/lib/formatters` para todos os valores de exibição.
- Use `useToast()` para todo feedback ao usuário vindo de mutations.
- Use `<AppLayout>` em todas as páginas autenticadas.
- Use schemas Zod para toda validação de formulário.
- Escreva textos de UI em Português (pt-BR).
- Mantenha componentes de página finos — delegue renderização a componentes de domínio.
- Use `enabled: !!tenantId` em todos os `useQuery` que dependem de auth.

### Não Faça

- Não use class components.
- Não use CSS modules ou `style={}` para layout — somente Tailwind.
- Não use cores hex hardcoded — use tokens semânticos do Tailwind.
- Não ignore o filtro de `tenant_id`, mesmo em views admin (RLS também impõe isso).
- Não crie novos React Contexts para estado de servidor — use React Query.
- Não chame `supabase.auth.*` diretamente em componentes ou serviços — use `useAuth()`.
- Não coloque lógica de negócio em componentes de página — extraia para serviços ou hooks.
- Não omita `invalidateQueries` após mutations — a UI exibirá dados desatualizados.
- Não edite `src/integrations/supabase/types.ts` — é gerado automaticamente.
- Não adicione rotas sem atualizar `AppSidebar.tsx` se a rota deve ser navegável.

---

## Convenções de Nomenclatura

| Artefato | Convenção | Exemplo |
|---|---|---|
| Componentes React | PascalCase | `ClientFormDialog` |
| Custom hooks | `useXxx` | `useClients`, `useCreateBudget` |
| Serviços | `xxxService` | `clientService`, `budgetService` |
| Tipos DB | `XxxDB` | `ClientDB`, `BudgetDB` |
| Tipos frontend | `Xxx` | `Client`, `Budget` |
| Tipos de input | `CreateXxxInput`, `UpdateXxxInput` | `CreateClientInput` |
| Schemas Zod | `xxxSchema` | `clientSchema`, `employeeSchema` |
| Query keys | `['resource', tenantId]` | `['clients', tenantId]` |
| Paths de rota | mix de inglês e português | `/budgets`, `/alocacao`, `/crm` |
| Arquivos de hook/service | camelCase | `useClients.ts`, `clientService.ts` |
| Arquivos de componente | PascalCase | `ClientFormDialog.tsx` |

---

## Comandos de Desenvolvimento

```bash
# Desenvolvimento
npm run dev          # inicia em http://localhost:8080

# Build
npm run build

# Testes
npm run test
npm run test:watch

# Lint
npm run lint
```

---

## Migrations do Banco de Dados

Migrations ficam em `supabase/migrations/` (112+ arquivos com timestamps). Use o Supabase CLI para criar novos:

```bash
supabase migration new nome_da_migration
```

Nunca edite manualmente arquivos de migration já aplicados em qualquer ambiente.

---

## Referência de Arquivos Importantes

| Arquivo | Propósito |
|---|---|
| `src/App.tsx` | Todas as rotas e providers globais |
| `src/contexts/AuthContext.tsx` | Estado de auth, hook `useAuth()`, objeto `employee` |
| `src/components/layout/AppSidebar.tsx` | Itens de navegação e visibilidade por role |
| `src/components/layout/AppLayout.tsx` | Wrapper padrão de página autenticada |
| `src/lib/formatters.ts` | `formatCurrency`, `formatDate`, `formatPercent`, `getProjectMonthLabel` |
| `src/lib/utils.ts` | `cn()` para composição de className |
| `src/types/budget.ts` | Tipos de orçamento + funções de cálculo (`calculateBudgetTotals`, `calculateRecurringTotals`, `calculateSuccessFeeTotals`) |
| `src/types/project.ts` | Tipos de projeto, labels de status, opções de pagamento |
| `src/types/employee.ts` | Tipos de colaborador, tipos de contrato, roles do sistema |
| `src/types/lead.ts` | Tipos de CRM, estágios do pipeline, linhas de serviço |
| `src/integrations/supabase/client.ts` | Singleton do cliente Supabase |
| `src/components/data-table/DataTable.tsx` | Componente de tabela reutilizável (TanStack Table) |
