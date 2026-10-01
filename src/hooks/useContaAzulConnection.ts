import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { contaAzulService } from '@/services/contaAzulService';
import type { ContaAzulConnection } from '@/types/contaAzul';

const connectionKey = (tenantId: string | undefined) => ['conta-azul-connection', tenantId] as const;

const POLL_WHILE_SYNCING_MS = 5_000;
/** O pedido volta antes de a execução pegar a trava: a tela acompanha por este tempo mesmo assim. */
const OPTIMISTIC_SYNC_MS = 30_000;

export const isSyncing = (connection: ContaAzulConnection | null | undefined) =>
  Boolean(connection?.syncing_until && new Date(connection.syncing_until).getTime() > Date.now());

export function useContaAzulConnection() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: connectionKey(tenantId),
    queryFn: () => contaAzulService.getConnection(tenantId as string),
    enabled: Boolean(tenantId),
    refetchInterval: (query) => (isSyncing(query.state.data) ? POLL_WHILE_SYNCING_MS : false),
  });
}

function useTenantId(): () => string {
  const { employee } = useAuth();
  return () => {
    if (!employee?.tenant_id) throw new Error('Empresa não identificada na sessão.');
    return employee.tenant_id;
  };
}

/** Leva a pessoa para autorizar no Conta Azul. A volta cai em `/admin/integracoes/conta-azul/retorno`. */
export function useStartContaAzulConnection() {
  const { toast } = useToast();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: () => contaAzulService.startConnection(tenantId()),
    onSuccess: (url) => window.location.assign(url),
    onError: (error) =>
      toast({
        title: 'Não foi possível conectar',
        description: mensagemParaUsuario(error, 'Não foi possível começar a conexão com o Conta Azul.'),
        variant: 'destructive',
      }),
  });
}

export function useFinishContaAzulConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, state }: { code: string; state: string }) => contaAzulService.finishConnection(code, state),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conta-azul-connection'] }),
  });
}

export function useDisconnectContaAzul() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: () => contaAzulService.disconnect(tenantId()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conta-azul-connection'] });
      toast({ title: 'Conta Azul desconectado', description: 'A autorização foi revogada no Conta Azul.' });
    },
    onError: (error) =>
      toast({
        title: 'Não foi possível desconectar',
        description: mensagemParaUsuario(error, 'Não foi possível desconectar o Conta Azul.'),
        variant: 'destructive',
      }),
  });
}

export function useSyncContaAzul() {
  const { toast } = useToast();
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: () => contaAzulService.syncNow(tenantId()),
    onSuccess: () => {
      queryClient.setQueryData<ContaAzulConnection | null>(connectionKey(employee?.tenant_id), (old) =>
        old ? { ...old, syncing_until: new Date(Date.now() + OPTIMISTIC_SYNC_MS).toISOString() } : old,
      );
      toast({ title: 'Sincronização pedida', description: 'Os dados do Conta Azul chegam em instantes.' });
    },
    onError: (error) =>
      toast({
        title: 'Não foi possível sincronizar',
        description: mensagemParaUsuario(error, 'Não foi possível pedir a sincronização.'),
        variant: 'destructive',
      }),
  });
}

const costCentersKey = (tenantId: string | undefined) => ['conta-azul-cost-centers', tenantId] as const;

export function useContaAzulCostCenters(enabled: boolean) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: costCentersKey(tenantId),
    queryFn: () => contaAzulService.listCostCenters(tenantId as string),
    enabled: enabled && Boolean(tenantId),
  });
}

export function useLinkContaAzulCostCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, costCenterId }: { id: string; costCenterId: string | null }) =>
      contaAzulService.linkCostCenter(id, costCenterId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conta-azul-cost-centers'] }),
    onError: (error) =>
      toast({
        title: 'Não foi possível salvar a ligação',
        description: mensagemParaUsuario(error),
        variant: 'destructive',
      }),
  });
}
