
# Plano: Dashboard Profissional de Projeto Agil

## Visao Geral das Alteracoes

Redesenhar a tela de detalhes do projeto para um dashboard profissional de gestao agil, removendo informacoes duplicadas e organizando os dados de forma hierarquica e visual.

## Alteracoes Estruturais

### 1. Header Simplificado

**Arquivo: `src/components/projects/detail/ProjectHeader.tsx`**

Remover os 8 cards atuais e criar um header compacto e informativo:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [Badge Status]  Cliente • Gerente Responsavel • Periodo (Data Inicio - Fim)   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Apenas uma linha de contexto que orienta o usuario sobre ONDE ele esta.

### 2. Tabs como Primeiro Elemento

**Arquivo: `src/pages/ProjectDetail.tsx`**

Reorganizar para que as tabs venham ANTES do conteudo do dashboard:

```text
Nome do Projeto                                                          [Editar]
───────────────────────────────────────────────────────────────────────────────────
[Status] Cliente • Gerente • Data Inicio - Data Fim

┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Visao Geral] [Custos] [Financeiro] [Stakeholders] [Cronograma]                 │
└─────────────────────────────────────────────────────────────────────────────────┘

... Dashboard Content ...
```

### 3. Dashboard Completo na Aba Visao Geral

**Arquivo: `src/components/projects/detail/ProjectOverviewTab.tsx`**

Transformar em um dashboard profissional de gestao agil:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  METRICAS FINANCEIRAS PRINCIPAIS (5 cards em linha)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Contrato │ │ Custo    │ │ Margem   │ │ Recebido │ │ Pendente │              │
│  │ R$ 40.8k │ │ R$ 28k   │ │ 31%      │ │ R$ 0     │ │ R$ 40.8k │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  GRAFICOS DE CUSTOS E RECEBIMENTOS (2 colunas)                                  │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐            │
│  │ Composicao de Custos       │  │ Recebimentos                   │            │
│  │ [Donut Chart]              │  │ [Horizontal Bar Chart]         │            │
│  │  Mao de Obra: 60%          │  │  Recebido: verde               │            │
│  │  Fornecedores: 25%         │  │  Pendente: amarelo             │            │
│  │  Materiais: 15%            │  │  Atrasado: vermelho            │            │
│  └────────────────────────────┘  └────────────────────────────────┘            │
├─────────────────────────────────────────────────────────────────────────────────┤
│  CURVA DE TENDENCIA (largura total)                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ Custo Acumulado vs Orcamento                                                ││
│  │ [Line Chart com projecao]                                                   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────────┤
│  EQUIPE DO PROJETO (largura total, foco na gestao de pessoas)                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ Equipe do Projeto (X membros)                             [+ Adicionar]     ││
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                                            ││
│  │ │ JS  │ │ MC  │ │ AP  │ │ RF  │                                            ││
│  │ └─────┘ └─────┘ └─────┘ └─────┘                                            ││
│  │ Joao   Maria   Ana    Roberto                                               ││
│  │ Dev    Design  PM     Backend                                               ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────────┤
│  INFORMACOES DE PAGAMENTO (Parcelas)                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ Tabela de parcelas com status                                               ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Elementos Removidos

1. **Descricao do Projeto**: Removida conforme solicitado
2. **Cards duplicados no Header**: Valor do Contrato, Recebido, Pendente, Duracao, Periodo (ja estarao no dashboard ou no contexto)

## Elementos do Header Simplificado

Manter apenas informacoes de CONTEXTO:
- Badge de Status (colorido)
- Nome do Cliente
- Nome do Gerente
- Periodo (data inicio - data fim)

Formato em linha unica, sem cards.

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ProjectDetail.tsx` | Simplificar estrutura, tabs primeiro |
| `src/components/projects/detail/ProjectHeader.tsx` | Header compacto em linha unica |
| `src/components/projects/detail/ProjectOverviewTab.tsx` | Remover descricao, reorganizar dashboard |

## Detalhes de Implementacao

### ProjectHeader.tsx (Nova versao)

```tsx
// Header compacto - apenas contexto
<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
  <Badge className={statusColors[project.status]}>
    {PROJECT_STATUS_LABELS[project.status]}
  </Badge>
  <span className="hidden sm:inline">•</span>
  <span className="flex items-center gap-1">
    <Building2 className="h-3.5 w-3.5" />
    {project.client?.trading_name || project.client?.company_name}
  </span>
  <span className="hidden sm:inline">•</span>
  <span className="flex items-center gap-1">
    <User className="h-3.5 w-3.5" />
    {project.manager?.nome}
  </span>
  <span className="hidden sm:inline">•</span>
  <span className="flex items-center gap-1">
    <Calendar className="h-3.5 w-3.5" />
    {formatPeriod(project)}
  </span>
</div>
```

### ProjectOverviewTab.tsx (Dashboard Completo)

Remover a secao de descricao e reorganizar o dashboard:

1. **Metricas Financeiras**: 5 cards compactos em linha
2. **Graficos**: 2 colunas (Composicao de Custos + Recebimentos)
3. **Tendencia**: Curva de custos em largura total
4. **Equipe**: Secao de equipe em largura total (mais destaque)
5. **Parcelas**: Tabela de pagamentos

### Estrutura Visual Final

```text
┌─ NOME DO PROJETO ─────────────────────────────────────────────────────── [Editar]
│  [Status] Cliente • Gerente • Periodo
├───────────────────────────────────────────────────────────────────────────────────
│  [Visao Geral] [Custos] [Financeiro] [Stakeholders] [Cronograma]
├───────────────────────────────────────────────────────────────────────────────────
│
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│  │Contrato│  │ Custo  │  │ Margem │  │Recebido│  │Pendente│
│  │ R$ 40k │  │ R$ 28k │  │  31%   │  │ R$ 0   │  │ R$ 40k │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘
│
│  ┌────────────────────────┐  ┌────────────────────────┐
│  │  Composicao Custos     │  │  Recebimentos          │
│  │      [Donut]           │  │      [Barras]          │
│  └────────────────────────┘  └────────────────────────┘
│
│  ┌─────────────────────────────────────────────────────┐
│  │          Curva de Tendencia                         │
│  └─────────────────────────────────────────────────────┘
│
│  ┌─────────────────────────────────────────────────────┐
│  │  Equipe do Projeto           [+ Adicionar Membro]   │
│  │  [Avatar] [Avatar] [Avatar] [Avatar] [Avatar]       │
│  └─────────────────────────────────────────────────────┘
│
│  ┌─────────────────────────────────────────────────────┐
│  │  Parcelas de Pagamento                              │
│  │  [Tabela]                                           │
│  └─────────────────────────────────────────────────────┘
│
└───────────────────────────────────────────────────────────────────────────────────
```

## Principios de Design Aplicados

1. **Hierarquia Visual**: Metricas financeiras no topo (mais importantes)
2. **Dados Acionaveis**: Graficos que permitem identificar problemas rapidamente
3. **Gestao de Pessoas**: Equipe em destaque para projetos ageis
4. **Fluxo de Caixa**: Parcelas visiveis para controle financeiro
5. **Sem Duplicacao**: Cada informacao aparece em um unico lugar

## Paleta de Cores dos Indicadores

| Metrica | Cor Positiva | Cor Negativa |
|---------|--------------|--------------|
| Margem | Verde (>= 30%) | Vermelho (< 15%) |
| Recebido | Verde | - |
| Pendente | Amarelo | - |
| Atrasado | - | Vermelho |
| Custo Plan. | Neutro | - |

## Responsividade

- Desktop: 5 cards em linha, 2 colunas de graficos
- Tablet: 5 cards em linha (menores), 2 colunas de graficos
- Mobile: Cards empilham em 2x3, graficos em 1 coluna
