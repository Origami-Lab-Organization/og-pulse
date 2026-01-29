

# Plano: Adicionar Badge de Status no Modal de Edição

## Resumo

Ao abrir o modal de edição de um funcionário, exibir o status atual como uma badge ao lado do título do modal. Isso dará visibilidade imediata ao status sem a necessidade de um campo editável.

---

## Alterações Necessárias

### Arquivo: `src/components/employees/EmployeeFormDialog.tsx`

#### 1. Importar Badge e ícones necessários

Adicionar import do componente Badge e dos ícones Clock e Ban:

```typescript
import { Badge } from '@/components/ui/badge';
// Adicionar Clock e Ban aos imports do lucide-react
import { ..., Clock, Ban } from 'lucide-react';
```

#### 2. Criar função para renderizar o badge de status

Reutilizar a mesma lógica visual do `EmployeesTable.tsx`:

```typescript
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ativo':
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-600/80">
          Ativo
        </Badge>
      );
    case 'aguardando_confirmacao':
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
          <Clock className="h-3 w-3 mr-1" />
          Aguardando
        </Badge>
      );
    case 'bloqueado':
      return (
        <Badge variant="destructive">
          <Ban className="h-3 w-3 mr-1" />
          Bloqueado
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
```

#### 3. Atualizar DialogHeader para exibir o badge

Modificar o DialogHeader (linhas 1200-1209) para incluir o badge ao lado do título quando em modo de edição:

```typescript
<DialogHeader>
  <div className="flex items-center gap-3">
    <DialogTitle className="text-xl font-semibold">
      {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
    </DialogTitle>
    {isEditing && employee && getStatusBadge(employee.status)}
  </div>
  <DialogDescription>
    {isEditing
      ? 'Atualize as informações do funcionário.'
      : `Etapa ${currentStep + 1} de ${STEPS.length}: ${STEPS[currentStep].label}`}
  </DialogDescription>
</DialogHeader>
```

---

## Resultado Visual

```text
+------------------------------------------+
| Editar Funcionário  [Aguardando]    [X]  |
| Atualize as informações do funcionário.  |
+------------------------------------------+
|                                          |
|  [Dados] [Contratação] [Benefícios] ...  |
|                                          |
```

Os badges terão as mesmas cores da tabela:
- **Ativo**: Verde
- **Aguardando**: Amarelo/Amber com ícone de relógio
- **Bloqueado**: Vermelho com ícone de proibido

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/employees/EmployeeFormDialog.tsx` | Adicionar import do Badge, criar função getStatusBadge, atualizar DialogHeader |

---

## Critérios de Aceite

1. Ao abrir a edição de um funcionário, o badge de status aparece ao lado do título "Editar Funcionário"
2. O badge mostra a cor e ícone corretos para cada status (ativo, aguardando, bloqueado)
3. O badge NÃO aparece ao criar um novo funcionário
4. O badge é apenas visual (não clicável/editável)

