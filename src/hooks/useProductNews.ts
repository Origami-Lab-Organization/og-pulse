import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as amplitude from '@amplitude/analytics-browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CURRENT_PRODUCT_NEWS } from '@/content/productNews';
import { useAuth } from '@/contexts/AuthContext';
import { PRODUCT_NEWS_EVENT } from '@/lib/productNews.constants';
import { editionForViewer, isEligibleForEdition, secondsSince } from '@/lib/productNews';
import { productNewsService } from '@/services/productNewsService';
import type { ProductNewsAction, ProductNewsEdition, ProductNewsOrigin } from '@/types/productNews';

const NEWS_READ_KEY = 'product-news-read';

/**
 * A edição vigente, se esta pessoa ainda não viu (ADR-0048).
 *
 * Fechar responde na hora: o estado local muda antes de gravar, e a gravação que falhar só
 * faz o anúncio voltar na próxima entrada — nunca prende a pessoa nele.
 */
export function useProductNews() {
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const { version, publishedAt } = CURRENT_PRODUCT_NEWS;

  const edition = useMemo(
    () =>
      isEligibleForEdition(user?.created_at, publishedAt)
        ? editionForViewer(CURRENT_PRODUCT_NEWS, can)
        : null,
    [user?.created_at, publishedAt, can],
  );

  const readQuery = useQuery({
    queryKey: [NEWS_READ_KEY, userId, version],
    enabled: Boolean(userId && edition),
    staleTime: Infinity,
    queryFn: () => productNewsService.hasRead(userId as string, version),
  });

  const markRead = useCallback(() => {
    if (!userId) return;
    queryClient.setQueryData([NEWS_READ_KEY, userId, version], true);
    productNewsService.markRead(userId, version).catch((error: Error) => {
      console.error('[novidades] leitura não registrada; o anúncio pode voltar:', error.message);
    });
  }, [queryClient, userId, version]);

  return { edition: readQuery.data === false ? edition : null, markRead };
}

const OTHER_DIALOG = '[role="dialog"], [role="alertdialog"], [aria-modal="true"]';
/** Valor de `visibility` do CSS para elemento presente no DOM mas escondido. */
const CSS_VISIBILITY_HIDDEN = 'hidden';

function hasOtherDialogVisible(): boolean {
  return [...document.querySelectorAll<HTMLElement>(OTHER_DIALOG)].some(
    (element) =>
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== CSS_VISIBILITY_HIDDEN,
  );
}

/** Espera o app assentar antes de olhar: o tour e os diálogos da tela abrem logo após a carga. */
const SETTLE_MS = 400;

/**
 * Abre só quando a tela está livre: tour, guia ou qualquer diálogo aberto têm prioridade.
 * Fica observando e abre assim que o último deles fechar.
 */
export function useOpenWhenFree(ready: boolean): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    if (!ready) return;
    const tryOpen = () => {
      if (hasOtherDialogVisible()) return;
      observer.disconnect();
      setOpen(true);
    };
    const observer = new MutationObserver(tryOpen);
    const timer = setTimeout(() => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'hidden', 'class'],
      });
      tryOpen();
    }, SETTLE_MS);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [ready]);

  return open && ready;
}

/** Analytics nunca derruba a tela. Fora do modo produto (ADR-0030), o Amplitude não envia. */
function track(event: string, properties: Record<string, string | number>): void {
  try {
    amplitude.track(event, { formato: 'modal', ...properties });
  } catch {
    // sem rastreio, o anúncio segue funcionando
  }
}

/** Eventos do anúncio: exibido, tópico aberto e como a pessoa saiu. */
export function useProductNewsTracking(
  edition: ProductNewsEdition,
  open: boolean,
  origin: ProductNewsOrigin,
) {
  const startedAt = useRef(0);
  const openedTopics = useRef(new Set<string>());
  const { version } = edition;

  useEffect(() => {
    if (!open) return;
    startedAt.current = performance.now();
    openedTopics.current = new Set();
    track(PRODUCT_NEWS_EVENT.SHOWN, { novidade: version, origem: origin });
  }, [open, version, origin]);

  const openTopic = useCallback(
    (topic: string) => {
      openedTopics.current.add(topic);
      track(PRODUCT_NEWS_EVENT.TOPIC_OPENED, { novidade: version, origem: origin, topico: topic });
    },
    [version, origin],
  );

  const answer = useCallback(
    (action: ProductNewsAction) => {
      track(PRODUCT_NEWS_EVENT.ANSWERED, {
        novidade: version,
        origem: origin,
        acao: action,
        segundos: secondsSince(startedAt.current, performance.now()),
        topicos_abertos: openedTopics.current.size,
      });
    },
    [version, origin],
  );

  return { openTopic, answer };
}
