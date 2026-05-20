# Pattern: Troubleshooting

## Fluxo rapido

1. Reproduzir o problema localmente ou identificar o fluxo afetado.
2. Ler componentes/hooks/migrations envolvidos antes de alterar.
3. Confirmar se ha policy RLS, role ou tenant envolvido.
4. Corrigir com menor escopo possivel.
5. Rodar verificacoes proporcionais ao risco.
6. Registrar ADR se a solucao mudar arquitetura, permissao ou regra central.

## Comandos uteis

- `rg "termo" src supabase`
- `npm run lint`
- `npm run test`
- `npm run build`

## Checklist de debug

- O usuario tem role correta?
- A query inclui contexto de tenant/projeto/usuario?
- A policy permite select/insert/update/delete esperado?
- O cache do TanStack Query foi invalidado apos mutation?
- A migration existe e esta na ordem correta?
