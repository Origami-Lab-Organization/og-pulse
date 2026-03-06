

## Plano: Botão "Próximo" sempre ativo + validação inline com erros visuais

### Mudanças

#### `TerminationWizardModal.tsx`
- Remover a lógica `canAdvance` que desabilita o botão no step `info`
- Adicionar estado `showErrors` (boolean), inicializado como `false`
- No `handleNext`, ao invés de bloquear via `disabled`, validar os campos obrigatórios do step atual. Se inválidos, setar `showErrors = true` e não avançar. Se válidos, avançar e resetar `showErrors`
- Passar `showErrors` como prop para `TerminationStep1Info`
- Botão "Próximo" fica sempre habilitado (exceto no step `review` que mantém o `confirmed`)

#### `TerminationStep1Info.tsx`
- Receber prop `showErrors: boolean`
- Quando `showErrors` é `true`, mostrar borda vermelha (`border-destructive`) nos campos inválidos:
  - Data efetiva do desligamento: se vazio → borda vermelha + "Data obrigatória"
  - Tipo de desligamento: se vazio → borda vermelha + "Tipo obrigatório"
  - Motivo detalhado: se < 20 chars → borda vermelha no textarea + "Mínimo de 20 caracteres"
- Mensagens de erro em `<p className="text-xs text-destructive">`

### Arquivos modificados
- `src/components/employees/TerminationWizardModal.tsx`
- `src/components/employees/termination-wizard/TerminationStep1Info.tsx`

