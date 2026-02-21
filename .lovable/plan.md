

## Adaptar informacoes financeiras para projetos de Financiamento da Inovacao

### Problema

Projetos do tipo "Financiamento da Inovacao" possuem um modelo financeiro diferente dos demais:
- O pagamento e feito X dias corridos apos emissao da NF (nao tem "dia de vencimento" fixo no mes)
- Existe um percentual de sucesso (success fee) cobrado sobre o valor do beneficio obtido, que precisa ser cadastrado no projeto
- As informacoes financeiras exibidas na visao geral (Forma de Pagamento Mensal, parcelas, Dia de Vencimento) nao fazem sentido para esse tipo

### Solucao

**1. Nova coluna no banco de dados**

Adicionar `success_fee_percent` (numeric, nullable, default null) na tabela `projects` para armazenar o percentual de sucesso cobrado.

**2. Formulario de criacao/edicao do projeto (`ProjectFormDialog.tsx`)**

Quando `serviceLine === 'financiamento_inovacao'`:
- Exibir campo "Percentual de Sucesso (%)" na aba Financeiro
- Trocar o label "Dia de Vencimento" por "Prazo de Pagamento (dias)" com placeholder "Ex: 30" (representando dias corridos apos NF)
- Ocultar campos que nao se aplicam: Forma de Pagamento e Quantidade de Parcelas

Quando nao for financiamento: comportamento atual mantido.

**3. Visao Geral do projeto (`ProjectOverviewTab.tsx`)**

Quando `service_line === 'financiamento_inovacao'`:
- Trocar "Forma de Pagamento / X parcela(s)" por "Pagamento em X dias apos NF"
- Trocar "Dia de Vencimento" por exibicao do "Percentual de Sucesso: X%"
- Se nao houver success fee cadastrado, nao exibir essa linha

Quando nao for financiamento: exibicao atual mantida.

**4. Tipos e servico**

- Adicionar `successFeePercent` em `CreateProjectInput` e `ProjectDB` (`src/types/project.ts`)
- Mapear o campo no `projectService.ts` (create e update)
- Adicionar no schema zod do formulario

### Detalhes tecnicos

**Migracao SQL:**
```sql
ALTER TABLE projects ADD COLUMN success_fee_percent numeric DEFAULT NULL;
```

**Arquivos modificados:**
- `src/types/project.ts` - adicionar `success_fee_percent` em ProjectDB e `successFeePercent` em CreateProjectInput
- `src/services/projectService.ts` - mapear novo campo no create e update
- `src/components/projects/ProjectFormDialog.tsx` - campo condicional de success fee, adaptar labels e visibilidade por service line
- `src/components/projects/detail/ProjectOverviewTab.tsx` - adaptar card de informacoes financeiras por service line

**Logica do campo `due_day` reaproveitado:**
Para financiamento, o campo `due_day` sera reinterpretado como "prazo em dias corridos apos NF" (ja e um integer 1-31, sera flexibilizado para aceitar ate 90 dias). Isso evita criar outra coluna, ja que o conceito e similar (prazo de pagamento).
