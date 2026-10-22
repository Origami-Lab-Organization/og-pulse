# ADR 0052: Transcrição do Teams chega sozinha, com permissão de aplicação restrita

- Status: aceito
- Data: 2026-10-22
- Decisores: Italo Castro (tech lead)
- Relacionados: ADR-0039 (transcrição por worker próprio — vira plano B), ADR-0019 (recusa de
  permissão de aplicação nos arquivos — continua valendo para arquivos), ADR-0011 (reunião
  identificada pelo `iCalUId`), ADR-0016 (id token do Entra validado no servidor), ADR-0027
  (capacidade), ADR-0046 (RLS em forma de conjunto)

## Contexto

A ADR-0039 entregou a transcrição com um clique: a pessoa escolhe a gravação no OneDrive, o
navegador gera um link temporário e um worker com WhisperX transcreve. O pedido seguinte foi
outro: "ao terminar a reunião, na aba de reuniões fica a transcrição, sem o usuário precisar
operar".

Sem ninguém com o Pulse aberto, só um servidor pode buscar a reunião — e todo o desenho da
ADR-0039 existia para nenhum servidor ter acesso à Microsoft. Três caminhos foram postos na
mesa em 22/10: guardar o acesso delegado do organizador (refresh token cifrado), permissão de
aplicação no Teams, ou enviar sozinho quando o organizador abrisse o Pulse. Italo escolheu a
permissão de aplicação, com a transcrição nativa do Teams.

Fatos conferidos na documentação da Microsoft em 22/10/2026:

- `GET /users/{id}/onlineMeetings/getAllTranscripts(meetingOrganizerUserId=...)` lista as
  transcrições das reuniões de um organizador. Só com permissão de aplicação
  (`OnlineMeetingTranscript.Read.All`).
- Toda permissão de aplicação de reunião exige uma **application access policy** do Teams,
  concedida pelo admin a cada usuário ou ao tenant inteiro. Sem ela, o Graph responde 403
  "No application access policy found for this app".
- O conteúdo sai em WebVTT com o nome real de quem falou (`<v Nome>`). O tenant pode desligar
  o acesso do Graph às transcrições (`GraphAccessToTranscriptsDisabled`) ou a atribuição de
  voz (`SpeakerAttributionNotAllowed`; aí vem o texto sem nomes).
- As APIs de transcrição e gravação do Teams deixaram de ser tarifadas em 25/08/2025.
- No tenant da Origami a transcrição começou sozinha numa reunião de teste (22/10).

## Decisão

1. **A transcrição do próprio Teams é o caminho principal.** Nada é transcrito pelo Pulse; o
   texto chega pronto e com nomes. A ADR-0039 continua valendo como plano B, para áudio sem
   transcrição do Teams.
2. **A reunião é vinculada ao projeto quando nasce**, em `project_online_meetings`: pela
   Agenda ao criar a reunião do Teams com um projeto escolhido, ou pelo detalhe de uma reunião
   que a pessoa organizou ("Vincular a um projeto"). **Não precisa ser rito**: reunião avulsa
   do projeto também traz a transcrição. A transcrição só vai para projeto vinculado — nunca
   por classificação do conteúdo (mantido da ADR-0039).
3. **O organizador não vem do cliente.** A Edge Function `teams-meeting-register` valida um id
   token do Entra (mesmas checagens do `microsoft-sso`), exige que o e-mail dele seja o do
   funcionário logado e grava o `oid` como `organizer_entra_id`. A sincronização só lista as
   transcrições desse organizador; vincular a reunião de outra pessoa ao próprio projeto não
   traz nada. Por isso só quem organizou pode trazer a transcrição.
4. **Polling, não webhook.** O cron chama `teams-transcripts-sync` de 10 em 10 minutos; ela
   relê os últimos 3 dias de cada organizador e a UNIQUE `(project_id, source_transcript_id)`
   torna a releitura idempotente. Webhook pediria endpoint público com validação, assinatura
   renovada a cada poucos dias, notificação de ciclo de vida e assinatura feita antes de a
   transcrição começar — tudo para ganhar minutos.
5. **Credencial em app próprio.** "Pulse — Transcrições" é um registro de app separado do app
   SPA do login, só com `OnlineMeetingTranscript.Read.All`. O segredo fica nos secrets das
   Edge Functions (`MICROSOFT_TRANSCRIPTS_CLIENT_ID`/`_SECRET`), nunca no front.
6. **Gravar e transcrever automaticamente** continua sendo ligado pelo navegador, com escopo
   delegado (`OnlineMeetings.ReadWrite`, pedido só no uso), ao criar a reunião.
7. Quem vinculou recebe aviso no sino quando a transcrição chega. A tela mostra cada reunião
   vinculada com a última verificação ou o problema encontrado, já em português.

## Consequências

**Ganhos**

- Ninguém opera nada: a transcrição aparece no projeto 10 a 20 minutos depois do fim da
  reunião.
- Nomes reais de quem falou, sem a etapa "Voz 1 → Fulana".
- Sem VM para operar no caminho principal.

**Custos e riscos**

- **Permissão de aplicação existe.** Com a policy concedida ao tenant inteiro, o app pode ler a
  transcrição de qualquer reunião de qualquer pessoa. O código do Pulse só importa reunião
  vinculada, mas a permissão é maior que o uso. Mitigação: conceder a policy **por usuário**
  (quem organiza reunião de projeto), não `-Global`. É a diferença entre esta decisão e o que
  a ADR-0019 recusou: lá era todo arquivo da empresa; aqui, transcrição de reunião de quem o
  admin escolher.
- **Segredo de app para guardar e girar.** O client secret expira (máximo 24 meses no Entra);
  vencido, a sincronização para e a tela de cada reunião mostra o aviso.
- **Depende do tenant**: transcrição liberada na política de reunião e acesso do Graph às
  transcrições ligado. Desligar qualquer um para a importação sem perder o já importado.
- **Reunião organizada por outra pessoa não vem** — limite da API, não do Pulse.
- **A reunião expira** 60 dias depois da última ocorrência; depois disso a transcrição não é
  mais lida. O que já veio fica.

## Alternativas descartadas

- **Acesso delegado do organizador guardado** (refresh token cifrado): sem permissão de
  aplicação, mas exige client secret do mesmo jeito e um token por pessoa para renovar e
  revogar. Descartado na escolha de 22/10.
- **Enviar ao abrir o Pulse**: sem permissão nova, mas só começa quando o organizador abrir o
  Pulse — não atende "sem operar".
- **Webhook (change notifications)**: ver item 4.

## Verificação pendente

1. Criar o app, dar consentimento de admin e conceder a policy (passo a passo em
   `.harness/integrations/teams-transcricao.md`).
2. Uma reunião de teste com fala: conferir que a transcrição aparece na aba em até 20 minutos e
   com os nomes.
3. `recordAutomatically` liga também a transcrição, ou só a gravação? No tenant a transcrição
   começou sozinha no teste, mas pode ser política do tenant e não a opção.
