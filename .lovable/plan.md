

## Plano: Correções no Wizard de Desligamento

### Problema 1: Botão "Cancelar" ainda aparece
O código já foi atualizado e **não contém** mais o botão "Cancelar". A screenshot provavelmente mostra o preview antes do build atualizar. Nenhuma mudança de código necessária — o botão já foi removido.

### Problema 2: Botão "Próximo" desabilitado
O botão "Próximo" na Step 1 exige que `termination_type` esteja preenchido. Porém, o campo de tipo de desligamento usa `data.termination_type || defaultType` para exibição, mas o valor real em `wizardData.termination_type` começa como `''` (string vazia). O Select mostra um valor visual via fallback, mas o dado nunca é salvo no state até o usuário interagir manualmente com o campo.

**Correção**: Inicializar `termination_type` com o valor default correto baseado no tipo de contrato quando o wizard abre, ao invés de deixar vazio e usar fallback visual.

### Mudanças

#### `TerminationWizardModal.tsx`
- Na inicialização do wizard (quando `isOpen` muda para `true` ou quando `employee` muda), setar `wizardData.termination_type` com o default correto baseado no `contractType`
- Garantir que o estado inicial já contém um `termination_type` válido

#### `TerminationStep1Info.tsx`
- Remover o fallback `data.termination_type || defaultType` no Select — usar apenas `data.termination_type` já que virá inicializado corretamente

### Arquivos modificados
- `src/components/employees/TerminationWizardModal.tsx` — inicializar termination_type
- `src/components/employees/termination-wizard/TerminationStep1Info.tsx` — remover fallback

