

## Plano: Corrigir dados da Mariana e prevenir falha silenciosa no update de status

### Problema raiz
O `terminationService.create()` cria o registro de desligamento com sucesso, mas o update subsequente no status do employee falha silenciosamente. Isso acontece porque o update via RLS pode estar sendo bloqueado (o Supabase retorna sucesso com 0 rows affected quando RLS bloqueia, sem erro). O código ignora essa falha (`// Don't throw`).

### Correção imediata dos dados
Usar o insert tool para atualizar diretamente a Mariana no banco:
```sql
UPDATE employees SET status = 'em_desligamento', termination_id = 'df41b502-5f02-4c1d-bbe6-3dff73ed4eb3' WHERE id = '61444641-d02c-4472-93a8-63091c612225';
```

### Correção do código

#### `src/services/terminationService.ts`
- No método `create()`, após o update do employee, verificar se o update realmente afetou alguma row
- Se não afetou (RLS bloqueou), logar o erro de forma mais explícita e opcionalmente usar uma abordagem via RPC/edge function
- Alternativa mais robusta: verificar `data` retornado pelo update com `.select()` para confirmar que a mudança foi aplicada, e lançar erro se não foi

### Arquivos modificados
- `src/services/terminationService.ts` — adicionar verificação do resultado do update + `.select()` para confirmar

