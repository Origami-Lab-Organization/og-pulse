# Integração Microsoft 365 — Agenda e E-mails

Status: funcional. Leitura de agenda e e-mails, criação de compromissos.
Independente do Supabase Auth.

## O que existe

Rota `/minha-agenda` (item "Agenda" na sidebar) com duas abas:

- **Agenda** — grade de mês navegável (`/me/calendarView` no intervalo da
  grade), com detalhe do dia e criação de compromisso (`POST /me/events`,
  incluindo reunião do Teams quando pedido).
- **E-mails** — 15 mensagens mais recentes da caixa de entrada
  (`/me/mailFolders/inbox/messages`).

O Outlook Web **não** pode ser embutido em iframe (a Microsoft bloqueia o
enquadramento). A grade é nossa, alimentada pelo Graph.

O login do Pulse **continua sendo e-mail/senha pelo Supabase**. Dentro do
sistema, a pessoa clica em "Conectar Microsoft" e autoriza o acesso à própria
conta. São duas coisas separadas de propósito, pelo motivo da seção seguinte.

## Por que não é "Entrar com Microsoft"

O backend do Pulse é um Supabase gerenciado pelo Lovable Cloud, e o painel de
Authentication do Lovable lista o provider Microsoft como "Coming soon". Sem
acesso ao dashboard bruto do Supabase não há como habilitá-lo. A autorização do
Graph via MSAL não depende disso e funciona hoje.

Quando o login com Microsoft for possível (Lovable liberar o provider, ou o
projeto migrar para um Supabase próprio), a agenda continua funcionando como
está — as duas coisas não se bloqueiam.

## Configuração necessária

### 1. Registrar o app no Microsoft Entra ID

Azure Portal → Microsoft Entra ID → App registrations → New registration:

- Supported account types: **Accounts in this organizational directory only**
  (single tenant).
- Platform: **Single-page application (SPA)** — não é "Web". A MSAL usa
  Authorization Code + PKCE, então **não existe client secret** neste fluxo.
- Redirect URI = a página estática de retorno, **não** a raiz do app:
  - `http://localhost:8080/microsoft-auth.html` (desenvolvimento)
  - `<url-de-producao>/microsoft-auth.html`

  A URI precisa ser essa página (`microsoft-auth.html` na raiz, entry separado
  no Vite, que roda `src/microsoftAuthBridge.ts`). Apontar
  para a raiz faz o React Router carregar a SPA dentro do popup, e o redirect
  de rota apaga o fragmento com o código do OAuth — o fluxo morre em silêncio,
  sem gravar conta nem token, e a tela fica pedindo "Conectar" para sempre.
  A mesma página é usada pelo iframe de renovação silenciosa.

  A página precisa chamar `broadcastResponseToMainFrame()` da MSAL: a partir da
  v5 a janela-mãe não lê mais a URL do popup, é a página de retorno que repassa
  a resposta. Sem isso o popup fica aberto em "Autorizando…" para sempre.
- API permissions → Microsoft Graph → **Delegated**: `Calendars.ReadWrite` e
  `Mail.Read`. Clicar em **Grant admin consent** para o tenant.
  `Calendars.ReadWrite` cobre leitura e criação; sem ela a grade lista mas não
  cria.

Os escopos reservados (`openid`, `profile`, `offline_access`) são pedidos pela
própria MSAL — não precisam ser adicionados.

### 2. Variáveis de ambiente

```
VITE_MICROSOFT_CLIENT_ID=<Application (client) ID do registro>
VITE_MICROSOFT_TENANT_ID=<Directory (tenant) ID da Origami>
```

Sem as duas, a tela mostra "integração não configurada" e não quebra. O
`tenant_id` entra na authority da MSAL (`login.microsoftonline.com/<tenant>`),
o que impede conta Microsoft pessoal de autorizar — não é só uma dica de UX.

Nada disso é secreto: client ID e tenant ID são públicos por definição num app
SPA. Não há segredo no front.

## Privacidade e escopo de acesso

Todas as chamadas usam o endpoint `/me` do Graph: cada pessoa só alcança a
própria agenda e a própria caixa de entrada, com a permissão que a Microsoft já
concede a ela. O Pulse não guarda evento, e-mail nem token em tabela nossa —
nada passa por Postgres, RLS ou Edge Function. Os dados são buscados no
navegador e ficam apenas no cache em memória do TanStack Query.

"Desconectar" esquece a autorização somente no Pulse (`clearCache`), sem
derrubar a sessão da conta Microsoft no resto do Office.

## Renovação de token

A MSAL renova o access token em silêncio (`acquireTokenSilent`) e só reabre o
popup quando a Microsoft exige interação — senha trocada, MFA ou consentimento
revogado. O cache fica em `localStorage` porque sem ele o refresh silencioso
depende de cookie de terceiro, que os navegadores bloqueiam.

## Escopo deliberadamente fora

- Editar e excluir eventos já criados (o escopo permite; a UI não faz).
- Enviar e-mail (exigiria `Mail.Send`).
- Visões de semana e dia na grade — só mês por enquanto.
- Ler agenda de outra pessoa (exigiria permissão de aplicação e admin consent
  amplo — decisão de privacidade que ninguém tomou).
- Sincronizar agenda com timesheet ou alocação.
- Webhooks/subscriptions do Graph para tempo real.

## Estado da validação

Validado em navegador: o popup de consentimento abre, retorna e a conta fica
conectada; a listagem de agenda e e-mails carrega.

Ainda **não** exercitado: navegação entre meses na grade, detalhe do dia,
criação de compromisso (com e sem reunião do Teams), "Desconectar", e recusa de
conta de fora do tenant. Não há teste automatizado.

Há um painel "Diagnóstico da conexão (dev)" no fim da página, visível só em
desenvolvimento (`import.meta.env.DEV`). Ele existe porque o DevTools está
bloqueado por política da organização — remover quando a integração estabilizar.

### Erros de configuração já vistos

- `AADSTS9002326` (cross-origin token redemption): a Redirect URI está
  cadastrada na plataforma **Web** em vez de **Single-page application**.
- `AADSTS50011`: a URI registrada não bate exatamente com a origem + caminho
  (barra final sobrando, porta diferente da 8080).
- Popup fica em "Autorizando…" com o código na URL: a página de retorno não
  executou o bridge da MSAL.
