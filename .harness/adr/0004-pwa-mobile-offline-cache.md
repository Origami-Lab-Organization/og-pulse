# ADR 0004: PWA mobile e cache offline autenticado

- Status: aceito
- Data: 2026-06-19
- Decisores: Origami Lab / operação interna

## Contexto

Timesheet, Meu Kanban e Reembolsos precisam funcionar como aplicativo instalável em smartphones. As leituras já carregadas devem permanecer disponíveis por um período curto sem conexão, mas respostas do Supabase dependem de JWT e RLS; um cache indexado apenas por URL poderia expor dados de outra conta usada no mesmo aparelho.

## Decisão

Usar `vite-plugin-pwa` com Workbox em modo `injectManifest` e registro somente abaixo de 768px. O modo standalone permite apenas as três rotas de negócio e as rotas técnicas de autenticação.

O service worker aplica `NetworkFirst` somente a `GET`s de uma allowlist das três funcionalidades. A chave de cache inclui um hash não reversível do `sub` do JWT, expira em 24 horas e o cache privado é removido no logout. Mutations, Auth, RPC, Realtime, Storage e URLs assinadas nunca são cacheados. Escritas offline ficam bloqueadas e não existe sincronização posterior.

## Consequências

- Benefícios:
  - instalação consistente no Android e iOS;
  - leitura offline sem compartilhar respostas entre contas;
  - controle explícito sobre dados sensíveis e atualização do app.
- Custos:
  - service worker próprio e dependências Workbox adicionais;
  - matriz de testes em navegadores e aparelhos reais.
- Riscos:
  - dados podem ficar desatualizados por até 24 horas;
  - um usuário bloqueado offline ainda pode visualizar dados previamente cacheados até reconectar ou o cache expirar, sem poder escrever.
- Como reverter:
  - publicar service worker autodestrutivo, remover o registro e manter as telas web responsivas.

## Evidências

- História: `jornadas/tasks/funcionario/J12-pwa.md`
- Configuração: `vite.config.ts`
- Service worker: `src/sw.ts`

