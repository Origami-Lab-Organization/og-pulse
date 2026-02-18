

# Corrigir geracao de parcelas para projetos continuos na edicao

## Problema

A logica de regeneracao de parcelas no metodo `update` do `projectService.ts` (linhas 246-311) tem dois problemas para projetos continuos:

1. **`renewalDate` nao esta na lista de triggers**: A condicao `shouldRegenerateInstallments` (linha 247) nao inclui `updates.renewalDate` nem `updates.isContinuous`. Quando o usuario edita apenas a data de renovacao, nenhuma parcela e regenerada.

2. **Condicao exige `installmentsCount > 0`**: A linha 253 exige `updates.installmentsCount && updates.installmentsCount > 0`, mas projetos continuos tem `installmentsCount = 1` e a logica real depende da `renewalDate`, nao do count. Alem disso, se o usuario so editou a `renewalDate`, o `installmentsCount` pode nao estar no objeto `updates`.

3. **A regeneracao nao usa a funcao `generateInstallments`**: O bloco de regeneracao (linhas 270-310) implementa logica propria que nao considera projetos continuos. Ele divide o valor total pelas parcelas restantes em vez de usar o valor cheio mensal.

## Dados atuais no banco

O projeto "Gestao de Portfolio" tem:
- `first_invoice_date`: 2026-01-08
- `renewal_date`: 2027-01-04
- `total_value`: 5000 (valor mensal recorrente)
- `installments_count`: 1
- Apenas 1 parcela gerada (deveria ter ~13 parcelas mensais)

## Solucao

### Arquivo: `src/services/projectService.ts`

Reescrever o bloco de regeneracao de parcelas no metodo `update` para:

1. Adicionar `renewalDate` e `isContinuous` a lista de triggers em `shouldRegenerateInstallments`
2. Para projetos continuos: buscar os dados completos do projeto atualizado (ja retornado pelo `update`), deletar parcelas pendentes e chamar `generateInstallments` com os parametros corretos
3. Para projetos nao-continuos: manter a logica atual

A logica ficara assim:

```text
shouldRegenerateInstallments agora inclui:
  - totalValue, installmentsCount, firstInvoiceDate, dueDay (existentes)
  - renewalDate, isContinuous (novos)

Se shouldRegenerateInstallments:
  1. Buscar dados atualizados do projeto (do resultado do UPDATE)
  2. Deletar parcelas pendentes/overdue
  3. Se projeto continuo E tem renewalDate E tem firstInvoiceDate:
     -> Chamar generateInstallments(id, totalValue, 1, firstInvoiceDate, dueDay, true, renewalDate)
  4. Se projeto nao-continuo E tem installmentsCount > 0 E firstInvoiceDate:
     -> Manter logica existente (ou tambem usar generateInstallments)
  5. Inserir novas parcelas
```

### Apos o fix no codigo: Regenerar parcelas do projeto existente

Depois de corrigir o codigo, sera necessario disparar uma edicao no projeto "Gestao de Portfolio" para que as parcelas sejam regeneradas. Alternativamente, podemos deletar as parcelas pendentes e inserir novas via SQL.

## Arquivos Modificados

| Arquivo | Descricao |
|---------|-----------|
| `src/services/projectService.ts` | Corrigir logica de regeneracao de parcelas no `update` para incluir `renewalDate` e tratar projetos continuos |
| Banco de dados | Deletar parcela pendente existente e gerar as parcelas corretas para o projeto |

