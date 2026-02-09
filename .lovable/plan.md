

# Corrigir bug: valor realizado de fornecedor salvo como zero

## Problema Identificado

O banco de dados confirma que o valor foi salvo como `0` (zero). A causa raiz esta no `SupplierActualDialog.tsx`, no `useEffect` da linha 75-83:

```text
useEffect(() => {
  if (supplier) {
    const existingForMonth = existingActuals.find(...);
    setValue(existingForMonth?.value || 0);  // <-- Reseta o valor!
  }
}, [monthNumber, supplier, existingActuals]);
```

Este efeito tem `existingActuals` como dependencia. Como `existingActuals` e um array passado como prop, qualquer re-render do componente pai gera uma nova referencia de array, disparando o efeito e resetando o valor digitado pelo usuario para `0` (pois nao existe registro salvo ainda no banco).

**Sequencia do bug:**
1. Usuario abre o dialog e digita um valor (ex: R$ 5.000,00)
2. O componente pai re-renderiza (por qualquer motivo: estado, query, etc.)
3. `existingActuals` recebe uma nova referencia de array
4. O `useEffect` dispara e faz `setValue(0)` (pois nao encontra registro existente)
5. Usuario clica "Salvar" e o sistema grava `value: 0`

## Correcao

| Arquivo | Mudanca |
|---------|---------|
| `src/components/projects/detail/SupplierActualDialog.tsx` | Remover `existingActuals` da dependencia do segundo `useEffect` (que trata mudanca de mes), mantendo apenas `monthNumber` como trigger. O primeiro `useEffect` (que inicializa ao abrir o dialog) ja cuida do carregamento inicial corretamente. |

### Detalhe Tecnico

O segundo `useEffect` (linha 75-83) deve reagir **apenas** quando o usuario troca o mes no dropdown. Portanto, a dependencia correta e apenas `monthNumber`. As variaveis `supplier` e `existingActuals` serao acessadas pelo closure sem necessidade de serem dependencias, ja que nao queremos que mudancas nelas resetem o formulario.

Alternativamente, para maior seguranca, usaremos uma flag `isUserEditing` ou simplesmente removeremos `existingActuals` do array de dependencias e manteremos `supplier` apenas como guard.

