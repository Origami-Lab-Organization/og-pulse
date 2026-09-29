# Worker de transcrição de reuniões

Transcreve gravações de reunião do Teams com [WhisperX](https://github.com/m-bain/whisperX)
e devolve o texto para o Pulse. Roda **na VM**, fora do Supabase.

Decisão e motivos: [`.harness/adr/0039`](../../.harness/adr/0039-transcricao-de-reuniao-em-worker-proprio-sem-permissao-de-aplicacao.md).

## Como ele se encaixa

```
Pulse (navegador)          Supabase                     esta VM
─────────────────          ────────                     ───────
resolve a URL
pré-autenticada  ──POST──▶ transcription-enqueue
                           ├─ meeting_transcriptions (fila, RLS)
                           └─ meeting_transcription_sources (URL, sem policy)
                                                          │
                                                   puxa ◀─┘
                                                   baixa da Microsoft
                                                   transcreve
                           meeting_transcriptions ◀── grava texto
```

**Ninguém chama esta VM.** Ela puxa da fila e só faz conexão de saída — não precisa de
domínio, TLS, porta aberta nem firewall novo. VM parada significa fila esperando, não erro
na tela de quem pediu.

**Esta VM não tem credencial da Microsoft.** Ela recebe uma URL pré-autenticada de validade
curta, resolvida pelo navegador de quem pediu a transcrição. É isso que evita dar ao Pulse
permissão de aplicação sobre os arquivos de toda a empresa.

## Instalação (Ubuntu)

```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv ffmpeg   # ffmpeg é obrigatório
git clone <repo> && cd og-pulse/apps/transcription-worker
python3.11 -m venv .venv && source .venv/bin/activate

# COM GPU NVIDIA: instale o torch com CUDA ANTES do resto, senão vem a build de CPU
# e o worker roda lento sem avisar.
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

pip install -r requirements.txt
cp .env.example .env    # preencha; chmod 600 .env
```

### Token do Hugging Face (separação de vozes)

O pyannote é *gated*: sem token e sem aceitar os termos, o worker transcreve mas **não**
separa quem falou.

1. Conta em huggingface.co e um token de leitura.
2. Aceitar os termos em `pyannote/speaker-diarization-3.1` e `pyannote/segmentation-3.0`.
3. `HF_TOKEN=` no `.env`.

O token fica na VM. Nunca no repositório.

## Rodar

```bash
set -a && source .env && set +a && python worker.py
```

Como serviço (`/etc/systemd/system/pulse-transcription.service`):

```ini
[Unit]
Description=Pulse — worker de transcrição
After=network-online.target

[Service]
Type=simple
User=pulse
WorkingDirectory=/opt/og-pulse/apps/transcription-worker
EnvironmentFile=/opt/og-pulse/apps/transcription-worker/.env
ExecStart=/opt/og-pulse/apps/transcription-worker/.venv/bin/python worker.py
Restart=always
RestartSec=30
# SIGTERM encerra depois do job atual, sem deixar 'processando' órfão.
KillSignal=SIGTERM
TimeoutStopSec=3600

[Install]
WantedBy=multi-user.target
```

## O que esperar de tempo

Depende de GPU. Ordem de grandeza para **uma hora de áudio**, com `large-v3`:

| Máquina | Transcrição + diarização |
|---|---|
| GPU NVIDIA recente (float16) | poucos minutos |
| CPU moderna, `int8` | de meia hora para cima |

Nos dois casos o trabalho é assíncrono e ninguém fica esperando na tela. O que muda é o
que a tela promete: "em instantes" ou "avisamos quando ficar pronto".

**Memória:** `large-v3` em float16 quer ~10 GB de VRAM; a diarização soma alguns GB. Se
não couber, use `WHISPER_COMPUTE_TYPE=int8` ou `WHISPER_MODEL=medium`.

## Operação

```sql
-- Fila e estado
SELECT status, count(*) FROM meeting_transcriptions GROUP BY 1;

-- Job preso: 'processando' há muito tempo, com o nome da máquina que pegou
SELECT id, claimed_by, claimed_at, attempts, last_error
FROM meeting_transcriptions
WHERE status = 'processando' AND claimed_at < now() - interval '3 hours';
```

**Fila crescendo em silêncio é o modo de falha desta peça.** Se o worker morre, ninguém
recebe erro — a transcrição só não chega. Alerta sobre `status = 'pendente'` mais velho que
algumas horas é o que transforma isso em sintoma visível.

## O que este worker NÃO faz

- **Não sobe arquivo para o OneDrive.** Ele não tem credencial do Graph. A cópia na pasta
  do projeto é publicada pelo navegador de quem tem o token delegado (ADR-0039).
- **Não sabe o nome de quem falou.** Entrega `SPEAKER_00`, `SPEAKER_01`. Ligar voz a
  pessoa é confirmação na tela — inferir produziria registro errado com cara de oficial.
- **Não decide de qual projeto é a reunião.** Isso vem do vínculo do rito (ADR-0011) ou de
  escolha confirmada por gente.
