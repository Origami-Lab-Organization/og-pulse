
# Plano: Permitir Fechar Modal Sem Confirmacao Quando Nao Ha Alteracoes

## Problema Atual

Quando o usuario abre a modal de edicao de funcionario mas nao faz nenhuma alteracao, ao tentar fechar a modal ele recebe a pergunta "Deseja sair sem salvar?". Isso e desnecessario e prejudica a experiencia do usuario.

## Solucao Proposta

Utilizar o estado `isDirty` do `react-hook-form` para detectar se houve alteracoes no formulario. Apenas mostrar o dialogo de confirmacao quando houver mudancas pendentes.

---

## Alteracoes Tecnicas

### Arquivo: `src/components/employees/EmployeeFormDialog.tsx`

#### 1. Obter Estado isDirty do Form

Extrair `isDirty` do `formState` do react-hook-form:

```typescript
// Linha ~171-196, adicionar isDirty na desestruturacao
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: { ... },
});

const { formState: { isDirty } } = form;
```

#### 2. Considerar Mudancas Locais (Beneficios e Ferramentas)

Para novos funcionarios, tambem considerar se foram adicionados beneficios ou ferramentas:

```typescript
// Verificar se ha mudancas nao salvas
const hasUnsavedChanges = isDirty || 
  (!isEditing && (localBenefits.length > 0 || localTools.length > 0));
```

#### 3. Atualizar Logica de Fechamento

Modificar a funcao `handleClose` para verificar se ha alteracoes:

```typescript
// DE (linha 207-214):
const handleClose = (openState: boolean) => {
  if (!openState) {
    setShowExitConfirm(true);
  } else {
    onOpenChange(openState);
  }
};

// PARA:
const handleClose = (openState: boolean) => {
  if (!openState) {
    // Apenas mostrar confirmacao se houver mudancas
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      onOpenChange(false);
    }
  } else {
    onOpenChange(openState);
  }
};
```

---

## Fluxo de Decisao

```text
Usuario tenta fechar modal
        |
        v
  Ha alteracoes?
   (isDirty || beneficios/ferramentas locais)
        |
    +---+---+
    |       |
   SIM     NAO
    |       |
    v       v
Mostrar   Fechar
dialogo   diretamente
```

---

## Cenarios de Teste

| Cenario | Comportamento Esperado |
|---------|------------------------|
| Abrir modal de edicao, nao alterar nada, fechar | Fecha sem perguntar |
| Abrir modal de edicao, alterar nome, fechar | Mostra confirmacao |
| Abrir modal de criacao, nao preencher nada, fechar | Fecha sem perguntar |
| Abrir modal de criacao, preencher dados, fechar | Mostra confirmacao |
| Abrir modal de criacao, adicionar beneficio, fechar | Mostra confirmacao |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/employees/EmployeeFormDialog.tsx` | Adicionar verificacao de `isDirty` e mudancas locais antes de mostrar confirmacao |

---

## Criterios de Aceite

1. Ao abrir modal de edicao sem fazer alteracoes, pode fechar sem confirmacao
2. Ao alterar qualquer campo do formulario, mostra confirmacao ao tentar fechar
3. Ao adicionar beneficio ou ferramenta em novo funcionario, mostra confirmacao
4. O dialogo de confirmacao continua funcionando normalmente quando ha alteracoes
