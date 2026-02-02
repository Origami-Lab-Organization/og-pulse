
# Plano: Dashboard Profissional de Projeto

## Resumo das Alteracoes

Transformar a aba "Visao Geral" em um dashboard profissional de gestao de projeto com layout otimizado e graficos de resumo.

## 1. Remover Botao Voltar e Excluir

**Arquivo: `src/pages/ProjectDetail.tsx`**

Manter apenas o botao "Editar" na area de acoes:

```text
Antes:
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Voltar  │  │  Editar  │  │  Excluir │
└──────────┘  └──────────┘  └──────────┘

Depois:
┌──────────┐
│  Editar  │
└──────────┘
```

O breadcrumb "Projetos" ja serve como navegacao de retorno.

## 2. Permitir Adicionar Membros na Visao Geral

A funcionalidade de adicionar membros ja existe em `ProjectMembersTable`. Precisamos:
- Importar o botao de adicionar membro na secao de equipe do `ProjectOverviewTab`
- Exibir o botao apenas quando o projeto estiver em modo de planejamento OU quando o usuario quiser alocar mais pessoas

## 3. Layout em Duas Colunas: Descricao e Equipe

**Arquivo: `src/components/projects/detail/ProjectOverviewTab.tsx`**

```text
Antes:
┌─────────────────────────────────────────┐
│ Descricao do Projeto                    │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Equipe do Projeto                       │
└─────────────────────────────────────────┘

Depois:
┌────────────────────┐  ┌────────────────────┐
│ Descricao          │  │ Equipe             │
│ do Projeto         │  │ do Projeto         │
│                    │  │ + Adicionar Membro │
└────────────────────┘  └────────────────────┘
```

## 4. Dashboard Profissional - Nova Estrutura

Transformar a pagina em um dashboard de gestao agil:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Status] Em Planejamento         Nome do Projeto                  [Editar]│
│  Cliente: ABC Ltda • Gerente: Joao Silva • Jan/2026 - Jun/2026              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ METRICAS PRINCIPAIS ───────────────────────────────────────────────────────┐
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│ │ Contrato   │ │ Custo Plan.│ │ Margem     │ │ Recebido   │ │ Pendente   │ │
│ │ R$ 100.000 │ │ R$ 68.000  │ │ 32%        │ │ R$ 25.000  │ │ R$ 75.000  │ │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ GRAFICOS DE RESUMO ────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────┐  ┌─────────────────────────────┐            │
│ │ Composicao de Custos        │  │ Recebimentos                │            │
│ │ [Grafico de pizza ou donut] │  │ [Grafico de barras]         │            │
│ │  Mao de Obra: 60%           │  │  Recebido vs Pendente       │            │
│ │  Fornecedores: 25%          │  │                             │            │
│ │  Materiais: 15%             │  │                             │            │
│ └─────────────────────────────┘  └─────────────────────────────┘            │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Curva de Custos (mini)                                                   │ │
│ │ [Linha de tendencia simplificada - Planejado vs Budget]                  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ DESCRICAO E EQUIPE ────────────────────────────────────────────────────────┐
│ ┌────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│ │ Descricao do Projeto       │  │ Equipe do Projeto (4 membros)           │ │
│ │                            │  │                                         │ │
│ │ Lorem ipsum dolor sit amet │  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │ │
│ │ consectetur adipiscing     │  │ │ JS  │ │ MC  │ │ AP  │ │ RF  │        │ │
│ │ elit. Sed do eiusmod...    │  │ │     │ │     │ │     │ │     │        │ │
│ │                            │  │ └─────┘ └─────┘ └─────┘ └─────┘        │ │
│ │                            │  │ Joao   Maria   Ana    Roberto          │ │
│ │                            │  │                                         │ │
│ │                            │  │            [+ Adicionar Membro]        │ │
│ └────────────────────────────┘  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ PARCELAS ──────────────────────────────────────────────────────────────────┐
│ Tabela de parcelas existente                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5. Novos Componentes

### 5.1 Grafico de Composicao de Custos (Donut Chart)

**Novo arquivo: `src/components/projects/detail/ProjectCostBreakdownChart.tsx`**

Grafico de rosca mostrando a distribuicao percentual:
- Mao de Obra (azul)
- Fornecedores (roxo)
- Materiais (amarelo)

### 5.2 Grafico de Recebimentos

**Novo arquivo: `src/components/projects/detail/ProjectPaymentsChart.tsx`**

Grafico de barras horizontais:
- Recebido (verde)
- Pendente (amarelo)
- Atrasado (vermelho)

### 5.3 Mini Curva de Tendencia

Reutilizar `ProjectTrendChart` em formato compacto para o dashboard.

### 5.4 Componente de Equipe Compacto

**Novo arquivo: `src/components/projects/detail/ProjectTeamSection.tsx`**

Exibir equipe com avatares visuais e botao de adicionar:
- Avatares circulares com iniciais
- Nome e papel abaixo
- Botao de adicionar membro (abre dialog)
- Reutiliza logica do `ProjectMembersTable` para adicionar

## 6. Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ProjectDetail.tsx` | Remover botoes Voltar e Excluir |
| `src/components/projects/detail/ProjectOverviewTab.tsx` | Transformar em dashboard completo |
| `src/components/projects/detail/ProjectHeader.tsx` | Simplificar para linha unica no topo |

## 7. Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/projects/detail/ProjectCostBreakdownChart.tsx` | Donut chart de custos |
| `src/components/projects/detail/ProjectPaymentsChart.tsx` | Barras de recebimentos |
| `src/components/projects/detail/ProjectTeamSection.tsx` | Secao de equipe com adicionar |

## 8. Detalhes Tecnicos

### Grafico de Composicao de Custos
```tsx
// Usando Recharts PieChart com innerRadius para efeito donut
<PieChart>
  <Pie
    data={[
      { name: 'Mao de Obra', value: laborCost, fill: 'hsl(var(--chart-1))' },
      { name: 'Fornecedores', value: supplierCost, fill: 'hsl(var(--chart-4))' },
      { name: 'Materiais', value: materialCost, fill: 'hsl(var(--chart-3))' },
    ]}
    innerRadius={60}
    outerRadius={80}
  />
</PieChart>
```

### Secao de Equipe
```tsx
// Avatares em grid responsivo
<div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
  {members.map((member) => (
    <div className="flex flex-col items-center gap-1">
      <Avatar className="h-12 w-12">
        <AvatarFallback>{getInitials(member.employee.nome)}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{member.employee.nome.split(' ')[0]}</span>
      <span className="text-xs text-muted-foreground">{member.role}</span>
    </div>
  ))}
</div>
```

## 9. Resultado Visual Final

O dashboard tera aspecto profissional similar a ferramentas como Jira, Monday.com ou Azure DevOps, com:

- Header compacto com informacoes essenciais
- Metricas financeiras em destaque
- Graficos visuais de composicao e status
- Layout em grid responsivo (2 colunas em desktop, 1 em mobile)
- Cores consistentes com a paleta do sistema
- Interatividade para adicionar membros diretamente

## 10. Responsividade

```text
Desktop (>1024px):      Tablet (768-1024px):    Mobile (<768px):
┌─────┐ ┌─────┐         ┌─────┐ ┌─────┐        ┌─────────────┐
│     │ │     │         │     │ │     │        │             │
└─────┘ └─────┘         └─────┘ └─────┘        └─────────────┘
2 colunas               2 colunas               1 coluna
```
