# FUNC-J1 — Convite e Primeiro Acesso

> Jornada: Funcionário J1 · Estado auditado: 🟡 PARCIAL (~50%)
> Dependências externas: J2 Onboarding (redirect final aponta para `/onboarding`) — desenvolver em paralelo; nenhuma outra equipe

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Infra de convite: `must_change_password` (migration 20260121002930), status `aguardando_confirmacao`, `temp_password`
- Edge Function de convite: `supabase/functions/send-invite-email/index.ts` — template HTML com credenciais e botão
- Edge Function `create-employee-user` + `resendInvite`
- Guard de intercepção funcionando: `src/components/auth/ProtectedRoute.tsx` — `if (employee?.must_change_password && location.pathname !== '/change-password')` redireciona
- Tela de troca de senha em `/change-password`: `src/pages/ChangePassword.tsx` com validação de força
- `updatePassword()` em `AuthContext.tsx` + RPC `complete_password_change`

**❌ Pendente:**
- Login sem pré-preenchimento do e-mail vindo do convite (`src/pages/Login.tsx`)
- E-mail de convite com remetente genérico (`noreply@resend.dev`), sem nome da empresa, sem validade de 7 dias
- Sem validação de expiração de link (TTL) e sem tela de "link expirado"
- Tela de primeiro acesso sem UX acolhedora (indicador de força em tempo real, sem sidebar) e sem redirect para `/onboarding`

## História de Usuário

**Como** funcionário novo que recebeu um convite por e-mail,
**quero** clicar no link, logar com a senha temporária e definir minha senha pessoal numa tela clara,
**para que** eu entre no sistema em menos de 3 minutos sem precisar de ajuda de ninguém.

## Contexto

Primeiro contato do consultor com o Pulse. A infra de convite e o guard já funcionam — o gap é de experiência: e-mail profissional, login que reconhece o convite, tela de primeiro acesso acolhedora e tratamento de link expirado. Depende de J2 só no destino do redirect final (`/onboarding`); enquanto J2 não existe, redirecionar para `/dashboard`.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — E-mail de convite melhorado**
Atualizar `supabase/functions/send-invite-email/index.ts` para o template conter:
- Remetente identificado (Origami Pulse / nome da empresa) em vez de `noreply@resend.dev`
- Saudação com o nome do funcionário e o nome da empresa que convida
- Senha temporária em destaque (copiável)
- Botão único "Acessar o Origami Pulse" cujo link inclui o e-mail como parâmetro de URL (`?email=...`)
- Instrução: "Você precisará criar uma nova senha no primeiro acesso"
- Menção de validade de 7 dias do link

**CA-02 — Login com e-mail pré-preenchido**
`src/pages/Login.tsx` lê o parâmetro `email` da URL e pré-preenche o campo de e-mail (somente leitura ou editável); funcionário digita apenas a senha temporária.

**CA-03 — Tela `/primeiro-acesso` dedicada (sem sidebar)**
Nova rota `/primeiro-acesso` (em `App.tsx`) renderizada sem o layout/sidebar do sistema, contendo:
- Boas-vindas com nome do funcionário e nome da empresa
- Texto: "Por segurança, você precisa criar uma senha pessoal antes de continuar"
- Campo nova senha com indicador de força em **tempo real**
- Campo confirmar nova senha
- Critérios visíveis e marcados ao vivo: 8+ caracteres, 1 maiúscula, 1 número, 1 especial
- Botão "Criar minha senha e entrar"
- Reaproveita `updatePassword()` / RPC `complete_password_change` já existentes (não reimplementar a persistência)

**CA-04 — Guard redireciona para a nova tela**
`ProtectedRoute.tsx` passa a redirecionar `must_change_password === true` para `/primeiro-acesso` (em vez de `/change-password`); qualquer navegação para outra rota com essa flag volta para `/primeiro-acesso`. Após sucesso: limpa `must_change_password`/`temp_password`, status → `ativo`, e redireciona para `/onboarding` (fallback `/dashboard` enquanto J2 não existir).

**CA-05 — Validação de link expirado (> 7 dias)**
- Convite carrega/valida um TTL de 7 dias (gravar timestamp do convite na criação em `create-employee-user`; validar na autenticação/primeiro acesso)
- Link expirado: tela clara "Este link expirou. Entre em contato com o seu gestor para receber um novo convite." — **sem** mensagem técnica do Supabase

### Parte B — Melhorias no existente (depois do pendente)

**CA-06 — Reenvio invalida senha temporária anterior**
Ao acionar `resendInvite`, a senha temporária anterior deixa de ser válida (gera nova); documentar comportamento.

**CA-07 — Mensagem amigável de senha temporária incorreta**
Erro de senha temporária errada exibe mensagem compreensível (não o erro cru do Supabase); orientar a copiar do e-mail.

## Fora do Escopo
- Onboarding em si (J2 — task separada); aqui apenas o redirect de destino
- Magic link / SSO / recuperação de senha por e-mail (fora da jornada)
- Layout mobile dedicado / PWA (J12)

## Notas Técnicas
- Rotas: `App.tsx` (adicionar `/primeiro-acesso`; manter ou redirecionar `/change-password`)
- Telas: `src/pages/ChangePassword.tsx` (base da UX), `src/pages/Login.tsx`
- Guard: `src/components/auth/ProtectedRoute.tsx`
- Auth: `AuthContext.tsx` (`updatePassword`), RPC `complete_password_change`
- Edge Functions: `supabase/functions/send-invite-email/index.ts`, `create-employee-user`
- Banco: `must_change_password` (migration 20260121002930), status `aguardando_confirmacao`/`ativo`, `temp_password`
- Dado sensível (e-mail, status do funcionário): respeitar `tenant_id`/RLS já existentes em `employees`

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Receber convite e clicar no link | E-mail identificado com empresa/nome, senha copiável, botão único |
| Abrir link de convite | `/primeiro-acesso` carrega; campo de e-mail pré-preenchido |
| Acessar `/projetos` com `must_change_password: true` | Redirect para `/primeiro-acesso` |
| Definir senha forte e confirmar | Senha trocada; flag limpa; status `ativo`; redirect para `/onboarding` (ou `/dashboard`) |
| Senha não atende critérios | Indicador em tempo real bloqueia o botão |
| Abrir link após 7 dias | Tela "Este link expirou..." sem erro técnico |
| Admin reenvia convite | Senha temporária anterior inválida; novo e-mail entregue |
| Senha temporária digitada errada | Mensagem compreensível, sem texto cru do Supabase |
