

## Parcelas Manuais para Projetos de Financiamento da Inovacao

### Contexto

Projetos de "Financiamento da Inovacao" nao possuem parcelas automaticas, pois o faturamento depende do beneficio gerado ao cliente. As parcelas devem ser cadastradas manualmente pelo usuario, com valor, data de vencimento e descricao.

### O que muda

**Projetos normais (sem mudanca):** parcelas sao geradas automaticamente ao criar/editar o projeto, com base em valor total, qtd parcelas, e data de vencimento.

**Projetos de financiamento:** parcelas nao sao geradas automaticamente. O usuario cadastra cada parcela manualmente na aba Financeiro, informando valor, data de vencimento e descricao. Tambem pode excluir parcelas.

### Etapas

**1. Atualizar tipos (`src/types/project.ts`)**
- Criar interface `CreateInstallmentInput` com campos: `projectId`, `value`, `dueDate`, `notes?`

**2. Atualizar servico (`src/services/projectService.ts`)**
- Adicionar metodo `createInstallment(input)` que insere na tabela `project_installments` com `installment_number` automatico (proximo numero sequencial)
- Adicionar metodo `deleteInstallment(id)`
- Na criacao e atualizacao de projetos: pular geracao automatica de parcelas quando `service_line === 'financiamento_inovacao'`

**3. Atualizar hooks (`src/hooks/useProjects.ts`)**
- Adicionar `useCreateInstallment` mutation
- Adicionar `useDeleteInstallment` mutation

**4. Atualizar `ProjectInstallmentsTable` (`src/components/projects/ProjectInstallmentsTable.tsx`)**
- Receber nova prop `isManualInstallments?: boolean`
- Quando `isManualInstallments`:
  - Exibir botao "Nova Parcela" no topo
  - Ao clicar, exibir formulario inline ou dialog simples com campos: Valor, Data de Vencimento, Descricao (opcional)
  - Adicionar botao de excluir (icone lixeira) nas acoes de cada parcela
  - A coluna "Vencimento" se torna editavel no modo edicao

**5. Atualizar `ProjectFinancialTab` (`src/components/projects/detail/ProjectFinancialTab.tsx`)**
- Passar `isManualInstallments={project.service_line === 'financiamento_inovacao'}` para o `ProjectInstallmentsTable`

### Detalhes tecnicos

**CreateInstallmentInput:**
```typescript
export interface CreateInstallmentInput {
  projectId: string;
  value: number;
  dueDate: string;
  notes?: string;
}
```

**createInstallment no servico:**
```typescript
// Buscar maior installment_number existente para o projeto
// Inserir com installment_number = max + 1
// Status inicial: 'pending'
```

**Pular geracao automatica:**
No `projectService.create()` e `projectService.update()`, envolver a logica de geracao de parcelas com:
```typescript
if (input.serviceLine !== 'financiamento_inovacao') {
  // gerar parcelas automaticamente
}
```

**Formulario de nova parcela (inline):**
Uma nova linha no topo da tabela com inputs de Valor (mascara monetaria), Data de Vencimento (date picker), e Descricao (texto livre), com botoes Confirmar e Cancelar.

**Exclusao de parcela:**
Botao de lixeira ao lado do botao de edicao. Exibe confirmacao antes de excluir. Apenas parcelas com status 'pending' podem ser excluidas.

### Arquivos modificados

- `src/types/project.ts` - nova interface
- `src/services/projectService.ts` - novos metodos + condicional na geracao
- `src/hooks/useProjects.ts` - novos hooks
- `src/components/projects/ProjectInstallmentsTable.tsx` - botao nova parcela, exclusao, edicao de vencimento
- `src/components/projects/detail/ProjectFinancialTab.tsx` - passar prop
