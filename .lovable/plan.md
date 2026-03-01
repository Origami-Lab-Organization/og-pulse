

# Filtros Avancados no Dashboard Comercial

## Resumo
Substituir o filtro de "Ano" por um seletor de periodo flexivel e adicionar filtro de "Responsavel". Todos os calculos do hook serao atualizados para usar intervalo de datas ao inves de ano fixo.

## Alteracoes

### 1. Pagina: novos estados e filtros (`CommercialDashboard.tsx`)

**Remover:** estado `selectedYear` e o Select de ano.

**Adicionar:**
- Estado `periodType`: `'this_month' | 'last_3_months' | 'this_year' | 'last_year' | 'custom'` (default: `'this_year'`)
- Estados `customStart` e `customEnd` (Date | undefined) para o modo "Personalizado"
- Estado `selectedResponsible` (string, default `'all'`)
- Logica `useMemo` que calcula `dateFrom` e `dateTo` a partir do `periodType`
- Select de periodo com opcoes: "Este mes", "Ultimos 3 meses", "Este ano", "Ano anterior", "Personalizado"
- Quando "Personalizado" selecionado, exibir dois Popovers com Calendar (date picker) para inicio e fim
- Select de responsavel populado a partir de `data.responsibleOptions` (lista extraida do hook)

**Periodo anterior para comparacao YoY:**
- O hook recebera `dateFrom` e `dateTo` e calculara internamente o periodo anterior com a mesma duracao

### 2. Hook: aceitar intervalo de datas e responsavel (`useCommercialDashboard.ts`)

**Nova assinatura:**
```text
useCommercialDashboard(
  dateFrom: Date,
  dateTo: Date,
  selectedServiceLine: string,
  selectedResponsible: string
)
```

**Mudancas internas:**
- Substituir `getYear(parseISO(l.created_at)) === selectedYear` por `parseISO(l.created_at) >= dateFrom && parseISO(l.created_at) <= dateTo`
- Adicionar filtro por `responsible_id` quando `selectedResponsible !== 'all'`
- Calcular periodo anterior automaticamente: mesma duracao, deslocada para tras (ex: se periodo = 3 meses, anterior = 3 meses antes disso)
- Para o grafico de receita por mes, gerar labels dinamicos baseados no intervalo de datas ao inves dos 12 meses fixos
- Extrair lista de responsaveis unicos (id + nome) de todos os leads e retornar como `responsibleOptions` no objeto de dados

**Novo campo no retorno:**
```text
responsibleOptions: { id: string; name: string }[]
```

### 3. Detalhes de UI dos filtros

Layout dos filtros na barra (flex wrap gap-3):
1. Select "Periodo" (w-[180px])
2. Se "Personalizado": dois botoes com Popover + Calendar (date pickers)
3. Select "Linha de Servico" (w-[220px]) -- ja existe
4. Select "Responsavel" (w-[200px])

Os date pickers usarao o componente Calendar do shadcn dentro de Popover com `pointer-events-auto`, formatando datas com `date-fns` `format(date, 'dd/MM/yyyy')`.

## Arquivos modificados
1. `src/hooks/useCommercialDashboard.ts` -- nova assinatura, filtro por datas e responsavel, lista de responsaveis
2. `src/pages/CommercialDashboard.tsx` -- novos estados, UI de filtros, calculo de dateFrom/dateTo, date pickers

Nenhuma alteracao no banco de dados e necessaria. Os campos `responsible_id` e `created_at` ja existem na tabela `leads`.

