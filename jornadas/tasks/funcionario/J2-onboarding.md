# FUNC-J2 — Onboarding

> Jornada: Funcionário J2 · Estado auditado: ❌ NÃO EXISTE (0%)
> Dependências externas: J1 Primeiro Acesso (entrega o usuário em `/onboarding` após trocar a senha) — coordenar redirect

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Nada. Confirmado: `grep onboarding_completed` → vazio; sem `Onboarding.tsx`; sem rota `/onboarding` em `App.tsx`
- Reuso possível: layout sem sidebar (mesmo padrão da tela de primeiro acesso, J1), `AuthContext`/`employees` para identificar o usuário e a empresa

**❌ Pendente:**
- Campos `onboarding_completed` / `onboarding_completed_at` em `employees`
- Página `/onboarding` (fora do layout do sistema) com tela de boas-vindas, 3 passos e tela final
- Guard de redirecionamento pós-primeiro-acesso
- Banner não-intrusivo para quem pulou

## História de Usuário

**Como** funcionário que acabou de definir minha senha e nunca usou o Pulse,
**quero** um onboarding curto de 3 passos que me mostre onde lançar horas, ver projetos e ver notificações,
**para que** eu use o sistema com autonomia em menos de 5 minutos sem pedir ajuda ao GP.

## Contexto

Logo após J1, o funcionário entra num sistema que nunca viu. Sem orientação, o GP orienta cada pessoa manualmente. Esta jornada é construída do zero: campo no banco, página dedicada, guard e banner. O onboarding é pulável e idempotente (não reaparece para quem concluiu). Recebe o usuário do redirect de J1.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Migration: campos de controle em `employees`**
Adicionar via migration versionada:
- `onboarding_completed boolean NOT NULL DEFAULT false`
- `onboarding_completed_at timestamptz NULL`
RLS: o funcionário só pode atualizar o próprio registro; respeitar `tenant_id` existente em `employees`.

**CA-02 — Rota e página `/onboarding` (sem sidebar)**
Nova rota em `App.tsx` + `src/pages/Onboarding.tsx`, renderizada **fora** do layout do sistema (sem sidebar), igual ao padrão da tela de primeiro acesso.

**CA-03 — Tela de boas-vindas**
- Avatar com iniciais do funcionário
- "Bem-vindo(a) ao Origami Pulse, [Nome]!"
- "Você está no workspace da [Nome da Empresa]"
- "Em 3 passos rápidos você vai conhecer o essencial"
- Botão "Começar" + link "Pular e ir direto para o sistema"

**CA-04 — Os 3 passos**
- Passo 1 — Meu Espaço: descrição de kanban, timesheet, reembolsos e documentos; miniatura da navegação lateral
- Passo 2 — Timesheet: "Registre suas horas aqui"; card de exemplo com horas sugeridas e ajuste (conceito do pré-preenchimento de J7)
- Passo 3 — Caixa de Entrada: "Suas notificações chegam aqui"; preview de um card de notificação
- Navegação avançar/voltar entre passos; indicador de progresso (1/3, 2/3, 3/3)

**CA-05 — Tela final com atalhos**
- "Tudo certo, [Nome]! Você está pronto para usar o Origami Pulse."
- Três atalhos: "Ver meus projetos" (`/meus-projetos`) / "Lançar minhas horas" (`/my-timesheet`) / "Ir para o dashboard" (`/dashboard`)
- Ao **renderizar** esta tela: seta `onboarding_completed = true` e `onboarding_completed_at = now()`

**CA-06 — Guard de redirecionamento**
- Após primeiro acesso (J1), se `onboarding_completed === false`: redireciona para `/onboarding`
- Se `onboarding_completed === true`: nunca mostra o onboarding; acessar `/onboarding` via URL redireciona para `/dashboard`
- "Pular" também marca `onboarding_completed = true` (caminho alternativo) e leva ao dashboard

**CA-07 — Banner para quem pulou**
- Banner não-intrusivo no topo do dashboard por 7 dias após pular: "Quer conhecer o sistema em 3 passos rápidos?" (link reabre `/onboarding`)
- Após 7 dias OU clique em "Não mostrar mais": estado persiste para não reaparecer (reaproveitar `onboarding_completed` / flag dedicada; não reabrir indefinidamente)

### Parte B — Melhorias no existente (depois do pendente)

**CA-08 — Adequação por papel**
GP/`manager` recebe o mesmo onboarding base; documentar se admin precisa de onboarding próprio (decisão registrada, não implementar variação agora).

## Fora do Escopo
- Onboarding específico de Admin/GP com seções extras (apenas documentar)
- Tour interativo "guiado por cima da UI real" (highlights nos elementos) — manter telas estáticas
- Layout mobile dedicado / PWA (J12)

## Notas Técnicas
- Rotas: `App.tsx` (adicionar `/onboarding`)
- Nova página: `src/pages/Onboarding.tsx` (sem sidebar — reaproveitar shell da tela de primeiro acesso de J1)
- Banco: `employees` (+ `onboarding_completed`, `onboarding_completed_at`); RLS por funcionário/`tenant_id`
- Hook sugerido: `src/hooks/useOnboarding.ts` (ler/atualizar status via TanStack Query)
- Identidade/empresa: `AuthContext` + dados de `employees`
- Guard: reaproveitar o padrão de `src/components/auth/ProtectedRoute.tsx`
- Atalhos apontam para rotas reais já existentes (`/meus-projetos`, `/my-timesheet`, `/dashboard`)

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Funcionário conclui J1 com `onboarding_completed: false` | Redireciona para `/onboarding` |
| Percorre os 3 passos até a tela final | `onboarding_completed = true` + `onboarding_completed_at` setado |
| Clica em "Pular" | `onboarding_completed = true`; vai ao dashboard; banner aparece |
| `onboarding_completed: true` setado no banco | Guard não mostra onboarding novamente |
| Acessa `/onboarding` via URL após concluir | Redireciona para `/dashboard` |
| Quem pulou, no dashboard | Banner por 7 dias; "Não mostrar mais" o remove permanentemente |
| Atalho "Lançar minhas horas" | Navega para `/my-timesheet` |
