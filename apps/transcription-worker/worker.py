"""Worker de transcrição de reuniões — roda na VM, fora do Supabase (ADR-0039).

Ciclo: pega um job pendente, baixa a gravação pela URL pré-autenticada, transcreve com
WhisperX, grava o texto de volta no Postgres.

Três regras que não são detalhe de implementação:

  * NINGUÉM CHAMA ESTE PROCESSO. Ele puxa da fila. A VM não expõe porta, o que dispensa
    domínio, TLS e firewall — e faz VM fora do ar virar trabalho esperando, não erro na
    cara de quem pediu.

  * ESTE PROCESSO NÃO TEM CREDENCIAL DO MICROSOFT GRAPH, e não deve ganhar uma. O que ele
    recebe é uma URL pré-autenticada de validade curta, resolvida pelo navegador de quem
    pediu. É isso que evita permissão de aplicação no tenant inteiro.

  * A URL NUNCA VAI PARA LOG. Quem a tem baixa a gravação. Ela é apagada assim que o job
    chega a estado final.

Configuração, toda por variável de ambiente — ver .env.example.
"""

from __future__ import annotations

import logging
import os
import signal
import socket
import sys
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import requests
from supabase import Client, create_client

log = logging.getLogger("transcription-worker")

TABELA = "meeting_transcriptions"
TABELA_ORIGEM = "meeting_transcription_sources"

# Gravação de reunião longa passa fácil de 1 GB; acima disto é sinal de arquivo errado.
TAMANHO_MAXIMO_BYTES = int(os.getenv("MAX_RECORDING_BYTES", str(8 * 1024**3)))


@dataclass(frozen=True)
class Config:
    supabase_url: str
    service_key: str
    modelo: str
    device: str
    compute_type: str
    hf_token: str | None
    intervalo: int
    tentativas_maximas: int
    nome: str

    @staticmethod
    def do_ambiente() -> "Config":
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise SystemExit("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.")

        device = os.getenv("WHISPER_DEVICE") or _device_disponivel()
        # float16 só faz sentido em GPU; em CPU o ganho vem de int8.
        padrao_compute = "float16" if device == "cuda" else "int8"

        return Config(
            supabase_url=url,
            service_key=key,
            modelo=os.getenv("WHISPER_MODEL", "large-v3"),
            device=device,
            compute_type=os.getenv("WHISPER_COMPUTE_TYPE", padrao_compute),
            hf_token=os.getenv("HF_TOKEN") or None,
            intervalo=int(os.getenv("POLL_INTERVAL_SECONDS", "30")),
            tentativas_maximas=int(os.getenv("MAX_ATTEMPTS", "3")),
            nome=os.getenv("WORKER_NAME", socket.gethostname()),
        )


def _device_disponivel() -> str:
    try:
        import torch  # noqa: PLC0415 — import caro, só quando não veio por env

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


# ─── Fila ────────────────────────────────────────────────────────────────────


def pegar_job(db: Client, cfg: Config) -> dict | None:
    """Marca um pendente como 'processando' e devolve a linha.

    O UPDATE filtra por status: se dois workers disputarem o mesmo job, só um encontra a
    linha ainda pendente. Não precisa de lock explícito nem de RPC.
    """
    pendentes = (
        db.table(TABELA)
        .select("id, attempts, event_subject")
        .eq("status", "pendente")
        .order("created_at")
        .limit(1)
        .execute()
    )
    if not pendentes.data:
        return None

    candidato = pendentes.data[0]
    tomado = (
        db.table(TABELA)
        .update(
            {
                "status": "processando",
                "claimed_by": cfg.nome,
                "claimed_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", candidato["id"])
        .eq("status", "pendente")
        .execute()
    )
    return tomado.data[0] if tomado.data else None


def origem_do_job(db: Client, job_id: str) -> tuple[str, datetime] | None:
    """URL e validade. Fora daqui, a URL não circula."""
    resposta = (
        db.table(TABELA_ORIGEM)
        .select("download_url, expires_at")
        .eq("transcription_id", job_id)
        .maybe_single()
        .execute()
    )
    if not resposta or not resposta.data:
        return None

    expira = datetime.fromisoformat(resposta.data["expires_at"].replace("Z", "+00:00"))
    return resposta.data["download_url"], expira


def concluir(db: Client, job_id: str, dados: dict) -> None:
    db.table(TABELA).update(
        {**dados, "status": "concluida", "finished_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", job_id).execute()
    _descartar_origem(db, job_id)


def falhar(db: Client, job: dict, cfg: Config, motivo: str) -> None:
    """Devolve para a fila enquanto houver tentativa; depois disso, estado final.

    `motivo` é mensagem curta e nossa — nunca o corpo da resposta da Microsoft, que pode
    trazer a URL assinada de volta.
    """
    tentativas = int(job.get("attempts", 0)) + 1
    esgotou = tentativas >= cfg.tentativas_maximas

    db.table(TABELA).update(
        {
            "status": "falhou" if esgotou else "pendente",
            "attempts": tentativas,
            "last_error": motivo[:500],
            "claimed_by": None,
            "claimed_at": None,
            "finished_at": datetime.now(timezone.utc).isoformat() if esgotou else None,
        }
    ).eq("id", job["id"]).execute()

    if esgotou:
        _descartar_origem(db, job["id"])


def _descartar_origem(db: Client, job_id: str) -> None:
    """Segredo vive o tempo do trabalho, não mais que isso."""
    try:
        db.table(TABELA_ORIGEM).delete().eq("transcription_id", job_id).execute()
    except Exception:
        log.warning("não foi possível descartar a origem do job %s", job_id)


# ─── Download ────────────────────────────────────────────────────────────────


def baixar(url: str, destino: Path) -> int:
    """Baixa em streaming. A URL já carrega a autorização — nenhum header nosso."""
    with requests.get(url, stream=True, timeout=(30, 600)) as resposta:
        resposta.raise_for_status()

        total = 0
        with destino.open("wb") as arquivo:
            for pedaco in resposta.iter_content(chunk_size=1024 * 1024):
                total += len(pedaco)
                if total > TAMANHO_MAXIMO_BYTES:
                    raise ValueError("Gravação maior que o limite aceito pelo worker.")
                arquivo.write(pedaco)
        return total


# ─── Transcrição ─────────────────────────────────────────────────────────────


class Transcritor:
    """Carrega o modelo uma vez e reaproveita entre jobs — a carga leva minutos."""

    def __init__(self, cfg: Config) -> None:
        import whisperx  # noqa: PLC0415 — dependência pesada, só no processo real

        self._whisperx = whisperx
        self._cfg = cfg
        log.info("carregando %s em %s (%s)", cfg.modelo, cfg.device, cfg.compute_type)
        self._modelo = whisperx.load_model(cfg.modelo, cfg.device, compute_type=cfg.compute_type)
        self._alinhadores: dict[str, tuple] = {}
        self._diarizador = None

    def transcrever(self, caminho: Path) -> dict:
        wx = self._whisperx
        audio = wx.load_audio(str(caminho))

        bruto = self._modelo.transcribe(audio, batch_size=int(os.getenv("BATCH_SIZE", "8")))
        idioma = bruto.get("language", "pt")

        alinhado = self._alinhar(audio, bruto["segments"], idioma)
        segmentos = self._separar_vozes(audio, alinhado)

        return {
            "language": idioma,
            "duration_seconds": int(len(audio) / 16000),
            "segments": segmentos,
            "transcript_text": formatar_texto(segmentos),
        }

    def _alinhar(self, audio, segmentos: list, idioma: str) -> dict:
        """Timestamp por palavra. Sem isto a separação de vozes erra as bordas da fala."""
        wx = self._whisperx
        if idioma not in self._alinhadores:
            self._alinhadores[idioma] = wx.load_align_model(
                language_code=idioma, device=self._cfg.device
            )
        modelo, metadados = self._alinhadores[idioma]
        return wx.align(segmentos, modelo, metadados, audio, self._cfg.device)

    def _separar_vozes(self, audio, alinhado: dict) -> list[dict]:
        """Diarização. Sem token do Hugging Face, entrega o texto sem rótulo de voz."""
        if not self._cfg.hf_token:
            return [_segmento(s, None) for s in alinhado["segments"]]

        if self._diarizador is None:
            self._diarizador = _carregar_diarizador(
                self._whisperx, self._cfg.hf_token, self._cfg.device
            )

        vozes = self._diarizador(audio)
        com_voz = self._whisperx.assign_word_speakers(vozes, alinhado)
        return [_segmento(s, s.get("speaker")) for s in com_voz["segments"]]


def _carregar_diarizador(whisperx_mod, token: str, device: str):
    """O caminho da classe mudou de lugar entre versões do WhisperX."""
    try:
        return whisperx_mod.diarize.DiarizationPipeline(use_auth_token=token, device=device)
    except AttributeError:
        return whisperx_mod.DiarizationPipeline(use_auth_token=token, device=device)


def _segmento(bruto: dict, voz: str | None) -> dict:
    return {
        "start": round(float(bruto.get("start", 0)), 2),
        "end": round(float(bruto.get("end", 0)), 2),
        "speaker": voz,
        "text": (bruto.get("text") or "").strip(),
    }


def formatar_texto(segmentos: list[dict]) -> str:
    """Texto corrido, agrupando falas seguidas da mesma voz.

    O rótulo é SPEAKER_00, não o nome da pessoa: quem liga voz a nome é quem participou
    da reunião, pela tela (ADR-0039).
    """
    linhas: list[str] = []
    voz_anterior = object()

    for seg in segmentos:
        if not seg["text"]:
            continue
        if seg["speaker"] != voz_anterior:
            rotulo = seg["speaker"] or "Fala"
            linhas.append(f"\n[{_tempo(seg['start'])}] {rotulo}:")
            voz_anterior = seg["speaker"]
        linhas.append(seg["text"])

    return " ".join(linhas).replace("\n ", "\n").strip()


def _tempo(segundos: float) -> str:
    total = int(segundos)
    return f"{total // 3600:02d}:{(total % 3600) // 60:02d}:{total % 60:02d}"


# ─── Loop ────────────────────────────────────────────────────────────────────


def processar(db: Client, cfg: Config, transcritor: Transcritor, job: dict) -> None:
    origem = origem_do_job(db, job["id"])
    if origem is None:
        falhar(db, job, cfg, "Endereço da gravação não encontrado.")
        return

    url, expira_em = origem
    if expira_em <= datetime.now(timezone.utc):
        # Não adianta tentar de novo: só quem tem o token do Graph gera outra URL.
        falhar(db, job, cfg, "O endereço da gravação expirou. Peça a transcrição de novo.")
        return

    with tempfile.TemporaryDirectory() as pasta:
        destino = Path(pasta) / "gravacao"
        tamanho = baixar(url, destino)
        log.info("job %s: %.1f MB baixados", job["id"], tamanho / 1024**2)

        resultado = transcritor.transcrever(destino)

    concluir(db, job["id"], resultado)
    log.info("job %s: concluído (%s s de áudio)", job["id"], resultado["duration_seconds"])


def main() -> int:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    cfg = Config.do_ambiente()
    db = create_client(cfg.supabase_url, cfg.service_key)
    transcritor = Transcritor(cfg)

    parar = False

    def encerrar(*_):
        nonlocal parar
        parar = True
        log.info("encerrando depois do job atual")

    signal.signal(signal.SIGTERM, encerrar)
    signal.signal(signal.SIGINT, encerrar)

    log.info("worker %s pronto", cfg.nome)

    while not parar:
        try:
            job = pegar_job(db, cfg)
        except Exception as erro:
            log.error("fila inacessível: %s", type(erro).__name__)
            time.sleep(cfg.intervalo)
            continue

        if job is None:
            time.sleep(cfg.intervalo)
            continue

        log.info("job %s: %s", job["id"], job.get("event_subject", "")[:60])
        try:
            processar(db, cfg, transcritor, job)
        except Exception as erro:
            # Mensagem curta e nossa: o texto do erro pode conter a URL assinada.
            log.error("job %s falhou: %s", job["id"], type(erro).__name__)
            falhar(db, job, cfg, f"Falha ao transcrever ({type(erro).__name__}).")

    return 0


if __name__ == "__main__":
    sys.exit(main())
