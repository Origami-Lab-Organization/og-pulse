# has_role órfã dentro de funções — 08/09/2026

## Sintoma

Usuário tentou alterar hora planejada na aba Equipe de um projeto e recebeu, no toast:

```
function public.has_role(uuid, uuid, unknown) does not exist
```

Relatado como dois problemas: "não permite alteração de carga de horas" e "mensagem
está muito técnica, deveria informar o que fazer". Os dois procedem.

## Causa

A aposentadoria do mecanismo de papel (PUL-206, 04/09) derrubou `public.has_role`. O
inventário de dependentes cobriu policies, triggers conhecidos e `src/`. **Não cobriu o
corpo das outras funções.** Cinco continuaram chamando a função removida:

| função | efeito |
|---|---|
| `enforce_past_month_allocation_edit` | trigger em `project_role_allocations` — o defeito relatado |
| `vacation_request_is_admin` | usada por 3 policies de `vacation_request_approvals` |
| `vacation_request_owner_or_admin` | idem — **ler** aprovação de férias erra desde 04/09 |
| `reopen_project_gpo_report` | reabrir relatório de GPO entregue |
| `simulate_allocation_margin_impact` | simulação de impacto na margem |

Chamada dentro de função só resolve em runtime. O `DROP` passou, o deploy passou, e a
quebra ficou quatro dias em produção. Aprovação de férias estava erroando esse tempo todo
e ninguém reportou — o que é pior que o defeito relatado.

## Correção

`20260908150000_functions_off_has_role.sql`. Corpo gerado a partir de
`pg_get_functiondef` do banco, trocando só o predicado — escrever à mão perdeu, na
primeira tentativa, o `set_config('app.gpo_transition', ...)` e a limpeza de
`delivered_at` do relatório de GPO.

Duas capacidades novas, `alocacao:editar-mes-fechado` e `gpo:reabrir-relatorio`, ambas
derivadas de quem tem `pessoa:editar-papel`. Paridade zero medida antes: os conjuntos
`pessoa:editar-papel`, `projeto:gerir-qualquer` e `ferias:administrar` têm as mesmas 8
pessoas, zero divergência.

## Segunda metade: a mensagem

O toast fazia `error.message || 'Erro ao atualizar horas'`, então qualquer erro de banco
ia cru para a tela. Agora existe convenção: mensagem escrita para o usuário sobe do banco
com `ERRCODE 'PU001'`, e a tela passa tudo por `mensagemParaUsuario`
(`src/lib/errors/userMessage.ts`) — `PU001` passa direto, recusa de acesso vira frase de
permissão, e o resto vira texto acionável com o detalhe no console.

## Regras que saíram disso

Duas linhas novas em `.harness/ai-review-checklist.md`: inventário de remoção de função
tem de varrer `pg_get_functiondef`, e mensagem que chega ao usuário tem de ter sido
escrita para ele.

## Segundo round: as Edge Functions — 10/09/2026

O inventário de 08/09 varreu `pg_get_functiondef` e fechou as cinco funções do banco. **Não
varreu `supabase/functions/`.** Dois dias depois, um cliente novo entrou e foi convidar o
time: cadastrar funcionário respondia "Edge Function returned a non-2xx status code" para
todo mundo, inclusive admin.

Três Edge Functions autorizavam pela mesma RPC removida, cada uma travando uma operação
inteira:

| função | passou a exigir |
|---|---|
| `create-employee-user` | `has_capability('pessoa:editar')` |
| `decide-time-adjustment` | `has_capability('ponto:aprovar')` |
| `register-absence-period` | `has_capability('pessoa:editar')` |

A capacidade de cada uma veio da `capability-matrix.md`, não de chute. O último funcionário
criado por convite na base era de 23/07, o que explica os quase dois meses sem ninguém
notar.

**Detalhe desconfortável:** `src/lib/errors/userMessage.ts` — a "segunda metade" registrada
acima — nasceu porque um usuário leu `function public.has_role(...) does not exist` num
toast. A resposta na época foi escrever uma mensagem amigável para o erro, sem ir atrás da
função que não existia. Mensagem amigável sobre causa não investigada esconde o defeito em
vez de resolvê-lo, e foi exatamente o que aconteceu aqui.

**Regra que faltava na de 08/09:** inventário de remoção de RPC tem de varrer
`supabase/functions/` junto com `pg_get_functiondef`. O Deno não quebra em build — quebra em
produção, na primeira chamada.

Correção no commit `748cc55e`; as três funções estão em produção na v4 desde 10/09 10:47.
Ver PUL-257.
