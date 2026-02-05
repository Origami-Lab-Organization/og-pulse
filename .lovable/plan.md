
# Plano: Fornecedores Herdados do Orçamento + Seleção do Cadastro

## Problema Atual

O dialog de adicionar fornecedor mostra 3 opções:
1. Selecionar do orçamento
2. Selecionar do cadastro
3. Digitar manualmente

O usuário quer que siga o mesmo padrão da Mão de Obra:
- **Fornecedores do orçamento são herdados** automaticamente (sem opção de seleção manual)
- **Novos fornecedores** devem ser selecionados do cadastro (não digitar manualmente)

---

## Comportamento Desejado

### Padrão a Seguir (Mão de Obra)

```text
┌───────────────────────────────────────┐
│ Adicionar Papel                       │
│                                       │
│ [x] Do Orçamento                      │
│     [Select: Desenvolvedor Senior ]   │
│                                       │
│ [ ] Novo Papel                        │
│     Nome do Papel: __________         │
│     Senioridade:  [Select ▼]          │
│     Valor/Hora:   __________          │
└───────────────────────────────────────┘
```

### Aplicar para Fornecedores

```text
┌───────────────────────────────────────┐
│ Adicionar Fornecedor                  │
│                                       │
│ [x] Do Orçamento                      │
│     [Select: Serviço de Marketing ]   │
│     → Herda nome, descrição e R$/mês  │
│                                       │
│ [ ] Novo Fornecedor                   │
│     [Select: Fornecedor do Cadastro]  │
│     Descrição do Serviço: _________   │
│     Valor Mensal Inicial: _________   │
└───────────────────────────────────────┘
```

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectSuppliersSection.tsx`

#### 1. Adicionar estado para controle do modo

```tsx
const [useBudgetSupplier, setUseBudgetSupplier] = useState(budgetSuppliers.length > 0);
```

#### 2. Modificar o Dialog de Adicionar

Remover a opção de "digitar manualmente" e estruturar em dois modos:

**Modo A - Do Orçamento:**
- Select com fornecedores não utilizados do orçamento
- Ao selecionar, herda automaticamente: nome, descrição, valor mensal
- Não exibe campos de input (tudo vem do orçamento)

**Modo B - Novo Fornecedor:**
- Select **obrigatório** de fornecedor do cadastro
- Campo de descrição do serviço (opcional)
- Campo de valor mensal inicial (obrigatório)

#### 3. Remover campos de input manual para nome

O campo "Nome do Fornecedor/Serviço" será removido. O nome sempre virá de:
- Orçamento (quando selecionado do orçamento)
- Cadastro de fornecedores (quando selecionado do cadastro)

#### 4. Ajustar validação do submit

```tsx
// Modo orçamento: precisa ter budget supplier selecionado
// Modo novo: precisa ter fornecedor do cadastro selecionado + valor mensal
const canSubmit = useBudgetSupplier 
  ? !!selectedBudgetSupplier 
  : (!!selectedRegistrySupplier && formData.monthlyValue > 0);
```

---

## Novo Layout do Dialog

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Adicionar Fornecedor</DialogTitle>
      <DialogDescription>
        Selecione um fornecedor do orçamento ou adicione um novo do cadastro.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Modo: Do Orçamento */}
      {unusedBudgetSuppliers.length > 0 && (
        <div className="flex items-center space-x-2">
          <Checkbox 
            checked={useBudgetSupplier} 
            onCheckedChange={(checked) => setUseBudgetSupplier(!!checked)} 
          />
          <Label>Do Orçamento</Label>
        </div>
      )}

      {useBudgetSupplier && unusedBudgetSuppliers.length > 0 ? (
        <div className="space-y-2">
          <Select value={selectedBudgetSupplier} onValueChange={handleBudgetSupplierSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um serviço do orçamento..." />
            </SelectTrigger>
            <SelectContent>
              {unusedBudgetSuppliers.map((bs) => (
                <SelectItem key={bs.id} value={bs.id}>
                  {bs.name} - {formatCurrency(bs.monthly_value)}/mês
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Preview dos dados herdados */}
          {selectedBudgetSupplier && (
            <div className="p-3 bg-muted rounded-md text-sm space-y-1">
              <p><strong>Serviço:</strong> {formData.name}</p>
              {formData.description && <p><strong>Descrição:</strong> {formData.description}</p>}
              <p><strong>Valor Mensal:</strong> {formatCurrency(formData.monthlyValue)}</p>
            </div>
          )}
        </div>
      ) : (
        /* Modo: Novo Fornecedor */
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Select value={selectedRegistrySupplier} onValueChange={handleRegistrySupplierSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um fornecedor cadastrado..." />
              </SelectTrigger>
              <SelectContent>
                {availableSuppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.tradingName || supplier.companyName}
                    {supplier.category && ` (${supplier.category})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição do Serviço</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Ex: Gestão de mídias sociais"
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Mensal Inicial (R$)</Label>
            <Input
              type="number"
              value={formData.monthlyValue || ''}
              onChange={(e) => setFormData({...formData, monthlyValue: Number(e.target.value)})}
            />
          </div>
        </div>
      )}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setDialogOpen(false)}>
        Cancelar
      </Button>
      <Button 
        onClick={handleSubmit} 
        disabled={!canSubmit || addSupplier.isPending}
      >
        Adicionar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Ajustes na Lógica de Submit

```tsx
const handleSubmit = () => {
  const input: Omit<CreateProjectSupplierInput, 'projectId'> = useBudgetSupplier
    ? {
        name: formData.name,              // Nome do serviço do orçamento
        description: formData.description,
        monthlyValue: formData.monthlyValue,
        startMonth: 1,
        endMonth: undefined,
        budgetSupplierId: selectedBudgetSupplier,
      }
    : {
        // Para novo fornecedor, nome vem do fornecedor do cadastro
        name: availableSuppliers.find(s => s.id === selectedRegistrySupplier)?.tradingName 
              || availableSuppliers.find(s => s.id === selectedRegistrySupplier)?.companyName
              || '',
        description: formData.description,
        monthlyValue: formData.monthlyValue,
        startMonth: 1,
        endMonth: undefined,
        supplierId: selectedRegistrySupplier,
      };

  addSupplier.mutate({ projectId, ...input }, {
    onSuccess: () => {
      setDialogOpen(false);
      resetForm();
    },
  });
};
```

---

## Exibição na Tabela

Para fornecedores do cadastro (novo), exibir:
- **Linha 1:** Nome do fornecedor (tradingName ou companyName)
- **Linha 2:** Descrição do serviço (se houver)

Para fornecedores do orçamento, exibir:
- **Linha 1:** Nome do fornecedor (se vinculado ao cadastro) ou Nome do serviço
- **Linha 2:** Descrição do orçamento

---

## Resumo das Alterações

| Item | Alteração |
|------|-----------|
| Dialog | Substituir 3 opções por 2 modos: Orçamento vs Novo |
| Input manual de nome | Removido - nome sempre vem do orçamento ou cadastro |
| Modo Orçamento | Herda nome, descrição e valor mensal automaticamente |
| Modo Novo | Select obrigatório do cadastro + campos descrição e valor |
| Validação | Ajustada para os dois modos |
| Tabela | Mantém exibição atual (já mostra nome + descrição) |

---

## Arquivo Afetado

- `src/components/projects/detail/ProjectSuppliersSection.tsx`

---

## Resultado Esperado

1. **Consistência** com a seção de Mão de Obra
2. **Sem digitação manual** de nomes de fornecedores
3. **Dados do orçamento** herdados automaticamente
4. **Novos fornecedores** sempre vinculados ao cadastro central
