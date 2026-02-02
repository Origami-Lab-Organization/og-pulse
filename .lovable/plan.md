
# Plano: Criacao Automatica de Projeto ao Fechar Negocio

## Contexto Atual

### Fluxo Existente
1. Usuario arrasta orcamento no CRM para coluna "Negocio Fechado"
2. `useUpdateBudgetStatus` chama `budgetService.updateStatus(id, 'active')`
3. Status e atualizado no banco, mas **nenhum projeto e criado**

### Dados Disponiveis no Orcamento
| Campo Orcamento | Pode Mapear Para Projeto |
|-----------------|-------------------------|
| `title` | `name` |
| `client_id` | `client_id` |
| `start_date` | `start_date` |
| `duration_months` | Calcular `end_date` |
| `final_total` | `total_value` |
| `id` | `budget_id` (vinculo) |

### Orcamento Existente em "Negocio Fechado"
Existe 1 orcamento com status `active` que precisa ter projeto criado:
- **Titulo**: Plataforma Bry - Discovery
- **Valor**: R$ 40.800
- **Cliente**: ID 150a61d9-f322-4b29-bf99-ed526e17c23d

---

## Solucao Proposta

### Abordagem UX: Modal de Confirmacao

Quando o usuario arrastar um orcamento para "Negocio Fechado", exibir um **modal de confirmacao** que:

1. Mostra resumo do orcamento que sera fechado
2. Solicita dados faltantes para criar o projeto:
   - **Gerente do Projeto** (obrigatorio - nao existe no orcamento)
   - **Forma de Pagamento** (sugerir mensal)
   - **Quantidade de Parcelas** (sugerir baseado em duration_months)
   - **Dia de Vencimento** (sugerir 10)
3. Permite confirmar ou cancelar a acao

### Fluxo Visual

```text
[Usuario arrasta card para "Negocio Fechado"]
              |
              v
┌─────────────────────────────────────────────────────────────┐
│              Fechar Negocio                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Orcamento: Plataforma Bry - Discovery                      │
│  Cliente: Empresa XYZ                                       │
│  Valor: R$ 40.800,00                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Um projeto sera criado automaticamente com os dados        │
│  do orcamento. Complete as informacoes abaixo:              │
│                                                             │
│  Gerente do Projeto *     [Selecionar gerente     ▼]        │
│  Forma de Pagamento       [Mensal                 ▼]        │
│  Parcelas                 [3                      ]         │
│  Dia de Vencimento        [10                     ]         │
│  Data Primeira NF         [____/____/________     ]         │
│                                                             │
│               [Cancelar]    [Confirmar e Criar Projeto]     │
└─────────────────────────────────────────────────────────────┘
```

### Pre-preenchimento Inteligente
- **Nome do Projeto**: Titulo do orcamento
- **Cliente**: Cliente do orcamento (se existir)
- **Data Inicio**: Data de inicio do orcamento
- **Data Fim**: start_date + duration_months
- **Valor Total**: final_total do orcamento
- **Parcelas**: Sugerir duration_months
- **Status**: `planning` (conforme solicitado)

---

## Implementacao Tecnica

### 1. Novo Componente: `CloseBusinessDialog.tsx`

Modal que:
- Recebe o orcamento sendo fechado
- Exibe resumo do orcamento
- Coleta dados faltantes (gerente, forma de pagamento, parcelas)
- Ao confirmar:
  1. Atualiza status do orcamento para `active`
  2. Cria projeto vinculado ao orcamento

### 2. Modificar `KanbanBoard.tsx`

- Ao detectar drop na coluna `active`, abrir `CloseBusinessDialog` ao inves de chamar diretamente `updateStatus`
- Somente apos confirmacao do modal, executar a acao

### 3. Novo Servico: `projectService.createFromBudget()`

Metodo que:
- Recebe `budget: BudgetWithDetails` + dados complementares
- Cria projeto com `budget_id` preenchido
- Retorna o projeto criado

### 4. Hook: `useCloseBusinessDeal()`

Hook que combina:
- Atualizar status do orcamento
- Criar projeto
- Invalidar queries de ambas as listas

### 5. Migracao de Orcamentos Existentes

Criar projeto para o orcamento "Plataforma Bry - Discovery" que ja esta em `active` mas sem projeto associado.

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/crm/CloseBusinessDialog.tsx` | Criar - Modal de confirmacao |
| `src/components/crm/KanbanBoard.tsx` | Modificar - Interceptar drop em "active" |
| `src/services/projectService.ts` | Modificar - Adicionar `createFromBudget()` |
| `src/hooks/useBudgets.ts` | Modificar - Adicionar `useCloseBusinessDeal()` |

---

## Melhoria no Formulario de Projetos

Para melhorar a experiencia, adicionar ao `ProjectFormDialog`:

1. **Campo Orcamento Vinculado** (opcional): Select para escolher orcamento
2. **Auto-preenchimento**: Ao selecionar orcamento, preencher automaticamente:
   - Nome do projeto
   - Cliente
   - Data de inicio
   - Data de fim
   - Valor total

Isso permite criar projetos manualmente a partir de orcamentos, alem do fluxo automatico do CRM.

---

## Diagrama de Fluxo

```text
                    CRM Kanban
                        |
        [Arrasta card para "Negocio Fechado"]
                        |
                        v
         ┌──────────────────────────────┐
         │   E transicao para 'active'? │
         └──────────────┬───────────────┘
                       Sim
                        |
                        v
         ┌──────────────────────────────┐
         │   Abre CloseBusinessDialog   │
         │   (coleta gerente, parcelas) │
         └──────────────┬───────────────┘
                        |
              [Usuario confirma]
                        |
                        v
         ┌──────────────────────────────┐
         │ 1. updateStatus(id, 'active')│
         │ 2. createProject(budgetData) │
         │ 3. Toast de sucesso          │
         │ 4. Redirecionar p/ projeto?  │
         └──────────────────────────────┘
```

---

## Opcao de Redirecionamento

Apos criar o projeto, oferecer ao usuario:
- **Ir para o Projeto**: Navega para `/projects` com o projeto aberto
- **Continuar no CRM**: Permanece na tela do CRM

---

## Tratamento do Orcamento Existente

Para o orcamento "Plataforma Bry - Discovery" que ja esta em `active`:
1. Ao carregar a lista de projetos, verificar se existe orcamento `active` sem projeto vinculado
2. Exibir banner sugerindo criar projeto para esses orcamentos
3. Ou: criar script de migracao one-time

**Recomendacao**: Adicionar botao na lista de projetos "Sincronizar Orcamentos" que abre dialogo para criar projetos para orcamentos fechados pendentes.
