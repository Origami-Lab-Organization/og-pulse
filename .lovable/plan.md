
# Plano: Corrigir Bug de Submit Acidental no Wizard de Funcionarios

## Problema Identificado

O wizard de cadastro de funcionarios esta disparando o submit do formulario prematuramente quando o usuario interage com os botoes de adicionar/deletar beneficios ou ferramentas nas etapas 3 e 4.

### Causa Raiz

Os botoes dentro de `EmployeeBenefitsLocalTable` e `EmployeeToolsLocalTable` nao possuem o atributo `type="button"` definido. Em HTML, botoes dentro de um `<form>` tem `type="submit"` por padrao, o que causa o envio do formulario ao clicar em qualquer botao.

### Fluxo do Bug

1. Usuario esta na Etapa 3 (Beneficios) ou Etapa 4 (Ferramentas)
2. Usuario clica em "Adicionar" beneficio/ferramenta, ou nos botoes de confirmar/cancelar/deletar
3. O botao, sem `type="button"`, dispara o submit do formulario pai
4. O `handleSubmit` e executado, salvando o funcionario
5. O estado e resetado (`setCurrentStep(0)`), voltando para a primeira etapa
6. O dialog e fechado e o usuario ve a mensagem de sucesso

---

## Solucao

Adicionar `type="button"` em todos os botoes dos componentes que estao aninhados dentro do form.

---

## Arquivos a Modificar

### 1. `src/components/employees/EmployeeBenefitsLocalTable.tsx`

Adicionar `type="button"` nos seguintes botoes:

| Linha | Botao | Funcao |
|-------|-------|--------|
| 114 | Adicionar | Abre modo de adicao |
| 173-180 | Check (confirmar) | Confirma adicao de beneficio |
| 181-190 | X (cancelar) | Cancela adicao |
| 204-209 | Trash2 (deletar) | Remove beneficio da lista |

```tsx
// ANTES
<Button onClick={() => setIsAdding(true)} size="sm">

// DEPOIS
<Button type="button" onClick={() => setIsAdding(true)} size="sm">
```

### 2. `src/components/employees/EmployeeToolsLocalTable.tsx`

Adicionar `type="button"` nos seguintes botoes:

| Linha | Botao | Funcao |
|-------|-------|--------|
| 112 | Adicionar | Abre modo de adicao |
| 171-178 | Check (confirmar adicao) | Confirma adicao de ferramenta |
| 179-188 | X (cancelar adicao) | Cancela adicao |
| 238-244 | Check (confirmar edicao) | Confirma edicao |
| 245-251 | X (cancelar edicao) | Cancela edicao |
| 255-261 | Pencil (editar) | Inicia modo de edicao |
| 262-268 | Trash2 (deletar) | Remove ferramenta da lista |

---

## Detalhamento das Alteracoes

### EmployeeBenefitsLocalTable.tsx

**Botao "Adicionar" (linha 114):**
```tsx
// DE:
<Button onClick={() => setIsAdding(true)} size="sm">

// PARA:
<Button type="button" onClick={() => setIsAdding(true)} size="sm">
```

**Botao de confirmar adicao (linha 173):**
```tsx
// DE:
<Button
  size="icon"
  variant="ghost"
  onClick={handleAdd}
  disabled={!newBenefit.name.trim()}
>

// PARA:
<Button
  type="button"
  size="icon"
  variant="ghost"
  onClick={handleAdd}
  disabled={!newBenefit.name.trim()}
>
```

**Botao de cancelar adicao (linha 181):**
```tsx
// DE:
<Button
  size="icon"
  variant="ghost"
  onClick={() => {...}}
>

// PARA:
<Button
  type="button"
  size="icon"
  variant="ghost"
  onClick={() => {...}}
>
```

**Botao de deletar (linha 204):**
```tsx
// DE:
<Button
  size="icon"
  variant="ghost"
  onClick={() => handleDelete(benefit.id)}
>

// PARA:
<Button
  type="button"
  size="icon"
  variant="ghost"
  onClick={() => handleDelete(benefit.id)}
>
```

### EmployeeToolsLocalTable.tsx

Aplicar a mesma correcao em todos os 7 botoes do componente:
- Botao "Adicionar" (linha 112)
- Botao confirmar adicao (linha 171)
- Botao cancelar adicao (linha 179)
- Botao confirmar edicao (linha 238)
- Botao cancelar edicao (linha 245)
- Botao editar (linha 255)
- Botao deletar (linha 262)

---

## Resumo das Alteracoes

| Arquivo | Botoes Corrigidos |
|---------|-------------------|
| `EmployeeBenefitsLocalTable.tsx` | 4 botoes |
| `EmployeeToolsLocalTable.tsx` | 7 botoes |
| **Total** | **11 botoes** |

---

## Criterios de Aceite

1. Ao clicar em "Adicionar" na etapa de Beneficios, o formulario nao e submetido
2. Ao confirmar ou cancelar a adicao de um beneficio, o wizard permanece na etapa atual
3. Ao deletar um beneficio, o wizard permanece na etapa atual
4. O mesmo comportamento correto ocorre na etapa de Ferramentas
5. O botao "Proximo" na etapa de Beneficios avanca para a etapa de Ferramentas
6. O botao "Finalizar Cadastro" so aparece na ultima etapa (Ferramentas)
7. O funcionario so e salvo quando o usuario clica em "Finalizar Cadastro" na etapa 4

---

## Nota Tecnica

O componente `Button` do shadcn/ui nao define um `type` padrao. Em HTML, botoes dentro de `<form>` tem `type="submit"` como padrao. Para evitar problemas futuros, poderia-se considerar alterar o componente Button para ter `type="button"` como padrao, mas isso mudaria o comportamento em toda a aplicacao e exigiria revisao de todos os formularios existentes.
