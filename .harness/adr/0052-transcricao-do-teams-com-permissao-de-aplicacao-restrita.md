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
5. **Credencial: o mesmo app do login** ("Origami Pulse", `53d51c7c-…`), com um client secret
   próprio para isto ("Pulse — Transcrições (Supabase)"). Previsto como app separado; na
   configuração de 22/10 o Italo usou o app existente, que já reúne permissões de aplicativo
   para outros usos (`OnlineMeetings.Read.All` e `OnlineMeetings.ReadWrite.All`). O segredo fica
   nos secrets das Edge Functions (`MICROSOFT_TRANSCRIPTS_CLIENT_ID`/`_SECRET`), nunca no front.
   Custo aceito: o app do login passou a ter segredo e permissões de aplicativo; girar o segredo
   e revisar as permissões dele é agora tarefa de quem cuida do login também.
6. **Gravar e transcrever automaticamente** continua sendo ligado pelo navegador, com escopo
   delegado (`OnlineMeetings.ReadWrite`, pedido só no uso), ao criar a reunião.
6a. **Idioma falado sempre pt-BR** (22/10, Italo: "é sempre pt"). O Teams não detecta o idioma:
   transcreve no idioma configurado na reunião, que vem inglês. No teste de 22/10 a fala em
   português chegou como inglês sem sentido. Toda reunião do Teams criada pela Agenda do Pulse,
   e toda reunião vinculada por "Vincular a um projeto", recebe `meetingSpokenLanguageTag:
   'pt-BR'` (`prepareOnlineMeeting`). Só vale antes de a reunião começar; reunião criada fora do
   Pulse depende de quem organiza escolher o idioma no Teams.
7. Quem vinculou recebe aviso no sino quando a transcrição chega. **"Buscar transcrições
   agora"** (22/10, pedido do Italo) faz na hora o que o cron faz, só para as reuniões do
   projeto aberto: a mesma `teams-transcripts-sync` aceita a sessão de quem passa em
   `can_request_meeting_transcription` naquele projeto. Não apressa a Microsoft, que publica
   a transcrição alguns minutos depois do fim; só dispensa esperar o cron.
7b. **Resumo e notas pela equipe** (22/10, Italo: "o pessoal pode gerar com a IA deles e
   subir"). O Pulse não resume: cada reunião transcrita tem um resumo (`summary`) que quem pode
   pedir transcrição cola ou importa de um .md/.txt — gerado na IA de cada um — e a reunião
   vinculada sem transcrição tem notas (`notes`: pauta antes, ata manual depois). Quem e quando
   escreveu são carimbados por trigger. A tela vira uma linha do tempo por dia, com filtros
   (Transcritas, Sem resumo, Pendentes), participantes e prévia no cartão, busca no título, no
   texto e no resumo, e o "Transcrever gravação" (plano B) só aparece com
   `VITE_TRANSCRIPTION_WORKER_ENABLED=true` — sem o worker no ar, enfileirava trabalho que nunca
   andava. Migration `20261022140000`.
7a. Na tela, a transcrição do Teams mostra o **nome real** de quem falou (o "Voz 1" é só da
   gravação enviada, que não sabe nomes) e a **hora do relógio** de cada fala — início da
   transcrição (`createdDateTime`) mais o deslocamento do VTT.
8. **A aba Reuniões lista as reuniões vinculadas, não só as transcrições** (22/10, pedido do
   Italo: "dessa forma parece que não teve reunião"). Cada uma mostra a situação — Agendada,
   Aguardando transcrição (até 40 min depois do fim), Transcrita (com as ocorrências embaixo),
   Sem transcrição, Com problema — a partir do horário guardado no vínculo
   (`starts_at`/`ends_at`/`is_series`, migration `20261022120000`). Numa série, só as
   ocorrências que foram transcritas aparecem: o servidor não lê a agenda.

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

1. ~~Criar o app, dar consentimento de admin e conceder a policy~~ — feito em 22/10: segredo,
   permissão de aplicativo com consentimento (token com `OnlineMeetingTranscript.Read.All`
   conferido), política do Teams. A primeira sincronização devolveu
   `GraphAccessToTranscriptsDisabled`: o "acesso do Microsoft Graph às transcrições" vem
   **desligado por padrão** no Teams Admin Center; ligado, valeu em ~2 minutos.
2. ~~Reunião de teste com fala~~ — 22/10 07:58: "Teste gravacao" importada sozinha, com o nome
   de quem falou, na primeira sincronização depois de o acesso liberar.
3. ~~`recordAutomatically` liga também a transcrição?~~ — no teste de 22/10 a reunião gravada
   automaticamente "conforme a configuração do organizador" saiu com Transcrição no Recap.
