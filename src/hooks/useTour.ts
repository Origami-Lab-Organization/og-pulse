import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { stepsForCapabilities } from '@/lib/tour';
import type { TourStep } from '@/types/tour';

/**
 * Estado do tour guiado (PUL-251).
 *
 * **Consulta própria e falha tolerada**, pelas duas razões que já custaram caro aqui:
 *
 * - pedir `tour_seen_at` no select da sessão derrubaria o login de todo mundo enquanto a
 *   migration não estivesse aplicada — foi exatamente o que aconteceu com o guia do dono, e
 *   o comentário em `AuthContext` registra o incidente;
 * - erro, coluna ausente ou rede caída viram "já viu". Um acessório nunca deve abrir um
 *   overlay por cima de quem está trabalhando só porque não conseguiu confirmar nada.
 *
 * Os passos vêm filtrados pelas capacidades da sessão: cada perfil recebe o tour do tamanho
 * da sua realidade, sem ouvir falar de tela que não pode abrir.
 *
 * **Abrir e persistir são independentes.** O estado local do React Query manda no que a tela
 * faz agora; a RPC só registra para valer no outro dispositivo. Então "rever o tour" abre na
 * hora mesmo que a gravação falhe — e se falhar, o aviso diz que vale só nesta sessão em vez
 * de o clique não fazer nada, que foi o defeito da primeira versão.
 *
 * A abertura AUTOMÁTICA continua dependendo do banco de propósito: sem a coluna, `fetchSeen`
 * responde "já viu" e ninguém é apresentado à casa em que já mora.
 */

interface UseTourResult {
  /** Os passos desta pessoa, já recortados pelo perfil. */
  steps: readonly TourStep[];
  /** Abre o tour agora: nunca viu, e há passo para mostrar. */
  shouldOpen: boolean;
  isLoading: boolean;
  /** Marca como visto — serve para concluir e para pular, que dão no mesmo. */
  complete: () => void;
  /** Apaga a marca para ver de novo. Vem da Central de Ajuda. */
  restart: () => void;
}

const TOUR_KEY = 'tour-seen';

/** As duas escritas possíveis no estado do tour. */
const TourMark = { COMPLETE: 'complete', RESTART: 'restart' } as const;
type TourMark = (typeof TourMark)[keyof typeof TourMark];

/** Sem o genérico do schema: a coluna e as RPC nasceram nesta entrega. */
const db = supabase as unknown as SupabaseClient;

async function fetchSeen(employeeId: string): Promise<boolean> {
  const { data, error } = await db
    .from('employees')
    .select('tour_seen_at')
    .eq('id', employeeId)
    .maybeSingle();
  if (error || !data) return true;
  return !!(data as { tour_seen_at: string | null }).tour_seen_at;
}

export function useTour(): UseTourResult {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const employeeId = employee?.id;


  const seenQuery = useQuery({
    queryKey: [TOUR_KEY, employeeId],
    enabled: !!employeeId,
    queryFn: () => fetchSeen(employeeId as string),
  });

  // O `?? []` fica dentro do memo: fora dele, cria array novo a cada render e refaz o
  // recorte sem necessidade.
  const steps = useMemo(() => stepsForCapabilities(employee?.capabilities ?? []), [employee?.capabilities]);

  const mark = useMutation({
    mutationFn: async (mark: TourMark) => {
      const { error } = await db.rpc(mark === TourMark.COMPLETE ? 'complete_tour' : 'restart_tour');
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TOUR_KEY] }),
    onError: (error: Error, mark) =>
      toast({
        title: 'O tour abriu, mas não foi possível registrar',
        description:
          mark === TourMark.RESTART
            ? `Vale só nesta sessão: ao recarregar, volta ao estado anterior. ${error.message}`
            : `Ele pode aparecer de novo na próxima entrada. ${error.message}`,
        variant: 'destructive',
      }),
  });

  /**
   * Muda o estado local ANTES de tentar gravar. É o que faz o botão responder na hora,
   * independente de a RPC existir no banco.
   */
  const setSeenLocally = (seen: boolean) => queryClient.setQueryData([TOUR_KEY, employeeId], seen);

  // Enquanto carrega, `seen` é `true`: o tour não pisca na tela de quem já viu.
  const seen = seenQuery.data ?? true;

  return {
    steps,
    // Só boas-vindas e fecho não apresentam nada: sem passo de tela no meio, não vale abrir
    // overlay. Acontece quando as capacidades vêm vazias.
    shouldOpen: !seen && !seenQuery.isLoading && steps.length > 2,
    isLoading: seenQuery.isLoading,
    complete: () => {
      setSeenLocally(true);
      mark.mutate(TourMark.COMPLETE);
    },
    restart: () => {
      setSeenLocally(false);
      mark.mutate(TourMark.RESTART);
    },
  };
}
