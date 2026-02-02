
# Plano: Histórico de Versões para Orçamentos

## Análise de Contexto

### Fluxo Atual
O sistema possui um padrão de versionamento já implementado para **funcionários** (`employee_versions`), que armazena snapshots dos dados financeiros ao longo do tempo. Esse padrão pode ser adaptado para orçamentos.

### Características do Cenário de Negociação
- Orçamentos são editados frequentemente durante negociações
- Usuários precisam consultar versões anteriores para:
  - Comparar propostas enviadas ao cliente
  - Verificar o que mudou entre uma versão e outra
  - Recuperar valores de versões anteriores
- Apenas orçamentos em **Proposta** e **Negociação** são editáveis
- Ao chegar em **Negócio Fechado**, o orçamento é travado

---

## Opções de UX para Acesso ao Histórico

### Opção A: Aba "Histórico" na Página de Detalhes (Recomendada)
Adicionar uma aba ou seção expansível na página de detalhes do orçamento que exibe uma timeline visual de todas as versões.

**Vantagens:**
- Contexto completo: usuário está vendo o orçamento e pode acessar o histórico sem sair
- Padrão já usado no sistema (similar às abas em `EmployeeDetailDialog`)
- Facilita comparação rápida

**Desvantagens:**
- Pode ocupar espaço vertical se houver muitas versões

---

### Opção B: Botão "Histórico" no Header com Modal/Drawer
Um botão discreto no header da página que abre um drawer lateral ou modal com a lista de versões.

**Vantagens:**
- Não polui a interface principal
- Histórico acessível de qualquer lugar da página

**Desvantagens:**
- Exige ação extra para acessar
- Modal pode ser restritivo para comparações

---

### Opção C: Timeline Colapsável no Sidebar
Uma timeline vertical colapsável no lado direito da página de detalhes.

**Vantagens:**
- Sempre visível como referência
- Navegação rápida entre versões

**Desvantagens:**
- Ocupa espaço horizontal
- Mais complexo de implementar responsivamente

---

## Recomendação (15 Anos de UX)

**Opção A com melhorias**: Seção "Histórico de Versões" na página de detalhes, exibida como um Card colapsável (usando `Collapsible`) abaixo do resumo financeiro.

### Por quê?
1. **Descobribilidade**: Usuários veem que existe histórico sem precisar procurar
2. **Não intrusivo**: Começa colapsado, não polui a interface
3. **Contexto preservado**: Ao expandir, usuário vê histórico ao lado dos dados atuais
4. **Padrão conhecido**: Similar ao histórico de funcionários já existente
5. **Ação rápida**: Um clique para expandir/colapsar

### Estrutura Visual Proposta

```text
┌─────────────────────────────────────────────────────────────┐
│ 📋 Orçamento: Plataforma Bry                                │
├─────────────────────────────────────────────────────────────┤
│ [Cards de Status, Duração, Horas, Valor]                    │
│ [Cards de Cliente e Validade]                               │
│ [Gráficos]                                                  │
│ [Tabelas de Papéis, Fornecedores, Materiais]                │
│ [Resumo Financeiro]                                         │
│                                                             │
│ ▼ Histórico de Versões (3 versões)            [Expandir ▼]  │
│ ┌───────────────────────────────────────────────────────┐   │
│ │  v3 (Atual)  •  02/02/2026  •  R$ 150.000,00          │   │
│ │  ├─ Alteração: +1 papel, desconto aplicado            │   │
│ │                                                       │   │
│ │  v2  •  28/01/2026  •  R$ 142.000,00       [Ver ▶]    │   │
│ │  ├─ Alteração: ajuste de horas                        │   │
│ │                                                       │   │
│ │  v1 (Criação)  •  25/01/2026  •  R$ 138.000,00  [Ver] │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ [Observações]                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Detalhes do Registro de Histórico

### O Que Registrar (Snapshot Completo)
Para atender ao critério de aceite, cada versão armazenará:

| Categoria | Campos |
|-----------|--------|
| **Geral** | título, válido_de, válido_até, cliente/lead, notas |
| **Configuração** | duração_meses, taxas_%, despesas_adm_%, comissão_%, margem_% |
| **Papéis** | JSON com todos os papéis e suas horas por mês |
| **Fornecedores** | JSON com fornecedores e valores |
| **Materiais** | JSON com materiais e valores |
| **Totais** | custo_total, preço_venda, desconto, valor_final |

### Quando Criar Nova Versão
- Ao salvar qualquer edição no orçamento
- Sistema detecta automaticamente as diferenças e registra

### Metadados da Versão
- `version_number`: Número sequencial (v1, v2, v3...)
- `created_at`: Data/hora da alteração
- `created_by`: Quem fez a alteração
- `change_summary`: Resumo automático das alterações (opcional, melhoria futura)

---

## Implementação Técnica

### 1. Nova Tabela: `budget_versions`

```text
budget_versions
├── id (uuid, PK)
├── budget_id (uuid, FK → budgets)
├── version_number (integer)
├── created_at (timestamp)
├── created_by (uuid, FK → employees)
├── snapshot_data (jsonb) ← Todos os dados do orçamento naquele momento
└── change_summary (text, nullable) ← Opcional para v1
```

### 2. Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/services/budgetVersionService.ts` | Service para CRUD de versões |
| `src/components/budgets/BudgetVersionsSection.tsx` | Seção colapsável com timeline |
| `src/hooks/useBudgetVersions.ts` | Hook para buscar versões |

### 3. Alterações em Arquivos Existentes

| Arquivo | Alteração |
|---------|-----------|
| `src/services/budgetService.ts` | Antes de `update()`, criar versão do estado atual |
| `src/pages/BudgetDetail.tsx` | Adicionar seção de histórico após Resumo Financeiro |

### 4. RLS Policy

```text
Users can view budget versions in their tenant
(Similar às policies existentes para budget_*)
```

---

## Fluxo de Uso

1. Usuário acessa detalhes de um orçamento
2. Vê seção "Histórico de Versões" colapsada mostrando "(3 versões)"
3. Clica para expandir e vê timeline com todas as versões
4. Cada versão mostra: número, data, valor final e quem alterou
5. Botão "Ver" em cada versão abre modal com snapshot completo (somente leitura)
6. Versão atual é destacada com badge "Atual"

---

## Escopo da Implementação

### Fase 1 (MVP)
- Criar tabela `budget_versions`
- Implementar criação automática de versão ao editar
- Exibir lista de versões na página de detalhes
- Visualização de versão em modal (somente leitura)

### Fase 2 (Melhorias Futuras)
- Comparação lado-a-lado entre duas versões
- Resumo automático de alterações (diff)
- Restaurar versão anterior como novo orçamento

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/` | Criar tabela `budget_versions` com RLS |
| `src/services/budgetVersionService.ts` | Criar |
| `src/hooks/useBudgetVersions.ts` | Criar |
| `src/components/budgets/BudgetVersionsSection.tsx` | Criar |
| `src/components/budgets/BudgetVersionModal.tsx` | Criar |
| `src/services/budgetService.ts` | Modificar método `update()` |
| `src/pages/BudgetDetail.tsx` | Adicionar seção de histórico |
