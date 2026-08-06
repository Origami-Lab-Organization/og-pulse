# ADR 0016: Login com Microsoft via Edge Function que valida o ID token

- Status: aceito
- Data: 2026-08-06
- Decisores: Origami Lab / operacao interna

## Contexto

Todo mundo na empresa tem conta Microsoft 365, e entrar no Pulse com ela elimina
uma senha a mais. O Supabase Auth tem provider nativo para Azure/Entra ID, que
seria o caminho óbvio.

Ele não está disponível. O backend do Pulse é um Supabase gerenciado pelo Lovable
Cloud, cujo painel de Authentication lista Microsoft como "Coming soon". Foram
verificadas as duas portas do GoTrue, com resposta do próprio servidor:

- provider Azure no painel: `"azure": false` em `/auth/v1/settings`;
- `signInWithIdToken` (trocar ID token por sessão sem usar o painel):
  `provider_disabled — Provider (issuer "…/v2.0") is not enabled`.

SAML SSO também aparece desabilitado (`saml_enabled: false`) e depende do mesmo
painel. Sem acesso ao dashboard bruto do Supabase, nenhuma das três é viável.

A integração com o Microsoft Graph, por outro lado, já funciona: a MSAL autoriza
no navegador e devolve tanto o access token do Graph quanto o **ID token** do
Entra ID — uma prova de identidade assinada pelo diretório da empresa.

## Decisão

Uma Edge Function (`microsoft-sso`) recebe o ID token, valida criptograficamente
e emite a sessão do Supabase pela Admin API. O front apenas transporta a prova.

### O login com Microsoft convive com e-mail/senha

Não substitui. Se a função falhar, ninguém fica trancado fora do sistema.
Desligar senha é decisão de outro momento, depois de tempo de uso real.

### Validação da identidade — o coração da decisão

Esta função é a porta de entrada do sistema inteiro. Um relaxamento aqui vira
bypass de autenticação para qualquer funcionário, inclusive admin, com acesso a
salário, custo e margem. As checagens não são redundantes:

1. **Assinatura** verificada contra o JWKS do Entra ID
   (`login.microsoftonline.com/{tenant}/discovery/v2.0/keys`). Decodificar o
   token e confiar no conteúdo seria aceitar qualquer JSON forjado.
2. **`aud` igual ao nosso client id.** Sem isso, um token emitido para outro
   app do mesmo tenant seria aceito.
3. **`iss` e `tid` iguais ao nosso tenant.** Sem isso, qualquer tenant Microsoft
   do mundo entraria.
4. **Expiração**, garantida pelo `jwtVerify`.
5. **Funcionário existente e não bloqueado.** A função nunca cria usuário —
   `generateLink` com `magiclink` exige usuário já existente, o que é uma
   segunda barreira além da consulta em `employees`.

`client id` e `tenant id` vêm do ambiente da função, **jamais do corpo da
requisição** — aceitar do cliente anularia os itens 2 e 3.

### Emissão da sessão

A função gera um hash de uso único (`admin.generateLink`, tipo `magiclink`) e o
devolve ao front, que o troca por sessão com `verifyOtp`. Nenhum token de
serviço sai da função.

### `verify_jwt = false`

A função é pública por natureza: é ela que **cria** a sessão, então não pode
exigir sessão. A autenticação real acontece dentro dela, validando a identidade
do Entra ID. Não há rate limit próprio — o custo de tentativa é alto (exige uma
credencial válida assinada pelo tenant), mas isso é premissa, não garantia.

### Quem entra por SSO não passa por troca de senha

Ao entrar pela Microsoft, `must_change_password` é limpo e o status
`aguardando_confirmacao` é ativado. Exigir criação de senha prenderia a pessoa
numa tela para inventar credencial que ela nunca vai usar, e a identidade do
diretório corporativo é prova mais forte que uma senha local.

### Mensagens de erro específicas

"Não encontramos um funcionário ativo com este e-mail" é específico de
propósito. Não é enumeração: chegar nesse ponto exige uma credencial assinada
pelo tenant da empresa, então quem pergunta já é de dentro. Genérico aqui só
geraria chamado de suporte.

## Consequências

- Login sem senha para quem tem conta Microsoft, e a agenda já vem autorizada no
  mesmo gesto — é a mesma sessão da MSAL.
- Quem não é funcionário ativo autentica na Microsoft e é recusado com mensagem
  clara, sem sessão criada.
- A função precisa de `MICROSOFT_CLIENT_ID` e `MICROSOFT_TENANT_ID` como secrets
  do Supabase. Faltando um, ela responde 500 e o login por senha segue.
- Se o Lovable liberar o provider Azure, ou o projeto migrar para um Supabase
  próprio, esta função pode ser trocada pelo provider nativo sem mudar o front
  além do handler do botão.

## Alternativas consideradas

- **Provider Azure do Supabase Auth** — indisponível, verificado por resposta do
  servidor.
- **`signInWithIdToken`** — mesma trava (`provider_disabled`), verificado.
- **SAML SSO** — desabilitado e dependente do mesmo painel; resolveria o login
  mas não entregaria token do Graph, então não substituiria a MSAL.
- **Migrar para Supabase próprio** — resolve isso e mais coisas, mas envolve 328
  migrations, Edge Functions, secrets e os hashes de senha dos usuários. Fica
  como decisão separada.

## Pendência de verificação

Nada foi exercitado em navegador nem contra o Entra ID real. Os casos que
importam antes de liberar para o time: token expirado, `aud` de outro app,
conta de tenant externo, e-mail sem funcionário correspondente, funcionário
bloqueado. São exatamente os caminhos que ninguém testa à mão e que, se
estiverem errados, viram bypass — testá-los é pré-requisito para tirar o login
Microsoft de trás da configuração de ambiente.
