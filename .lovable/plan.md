

# Plano: Melhorias na Interface de Custos

## Alterações Solicitadas

### 1. Botão de Lançar - Apenas Ícone

Remover o texto "Lançar" do botão, mantendo apenas o ícone de dinheiro com tooltip para explicar a ação.

**Arquivo:** `ProjectSuppliersSection.tsx` (linhas 329-336)

```typescript
// ANTES
<Button variant="outline" size="sm" onClick={() => openActualDialog(supplier)}>
  <DollarSign className="h-4 w-4 mr-1" />
  Lançar
</Button>

// DEPOIS
<Button variant="outline" size="icon" onClick={() => openActualDialog(supplier)}>
  <DollarSign className="h-4 w-4" />
</Button>
```

### 2. Permitir Adicionar Fornecedores Durante Execução

Atualmente o botão "Adicionar Fornecedor" só aparece quando `isEditable` (fase de planejamento). Precisamos mostrá-lo também quando `canEditActuals`.

**Arquivo:** `ProjectSuppliersSection.tsx` (linhas 219-224)

```typescript
// ANTES
{isEditable && (
  <Button onClick={() => setDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Adicionar Fornecedor
  </Button>
)}

// DEPOIS
{(isEditable || canEditActuals) && (
  <Button onClick={() => setDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Adicionar Fornecedor
  </Button>
)}
```

### 3. Permitir Adicionar Materiais Durante Execução

Mesma lógica para a seção de materiais.

**Arquivo:** `ProjectMaterialsSection.tsx` (linhas 125-130)

```typescript
// ANTES
{isEditable && (
  <Button onClick={() => setDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Adicionar Material
  </Button>
)}

// DEPOIS
{(isEditable || canEditActuals) && (
  <Button onClick={() => setDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Adicionar Material
  </Button>
)}
```

### 4. Permitir Excluir Fornecedores/Materiais Adicionados na Execução

O botão de excluir também deve aparecer durante a execução para corrigir erros.

**Arquivo:** `ProjectSuppliersSection.tsx` (linha 342)

```typescript
// ANTES
{isEditable && (
  <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)} ...>

// DEPOIS  
{(isEditable || canEditActuals) && (
  <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)} ...>
```

**Arquivo:** `ProjectMaterialsSection.tsx` - Adicionar coluna de ação para excluir quando `canEditActuals`

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ProjectSuppliersSection.tsx` | Botão apenas com ícone; permitir adicionar/excluir em execução |
| `ProjectMaterialsSection.tsx` | Permitir adicionar/excluir materiais em execução |

---

## Resultado Final

- Interface mais limpa com botões apenas de ícones
- Flexibilidade para ajustar custos durante a execução do projeto
- Fornecedores e materiais não planejados podem ser registrados

