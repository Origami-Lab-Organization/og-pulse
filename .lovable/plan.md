
# Plano: Corrigir Modal em Branco ao Salvar Funcionario

## Problema Identificado

Ao clicar em "Finalizar Cadastro" no ultimo passo do wizard, a modal fica em branco no passo 1 em vez de fechar e exibir o toast de sucesso.

## Causa Raiz

O problema esta na funcao `handleSubmit` do `EmployeeFormDialog.tsx` (linhas 513-561):

```typescript
const handleSubmit = (data: FormData) => {
  // ... preparacao dos dados ...
  
  onSubmit({...}); // Chama a funcao do pai (async)
  
  // PROBLEMA: Reset imediato SEM aguardar o onSubmit terminar
  form.reset();
  setPhoneDisplay('');
  // ... outros resets ...
  setCurrentStep(0); // <-- Volta para o passo 1 imediatamente!
};
```

O que acontece:
1. Usuario clica em "Finalizar Cadastro"
2. `onSubmit` e chamado (inicia operacao async no pai)
3. **Imediatamente** (sem aguardar) o formulario reseta e `currentStep` volta para 0
4. A modal mostra o passo 1 (em branco) porque tudo foi resetado
5. Somente depois a operacao async termina e o pai fecha a modal

## Solucao

Remover o reset imediato do `handleSubmit`. O reset ja acontece automaticamente atraves do `useEffect` existente (linhas 280-362) quando:
- A prop `employee` muda, ou
- A prop `open` muda para `false`

Quando o pai fecha a modal (`setFormDialogOpen(false)`), o `useEffect` detecta a mudanca em `open` e reseta o formulario.

---

## Alteracoes Necessarias

### Arquivo: `src/components/employees/EmployeeFormDialog.tsx`

**Remover linhas 545-561** (o reset imediato dentro do `handleSubmit`):

```typescript
// ANTES:
const handleSubmit = (data: FormData) => {
  // ... logica de preparacao ...
  
  onSubmit({...});
  
  // Reset everything (REMOVER ESTAS LINHAS)
  form.reset();
  setPhoneDisplay('');
  setCpfDisplay('');
  setSalarioDisplay('');
  setBolsaAuxilioDisplay('');
  setValorContratoPjDisplay('');
  setProLaboreDisplay('');
  setDividendosDisplay('');
  setFgtsDisplay('');
  setDecimoDisplay('');
  setFeriasDisplay('');
  setFotoPreview(null);
  setLocalBenefits([]);
  setLocalTools([]);
  setCurrentStep(0);
  setCostBreakdown(null);
};

// DEPOIS:
const handleSubmit = (data: FormData) => {
  // ... logica de preparacao ...
  
  onSubmit({...});
  // Nao reseta aqui - o reset acontece via useEffect quando open muda
};
```

---

## Fluxo Corrigido

```text
Usuario clica "Finalizar Cadastro"
        |
        v
handleSubmit() chama onSubmit(data)
        |
        v
Pai (Index.tsx) executa mutacao async
        |
        v
Mutacao sucesso -> Toast aparece
        |
        v
Pai chama setFormDialogOpen(false)
        |
        v
useEffect detecta open=false
        |
        v
Reset do formulario (step 0, campos limpos)
        |
        v
Modal fecha normalmente
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/employees/EmployeeFormDialog.tsx` | Remover reset imediato no handleSubmit |

---

## Criterios de Aceite

1. Ao clicar em "Finalizar Cadastro", a modal permanece visivel mostrando o spinner de "Salvando..."
2. Apos a operacao completar com sucesso, o toast de sucesso aparece
3. A modal fecha automaticamente
4. Ao reabrir a modal, ela inicia no passo 1 com campos vazios
5. Se ocorrer erro, a modal permanece aberta para o usuario corrigir
