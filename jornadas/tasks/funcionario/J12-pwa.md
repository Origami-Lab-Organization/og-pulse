# FUNC-J12 — PWA do Pulse

> Jornada: Funcionário J12 · Estado auditado: ❌ NÃO EXISTE (0%)
> Dependências externas: nenhuma bloqueante. Os layouts mobile por funcionalidade dependem das páginas existirem (Ponto J11, Documentos J9, Perfil J10) — coordenar para não bloquear. Adicionar `vite-plugin-pwa` é dependência nova → registrar ADR.

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- `AppSidebar` já tem tratamento mobile via Sheet (base de navegação mobile existe).
- `host: true` / acesso via IP local já viável no Vite.

**❌ Pendente:**
- `vite-plugin-pwa` ausente do `package.json`; sem `manifest.json`.
- Sem ícones (`icon-192`, `icon-512`, `apple-touch-icon`); `vite.config.ts` minimalista.
- Sem `InstallPWABanner`; sem detecção `display-mode: standalone`; sem service worker/Workbox; sem estratégia offline.

## História de Usuário

**Como** Consultor que precisa bater ponto, lançar horas e ver notificações fora do computador,
**quero** instalar o Pulse como app no celular,
**para que** eu use o Meu Espaço completo sem depender do notebook.

## Contexto

J12 é transversal: afeta todas as páginas do Meu Espaço. É construção do zero. Cobre exclusivamente o Meu Espaço — em modo standalone o menu mostra só Meu Espaço; módulos de GP/Admin ficam acessíveis apenas pelo browser desktop. Caso de uso principal: bater ponto (J11). Offline é NetworkFirst com leitura do que já foi carregado; sem fila de sincronização — ações que modificam dados exigem conexão.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Setup do plugin**
- `npm install -D vite-plugin-pwa`; configurar em `vite.config.ts` com `registerType: 'autoUpdate'`, `host: true`.
- Registrar a nova dependência via ADR (boundary: não incluir lib sem decisão).

**CA-02 — Manifest**
- `display: 'standalone'`, `orientation: 'portrait'`, `start_url: '/dashboard'`, nome/short_name e tema do Pulse.

**CA-03 — Ícones e meta tags iOS**
- `public/icon-192.png` (192×192), `public/icon-512.png` (512×512, maskable c/ 20% padding), `public/apple-touch-icon.png` (180×180).
- `index.html`: `apple-touch-icon`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`.

**CA-04 — `InstallPWABanner`**
- Topo do dashboard. Android/Chrome: usa `beforeinstallprompt` → botão "Instalar". iOS Safari: instruções "Compartilhar → Adicionar à Tela de Início".
- Aparece uma vez por sessão; ao dispensar, não reaparece por 7 dias.

**CA-05 — Escopo PWA = Meu Espaço apenas**
- Em modo standalone (`window.matchMedia('(display-mode: standalone)')`): menu exibe apenas opções do Meu Espaço.
- Módulos de GP/Admin não aparecem no menu do PWA (acessíveis só via browser desktop).

**CA-06 — Offline NetworkFirst**
- Workbox NetworkFirst para chamadas ao Supabase: offline mostra dados já carregados.
- Ações que modificam dados exibem "Sem conexão. Reconecte para salvar." Sem fila de sincronização offline.

**CA-07 — Auto-update sem perder sessão**
- `autoUpdate` aplica nova versão silenciosamente; sessão Supabase persiste após update e após fechar/reabrir o app.

### Parte B — Melhorias no existente (depois)

**CA-08 — Layouts mobile por funcionalidade**
- Ponto: botão ~80px de altura, ~90% da largura, texto grande; tabela mensal como lista vertical.
- Timesheet: um projeto por vez, 5 dias abaixo, campos de hora grandes para toque.
- Meu Kanban: uma coluna por vez com swipe horizontal (A Fazer/Fazendo/Feito); cards em tela cheia.
- Reembolsos: câmera via `input[type=file][accept=image/*][capture=environment]`.
- Documentos: lista vertical com botões grandes.

**CA-09 — Robustez de layout**
- Rotação para paisagem não quebra o layout; painéis laterais (ex.: card de atividade) ocupam tela cheia no mobile.

## Fora do Escopo

- Push notifications nativas (apenas Realtime/Inbox no app).
- Fila de sincronização offline (ações de escrita exigem conexão, inclusive ponto).
- Publicação nas lojas (App Store / Play Store) — PWA instalável pelo navegador.

## Notas Técnicas

- Reusar o tratamento mobile já presente na `AppSidebar` (Sheet) para a navegação.
- Boundary: adicionar `vite-plugin-pwa` exige ADR antes de mergear.
- A detecção `standalone` filtra o menu — centralizar em um helper único reutilizável.
- NetworkFirst deve excluir endpoints de escrita do cache otimista (não servir resposta velha em mutações).
- Coordenar com J9/J10/J11 para os layouts mobile (Parte B) só quando as páginas existirem.

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Instalar no Android/Chrome | Banner "Instalar" via `beforeinstallprompt`; app na tela inicial |
| Instalar no iOS Safari | Instruções de "Adicionar à Tela de Início"; sessão persiste após reabrir |
| Abrir em modo standalone | Menu mostra só Meu Espaço; GP/Admin ausentes |
| Acessar módulo GP pelo menu do PWA | Não disponível no menu standalone |
| Ficar offline com dados carregados | Dados visíveis; mutação mostra "Sem conexão. Reconecte para salvar." |
| Update disponível | `autoUpdate` aplica sem perder sessão |
| Rotação para paisagem | Layout não quebra |
| Dispensar banner | Não reaparece por 7 dias |
