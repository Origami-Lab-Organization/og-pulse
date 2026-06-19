# CLAUDE.md — og-pulse
# generated: 2026-06-19 (atualizado com contexto técnico)
# status: ACTIVE

---

## Identidade
Você é o Dev Sênior Invisível deste projeto.

## Regras Inegociáveis (Harness)
- NUNCA viole `.harness/boundaries.md`
- NUNCA gere lógica de negócio sem testes
- Complexidade ≤ 7 por função (threshold SonarQube)
- Cobertura ≥ 80% geral, ≥ 95% código crítico
- SEMPRE pergunte antes de assumir em pedidos ambíguos

## Referências Harness
- `.harness/boundaries.md` — limites absolutos
- `.harness/domain-glossary.md` — termos de negócio (tenant, parcela, timesheet, etc.)
- `.harness/patterns/` — como o time implementa cada coisa
- `.harness/adr/` — decisões arquiteturais já tomadas
- `.harness/ai-review-checklist.md` — checklist antes do PR

---

## Stack e Versões

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js / Vite | vite 5.4.19 |
| Linguagem | TypeScript | 5.8.3 |
| Framework UI | React | 18.3.1 |
| Roteamento | React Router DOM | 6.30.1 |
| Server state | TanStack React Query | 5.83.0 |
| Banco de dados | Supabase (PostgreSQL) | supabase-js 2.91.0 |
| Edge Functions | Deno/TypeScript (Supabase) | — |
| Estilo | Tailwind CSS | 3.4.17 |
| Componentes UI | shadcn/ui + Radix UI | vários |
| Formulários | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| Tabelas | TanStack React Table | 8.21.3 |
| Gráficos | Recharts | 2.15.4 |
| Drag & Drop | DnD Kit | 6.3.1 |
| Datas | date-fns | 3.6.0 |
| Geração PDF | jsPDF + html2canvas | 4.2.0 / 1.4.1 |
| Geração DOCX | docx | 9.6.0 |
| Analytics | Amplitude | 2.35.4 |
| AI SDK | @anthropic-ai/sdk | 0.78.0 |
| Testes unit | Vitest + Testing Library | 3.2.4 / 16.0.0 |
| Testes e2e | Playwright | 1.58.2 |
| Linter | ESLint 9 (flat config) | 9.32.0 |
| Compiler | SWC (@vitejs/plugin-react-swc) | 3.11.0 |

---

## Comandos

```bash
npm run dev          # servidor local em http://localhost:8080
npm run build        # build de produção (Vite)
npm run build:dev    # build em modo development
npm run preview      # preview do build
npm run lint         # ESLint (flat config, ESLint 9)
npm test             # Vitest (run único — não watch)
npm run test:watch   # Vitest em modo watch
```

Para Edge Functions, use a CLI do Supabase (`supabase functions serve`).
Variáveis de ambiente ficam em `.env.local` (não comitar — ver `.harness/boundaries.md`).

---

## Estrutura de Pastas

```
og-pulse/
├── src/
│   ├── App.tsx                  # Raiz: providers + router
│   ├── main.tsx                 # Entry point (monta App no DOM)
│   ├── components/              # Componentes por domínio (ver abaixo)
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Auth + employee + tenant_id + roles
│   │   └── HideValuesContext.tsx # Toggle de ocultar valores financeiros
│   ├── hooks/                   # Custom hooks (um por domínio/concern)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts        # createClient — único ponto de acesso ao Supabase
│   │       └── types.ts         # Tipos auto-gerados (NÃO editar manualmente)
│   ├── lib/                     # Cálculos e utilitários puros
│   │   ├── formatters.ts        # Formatação de moeda, datas, etc.
│   │   ├── utils.ts             # cn() para merge de classes Tailwind
│   │   ├── employeeCostCalculator.ts
│   │   ├── netSalaryCalculator.ts
│   │   ├── projectHealthCalculator.ts
│   │   ├── workingDays.ts
│   │   └── viaCep.ts            # Integração ViaCEP (endereços BR)
│   ├── pages/                   # Componentes de página (mapeados 1:1 com rotas)
│   ├── services/                # Acesso ao Supabase (métodos estáticos por domínio)
│   ├── test/                    # Testes Vitest + arquivos de setup
│   ├── types/                   # Tipos TypeScript por domínio
│   └── utils/
│       ├── generatePdf.ts
│       └── generateDocx.ts
├── supabase/
│   ├── migrations/              # SQL versionado (NÃO editar diretamente)
│   └── functions/               # 17 Edge Functions Deno/TypeScript
├── apps/
│   └── mcp-activities/          # MCP edge function separada
├── public/                      # Assets estáticos
└── .harness/                    # Contexto do time (ADRs, patterns, boundaries)
```

### `src/components/` — organização por domínio

```
analytics/     crm/          layout/       services/
auth/          data-table/   my-kanban/    settings/
budgets/       employees/    my-projects/  strategy/
calculator/    inbox/        notifications/suppliers/
candidates/    job-openings/ portfolio/    timesheets/
clients/       commercial/   pricing/      terminations/
projects/      reimbursements/
ui/            # Primitivos shadcn/ui (NÃO modificar sem ADR)
```

---

## Convenções de Código

### Componentes
- Arquivo por componente em pasta de domínio: `src/components/<domínio>/<Nome>.tsx`
- Nome do componente = PascalCase, igual ao nome do arquivo
- Props inline (sem interface separada para props simples)
- Para props complexas: `interface <Nome>Props` no mesmo arquivo

### State
- **Server state**: sempre via TanStack React Query (nunca `useEffect` + `fetch` manual)
- **Auth / tenant_id**: sempre via `useAuth()` — nunca passar como prop por toda a árvore
- **Local UI state**: `useState` no componente; não criar store global sem decisão explícita
- Query key padrão: `[domínio, tenantId, filtros]` — ex: `['projects', tenantId, isAdmin]`

### Chamadas ao Supabase
- **Só via `src/services/<domínio>Service.ts`** — nunca chamar `supabase` diretamente em componente ou hook
- Service = objeto com métodos estáticos (não instanciar)
- Todo método de service recebe `tenantId` quando a query é sensível a tenant
- Hooks consomem services dentro de `useQuery` / `useMutation`

### Hooks de dados
- Um arquivo por domínio: `src/hooks/use<Domínio>.ts`
- Extraem `employee.tenant_id` e `isAdmin` do `useAuth()` internamente
- `enabled: !!tenantId` — nunca disparar query sem tenant_id
- `onSuccess` de mutations: `invalidateQueries` + toast de sucesso
- `onError` de mutations: toast de erro

### Formulários
- React Hook Form + Zod para validação
- Resolver: `zodResolver(schema)` no `useForm`
- Submit handler prefixado com `onSubmit` ou `handle<Ação>`

### Nomenclatura
- Handlers: `handle<Ação>` (ex: `handleAddEmployee`, `handleSubmit`)
- Hooks: `use<Domínio>` ou `use<Ação>` (ex: `useProjects`, `useCreateProject`)
- Services: `<domínio>Service` (ex: `projectService`, `employeeService`)
- Tipos: PascalCase em `src/types/<domínio>.ts`
- Variáveis booleanas: prefixo `is` / `has` / `can`

### Estilo
- Tailwind CSS exclusivamente — sem CSS-in-JS, sem módulos CSS
- `cn()` de `@/lib/utils` para merge condicional de classes
- Dark mode via classe CSS (ThemeProvider com `storageKey="origami-pulse-theme"`)
- Componentes Radix/shadcn em `src/components/ui/` — preservar acessibilidade

### Segurança
- `tenant_id` obrigatório em toda query que retorna dados sensíveis
- Nunca logar dados financeiros, senhas, tokens ou CPF/CNPJ completo
- Inputs externos sanitizados com DOMPurify (`dompurify` já instalado)

---

## Pontos de Entrada e Conexão entre Módulos

```
main.tsx
  └── App.tsx
        ├── QueryClientProvider (staleTime: 2 min)
        ├── ThemeProvider
        ├── AuthProvider  ← AuthContext (employee, tenant_id, roles)
        ├── TooltipProvider
        ├── Toaster (shadcn) + Sonner
        └── BrowserRouter
              └── Routes
                    ├── Rotas públicas: /login, /landing, /boas-vindas, etc.
                    ├── ProtectedRoute: qualquer auth (inbox, my-timesheet, reimbursements, etc.)
                    ├── RoleProtectedRoute requireManager: employees, clients, portfolio, analytics, etc.
                    ├── RoleProtectedRoute requireAdmin: /admin
                    └── Pública sem auth: /trabalhe-conosco/:tenantId (candidatura)
```

**Fluxo de dados por feature:**
1. `Page` chama hooks de `src/hooks/`
2. Hook usa `useAuth()` para obter `tenant_id`, depois chama `useQuery`/`useMutation`
3. Query/Mutation chama `src/services/<domínio>Service.ts`
4. Service acessa `supabase` de `src/integrations/supabase/client.ts`
5. Supabase aplica RLS automaticamente no banco

**Edge Functions** (`supabase/functions/`):
- Invocadas via `supabase.functions.invoke('<nome>', { body })` nos services
- Funções críticas: `create-employee-user`, `register-tenant`, `recalculate-employee-costs`, `send-invite-email`
- Funções de notificação (cron): `notify-timesheet-pending`, `timesheet-alert-managers`

---

## Roles e Controle de Acesso

| Role | Campo | Acesso |
|---|---|---|
| `admin` | `employee.isAdmin` | Tudo, incluindo dados salariais e RH completo |
| `manager` | `employee.is_gerente` | Comercial, Projetos, Analytics — sem dados salariais |
| `user` | (autenticado) | Apenas Meu Espaço: timesheet, reembolsos, my-projects |

- `employee.must_change_password` → redireciona para troca de senha no login
- `employee.tenant_id` → isolamento multi-tenant (RLS no banco)

### Campos financeiros PROIBIDOS para `user` e `manager`

Nunca exiba estes campos em views de funcionário ou GP:

```
total_value, payment_method, installments_count, due_day,
first_invoice_date, contract_url, success_fee_percent,
renewal_date, budget_id, salario_mensal, beneficios,
encargos, custo_hora, total_monthly_cost_estimated
```

---

## Regras de Negócio Críticas

### Multi-tenant
- Toda query Supabase filtra por `tenant_id` — sem exceção
- RLS aplicado no banco, não apenas escondendo elemento na UI
- Nova migration: `supabase migration new nome_descritivo`

### TypeScript
- Strict mode **DESATIVADO** — não ativar (`strictNullChecks: false`, `noImplicitAny: false`)

### Dados
- **Nunca deletar** entidade de catálogo/cadastro — usar `is_active = false`
- Migrations preservam dados existentes e não quebram referências ativas
- `total_value` de projeto **nunca é editado diretamente** — somente via aditivos aprovados

### Orçamentos
- Só existem **dentro de leads do CRM** — nunca criados de forma avulsa
- Fórmula de precificação: divisor de markup (`Preço = Custo / (1 - percentuais)`)
- `billing_type`: `fixed_scope` | `recurring` | `success_fee` | `no_revenue`

### Timesheet
- Apontamento é **por dia, por projeto** — não por tarefa
- Semana futura não pode ser editada
- Fechamento mensal exige assinatura eletrônica → registros imutáveis

### Reembolsos — regra de aprovação
- Funcionário com projeto → aprovado pelo `manager_id` do projeto
- Funcionário sem projeto → aprovado pelo admin
- Gerente com projeto → auto-aprovado
- Gerente sem projeto → aprovado pelo admin

### Cálculo de margem
```
Margem % = (Receita - Impostos - Comissões - Custos) / Receita × 100
```

### Cálculo de custo/hora CLT
```
FGTS          = salário_bruto × 0.08
INSS empresa  = salário_bruto × 0.20
13º           = salário_bruto / 12
Férias        = (salário_bruto / 12) × 1.33
custo_hora    = total_monthly_cost_estimated / jornada_mensal
```
(`total_monthly_cost_estimated` = salário + benefícios + encargos + ferramentas)

---

## Receitas de Implementação

### Nova página para gerentes (8 passos)
1. Componente de página em `src/pages/`
2. Componentes de domínio em `src/components/[domain]/`
3. Service em `src/services/xxxService.ts`
4. Tipos em `src/types/xxx.ts`
5. Hooks em `src/hooks/useXxx.ts`
6. Rota em `src/App.tsx` com `<RoleProtectedRoute requireManager>`
7. Item de navegação em `src/components/layout/AppSidebar.tsx`
8. Migration em `supabase/migrations/`

### Novo campo em entidade existente (6 passos)
1. Migration SQL (`ALTER TABLE`)
2. Atualizar interface `XxxDB` em `src/types/xxx.ts`
3. Atualizar `CreateXxxInput` / `UpdateXxxInput`
4. Atualizar `dbToXxx()` se houver mapeamento
5. Atualizar métodos `create()` / `update()` do service
6. Atualizar formulário (schema Zod + FormField)

---

## Nomenclatura Completa

| Artefato | Convenção | Exemplo |
|---|---|---|
| Componentes React | PascalCase | `ClientFormDialog` |
| Custom hooks | `useXxx` | `useClients`, `useCreateBudget` |
| Services | `xxxService` | `clientService` |
| Tipos DB | `XxxDB` | `ClientDB`, `BudgetDB` |
| Tipos frontend | `Xxx` | `Client`, `Budget` |
| Inputs de criação | `CreateXxxInput` | `CreateClientInput` |
| Schemas Zod | `xxxSchema` | `clientSchema` |
| Query keys | `['resource', tenantId]` | `['clients', tenantId]` |
| Textos de UI | **pt-BR** | — |
| Identificadores de código | **inglês** | — |

---

## Proibições Explícitas

- Não use class components
- Não use CSS modules ou `style={}`
- Não crie React Contexts para estado de servidor (use React Query)
- Não chame `supabase.auth.*` diretamente em componentes (use `useAuth()`)
- Não coloque lógica de negócio em componentes de página
- Não edite `src/integrations/supabase/types.ts` (gerado automaticamente)
- Não omita `invalidateQueries` após mutations
- Não use cores hex ou `style={{}}` — use tokens semânticos do Tailwind

---

## A CONFIRMAR

- **`employeeStore.ts`**: arquivo em `src/lib/` — padrão de store (Zustand? localStorage?) não confirmado sem leitura completa
- **Playwright**: está em `package.json` como dependência, mas os testes e2e não foram localizados em pasta dedicada — podem estar em `src/test/` junto com os Vitest ou em pasta a verificar
- **`apps/mcp-activities/`**: propósito exato e como se integra ao app principal não confirmado
- **Variáveis de ambiente**: nomes das env vars esperadas (ex: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) inferidos pelo padrão Supabase+Vite, mas não lidos diretamente — confirmar no `.env.example` ou Supabase dashboard
- **Supabase config.toml**: configuração de funções/auth não lida — pode conter restrições de CORS ou configurações de JWT relevantes
- **Tabelas do banco**: `src/integrations/supabase/types.ts` (166KB, auto-gerado) lista o schema completo — ler quando necessário para entender relacionamentos específicos
