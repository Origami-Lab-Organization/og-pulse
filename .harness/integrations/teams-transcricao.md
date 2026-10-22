# Integracao: Transcricao de reuniao do Teams (Microsoft Graph, permissao de aplicacao)

- Status: **funcionando desde 22/10/2026 07:58** — primeira transcricao importada sozinha
  ("Teste gravacao", com o nome de quem falou). O acesso do Graph levou ~2 minutos para valer
  depois de ligado no Teams Admin Center.
- Decisao: ADR-0052. Plano B por gravacao + WhisperX: ADR-0039.
- Codigo: `supabase/functions/teams-meeting-register`, `supabase/functions/teams-transcripts-sync`,
  `supabase/functions/_shared/transcricaoTeams.ts`, `supabase/functions/_shared/identidadeEntra.ts`,
  migration `20261021200000_meeting_transcriptions.sql` (tabela `project_online_meetings` e cron).

## Fluxo

1. Agenda: reuniao do Teams criada com um projeto escolhido (ou "Vincular a um projeto" numa
   reuniao que a pessoa organizou). O navegador acha o `onlineMeeting.id` pelo link de entrada
   (`/me/onlineMeetings?$filter=JoinWebUrl eq ...`, escopo delegado `OnlineMeetings.ReadWrite`),
   liga `recordAutomatically` se pedido, e chama `teams-meeting-register` com o id token do Entra.
2. `teams-meeting-register` valida o id token (JWKS, `aud` = `MICROSOFT_CLIENT_ID`, `iss`/`tid` =
   `MICROSOFT_TENANT_ID`), exige e-mail do token = e-mail do funcionario logado e
   `can_request_meeting_transcription`, e grava `project_online_meetings` com
   `organizer_entra_id` = `oid` do token.
3. Cron `teams-transcripts-sync-10min` (minuto 3, 13, 23...) chama `teams-transcripts-sync` com a
   chave de servico. Ela pega token do app (client credentials), lista
   `GET /users/{oid}/onlineMeetings/getAllTranscripts(meetingOrganizerUserId='{oid}',startDateTime=<agora-3d>)`
   de cada organizador, e para cada transcricao de reuniao vinculada ainda nao importada baixa
   `transcriptContentUrl` (`Accept: text/vtt`; se o tenant proibir atribuicao de voz, repete com
   `application/vnd.microsoft.graph.transcript+text`) e grava em `meeting_transcriptions` com
   `source = 'teams'`, `status = 'concluida'`.
4. Trigger avisa no sino quem vinculou. A tela mostra a ultima verificacao ou o erro, em
   `project_online_meetings.last_checked_at` / `last_error`.

Limites por chamada: 5 paginas por organizador, 15 transcricoes importadas, 20 s por requisicao
ao Graph. O que sobrar entra na proxima rodada.

## Configuracao (admin do Microsoft 365 + quem publica as Edge Functions)

1. **App no Entra**: em producao e o proprio app do login, "Origami Pulse"
   (`53d51c7c-a706-4c82-ba99-63192a93202f`, ADR-0052 item 5).
   - Permissao **de aplicativo** (nao "delegada") `OnlineMeetingTranscript.Read.All` e
     **consentimento de admin**. Conferir pelo token: `roles` precisa trazer a permissao.
   - Client secret proprio ("Pulse — Transcricoes (Supabase)", criado em 22/10/2026, 24 meses).
     Vencido, a sincronizacao para e todo cartao mostra "nao conseguiu se autenticar".
   - **Cuidado ao consentir**: "Conceder consentimento do administrador" pela tela de Permissoes
     de APIs pode REVOGAR o que estava concedido para o tenant e nao esta na lista configurada.
     Em 22/10 isso derrubou `Files.ReadWrite.All`, `OnlineMeetings.ReadWrite`, `offline_access`,
     `openid`, `profile` (usados pelo login e pelo OneDrive) e foi preciso adiciona-las a lista e
     consentir de novo. A lista configurada precisa ter TUDO que o app usa.
2. **Application access policy** (PowerShell do Teams, `Connect-MicrosoftTeams`):
   ```powershell
   New-CsApplicationAccessPolicy -Identity Pulse-Transcricoes -AppIds "<client id do app>" -Description "Pulse traz transcricao de reuniao de projeto"
   # Recomendado: por usuario, para quem organiza reuniao de projeto (object id do Entra)
   Grant-CsApplicationAccessPolicy -PolicyName Pulse-Transcricoes -Identity "<object id>"
   # Alternativa ampla (o app passa a poder ler a transcricao de qualquer reuniao do tenant):
   # Grant-CsApplicationAccessPolicy -PolicyName Pulse-Transcricoes -Global
   ```
   Leva ate 30 minutos para valer no Graph.
3. **Teams Admin Center** → Reunioes → Configuracoes de reuniao → **Acesso a API de transcricao**:
   ligar **Acesso ao Microsoft Graph** e, em Configurar, **Incluir atribuicao do locutor**. As
   duas vem DESLIGADAS por padrao; sem a primeira, todo app recebe 403
   `GraphAccessToTranscriptsDisabled`, com qualquer permissao. Equivalente em PowerShell:
   `Set-CsTeamsMeetingConfiguration -EnableGraphTranscriptAccess $true -EnableAttributedTranscripts $true -Identity Global`.
   A transcricao em si tambem precisa estar liberada na politica de reuniao.
4. **Secrets das Edge Functions** (projeto de producao): `MICROSOFT_TRANSCRIPTS_CLIENT_ID`,
   `MICROSOFT_TRANSCRIPTS_CLIENT_SECRET`. `MICROSOFT_TENANT_ID` e `MICROSOFT_CLIENT_ID` ja
   existem (do `microsoft-sso`). Sem os dois novos, a sincronizacao responde
   `{"situacao":"nao_configurado"}` e nao faz nada.
5. **Publicar** `teams-meeting-register`, `teams-transcripts-sync` e `transcription-enqueue`.

## Erros e o que a tela mostra

| Graph | `last_error` (tela) |
|---|---|
| 403 "No application access policy found for this app" | Microsoft 365 ainda nao liberou o Pulse para ler as reunioes deste organizador |
| 403 `GraphAccessToTranscriptsDisabled` | Acesso as transcricoes desligado no Teams da empresa |
| falha no token do app (segredo vencido, consentimento ausente) | O Pulse nao conseguiu se autenticar na Microsoft |
| qualquer outro | Nao foi possivel consultar agora; tenta de novo em 10 minutos |
| 403 `SpeakerAttributionNotAllowed` no conteudo | nao e erro: importa sem nomes |

## Quirks

- `getAllTranscripts` exige `meetingOrganizerUserId` (object id), nao aceita so o filtro de data.
- Numa serie recorrente, o `onlineMeeting.id` e o mesmo para todas as ocorrencias: uma
  vinculacao traz a transcricao de cada ocorrencia, cada uma com seu `callTranscript.id`.
- Reuniao criada pela API `onlineMeetings` sem evento de calendario nao tem transcricao pela API
  — as do Pulse nascem de evento (`/me/events`), entao valem.
- A reuniao expira 60 dias depois da ultima ocorrencia; depois disso a transcricao nao e lida.
- Deslocamento negativo no VTT (transcricao comecou com a conversa andando) vira 0.
- **Idioma**: o Teams transcreve no `meetingSpokenLanguageTag` da reuniao (padrao en-US), sem
  detectar nem traduzir. Fala em portugues numa reuniao en-US vira ingles sem sentido. O Pulse
  grava `pt-BR` ao criar ou vincular a reuniao (PATCH `/me/onlineMeetings/{id}`, delegado);
  so vale antes do inicio. Transcricao que ja saiu errada nao tem conserto pela API.

## Verificacao pendente

Nada foi exercitado contra o Graph real com permissao de aplicacao. Ver ADR-0052.
