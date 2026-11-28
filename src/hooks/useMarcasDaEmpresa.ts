import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { gravarMarca } from '@/services/marcasDaEmpresaService';
import type { PedidoDeMarca } from '@/types/marcasDaEmpresa';

/**
 * Marca ou tira Parceiro e "Cliente antes do Pulse" (US-0051). A relação e a carteira mudam,
 * então a ficha, a lista, o total e a carteira recarregam.
 */
export function useMarcarEmpresa() {
  const { employee } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pedido: PedidoDeMarca) => gravarMarca(employee!.tenant_id, pedido),
    onError: (e) => toast({ variant: 'destructive', title: 'Não deu para gravar a marca', description: mensagemParaUsuario(e) }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['receita-ficha'] });
      qc.invalidateQueries({ queryKey: ['receita-empresas'] });
      qc.invalidateQueries({ queryKey: ['receita-empresas-total'] });
      qc.invalidateQueries({ queryKey: ['carteira-de-clientes'] });
    },
  });
}
