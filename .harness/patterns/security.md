# Pattern: Security

## Baseline

- Aplicar LGPD por padrao: minimo necessario, acesso por perfil e sem logs sensiveis.
- Toda tabela com dados de negocio sensiveis deve usar RLS.
- Consultas no frontend devem depender das policies do Supabase e filtrar por contexto quando aplicavel.
- Validar entradas em formulários e Edge Functions com Zod ou validacao equivalente.

## Supabase

- Migrations devem criar ou atualizar policies junto com novas tabelas/colunas sensiveis.
- `security definer` exige comentario de motivo e revisao cuidadosa de `search_path`.
- Edge Functions devem tratar CORS de forma consistente e nunca retornar stack traces para o usuario final.
- Service role keys ficam somente em ambiente de servidor/Edge Function.

## Frontend

- Rotas protegidas devem usar `ProtectedRoute` e `RoleProtectedRoute` quando houver escopo por perfil.
- Estados de erro nao devem vazar payloads internos.
- Download/exportacao de PDF/documentos deve respeitar o mesmo nivel de permissao da tela de origem.
