import * as amplitude from '@amplitude/analytics-browser';
import { sessionReplayPlugin } from '@amplitude/plugin-session-replay-browser';
import { hasStoredSession } from '@/lib/session';

/**
 * Um analytics (Amplitude), dois modos (PUL-239, ADR-0030):
 *
 *  - **Vitrine**, para quem não está logado: instância própria, sem cookie nem storage
 *    de identidade, sem IP, sem session replay, só páginas vistas e atribuição
 *    (referrer/UTM). É o que mede a home, o cadastro e de onde a visita veio
 *    (Google, chatgpt.com, perplexity.ai…), sem banner de consentimento.
 *  - **Produto**, depois que existe funcionário ativo na sessão: a instância padrão, como
 *    sempre foi (autocapture completo e session replay), herdando o device id da vitrine
 *    para a visita e o uso ficarem na mesma linha do tempo quando acontecem no mesmo
 *    carregamento.
 *
 * Visitante da vitrine nunca é gravado em replay; a área logada nunca entra na vitrine.
 */

/** Chave pública de browser do projeto no Amplitude (não é segredo; identifica o projeto, não autoriza leitura). */
const AMPLITUDE_API_KEY = '62311ec50b18fbe85ef567acf268171c';
const VISITOR_INSTANCE = 'vitrine';

type BrowserClient = ReturnType<typeof amplitude.createInstance>;

let visitor: BrowserClient | null = null;
let productStarted = false;

/** Modo vitrine. Não liga quando já existe sessão guardada: quem recarregou a área logada não é visitante. */
export function startVisitorAnalytics(): void {
  if (visitor || hasStoredSession()) return;
  visitor = amplitude.createInstance();
  visitor.init(AMPLITUDE_API_KEY, {
    instanceName: VISITOR_INSTANCE,
    identityStorage: 'none',
    trackingOptions: { ipAddress: false },
    autocapture: {
      pageViews: true,
      attribution: true,
      sessions: false,
      formInteractions: false,
      fileDownloads: false,
      elementInteractions: false,
    },
  });
}

/** Modo produto, uma vez por carga de página, na primeira sessão com funcionário ativo. A vitrine cala. */
export function startProductAnalytics(): void {
  visitor?.setOptOut(true);
  if (productStarted) {
    amplitude.setOptOut(false);
    return;
  }
  productStarted = true;
  amplitude.add(sessionReplayPlugin({ sampleRate: 1 }));
  amplitude.init(AMPLITUDE_API_KEY, { autocapture: true, deviceId: visitor?.getDeviceId() });
}

/** Ao sair, o produto para de coletar e a pessoa volta a ser visitante. */
export function stopProductAnalytics(): void {
  if (productStarted) amplitude.setOptOut(true);
  visitor?.setOptOut(false);
}
