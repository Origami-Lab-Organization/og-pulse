

## Adaptar informacoes financeiras para projetos de Financiamento da Inovacao

### Resumo

Projetos do tipo "Financiamento da Inovacao" possuem um modelo financeiro diferente: pagamento em dias corridos apos NF (nao tem dia fixo no mes) e cobram um percentual de sucesso (success fee). As telas de formulario e visao geral precisam ser adaptadas.

### Etapas

**1. Migracao no banco de dados**
- Adicionar coluna `success_fee_percent` (numeric, nullable, default null) na tabela `projects`

**2. Atualizar tipos (`src/types/project.ts`)**
- Adicionar `success_fee_percent` em `ProjectDB`
- Adicionar `successFeePercent` em `CreateProjectInput`

**3. Atualizar servico (`src/services/projectService.ts`)**
- Mapear `success_fee_percent` no create e update

**4. Adaptar formulario (`src/components/projects/ProjectFormDialog.tsx`)**
- Adicionar campo `successFeePercent` no schema zod (number, opcional)
- Quando `serviceLine === 'financiamento_inovacao'`:
  - Exibir campo "Percentual de Sucesso (%)"
  - Trocar label "Dia de Vencimento" por "Prazo de Pagamento (dias)" com max ate 90
  - Ocultar campos Forma de Pagamento e Quantidade de Parcelas
- Passar `successFeePercent` no submit
- Carregar valor existente no edit

**5. Adaptar Visao Geral ativa (`src/components/projects/detail/ProjectOverviewTab.tsx`)**
- Quando `service_line === 'financiamento_inovacao'`:
  - Trocar "Forma de Pagamento / parcelas" por "Pagamento em X dias apos NF"
  - Trocar "Dia de Vencimento" por "Percentual de Sucesso: X%" (se existir)

**6. Adaptar Visao Geral planning (`src/components/projects/detail/ProjectPlanningOverviewTab.tsx`)**
- Mesma logica condicional do item 5

### Detalhes tecnicos

**Migracao SQL:**
```sql
ALTER TABLE projects ADD COLUMN success_fee_percent numeric DEFAULT NULL;
```

**Reaproveitamento do campo `due_day`:**
Para financiamento, `due_day` sera reinterpretado como "prazo em dias corridos apos NF". O schema zod tera max ajustado para 90 quando for financiamento.

**Arquivos modificados:**
- `src/types/project.ts`
- `src/services/projectService.ts`
- `src/components/projects/ProjectFormDialog.tsx`
- `src/components/projects/detail/ProjectOverviewTab.tsx`
- `src/components/projects/detail/ProjectPlanningOverviewTab.tsx`

