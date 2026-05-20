# Pattern: Error Handling

## Frontend

- Tratar loading, empty e error em telas de dados.
- Usar mensagens claras e acionaveis, sem stack trace.
- Preservar dados preenchidos pelo usuario quando uma acao falhar.
- Mutations com TanStack Query devem invalidar queries relevantes apos sucesso.

## Backend/Edge Functions

- Validar metodo HTTP e payload.
- Retornar status HTTP apropriado.
- Separar erro de validacao, permissao, dependencia externa e erro inesperado.
- Sanitizar mensagens retornadas ao cliente.

## Banco

- Constraints e triggers devem falhar com mensagens compreensiveis quando possivel.
- Migrations precisam ser idempotentes quando houver risco de reexecucao parcial.
