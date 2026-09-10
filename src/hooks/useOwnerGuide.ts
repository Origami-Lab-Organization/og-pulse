import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { buildOwnerGuideState, EMPTY_COUNTS } from '@/lib/ownerGuide';
import { fetchOwnerGuideCounts } from '@/services/ownerGuideService';
import type { OwnerGuideState } from '@/types/ownerGuide';

/**
 * Guia de primeiros passos do dono (PUL-250).
 *
 * Duas fontes, de naturezas diferentes:
 *
 * - **o progresso** vem do dado real (`fetchOwnerGuideCounts`) e nunca é gravado. Quem
 *   cadastra um cliente por qualquer caminho vê o passo fechar sozinho, e quem apaga tudo
 *   vê o passo reabrir. Não existe estado para dessincronizar;
 * - **dispensar** é preferência, e essa sim é gravada, no banco e não em localStorage,
 *   porque o dono abre o Pulse no computador e no celular.
 *
 * **Por que a preferência tem consulta própria, e não vem no select da sessão.** Ela já veio
 * de lá uma vez, e derrubou o login de todo mundo: a coluna ainda não existia no banco, o
 * PostgREST recusou a consulta inteira e o AuthContext concluiu que não havia funcionário
 * ativo. Uma feature não entregue trancou a base fora do sistema.
 *
 * Daí as duas regras aqui: a consulta é separada, e a falha dela é TOLERADA — erro ou coluna
 * ausente viram "dispensado", então o guia simplesmente não aparece. É a mesma escolha de
 * `useOnboarding`: na dúvida, o acessório se cala em vez de atrapalhar.
 */

interface UseOwnerGuideResult {
  state: OwnerGuideState;
  isLoading: boolean;
  /** Só mostra quando há passo pendente E a pessoa não dispensou. */
  visible: boolean;
  dismissed: boolean;
  /** Quem administra a empresa. Fora daqui, ninguém tem o que fazer com o guia. */
  isOwner: boolean;
  dismiss: () => void;
  restore: () => void;
}

interface UseOwnerGuideOptions {
  /**
   * Conta mesmo com o guia dispensado. A Central de Ajuda pede isso: é lá que a pessoa vai
   * quando quer o guia de volta, e para oferecer isso é preciso saber o que ainda falta. No
   * dock do canto fica desligado, senão seriam seis contagens por carga para quem já
   * dispensou e não vai ver nada.
   */
  alwaysCount?: boolean;
}

const OWNER_GUIDE_KEY = 'owner-guide-counts';
const OWNER_GUIDE_PREF_KEY = 'owner-guide-dismissed';

/** Sem o genérico do schema: a coluna pode não existir ainda, e aqui isso é caso previsto. */
const db = supabase as unknown as SupabaseClient;

async function fetchDismissed(employeeId: string): Promise<boolean> {
  const { data, error } = await db
    .from('employees')
    .select('owner_guide_dismissed_at')
    .eq('id', employeeId)
    .maybeSingle();
  // Migration pendente, coluna removida ou rede caída: o guia se cala.
  if (error || !data) return true;
  return !!(data as { owner_guide_dismissed_at: string | null }).owner_guide_dismissed_at;
}

/**
 * Só quem administra a empresa vê o guia. Um colaborador convidado não tem o que fazer com
 * "cadastre a primeira pessoa" — ele nem consegue, a RLS nega. Mesma capacidade que governa
 * o Portal do Admin (ADR-0027).
 */
const OWNER_CAPABILITY = 'configuracao:editar';

export function useOwnerGuide(options?: UseOwnerGuideOptions): UseOwnerGuideResult {
  const { employee, can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = employee?.tenant_id;
  const employeeId = employee?.id;
  const isOwner = can(OWNER_CAPABILITY);

  const prefQuery = useQuery({
    queryKey: [OWNER_GUIDE_PREF_KEY, employeeId],
    enabled: !!employeeId && isOwner,
    queryFn: () => fetchDismissed(employeeId as string),
  });
  // Enquanto não sabe, trata como dispensado: não pisca na tela de quem já dispensou.
  const dismissed = prefQuery.data ?? true;

  // Não consulta quem já dispensou: o guia não vai aparecer de qualquer forma, e são seis
  // contagens por carga do app.
  const countsQuery = useQuery({
    queryKey: [OWNER_GUIDE_KEY, tenantId],
    enabled: !!tenantId && isOwner && (!dismissed || !!options?.alwaysCount),
    queryFn: () => fetchOwnerGuideCounts(tenantId as string),
  });

  const setDismissed = useMutation({
    mutationFn: async (next: boolean) => {
      // Pelo `db`: as duas RPC nasceram nesta entrega e ainda não estão nos tipos gerados.
      const { error } = await db.rpc(next ? 'dismiss_owner_guide' : 'restore_owner_guide');
      if (error) throw error;
    },
    onSuccess: async (_data, next) => {
      await queryClient.invalidateQueries({ queryKey: [OWNER_GUIDE_PREF_KEY] });
      await queryClient.invalidateQueries({ queryKey: [OWNER_GUIDE_KEY] });
      // Dispensar sem dizer onde reencontrar é o mesmo que remover: o caminho de volta
      // existe e ninguém acha. O aviso é o que liga um ao outro.
      toast(
        next
          ? { title: 'Guia dispensado', description: 'Para trazer de volta, abra a Central de Ajuda.' }
          : { title: 'Guia reativado', description: 'Ele volta a acompanhar você no canto da tela.' },
      );
    },
    onError: (error: Error, next) =>
      toast({
        title: next ? 'Não foi possível dispensar o guia' : 'Não foi possível reativar o guia',
        description: error.message,
        variant: 'destructive',
      }),
  });

  const state = buildOwnerGuideState(countsQuery.data ?? EMPTY_COUNTS);

  return {
    state,
    isLoading: prefQuery.isLoading || countsQuery.isLoading,
    // Com os números ainda carregando, todos os passos parecem pendentes (EMPTY_COUNTS).
    // Esperar evita o guia piscar na tela de quem já montou a casa.
    visible:
      isOwner && !dismissed && !countsQuery.isLoading && !countsQuery.isError && !state.complete,
    dismissed,
    isOwner,
    dismiss: () => setDismissed.mutate(true),
    restore: () => setDismissed.mutate(false),
  };
}
