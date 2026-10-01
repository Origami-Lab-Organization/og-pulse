import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { contaAzulService } from '@/services/contaAzulService';

const connectionKey = (tenantId: string | undefined) => ['conta-azul-connection', tenantId] as const;

export function useContaAzulConnection() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: connectionKey(tenantId),
    queryFn: () => contaAzulService.getConnection(tenantId as string),
    enabled: Boolean(tenantId),
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
