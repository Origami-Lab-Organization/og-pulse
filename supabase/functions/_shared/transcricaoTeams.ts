// Transcrição do Teams (ADR-0052): o Graph entrega WebVTT, com o nome de quem falou na tag
// de voz. Aqui ela vira as mesmas falas que o worker do WhisperX grava, para a tela não
// distinguir a origem.
//
//   00:00:16.246 --> 00:00:17.726
//   <v Fulana de Tal>Isto é um teste.</v>

export interface Fala {
  start: number;
  end: number;
  speaker: string | null;
  text: string;
}

const TEMPO = /^(-?)(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/;
const VOZ = /<v(?:\.[^\s>]+)?\s+([^>]+)>/;
const TAG = /<[^>]+>/g;

/** "00:01:02.500" → 62.5. Deslocamento negativo (transcrição começou com a conversa andando) vira 0. */
export function segundos(tempo: string): number {
  const partes = TEMPO.exec(tempo.trim());
  if (!partes || partes[1] === "-") return 0;
  const [, , horas = "0", minutos, segs, milis = "0"] = partes;
  return Number(horas) * 3600 + Number(minutos) * 60 + Number(segs) + Number(milis.padEnd(3, "0")) / 1000;
}

function lerBloco(bloco: string): Fala | null {
  const linhas = bloco.split(/\r?\n/);
  const indice = linhas.findIndex((linha) => linha.includes("-->"));
  if (indice < 0) return null;

  const [inicio, fim] = linhas[indice].split("-->").map((parte) => parte.trim().split(/\s+/)[0]);
  const bruto = linhas.slice(indice + 1).join(" ");
  const text = bruto.replace(TAG, "").replace(/\s+/g, " ").trim();
  if (!text) return null;

  const speaker = VOZ.exec(bruto)?.[1]?.trim() || null;
  return { start: segundos(inicio), end: segundos(fim ?? inicio), speaker, text };
}

export function lerVtt(conteudo: string): Fala[] {
  return conteudo
    .split(/\r?\n\s*\r?\n/)
    .map(lerBloco)
    .filter((fala): fala is Fala => fala !== null);
}

function relogio(total: number): string {
  const s = Math.floor(total);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Texto corrido, agrupando falas seguidas da mesma voz — o mesmo formato do worker. */
export function textoCorrido(falas: Fala[]): string {
  const blocos: string[] = [];
  let anterior: string | null | undefined;
  for (const fala of falas) {
    if (fala.speaker !== anterior || blocos.length === 0) {
      blocos.push(`[${relogio(fala.start)}] ${fala.speaker ?? "Fala"}: ${fala.text}`);
      anterior = fala.speaker;
    } else {
      blocos[blocos.length - 1] += ` ${fala.text}`;
    }
  }
  return blocos.join("\n\n");
}

export function duracaoEmSegundos(falas: Fala[]): number | null {
  const fim = falas.reduce((maior, fala) => Math.max(maior, fala.end), 0);
  return fim > 0 ? Math.round(fim) : null;
}
