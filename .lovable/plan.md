

# Plano: Reformular Cadastro de Papeis com Linhas Dinamicas

## Problema Atual

O toggle "Criar multiplas senioridades" adiciona fricção e não é intuitivo. O usuário precisa decidir antecipadamente se quer criar uma ou várias senioridades.

---

## Nova Experiência Proposta

Um formulário mais simples e direto, onde o usuário sempre trabalha com linhas de senioridade/valor:

```text
+--------------------------------------------------+
|  Novo Papel                                      |
+--------------------------------------------------+
|  Nome do Papel *                                 |
|  [Desenvolvedor                              ]   |
|                                                  |
|  Senioridades e Valores *                        |
|  +--------------------------------------------+  |
|  | [Junior  v]  [R$ 80,00     ]    [Remover] |  |
|  +--------------------------------------------+  |
|  | [Pleno   v]  [R$ 120,00    ]    [Remover] |  |
|  +--------------------------------------------+  |
|                                                  |
|  [+ Adicionar senioridade]                       |
|                                                  |
|  Descricao (opcional)                            |
|  [                                           ]   |
|                                                  |
|  [ ] Ativo                                       |
|                                                  |
|              [Cancelar]  [Cadastrar]             |
+--------------------------------------------------+
```

---

## Fluxo de Uso

### Criar papel com uma senioridade:
1. Digita "Tech Lead"
2. Seleciona "Senior" na primeira linha
3. Preenche valor R$ 200,00
4. Clica "Cadastrar"

### Criar papel com multiplas senioridades:
1. Digita "Desenvolvedor"
2. Seleciona "Junior" e preenche R$ 80,00
3. Clica "+ Adicionar senioridade"
4. Seleciona "Pleno" e preenche R$ 120,00
5. Clica "+ Adicionar senioridade"
6. Seleciona "Senior" e preenche R$ 180,00
7. Clica "Cadastrar" (cria 3 registros)

### Editar papel existente:
1. Abre formulário com uma linha pre-preenchida
2. Edita o valor
3. Clica "Salvar"

---

## Regras de Negócio

| Regra | Comportamento |
|-------|---------------|
| Minimo 1 linha | Sempre iniciar com uma linha |
| Remover linha | So permitir se houver mais de 1 linha |
| Senioridade unica | Nao permitir selecionar a mesma senioridade duas vezes |
| Validacao | Cada linha deve ter senioridade e valor preenchidos |
| Edicao | Exibir apenas 1 linha (sem botao de adicionar) |

---

## Alteracoes Tecnicas

### Arquivo: `src/components/pricing/RoleRateFormDialog.tsx`

**Remover:**
- Estado `isMultipleMode`
- Toggle de multiplas senioridades
- Campos fixos para junior/pleno/senior com checkboxes
- Schema atual com campos separados por senioridade

**Adicionar:**
- Estado para array de linhas: `[{ seniority: '', hourlyRate: '' }]`
- Componente de linha com Select + Input + Botao remover
- Botao "+ Adicionar senioridade"
- Logica para filtrar senioridades ja selecionadas no Select
- Novo schema Zod com array de linhas

### Estrutura do Estado

```typescript
interface SeniorityLine {
  id: string; // para key do React
  seniority: string;
  hourlyRate: string;
}

// Estado inicial
const [lines, setLines] = useState<SeniorityLine[]>([
  { id: crypto.randomUUID(), seniority: '', hourlyRate: '' }
]);
```

### Novo Schema Zod

```typescript
const roleRateSchema = z.object({
  roleName: z.string().min(2, 'Nome do papel deve ter no mínimo 2 caracteres'),
  lines: z.array(z.object({
    seniority: z.string().min(1, 'Selecione a senioridade'),
    hourlyRate: z.string().min(1, 'Informe o valor hora'),
  })).min(1, 'Adicione pelo menos uma senioridade'),
  description: z.string().optional(),
  isActive: z.boolean(),
});
```

### Logica de Submit

```typescript
const handleSubmit = (values) => {
  if (values.lines.length === 1) {
    // Criar unico registro
    onSubmit({
      roleName: values.roleName,
      seniority: values.lines[0].seniority,
      hourlyRate: parseCurrency(values.lines[0].hourlyRate),
      description: values.description,
      isActive: values.isActive,
    });
  } else {
    // Criar multiplos registros
    const inputs = values.lines.map(line => ({
      roleName: values.roleName,
      seniority: line.seniority,
      hourlyRate: parseCurrency(line.hourlyRate),
      description: values.description,
      isActive: values.isActive,
    }));
    onSubmitMultiple(inputs);
  }
};
```

---

## Layout da Linha de Senioridade

```typescript
<div className="flex items-center gap-2">
  <Select value={line.seniority} onValueChange={...}>
    <SelectTrigger className="w-[120px]">
      <SelectValue placeholder="Senioridade" />
    </SelectTrigger>
    <SelectContent>
      {availableSeniorities.map(opt => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  
  <Input 
    placeholder="R$ 0,00"
    value={line.hourlyRate}
    onChange={...}
    className="flex-1"
  />
  
  {lines.length > 1 && (
    <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  )}
</div>
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/pricing/RoleRateFormDialog.tsx` | Refatorar para usar linhas dinamicas |

---

## Criterios de Aceite

1. Formulário inicia com uma linha de senioridade/valor
2. Botao "+ Adicionar senioridade" adiciona nova linha
3. Cada linha tem Select de senioridade e Input de valor
4. Botao de remover aparece quando ha mais de 1 linha
5. Senioridades ja selecionadas nao aparecem nas outras linhas
6. Ao cadastrar, cria 1 ou mais registros conforme linhas preenchidas
7. Na edicao, exibe apenas 1 linha sem opcao de adicionar
8. Validacao exige pelo menos 1 linha com senioridade e valor

