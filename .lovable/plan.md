
# Plano: Unificar Campos de Beneficios entre Criacao e Edicao

## Problema Identificado

A seção de benefícios apresenta comportamentos diferentes entre criação e edição de funcionário:

### Modo de Criação (EmployeeBenefitsLocalTable)
- Usa **dropdown com opções predefinidas** (Vale Refeição, Vale Alimentação, etc.)
- **Não tem campo de descrição**
- 3 colunas na tabela: Benefício, Valor, Ação
- Exclui itens diretamente sem confirmação

### Modo de Edição (EmployeeBenefitsTable)
- Usa **campo de texto livre** (Input)
- **Tem campo de descrição**
- 4 colunas na tabela: Benefício, Descrição, Valor, Ações
- Possui edição inline de itens existentes
- Diálogo de confirmação antes de excluir

---

## Decisao de Design

Baseado na memória do projeto que diz:

> "Benefits are selected from a predefined dropdown list with no description field and only a delete action for existing items."

A interface **correta** é a do modo de criação (dropdown predefinido, sem descrição). Portanto, o componente `EmployeeBenefitsTable` precisa ser atualizado para seguir o mesmo padrão.

---

## Alteracoes Propostas

### Arquivo: `src/components/employees/EmployeeBenefitsTable.tsx`

1. **Adicionar lista de opções predefinidas** (igual ao EmployeeBenefitsLocalTable)
2. **Substituir Input por Select** para adicionar novos benefícios
3. **Remover coluna de Descrição** da tabela
4. **Remover edição inline** (benefícios só podem ser excluídos)
5. **Filtrar opções já selecionadas** do dropdown

### Codigo Atual vs Proposto

**ANTES (campo de texto livre):**
```typescript
<TableCell>
  <Input
    value={newBenefit.name}
    onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
    placeholder="Ex: Vale Refeição, Plano de Saúde..."
  />
</TableCell>
<TableCell>
  <Input
    value={newBenefit.description}
    onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
    placeholder="Descrição (opcional)"
  />
</TableCell>
```

**DEPOIS (dropdown predefinido):**
```typescript
const BENEFIT_OPTIONS = [
  { value: 'vale_refeicao', label: 'Vale Refeição' },
  { value: 'vale_alimentacao', label: 'Vale Alimentação' },
  { value: 'vale_transporte', label: 'Vale Transporte' },
  { value: 'plano_saude', label: 'Plano de Saúde' },
  { value: 'plano_odontologico', label: 'Plano Odontológico' },
  { value: 'seguro_vida', label: 'Seguro de Vida' },
  { value: 'auxilio_creche', label: 'Auxílio Creche' },
  { value: 'auxilio_educacao', label: 'Auxílio Educação' },
  { value: 'gympass', label: 'Gympass/Wellhub' },
  { value: 'auxilio_home_office', label: 'Auxílio Home Office' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'participacao_lucros', label: 'PLR' },
  { value: 'outros', label: 'Outros' },
];

// Filtrar benefícios já adicionados
const availableBenefits = BENEFIT_OPTIONS.filter(
  opt => !benefits.some(b => b.name === opt.label)
);

<TableCell>
  <Select
    value={newBenefit.selectedValue}
    onValueChange={handleSelectBenefit}
  >
    <SelectTrigger>
      <SelectValue placeholder="Selecione o benefício" />
    </SelectTrigger>
    <SelectContent>
      {availableBenefits.map(option => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</TableCell>
```

---

## Estrutura da Tabela de Beneficios (Unificada)

```text
+-------------------------------------------+
| Benefício          | Valor Mensal | Ação  |
|--------------------|--------------|-------|
| [Dropdown ▼]       | [R$ 0,00]    | ✓  X  |  <-- Linha de adição
| Vale Refeição      | R$ 500,00    | 🗑️    |
| Plano de Saúde     | R$ 800,00    | 🗑️    |
|                    |              |       |
|          Total Mensal: R$ 1.300,00        |
+-------------------------------------------+
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/employees/EmployeeBenefitsTable.tsx` | Substituir Input por Select, remover coluna Descrição, remover edição inline |

---

## Resumo das Mudancas no EmployeeBenefitsTable

1. Importar componentes Select do shadcn/ui
2. Adicionar constante BENEFIT_OPTIONS (mesma do EmployeeBenefitsLocalTable)
3. Adicionar lógica para filtrar opções já selecionadas
4. Remover estado e lógica de edição (editingId, editData, startEdit, saveEdit, cancelEdit)
5. Alterar de 4 colunas para 3 colunas na tabela
6. Trocar Input por Select na linha de adição
7. Remover botão de editar (lápis) - manter apenas botão de excluir
8. Adicionar `type="button"` em todos os botões para evitar submits acidentais

---

## Resultado Esperado

### Antes (Edição)
- Campo de texto livre para nome
- Campo de descrição
- Botões de editar e excluir

### Depois (Edição) - Igual à Criação
- Dropdown com opções predefinidas
- Sem campo de descrição
- Apenas botão de excluir

---

## Criterios de Aceite

1. Ao editar um funcionário, a aba de Benefícios mostra dropdown igual ao wizard de criação
2. Não há campo de descrição para benefícios
3. Tabela tem apenas 3 colunas: Benefício, Valor Mensal, Ação
4. Botão de editar (lápis) não aparece mais
5. Benefícios já adicionados não aparecem no dropdown
6. O botão "Adicionar" some quando todas as opções estão selecionadas
7. Diálogo de confirmação de exclusão continua funcionando
