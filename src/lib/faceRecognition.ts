/**
 * Reconhecimento facial on-device via face-api.js (@vladmandic/face-api).
 * Roda inteiramente no navegador do colaborador — nenhuma foto ou descriptor
 * biométrico é enviado a serviço externo. Modelos carregados via CDN (jsdelivr)
 * para não versionar binários grandes no repositório (ver boundaries.md).
 */

// Versão pinada ao pacote instalado — evita incompatibilidade entre a lib e o formato dos pesos.
const FACE_API_VERSION = '1.7.15';
const MODEL_URL = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${FACE_API_VERSION}/model/`;

export const FACE_MATCH_THRESHOLD = 0.6;
export const CONSENT_VERSION = '2026-07-19-v1';

let modelsLoadedPromise: Promise<void> | null = null;
let faceApiModule: typeof import('@vladmandic/face-api') | null = null;

async function getFaceApi() {
  if (!faceApiModule) {
    faceApiModule = await import('@vladmandic/face-api');
  }
  return faceApiModule;
}

/** Carrega os modelos (uma única vez por sessão) — chamar antes de detectar/comparar. */
export function loadFaceModels(): Promise<void> {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = (async () => {
      const faceapi = await getFaceApi();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })().catch((error) => {
      modelsLoadedPromise = null; // permite tentar de novo numa próxima chamada
      throw error;
    });
  }
  return modelsLoadedPromise;
}

/** Detecta um único rosto na imagem/vídeo e devolve o descriptor (128 números) — ou null se não achou rosto. */
export async function computeFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<number[] | null> {
  const faceapi = await getFaceApi();
  await loadFaceModels();

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;
  return Array.from(detection.descriptor);
}

/** Distância euclidiana entre dois descriptors — quanto menor, mais parecido. */
export async function compareFaceDescriptors(a: number[], b: number[]): Promise<number> {
  const faceapi = await getFaceApi();
  return faceapi.euclideanDistance(a, b);
}
