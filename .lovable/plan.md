
# Plano: Ajustes no Formulario de Funcionario

## Resumo das Mudancas

1. Validar CPF duplicado no tenant antes de cadastrar funcionario
2. Alterar jornada mensal padrao de 176 para 168 horas
3. Remover mensagem sobre beneficios/ferramentas nas etapas seguintes
4. Centralizar e compactar a mensagem de validacao contabil
5. Reformular cadastro de beneficios: dropdown com opcoes pre-definidas, sem descricao, apenas deletar

---

## 1. Validacao de CPF Duplicado

### Situacao Atual
- O CPF e validado apenas quanto ao formato e digitos verificadores (funcao `validateCPF`)
- Nao ha verificacao se o CPF ja existe no banco de dados

### Implementacao

Adicionar validacao assincrona no `EmployeeFormDialog.tsx`:

**Novo hook para verificar CPF:**
```typescript
const checkCpfExists = async (cpf: string, tenantId: string, excludeEmployeeId?: string) => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, nome')
    .eq('tenant_id', tenantId)
    .eq('cpf', cpf.replace(/\D/g, ''))
    .neq('id', excludeEmployeeId || '')
    .maybeSingle();
  
  return data;
};
```

**Modificar `handleCpfChange`:**
```typescript
const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const formatted = formatCPF(e.target.value);
  setCpfDisplay(formatted);
  const cpfClean = formatted.replace(/\D/g, '');
  form.setValue('cpf', cpfClean);
  form.trigger('cpf');
  
  // Verificar duplicidade se CPF valido
  if (cpfClean.length === 11 && validateCPF(cpfClean) && tenantId) {
    const existing = await checkCpfExists(cpfClean, tenantId, employee?.id);
    if (existing) {
      form.setError('cpf', { 
        type: 'manual', 
        message: `CPF ja cadastrado para ${existing.nome}` 
      });
    }
  }
};
```

---

## 2. Alterar Jornada Mensal Padrao para 168

### Arquivos a Modificar

**`src/components/employees/EmployeeFormDialog.tsx`**

Linha 178 - defaultValues:
```typescript
// DE:
jornadaMensal: 176,

// PARA:
jornadaMensal: 168,
```

Linha 264 e 299 - reset values:
```typescript
// DE:
jornadaMensal: employee.jornadaMensal || 176,
// e
jornadaMensal: 176,

// PARA:
jornadaMensal: employee.jornadaMensal || 168,
// e
jornadaMensal: 168,
```

Linha 674 - placeholder:
```typescript
// DE:
placeholder="176"

// PARA:
placeholder="168"
```

**`src/hooks/useEmployees.ts`**

Linha 41:
```typescript
// DE:
jornadaMensal: Number(db.jornada_mensal) || 176,

// PARA:
jornadaMensal: Number(db.jornada_mensal) || 168,
```

---

## 3. Remover Mensagem de Beneficios/Ferramentas

### Arquivo a Modificar

**`src/components/employees/EmployeeFormDialog.tsx`**

Remover linhas 879-881:
```tsx
// REMOVER:
<p className="text-xs text-muted-foreground text-center">
  Benefícios e ferramentas serão adicionados nas etapas seguintes.
</p>
```

---

## 4. Centralizar e Compactar Aviso de Contabilidade

### Situacao Atual (linhas 887-892)
```tsx
<div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
  <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
  <p className="text-sm text-warning-foreground">
    Cálculo estimado; valide com contabilidade.
  </p>
</div>
```

### Nova Implementacao
```tsx
<p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
  <AlertCircle className="h-3 w-3" />
  Cálculo estimado; valide com contabilidade.
</p>
```

Alteracoes:
- Remover o card/box ao redor
- Centralizar texto horizontalmente
- Usar fonte menor (text-xs)
- Icone menor (h-3 w-3)
- Layout inline compacto

---

## 5. Reformular Cadastro de Beneficios

### Situacao Atual (`EmployeeBenefitsLocalTable.tsx`)
- Input de texto livre para nome do beneficio
- Campo de descricao (opcional)
- Campo de valor
- Acoes: Editar e Deletar

### Nova Implementacao

**Lista pre-definida de beneficios:**
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
```

**Nova estrutura da tabela:**

| Beneficio (dropdown)         | Valor Mensal | Acao   |
|------------------------------|--------------|--------|
| [Select: Vale Refeicao ▼]   | R$ 500,00    | [X]    |

**Mudancas no componente:**
1. Substituir Input por Select/Combobox para escolha do beneficio
2. Remover coluna "Descricao"
3. Remover botao de Editar (apenas Deletar)
4. Simplificar interface: dropdown + valor + botao deletar
5. Filtrar opcoes ja selecionadas do dropdown

### Codigo Refatorado

```tsx
// Nova interface (sem description)
export interface LocalBenefit {
  id: string;
  name: string;
  monthlyValue: number;
}

// Nova row de adicao
<TableRow>
  <TableCell>
    <Select
      value={newBenefit.name}
      onValueChange={(value) => {
        const option = BENEFIT_OPTIONS.find(o => o.value === value);
        setNewBenefit({ ...newBenefit, name: option?.label || value });
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione o benefício" />
      </SelectTrigger>
      <SelectContent>
        {BENEFIT_OPTIONS
          .filter(opt => !benefits.some(b => b.name === opt.label))
          .map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </TableCell>
  <TableCell>
    <Input
      value={newBenefit.monthlyValueDisplay}
      onChange={(e) => { /* currency mask */ }}
      placeholder="R$ 0,00"
      className="w-[140px] text-right"
    />
  </TableCell>
  <TableCell>
    <div className="flex gap-1">
      <Button size="icon" variant="ghost" onClick={handleAdd}>
        <Check className="h-4 w-4 text-green-600" />
      </Button>
      <Button size="icon" variant="ghost" onClick={() => setIsAdding(false)}>
        <X className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  </TableCell>
</TableRow>

// Rows existentes - apenas exibicao e delete
<TableRow key={benefit.id}>
  <TableCell>
    <span className="font-medium">{benefit.name}</span>
  </TableCell>
  <TableCell className="text-right">
    {formatCurrency(benefit.monthlyValue)}
  </TableCell>
  <TableCell>
    <Button size="icon" variant="ghost" onClick={() => handleDelete(benefit.id)}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  </TableCell>
</TableRow>
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/employees/EmployeeFormDialog.tsx` | Validacao CPF duplicado, jornada 168, remover msg beneficios, compactar aviso |
| `src/components/employees/EmployeeBenefitsLocalTable.tsx` | Dropdown de beneficios, remover descricao, apenas delete |
| `src/hooks/useEmployees.ts` | Fallback jornada 168 |

---

## Resumo Visual das Alteracoes

### Antes (Step 2 - Resumo)
```
+----------------------------------------+
| Resumo de Custo                        |
| Base: R$ X.XXX                         |
| Encargos: R$ X.XXX                     |
| Provisoes: R$ X.XXX                    |
| SUBTOTAL: R$ XX.XXX                    |
| "Beneficios e ferramentas serao..."    |
+----------------------------------------+
+----------------------------------------+
| (!) Calculo estimado; valide com       |
|     contabilidade.                     |
+----------------------------------------+
```

### Depois (Step 2 - Resumo)
```
+----------------------------------------+
| Resumo de Custo                        |
| Base: R$ X.XXX                         |
| Encargos: R$ X.XXX                     |
| Provisoes: R$ X.XXX                    |
| SUBTOTAL: R$ XX.XXX                    |
+----------------------------------------+
    (!) Calculo estimado; valide.
```

### Antes (Step 3 - Beneficios)
```
| Beneficio [input] | Descricao [input] | Valor [input] | [✓][X] |
| VR                | Vale Refeicao     | R$ 500        | [✎][🗑] |
```

### Depois (Step 3 - Beneficios)
```
| Beneficio [dropdown ▼]     | Valor [input] | [✓][X] |
| Vale Refeicao              | R$ 500        | [🗑]    |
```

---

## Criterios de Aceite

1. Ao digitar CPF ja cadastrado, exibe erro "CPF ja cadastrado para [Nome]"
2. Jornada mensal inicia com 168 horas por padrao
3. Nao existe mais mensagem sobre beneficios/ferramentas no Step 2
4. Aviso de contabilidade aparece centralizado e compacto
5. Beneficios sao selecionados via dropdown pre-definido
6. Nao ha campo de descricao no cadastro de beneficios
7. Unica acao disponivel em beneficios cadastrados e deletar
8. Beneficios ja adicionados nao aparecem novamente no dropdown
