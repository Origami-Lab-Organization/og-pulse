
# Plano: Abrir Edicao de Funcionario ao Clicar na Linha da Tabela

## Situacao Atual

O componente `DataTable` ja possui suporte para clique em linha atraves da prop `onRowClick`:
- Linha 30: `onRowClick?: (row: TData) => void;`
- Linha 99-101: Adiciona `cursor-pointer` e chama `onRowClick` quando a linha e clicada

Porem, na pagina de funcionarios (`src/pages/Index.tsx`), essa prop nao esta sendo passada para o DataTable.

---

## Solucao

Passar a funcao `handleEditEmployee` como prop `onRowClick` para o DataTable.

---

## Alteracao Tecnica

### Arquivo: `src/components/employees/EmployeesTable.tsx`

Os botoes de acao no menu dropdown ja fazem `stopPropagation` para evitar conflito com o clique na linha (linhas 144-145 e 152), entao nao ha necessidade de alterar esse arquivo.

### Arquivo: `src/pages/Index.tsx`

Adicionar a prop `onRowClick` no componente DataTable:

```typescript
// DE (linha 151-157):
<DataTable
  columns={columns}
  data={employees}
  searchKey="nome"
  searchValue={searchQuery}
/>

// PARA:
<DataTable
  columns={columns}
  data={employees}
  searchKey="nome"
  searchValue={searchQuery}
  onRowClick={handleEditEmployee}
/>
```

---

## Resultado Visual

```text
+----------------------------------------------------------+
| Funcionario      | Contato        | Status | Custo | ... |
|------------------|----------------|--------|-------|-----|
| [cursor pointer] |                |        |       |     |
| Joao Silva       | joao@email.com | Ativo  | R$... | ... | <-- Clicavel!
| Maria Santos     | maria@email.com| Ativo  | R$... | ... | <-- Clicavel!
+----------------------------------------------------------+
```

Ao passar o mouse sobre a linha, o cursor muda para `pointer` indicando que e clicavel.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Index.tsx` | Adicionar prop `onRowClick={handleEditEmployee}` no DataTable |

---

## Criterios de Aceite

1. Ao clicar em qualquer lugar da linha do funcionario, abre a modal de edicao
2. Cursor muda para pointer ao passar sobre a linha
3. Clicar no menu de acoes (tres pontinhos) continua funcionando normalmente sem abrir a modal
