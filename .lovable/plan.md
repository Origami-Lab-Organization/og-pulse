
# Projetos Continuos: Gerar NFs Mensais com Data de Renovacao

## Resumo

Para projetos continuos, o sistema deve gerar automaticamente uma NF (parcela) por mes ate a data de renovacao do contrato, em vez de nao gerar parcelas. O formulario de projeto precisa de um campo "Data de Renovacao" que aparece quando o projeto e marcado como continuo.

## Mudancas no Banco de Dados

Adicionar coluna `renewal_date` na tabela `projects`:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `renewal_date` | date, nullable | Data de renovacao automatica do contrato |

## Logica de Geracao de Parcelas para Projetos Continuos

Quando um projeto e continuo e tem `first_invoice_date` e `renewal_date`:
- Gerar uma parcela por mes, desde `first_invoice_date` ate o mes da `renewal_date`
- O valor de cada parcela = `total_value` (valor recorrente mensal)
- Exemplo: inicio em janeiro, renovacao em dezembro = 12 parcelas

## Arquivos Modificados

| Arquivo | Descricao |
|---------|-----------|
| **Migration SQL** | Adicionar coluna `renewal_date` na tabela `projects` |
| `src/types/project.ts` | Adicionar `renewalDate` ao `CreateProjectInput` e `renewal_date` ao `ProjectDB` |
| `src/components/projects/ProjectFormDialog.tsx` | Exibir campo "Data de Renovacao" quando `isContinuous` e true |
| `src/services/projectService.ts` | Alterar `generateInstallments` e logica de create/update para lidar com projetos continuos (1 parcela/mes ate renovacao) |

## Detalhes Tecnicos

### Migration

```text
ALTER TABLE projects ADD COLUMN renewal_date date;
```

### Formulario (ProjectFormDialog)

Quando `isContinuous = true`:
- Esconder campo "Quantidade de Parcelas" (ja esconde)
- Mostrar campo "Data de Renovacao" (novo) -- input type="date"
- O label de valor ja mostra "Valor Recorrente Mensal" (ja funciona)
- Adicionar `renewalDate` ao schema zod com validacao condicional (obrigatorio quando continuo)

### Servico (projectService)

No `create()` e `update()`, quando `is_continuous = true`:
- Calcular quantidade de meses entre `first_invoice_date` e `renewal_date`
- Gerar uma parcela por mes com valor = `total_value`
- Usar a mesma logica de `generateInstallments` mas com valor fixo por parcela (sem dividir)

### Tipo (project.ts)

Adicionar:
```text
// Em CreateProjectInput
renewalDate?: string;

// Em ProjectDB
renewal_date: string | null;
```

### Fluxo

1. Usuario marca "Projeto Continuo"
2. Preenche valor recorrente mensal, data primeira NF, dia vencimento e data de renovacao
3. Ao salvar, sistema gera N parcelas (1 por mes) do primeiro mes ate a renovacao
4. Cada parcela tem o valor mensal cheio (nao dividido)
