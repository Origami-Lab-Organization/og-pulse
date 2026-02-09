
# Plano: Evolucao dos OKRs — Nivel de Confianca, Correcao de Data e Historico

## 1. Trocar "Status" do KR para "Nivel de Confianca"

O campo `status` do Key Result sera substituido por um campo de **nivel de confianca** com 5 opcoes:

- `very_high` — Muito Alto
- `high` — Alto
- `medium` — Medio
- `low` — Baixo
- `very_low` — Muito Baixo

### Mudancas:
- **Migracao SQL**: Renomear coluna `status` para `confidence_level` na tabela `project_key_results` e alterar o default para `'medium'`
- **Tipo TypeScript** (`src/types/projectOkr.ts`): Substituir `KeyResultStatus` por `KeyResultConfidenceLevel` com os 5 valores, atualizar labels e interfaces
- **Form do KR** (`src/components/projects/okrs/KeyResultFormDialog.tsx`): Trocar o dropdown de status por dropdown de nivel de confianca (visivel tanto na criacao quanto na edicao)
- **Listagem OKR** (`src/components/projects/detail/ProjectOKRsTab.tsx`): Substituir o badge de status por um badge colorido indicando o nivel de confianca (cores: verde escuro, verde, amarelo, laranja, vermelho)
- **Hook** (`src/hooks/useProjectOKRs.ts`): Ajustar mapeamento de `status` para `confidence_level`

## 2. Correcao da Data Meta do Objetivo

O problema e que `new Date('2026-02-15')` cria a data em UTC meia-noite, e em fusos negativos (ex: BRT -3h) exibe como dia 14.

### Mudanca:
- **ProjectOKRsTab.tsx** (linha 172): Trocar `new Date(okr.target_date)` por parsing que preserve o dia local:
```typescript
format(new Date(okr.target_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
```

## 3. Historico de Evolucao do Key Result

Toda vez que `current_value` ou `confidence_level` de um KR forem alterados, registrar um snapshot na nova tabela de historico. Um icone de grafico no card do objetivo abrira um popover com a curva de evolucao.

### Mudancas:

**Nova tabela** (`key_result_history`):

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| key_result_id | uuid FK -> project_key_results |
| current_value | numeric |
| confidence_level | text |
| changed_at | timestamptz (default now()) |
| changed_by | uuid (nullable) |

RLS: mesma logica das demais tabelas de projeto (via join com project_okrs -> projects).

**Registro automatico**: No `useUpdateKeyResult` do hook, apos o update bem-sucedido, inserir um registro na `key_result_history` com os novos valores.

**Novo componente**: `OKRHistoryPopover` — um icone pequeno (TrendingUp) no header do card de cada objetivo. Ao clicar, abre um Popover com um mini grafico Recharts (LineChart) mostrando a evolucao dos KRs daquele objetivo ao longo do tempo, com:
- Eixo X: datas
- Eixo Y: valor atual (ou % de progresso)
- Linha por KR
- Tooltip com o nivel de confianca naquele ponto

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar — renomear coluna + nova tabela `key_result_history` com RLS |
| `src/types/projectOkr.ts` | Editar — novos tipos de confianca |
| `src/hooks/useProjectOKRs.ts` | Editar — mapear confidence_level, inserir historico no update |
| `src/components/projects/okrs/KeyResultFormDialog.tsx` | Editar — dropdown de confianca |
| `src/components/projects/detail/ProjectOKRsTab.tsx` | Editar — badge de confianca, correcao de data, icone de historico |
| `src/components/projects/okrs/OKRHistoryPopover.tsx` | Criar — popover com grafico de evolucao |
