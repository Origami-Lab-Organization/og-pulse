# Origami Pulse — Contexto Completo para o Hackathon

> **Para as equipes Tsuru, Koi, Hana, Masu e Sensei**  
> Documento de referência técnica e de produto — Hackathon Origami Lab · Junho 2026

---

## Sumário

1. [O que é o Origami Pulse](#1-o-que-é-o-origami-pulse)
2. [O problema que resolve](#2-o-problema-que-resolve)
3. [Quem usa — As 4 Personas](#3-quem-usa--as-4-personas)
4. [Arquitetura e Tech Stack](#4-arquitetura-e-tech-stack)
5. [Módulos do produto](#5-módulos-do-produto)
6. [Modelo de roles e permissões](#6-modelo-de-roles-e-permissões)
7. [Entidades de negócio e banco de dados](#7-entidades-de-negócio-e-banco-de-dados)
8. [Padrões de código e convenções](#8-padrões-de-código-e-convenções)
9. [Regras de negócio críticas](#9-regras-de-negócio-críticas)
10. [Planos e precificação](#10-planos-e-precificação)
11. [Posicionamento competitivo](#11-posicionamento-competitivo)
12. [Roadmap e o que ainda precisa ser construído](#12-roadmap-e-o-que-ainda-precisa-ser-construído)
13. [Referência rápida de arquivos](#13-referência-rápida-de-arquivos)

---

## 1. O que é o Origami Pulse

O **Origami Pulse** é um SaaS B2B de PSA (Professional Services Automation) focado em **rentabilidade de projetos** para empresas de serviços brasileiras. Ele nasceu da própria dor da Origami Lab ao escalar — nenhuma ferramenta do mercado conseguia responder à pergunta central: *"qual projeto está dando lucro de verdade?"*

O produto unifica em uma única plataforma:

- **Pipeline comercial** — CRM de leads com Kanban, catálogo de serviços e orçamentos
- **Projetos** — execução, alocação de equipe, timesheets, controle financeiro
- **RH** — cadastro de colaboradores, custeio de folha, reembolsos, desligamentos
- **Analytics** — dashboards de margem, utilização e performance comercial

**Mercado-alvo:** consultorias, agências, escritórios de arquitetura, software houses e escritórios de engenharia com faturamento anual entre R$ 1M e R$ 30M. ICP atual concentrado em Minas Gerais, com expansão para sudeste e Brasil.

**Lançamento parceiro (early adopters):** junho de 2026  
**Lançamento público:** setembro de 2026

---

## 2. O problema que resolve

### A dor central

Empresas de serviços profissionais faturam bem mas não sabem o que sobra. Os sintomas mais comuns:

- Descobre que um projeto foi deficitário **meses depois** de encerrado
- Precifica novos projetos "no feeling" sem base histórica de custos reais
- Tem dados espalhados em Artia + ClickUp + Excel + planilhas de RH
- Gerentes de projeto passam horas consolidando relatórios manualmente
- Não consegue identificar qual **gerente** ou qual **cliente** é mais lucrativo

### O "Aha Moment" do produto

O momento de maior valor — e o principal gatilho de conversão e retenção — é o **alerta de desvio de orçamento**: o sistema avisa que um projeto está saindo do budget **antes** de o gestor perceber. Esse insight deve acontecer em menos de 7 dias de uso.

### O que o Pulse faz diferente

| Capacidade | Situação no mercado |
|---|---|
| Custo granular por projeto (mão de obra + fornecedores + materiais + assinaturas + reembolsos) | **Nenhum player nacional** faz isso de forma integrada |
| Benchmark de rentabilidade por gerente de projeto | **Não existe** no mercado brasileiro |
| Benchmark de rentabilidade por cliente | **Não existe** no mercado brasileiro |
| Alertas proativos de desvio de margem | **Ausente** em todos os players nacionais |
| IA generativa (Claude) para insights em português | Apenas o TaskRush tem IA preditiva, mas não conversacional |

---

## 3. Quem usa — As 4 Personas

### Persona #1 — Carlos (Sócio-Fundador de Consultoria) 🥇 PRIMÁRIA
- **Perfil:** CEO/Sócio, 38–52 anos, consultoria de 12–40 funcionários, R$ 2–15M/ano
- **Dor:** não sabe qual projeto dá lucro até fechar o balanço mensal
- **O que quer:** painel executivo de rentabilidade sem abrir planilha
- **Comportamento:** decide a compra sozinho ou com 1 sócio, 30 dias de trial, negocia anual
- **Disposição a pagar:** R$ 1.200–1.800/mês (plano Avançado)

### Persona #2 — Renata (Dona de Agência de Marketing) 🥇 PRIMÁRIA
- **Perfil:** fundadora de agência digital, 32–45 anos, 8–25 funcionários
- **Dor:** cliente que parece rentável consome 3x mais horas que o contrato — descobre tarde
- **O que quer:** dashboard de margem por cliente + alertas de scope creep
- **Trigger de compra:** perdeu uma conta grande e descobriu que ela nunca foi lucrativa
- **Disposição a pagar:** R$ 900–1.500/mês

### Persona #3 — Thiago (Gerente de Projetos Sênior) 🥈 SECUNDÁRIA
- **Perfil:** GP sênior, 28–42 anos, usa o produto diariamente
- **Papel:** **não decide** a compra, mas é o influenciador técnico indispensável
- **Dor:** passa 6h/semana consolidando horas e custos para enviar relatório ao sócio
- **O que quer:** alertas preventivos + relatórios automáticos

### Persona #4 — Juliana (Diretora de Operações) 🥉 FASE 2
- **Perfil:** COO/Diretora de Ops, empresa 50–200 pessoas, faturamento R$ 10–80M
- **Papel:** decisor em empresas maiores — target do plano Enterprise
- **Dor:** dezenas de projetos sem visão consolidada de margem; CFO pede dados que ela não tem
- **Disposição a pagar:** R$ 3.500–9.000/mês

---

## 4. Arquitetura e Tech Stack

### Stack completa

| Camada | Tecnologia |
|---|---|
| UI Framework | React 18 + TypeScript 5 + Vite |
| Roteamento | React Router DOM v6 |
| Estado de servidor | TanStack React Query v5 |
| Formulários | React Hook Form + Zod |
| Backend/BaaS | Supabase (PostgreSQL + Auth + Storage + RLS + Edge Functions + Realtime) |
| Componentes UI | shadcn/ui (Radix primitives) + Tailwind CSS v3 |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Analytics | Amplitude |
| Drag & Drop | @dnd-kit |
| Geração de documentos | jsPDF, docx |
| Testes | Vitest + @testing-library/react |
| Data utilities | date-fns (ptBR) |

> ⚠️ O TypeScript strict mode está **DESATIVADO**. Não ative.

### Supabase — configuração

O projeto principal do Pulse usa um projeto Supabase separado do projeto de hackathon.

- **Multi-tenant:** cada empresa (tenant) tem seus dados completamente isolados via `tenant_id` em todas as tabelas
- **RLS (Row Level Security):** ativo em todas as tabelas — nunca ignore o filtro de `tenant_id`
- **Auth:** gerenciado pelo Supabase Auth. Sempre use `useAuth()` — nunca chame `supabase.auth.*` diretamente em componentes
- **Migrations:** ficam em `supabase/migrations/` (112+ arquivos com timestamps). Crie novos com `supabase migration new nome_da_migration`

### Estrutura de diretórios

```
src/
├── App.tsx                     # Raiz: providers + todas as rotas
├── components/
│   ├── ui/                     # Primitivos shadcn/ui — NÃO modificar
│   ├── layout/                 # AppLayout, AppNavbar, AppSidebar
│   ├── auth/                   # ProtectedRoute, RoleProtectedRoute
│   ├── budgets/                # Wizard de orçamento
│   ├── crm/                    # Kanban e dialogs do CRM
│   ├── projects/               # Lista e abas de detalhe de projetos
│   ├── employees/              # Gestão de colaboradores + desligamento
│   ├── timesheets/             # Timesheets e alocação
│   ├── reimbursements/         # Formulários e inbox de reembolsos
│   ├── analytics/              # Gráficos KPI e tabelas
│   └── [outros domínios]/
├── pages/                      # Componentes de página por rota (orquestradores finos)
├── contexts/                   # AuthContext (React Context — não React Query)
├── hooks/                      # React Query hooks (useXxx.ts por domínio)
├── services/                   # Camada de serviço Supabase (xxxService.ts)
├── types/                      # Tipos TypeScript por domínio
├── lib/
│   ├── formatters.ts           # formatCurrency, formatDate, formatPercent, getProjectMonthLabel
│   └── utils.ts                # cn() (clsx + tailwind-merge)
└── integrations/supabase/
    ├── client.ts               # Singleton do cliente Supabase
    └── types.ts                # Tipos gerados automaticamente — NÃO editar
```

---

## 5. Módulos do produto

### 5.1 Meu Espaço (todos os usuários autenticados)

Área pessoal do colaborador. Acessível sem privilégios de gerente ou admin.

- **Dashboard pessoal** (`/dashboard`) — visão dos projetos nos quais está alocado
- **Timesheet** (`/my-timesheet`) — apontamento de horas por dia, por projeto. **Não é por tarefa.**
  - Grade semanal com um linha por projeto
  - Bloqueia semanas futuras
  - Requer assinatura eletrônica ao fechar o mês → registros se tornam imutáveis
  - Inclui geolocalização e IP no registro
  - Pré-preenchimento proporcional baseado no planejamento mensal
- **Reembolsos** (`/reimbursements`) — solicitação de reembolso de despesas; aprovação pelo GP do projeto ou admin

### 5.2 Marketing

- **Análise de Mercado** (`/marketing/analise-mercado`) — acesso aos 12 passos do plano estratégico do Pulse (apenas gerentes)

### 5.3 Comercial (requiresManager)

O fluxo comercial segue: **Lead no CRM → Orçamento → Projeto**. Orçamentos só existem dentro de leads do CRM — nunca são criados de forma avulsa.

- **Dashboard Comercial** (`/comercial`) — KPIs de pipeline, leads ganhos/perdidos, projeção de receita
- **CRM** (`/crm`) — Kanban de leads com estágios: `screening → qualification → proposal → negotiation → closed`
  - Leads podem ser arquivados com razão (sem budget, preço, prazo, concorrência, etc.)
  - Cada lead pode ter um orçamento vinculado
- **Serviços** (`/comercial/servicos`) — catálogo de serviços com tipos de faturamento (`fixed_scope`, `recurring`, `success_fee`, `no_revenue`)
- **Clientes** (`/clients`) — carteira de clientes com CNPJ, endereço, histórico de projetos
- **Orçamentos** (`/budgets`) — propostas comerciais detalhadas

#### Como funciona o orçamento

O orçamento usa um **wizard multi-etapas** com fórmula de divisor de markup:

```
Preço de Venda = Custo Total / (1 - soma_dos_percentuais)
```

Onde os percentuais são: `admin_expenses_percent + taxes_percent + commission_percent + net_margin_percent`

**Tipos de orçamento (billing_type):**

| Tipo | Descrição |
|---|---|
| `fixed_scope` | Projeto one-time com escopo fechado e markup |
| `recurring` | Contrato mensal (`is_recurring = true`) |
| `success_fee` | Receita vinculada a % de resultado externo |
| `no_revenue` | Projeto interno sem receita |

**Componentes de custo em orçamentos:**
- **Roles** — horas × taxa horária por mês (ex: Desenvolvedor Sênior, 80h/mês, R$ 120/h)
- **Suppliers** — custos externos mensais (ex: fornecedor de design)
- **Materials** — custos pontuais (ex: licença de software)

### 5.4 Projetos (requiresManager)

- **Portfólio** (`/portfolio`) — visão Kanban de todos os projetos por status
- **Projetos** (`/projects`) — lista com filtros por cliente, status, GP
- **Detalhe do Projeto** (`/projects/:id`) — 5 abas principais:
  - **Visão Geral** — dados do contrato, parcelas, marco de pagamento
  - **Equipe** — membros alocados com role, senioridade e horas planejadas/mês
  - **Custos** — comparativo planejado vs. realizado (mão de obra + fornecedores + materiais + reembolsos)
  - **Financeiro** — receita × custo × margem com gráfico mensal
  - **Stakeholders** — mapeamento de influência/interesse dos stakeholders do cliente
- **Alocação da Equipe** (`/alocacao`) — visão consolidada de utilização por colaborador
- **Fornecedores** (`/suppliers`) — cadastro do registro de fornecedores

#### Tipos de projeto

| Tipo | Equivale a |
|---|---|
| `fixed_scope` | Projeto com escopo e valor fechados, parcelas definidas |
| `continuous` | Contrato recorrente mensal |
| `success_fee` | Projeto com receita variável |
| `non_revenue` | Projeto interno |

#### Regra crítica: `total_value` nunca é editado diretamente
O valor total do contrato só pode ser alterado via **aditivos** aprovados. Nunca exponha ou permita edição direta do campo `total_value` em componentes de projeto.

#### Cálculo de margem
```
Margem % = (Receita - Impostos - Comissões - Custos) / Receita × 100
```

- **Receita planejada** = `total_value` do projeto
- **Receita realizada** = soma das parcelas com status `invoiced` ou `received`
- **Custo de mão de obra** = `(total_monthly_cost_estimated / jornada_mensal) × horas_apontadas`
- **Custos adicionais** = fornecedores + materiais + reembolsos aprovados

### 5.5 RH (requiresAdmin)

Dados financeiros de RH são **estritamente protegidos** — nunca devem aparecer em views de funcionário ou GP.

- **Funcionários** (`/employees`) — cadastro completo com cálculo automático de custo/hora real
- **Desligamentos** (`/rh/desligamentos`) — wizard de desligamento com cálculo de verbas rescisórias
- **Em desenvolvimento:** Contratos, Folha de Pagamento, Férias e Afastamentos, Relatórios

#### Tipos de contrato

```typescript
type ContractType = 'SOCIO' | 'CLT' | 'PJ' | 'MENOR_APRENDIZ' | 'ESTAGIO';
```

#### Cálculo de custo CLT (automático)
```
FGTS = salário_bruto × 0.08
INSS empresa = salário_bruto × 0.20
13º = salário_bruto / 12
Férias = (salário_bruto / 12) × 1.33
Total encargos = FGTS + INSS + 13º + Férias
```

#### O custo/hora do colaborador
```
custo_hora = total_monthly_cost_estimated / jornada_mensal
```
Onde `total_monthly_cost_estimated` = salário + benefícios + encargos + ferramentas

### 5.6 Analytics (requiresManager)

- Gráficos de utilização da equipe
- Breakdowns de custo por categoria
- Dashboard comercial com funil e tendências

---

## 6. Modelo de roles e permissões

### Roles do sistema

```typescript
type SystemRole = 'admin' | 'manager' | 'user';
```

| Role | Acesso |
|---|---|
| `admin` | Tudo, incluindo RH completo e dados financeiros sensíveis |
| `manager` | Comercial + Projetos + Analytics. Sem acesso a dados salariais |
| `user` | Apenas "Meu Espaço" — timesheet, reembolsos, dashboard pessoal |

### Campos financeiros PROIBIDOS para `user` e `manager`

Nunca exponha estes campos em views de funcionário ou gerente de projeto:

```
total_value, payment_method, installments_count, due_day,
first_invoice_date, contract_url, success_fee_percent,
renewal_date, budget_id, salario_mensal, beneficios,
encargos, custo_hora, total_monthly_cost_estimated
```

### Proteção de rotas

```tsx
// Para todos os usuários autenticados
<ProtectedRoute>
  <MinhaPage />
</ProtectedRoute>

// Para gerentes e admins
<RoleProtectedRoute requireManager>
  <ProjetosPage />
</RoleProtectedRoute>

// Para admins apenas
<RoleProtectedRoute requireAdmin>
  <FuncionariosPage />
</RoleProtectedRoute>
```

### RLS no Supabase

A segurança também é imposta no banco. Estrutura das policies:

```sql
-- Employee só vê seus próprios dados
-- Admin vê tudo no tenant
-- Gerente vê dados de projetos onde é gerente (manager_id)
```

Para reembolsos: funcionário → vê os próprios; gerente → vê os do projeto onde `projects.manager_id = employee.id`; admin → vê todos.

---

## 7. Entidades de negócio e banco de dados

### Principais tabelas

```
tenants                    # Empresa cliente do Pulse (isolamento multi-tenant)
employees                  # Colaboradores
employee_tools             # Ferramentas por colaborador (custo mensal)
employee_benefits          # Benefícios por colaborador
employee_versions          # Histórico de mudanças salariais
user_roles                 # Vínculo auth.uid ↔ role ↔ tenant

clients                    # Clientes da empresa
leads                      # Oportunidades no CRM
budgets                    # Orçamentos/propostas
budget_roles               # Papéis alocados no orçamento
budget_role_months         # Horas por mês por papel
budget_materials           # Materiais no orçamento
budget_suppliers           # Fornecedores no orçamento

projects                   # Projetos ativos
project_members            # Alocação: employee ↔ project
project_member_months      # Horas planejadas por mês
timesheet_entries          # Apontamentos diários de horas
project_suppliers          # Fornecedores no projeto
project_supplier_months    # Custo real mensal de fornecedor
project_supplier_actuals   # Realizado de fornecedores
project_materials          # Materiais no projeto
project_installments       # Parcelas de pagamento
project_commissions        # Comissões

suppliers                  # Registro de fornecedores
services                   # Catálogo de serviços
role_rates                 # Tabela de preços por role/senioridade
financial_settings         # Defaults financeiros do tenant (impostos, comissão, admin)
reimbursement_requests     # Solicitações de reembolso

okrs                       # OKRs do tenant
key_results                # Key Results dos OKRs
key_result_history         # Histórico de updates de KR
project_stakeholders       # Stakeholders mapeados por projeto
```

### Convenções de nomenclatura BD vs. frontend

| Banco (snake_case) | Frontend (camelCase) | Onde converter |
|---|---|---|
| `tenant_id` | `tenantId` | `dbToXxx()` converter |
| `is_gerente` | `isGerente` | `dbToEmployee()` |
| `salario_mensal` | `salarioMensal` | `dbToEmployee()` |
| `total_monthly_cost_estimated` | Calculado internamente | Não expor |

---

## 8. Padrões de código e convenções

### Camada de serviço

Serviços são wrappers finos sobre o Supabase. Sempre recebem `tenantId`:

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

### React Query hooks

```typescript
// src/hooks/useClients.ts
export const useClients = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['clients', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await clientService.getAll(tenantId);
      return data.map(dbToClient);
    },
    enabled: !!tenantId,  // SEMPRE incluir enabled
  });
};
```

### Padrões obrigatórios

**Faça:**
- Passe `tenant_id` em toda query Supabase
- Use `useAuth()` para `tenant_id` e role — nunca hardcode
- Use `queryClient.invalidateQueries()` após mutations
- Use `cn()` para composição dinâmica de className
- Use `formatCurrency()`, `formatDate()`, `formatPercent()` para exibição
- Use `useToast()` para feedback de mutations
- Use `<AppLayout>` em todas as páginas autenticadas
- Use schemas Zod para toda validação de formulário
- Escreva textos de UI em **pt-BR**; identificadores de código em **inglês**
- Use tokens semânticos do Tailwind — nunca cores hex ou `style={{}}`

**Não faça:**
- Não use class components
- Não use CSS modules ou `style={}`
- Não crie novos React Contexts para estado de servidor
- Não chame `supabase.auth.*` diretamente em componentes
- Não coloque lógica de negócio em componentes de página
- Não edite `src/integrations/supabase/types.ts` (é gerado automaticamente)
- Não omita `invalidateQueries` após mutations

### Nomenclatura

| Artefato | Convenção | Exemplo |
|---|---|---|
| Componentes React | PascalCase | `ClientFormDialog` |
| Custom hooks | `useXxx` | `useClients`, `useCreateBudget` |
| Serviços | `xxxService` | `clientService` |
| Tipos DB | `XxxDB` | `ClientDB`, `BudgetDB` |
| Tipos frontend | `Xxx` | `Client`, `Budget` |
| Inputs de criação | `CreateXxxInput` | `CreateClientInput` |
| Schemas Zod | `xxxSchema` | `clientSchema` |
| Query keys | `['resource', tenantId]` | `['clients', tenantId]` |

### Receitas de implementação

**Receita 1: Nova página para gerentes**
1. Crie o componente de página em `src/pages/`
2. Adicione componentes de domínio em `src/components/[domain]/`
3. Crie o serviço em `src/services/xxxService.ts`
4. Crie os tipos em `src/types/xxx.ts`
5. Crie hooks em `src/hooks/useXxx.ts`
6. Adicione a rota em `src/App.tsx` com `<RoleProtectedRoute requireManager>`
7. Adicione item de navegação em `src/components/layout/AppSidebar.tsx`
8. Crie migration em `supabase/migrations/`

**Receita 2: Novo campo em entidade existente**
1. Escreva a migration SQL (`ALTER TABLE`)
2. Atualize a interface `XxxDB` em `src/types/xxx.ts`
3. Atualize `CreateXxxInput` / `UpdateXxxInput`
4. Atualize `dbToXxx()` se houver mapeamento
5. Atualize os métodos `create()` e `update()` do serviço
6. Atualize o formulário (schema Zod + FormField)

---

## 9. Regras de negócio críticas

### Separação de informações financeiras (hard rule)

Dados financeiros (taxas, encargos, custos) vivem exclusivamente nos módulos de RH e financeiro. **Nunca devem aparecer** em views de projeto para funcionários ou GPs.

### Timesheet

- Apontamento é **por dia, por projeto** — não por tarefa
- A semana futura não pode ser editada
- O fechamento mensal exige **assinatura eletrônica** — registros se tornam imutáveis
- O pré-preenchimento usa distribuição proporcional do planejamento mensal
- Registro inclui geolocalização e IP

### NPS

- NPS é **por projeto** — não por stakeholder individual

### Horas extras

- Seguem legislação trabalhista brasileira (CLT/Estágio/Menor Aprendiz)

### Orçamentos

- **Só criados dentro de leads do CRM** — nunca avulsos (sem lead vinculado)
- A fórmula de precificação é divisor de markup — nunca markup direto

### Projetos

- `total_value` **nunca é editado diretamente** — somente via aditivos aprovados
- Impostos não são gerenciados no sistema (apenas nos orçamentos para markup)
- Planejamento é mensal com distribuição proporcional diária no timesheet

### Reembolsos

- Funcionário com projeto → aprovado pelo `manager_id` do projeto
- Funcionário sem projeto → aprovado pelo admin
- Gerente com projeto → auto-aprovado
- Gerente sem projeto → aprovado pelo admin
- Pagamento → somente admin

---

## 10. Planos e precificação

### Modelo de cobrança

**Flat-rate por empresa** (não por usuário) — diferencial frente a concorrentes globais como Monday e Asana que cobram por seat.

### Os 4 planos

#### 🆓 Starter — Grátis (PLG)
- 1 projeto ativo simultâneo
- Até 3 usuários
- Dashboard de margem bruta básico
- **Sem:** IA Claude, alertas, múltiplos projetos, benchmarks
- **Objetivo:** gerar Product-Led Growth

#### 📊 Growth — R$ 790/mês (ou R$ 7.490/ano, -21%)
- Até 15 projetos ativos, até 10 usuários
- Lançamento completo de custos (funcionários, fornecedores, materiais, assinaturas, reembolsos)
- Dashboard de margem por projeto e por cliente
- **Alertas automáticos de desvio de budget** (email + push)
- IA Claude — 50 consultas/mês
- Exportação Excel + contador
- Benchmarks agregados do setor (médias anônimas)
- **Target:** Carlos e Renata — consultorias/agências pequenas

#### ⭐ Avançado — R$ 1.490/mês (ou R$ 14.290/ano, -20%) — ÂNCORA
- Projetos e usuários **ilimitados**
- IA Claude **ilimitada**
- Relatórios com IA: insights de margem por gerente e por cliente
- **Simulador de precificação** baseado em histórico real
- Ranking top 5 projetos lucrativos vs. deficitários
- Benchmarks setoriais premium
- Alertas preditivos (IA antecipa desvios 2–3 semanas antes)
- Integração com Omie, Conta Azul e Excel
- Suporte prioritário (1h)
- **Target:** Carlos com consultoria média, Renata em crescimento

#### 🏢 Enterprise — A partir de R$ 3.500/mês (contrato anual)
- Tudo do Avançado +
- CSM dedicado com reunião mensal
- Onboarding customizado (até 5 sessões)
- Integração com TOTVS, SAP B1 via API
- White-label opcional
- SLA 99,9% + suporte 24/7 via Slack
- IA treinada com dados proprietários da empresa
- **Target:** Juliana, empresas 50–200 pessoas

### Unit economics

| Plano | MRR | LTV (4 anos) | Margem bruta |
|---|---|---|---|
| Starter | R$ 0 | R$ 0 | — |
| Growth | R$ 790 | R$ 37.920 | ~87% |
| Avançado | R$ 1.490 | R$ 71.520 | ~89% |
| Enterprise | R$ 4.500 | R$ 216.000 | ~93% |

### Meta Ano 1 (Cenário Base)
- 200 clientes ativos no Mês 12
- ARR de R$ 2,4M
- Break-even operacional no Mês 5–6

---

## 11. Posicionamento competitivo

### Concorrentes diretos

| Concorrente | Diferença frente ao Pulse |
|---|---|
| **Artia** (BR, 15 anos) | Gestão de projetos robusta, mas sem controle de custo granular e sem IA |
| **TaskRush** (BR, moderno) | Mais perigoso — posicionamento similar, tem IA preditiva, mas não conversacional |
| **Runrun.it** (BR) | Foco em agências, bom em horas, mas sem camada financeira profunda |
| **Monday.com** (Global) | Cobrado por usuário (caro), genérico, sem foco em margem de projetos |
| **ClickUp** (Global) | Muito genérico, sem controle financeiro de projetos, preço por usuário |
| **Asana** (Global) | Foco em tasks, não em finanças, preço por usuário em USD |

### White space — o que ninguém faz ainda

1. Controle granular de custos (5 categorias integradas) → **Pulse faz**
2. Benchmark de margem por gerente → **Pulse fará**
3. Benchmark de margem por cliente → **Pulse fará**
4. IA conversacional em português para insights de rentabilidade → **Pulse faz**
5. Alertas proativos de desvio antes de estourar → **Pulse faz**
6. Simulador de precificação baseado em histórico real → **Pulse faz (plano Avançado)**

### Porter's Five Forces (resumo)

| Força | Intensidade | Impacto |
|---|---|---|
| Rivalidade competitiva | Alta (8/10) | Precisa de posicionamento cirúrgico em rentabilidade |
| Ameaça de novos entrantes | Média-Alta (6/10) | Barreira são os dados proprietários — construir rápido |
| Poder de barganha dos fornecedores | Média (5/10) | Dependência da Anthropic (Claude API) — mitigar com arquitetura modular |
| Poder de barganha dos compradores | Média (5/10) | Stickiness de dados históricos reduz churn após 6 meses |
| Ameaça de substitutos | Média-Baixa (4/10) | Principal substituto é o Excel — custo real de manutenção é alto |

---

## 12. Roadmap e o que ainda precisa ser construído

### Módulos já implementados ✅

- Multi-tenant com auth e RLS
- Cadastro de empresa e onboarding self-service
- Módulo de Funcionários com cálculo de custo/hora (CLT, PJ, Sócio, Estágio, Menor Aprendiz)
- Ferramentas e benefícios por colaborador
- Histórico de versões de salário
- Wizard de desligamento com cálculo de verbas
- CRM Kanban com 5 estágios
- Wizard de Orçamento (4 tipos de billing)
- Catálogo de Serviços e RoleRates
- Módulo de Projetos com 5 abas
- Alocação de equipe por mês (ProjectMemberMonths)
- Fornecedores e Materiais por projeto
- Parcelas de pagamento por projeto
- Timesheet semanal com apontamento diário
- Reembolsos com workflow de aprovação
- Analytics de utilização e custo
- Dashboard Comercial com KPIs
- Stakeholders de projeto
- OKRs e Key Results
- Landing Page com SEO

### Módulos em desenvolvimento / planejados 🚧

| Funcionalidade | Status | Prioridade |
|---|---|---|
| Alertas proativos de desvio de budget | Planejado | 🔴 Alta |
| Assinatura eletrônica de timesheet mensal | Planejado | 🔴 Alta |
| IA Claude integrada (assistente de margem) | Planejado | 🔴 Alta |
| PWA para "Meu Espaço" | Planejado | 🟡 Média |
| Módulo de Materiais (interface) | Desabilitado na nav | 🟡 Média |
| Módulo de Assinaturas (interface) | Desabilitado na nav | 🟡 Média |
| Contratos de funcionários | Desabilitado na nav | 🟡 Média |
| Folha de Pagamento | Desabilitado na nav | 🟡 Média |
| Férias e Afastamentos | Desabilitado na nav | 🟡 Média |
| Relatórios de RH | Desabilitado na nav | 🟡 Média |
| Simulador de precificação (IA) | Planejado | 🟡 Média |
| Benchmarks setoriais (agregado) | Planejado | 🟢 Baixa |
| Integração Open Finance (Belvo/Pluggy) | Roadmap 2027 | 🟢 Futura |
| Integração ERP (Omie, Conta Azul) | Roadmap 2026–2027 | 🟢 Futura |
| MCP Server para Claude.ai (PUL-127) | Em progresso | 🔴 Alta |

### Itens do hackathon — o que as equipes podem atacar

Ideias de alto valor para construir durante o hackathon:

1. **Alerta de desvio de orçamento** — notificação quando projeto ultrapassa X% do budget planejado
2. **Dashboard de margem por gerente** — ranking de rentabilidade por GP (admin only)
3. **Assistente de IA de margem** — integração com Claude para perguntas sobre rentabilidade dos projetos
4. **PWA do Meu Espaço** — tornar o timesheet e os reembolsos acessíveis offline no mobile
5. **Simulador de precificação** — "quanto cobrar neste projeto com base no histórico?"
6. **Relatório executivo automático** — PDF mensal por cliente com insights de margem
7. **Benchmark anônimo do setor** — comparar margem do tenant com médias agregadas dos pares
8. **Módulo de Assinaturas** — controle de subscriptions (SaaS tools) como custo de projeto
9. **Timeline visual de alocação** — Gantt de alocação da equipe para identificar gargalos
10. **Integração Jira** — importar sprints e horas automaticamente para projetos de TI

---

## 13. Referência rápida de arquivos

| Arquivo | Propósito |
|---|---|
| `src/App.tsx` | Todas as rotas e providers globais |
| `src/contexts/AuthContext.tsx` | Estado de auth, hook `useAuth()`, objeto `employee` |
| `src/components/layout/AppSidebar.tsx` | Itens de navegação e visibilidade por role |
| `src/components/layout/AppLayout.tsx` | Wrapper padrão de página autenticada |
| `src/lib/formatters.ts` | `formatCurrency`, `formatDate`, `formatPercent`, `getProjectMonthLabel` |
| `src/lib/utils.ts` | `cn()` para composição de className |
| `src/types/budget.ts` | Tipos de orçamento + `calculateBudgetTotals`, `calculateRecurringTotals`, `calculateSuccessFeeTotals` |
| `src/types/project.ts` | Tipos de projeto, labels de status, opções de pagamento |
| `src/types/employee.ts` | Tipos de colaborador, tipos de contrato, roles do sistema, `calculateCLTCharges` |
| `src/types/lead.ts` | Tipos de CRM, `CRMStage`, estágios do pipeline, linhas de serviço |
| `src/integrations/supabase/client.ts` | Singleton do cliente Supabase |
| `src/integrations/supabase/types.ts` | Tipos gerados automaticamente (**NÃO editar**) |
| `src/components/data-table/DataTable.tsx` | Tabela reutilizável (TanStack Table) |
| `supabase/migrations/` | 112+ arquivos de migration com histórico completo do schema |

### Comandos úteis

```bash
# Desenvolvimento local
npm run dev          # http://localhost:8080

# Build de produção
npm run build

# Testes
npm run test
npm run test:watch

# Lint
npm run lint

# Nova migration
supabase migration new nome_descritivo_da_migration
```

---

## Apêndice: Fluxo comercial completo

```
Lead criado no CRM (screening)
    │
    ▼
Qualificação (qualification)
    │
    ▼
Orçamento criado dentro do lead
    │  ├─ Roles (horas × taxa horária por mês)
    │  ├─ Suppliers (custos externos mensais)
    │  └─ Materials (custos pontuais)
    │
    ▼
Negociação (negotiation)
    │
    ▼
Negócio Fechado (closed)
    │
    ▼
Projeto criado a partir do orçamento aprovado
    │  ├─ ProjectMembers (alocação da equipe)
    │  ├─ ProjectInstallments (cronograma de pagamentos)
    │  ├─ ProjectSuppliers (fornecedores)
    │  └─ ProjectMaterials
    │
    ▼
Execução
    │  ├─ TimesheetEntries (apontamentos diários)
    │  ├─ ProjectSupplierActuals (custos reais de fornecedores)
    │  └─ ReimbursementRequests (despesas da equipe)
    │
    ▼
Análise de margem
    │  ├─ Receita: parcelas invoiced/received
    │  ├─ Custo: horas × custo/hora + fornecedores + materiais + reembolsos
    │  └─ Margem = (Receita - Impostos - Comissões - Custos) / Receita
```

---

*Documento gerado em junho de 2026 — Hackathon Origami Lab, Formiga MG*  
*Versão para uso interno das equipes participantes*
