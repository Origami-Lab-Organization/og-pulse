# ADR 0029: Login social multi-provedor: Google ao lado da Microsoft, identidade casada com o funcionário convidado

- Status: proposto (decisões de produto tomadas em 09/09/2026; o mecanismo técnico recomendado aqui vira aceito com a entrega de PUL-225)
- Data: 2026-09-09
- Decisores: Italo Castro (produto); implementação prevista em PUL-225 (entrar com Google) e PUL-229 (convite ciente do provedor)

## Contexto

O primeiro cliente fora da Origami usa Google Workspace. Hoje o Pulse entra por e-mail e
senha ou pela Microsoft (ADR-0016), e o caminho Microsoft está preso ao tenant da Origami:
a função `microsoft-sso` exige `tid` igual à variável de ambiente. Sem Google, cada
funcionário do cliente precisaria de uma senha só para o Pulse.

O que mudou desde o ADR-0016:

- O Pulse virou multi-tenant de verdade: qualquer empresa se autocadastra, nasce em teste de
  14 dias e convida seus funcionários (`create-employee-user`, via `inviteUserByEmail`).
  Ver ADR-0028.
- O backend é um Supabase próprio (ADR-0026). O motivo original para não usar o provider
  nativo do Auth ("indisponível no Lovable Cloud") não vale mais. A escolha agora é de
  desenho, não de bloqueio.

Restrições que moldam a solução:

- `boundaries.md`: dado sensível é protegido no banco; tenant e escopo nunca são
  configuráveis pelo próprio mecanismo de capacidades (ADR-0027, ponto 7). O tenant de quem
  entra tem que vir do registro em `employees`, jamais do corpo da requisição.
- A função de login é a porta de entrada do sistema inteiro (lição do ADR-0016): um
  relaxamento vira bypass para admin, salário, custo e margem.
- Convite e login precisam convergir na **mesma** conta: quem foi convidado por e-mail e
  entra com Google não pode virar um segundo usuário sem histórico.

Alternativas consideradas:

1. **Provider Google nativo do Supabase Auth** (`signInWithOAuth`). Prós: nenhum código de
   validação nosso; refresh token do Google guardado pelo Auth. Contras: por padrão o
   Auth **cria** um usuário para qualquer conta Google que se apresente; impedir isso exige
   Auth Hook "before user created" ou trigger em `auth.users`, ambos configurados pelo painel
   e fora da trilha de migrations versionadas; a regra "entra quem foi convidado" ficaria
   espalhada entre painel e banco.
2. **Edge Function `google-sso` no molde da `microsoft-sso`.** O front obtém o ID token pelo
   Google Identity Services e o transporta; a função valida assinatura contra o JWKS do
   Google, `iss` (`accounts.google.com`), `aud` igual ao nosso client id, `exp` e
   `email_verified = true`; procura funcionário ativo e não bloqueado com aquele e-mail; o
   tenant é o dele; emite a sessão com `generateLink` tipo `magiclink`, que **exige usuário
   já existente**, então o login nunca cria ninguém por construção. Prós: mesma regra e mesmo
   padrão já auditados; tudo versionado no repositório; multi-tenant sem `tid` (o tenant vem
   do funcionário). Contras: código próprio na porta de entrada; não guarda token de acesso
   do Google (hoje não precisamos: arquivos no Drive estão fora do escopo).
3. **SAML / SSO do Workspace por tenant.** Exige plano superior do Supabase e configuração
   por empresa. Fora de escala para o momento.

## Decisão

**Decisões de produto (tomadas em 09/09/2026):**

1. **Google entra ao lado da Microsoft e do e-mail/senha.** Nenhum provedor é obrigatório e
   e-mail/senha nunca sai: se um provedor falhar, ninguém fica trancado fora (mesma regra do
   ADR-0016).
2. **Provedor é caminho de entrada, não conta separada.** A chave que liga a identidade ao
   funcionário é o **e-mail**. A mesma pessoa entrando por senha, Microsoft ou Google é o
   mesmo `auth.users`, com o mesmo histórico.
3. **Entra quem a empresa já convidou.** A conta social precisa bater com o e-mail de um
   funcionário ativo e não bloqueado. O login **nunca cria usuário nem tenant**; quem cria é
   o autocadastro (`register-tenant`) ou o convite (`create-employee-user`).
4. **O tenant vem do funcionário**, nunca do corpo da requisição nem de capacidade.
5. **A prova é validada no servidor.** O navegador só transporta o ID token. Token forjado,
   expirado ou emitido para outro aplicativo é recusado.
6. **Quem entra por provedor social não passa por troca de senha**, e o convite passa a
   oferecer o botão do provedor da empresa (PUL-229).

**Mecanismo técnico recomendado:** alternativa 2, função `google-sso` espelhando
`microsoft-sso`. Ao nascer a segunda função, o que é comum (busca do funcionário, emissão da
sessão, mensagens de erro, limpeza de `must_change_password`) sai para um módulo
compartilhado em `supabase/functions/_shared/`, para que a regra "nunca cria" exista em um
lugar só. `GOOGLE_CLIENT_ID` vem do ambiente da função, jamais do corpo da requisição.
Escopos mínimos: `openid email profile`; nada do Drive por aqui.

**Decisões pendentes** (não bloqueiam a implementação, mas precisam de resposta antes do
segundo tenant com Google):

- Exigir que a conta seja do domínio do Workspace da empresa, além de bater com o convite?
  Pede um campo de domínio permitido no tenant.
- O fundador cria a empresa com Google também? Hoje `register-tenant` recebe e-mail e senha.
- Microsoft para outros tenants: hoje o `tid` é fixo da Origami; abrir exige `tid` por tenant.

## Consequencias

- Beneficios: funcionário de cliente Google entra sem senha nova; uma pessoa, uma conta,
  qualquer caminho; a regra de quem entra continua no servidor e versionada; o desenho já
  passou por revisão de segurança no ADR-0016.
- Custos: tela de consentimento OAuth no Google Cloud da Origami (escopos básicos não pedem
  verificação do app); dois segredos novos (`VITE_GOOGLE_CLIENT_ID` no front, público;
  `GOOGLE_CLIENT_ID` na função); mais uma função pública (`verify_jwt = false`) para
  acompanhar em log; extração do módulo compartilhado.
- Riscos: e-mail é a chave, então um e-mail reatribuído no Workspace do cliente herda o
  acesso do antigo dono. É o mesmo risco do fluxo de recuperação de senha e mitiga-se do
  mesmo jeito: desligar o funcionário no Pulse quando sai da empresa. Sem rate limit próprio
  na função, como na `microsoft-sso`: o custo de tentativa é uma credencial assinada pelo
  Google, mas isso é premissa, não garantia.
- Como reverter: apagar a função `google-sso` e o botão; nada muda no banco. Contas que já
  entraram por Google continuam entrando por e-mail e senha (recuperação de senha).

## Criterio de revisao

- Quando o terceiro provedor aparecer, ou quando "arquivos no Google Drive" virar história:
  aí o Pulse precisa de token de acesso do Google, o que a alternativa 2 não guarda, e o
  provider nativo (com `provider_token`) volta à mesa.
- Se o Supabase Auth passar a aceitar o hook "before user created" por migration
  versionada, reavaliar o provider nativo com guarda no banco.

## Evidencias

- Jira: PUL-225 (entrar com Google, cenários 1 a 5), PUL-229 (convite ciente do provedor),
  PUL-226 (este registro), PUL-223 (épico).
- Referência de desenho: ADR-0016 e `supabase/functions/microsoft-sso/index.ts` (validação
  JWKS, `aud`, `iss`, `tid`; funcionário existente e não bloqueado; `generateLink`).
- Front hoje: `src/contexts/AuthContext.tsx` (`signInWithMicrosoft`, só transporta o token),
  `src/pages/Login.tsx` (botão Microsoft quando configurado).
- Convite: `supabase/functions/create-employee-user/index.ts` (`inviteUserByEmail`).
- Relacionados: ADR-0026 (Supabase próprio), ADR-0027 (capacidade por papel; tenant não é
  capacidade), ADR-0028 (plano de teste e autocadastro).
- Nenhum código Google existe ainda; nenhuma evidência de execução anexada.
