import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ToastAction } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { formatarData } from '@/lib/prospecting/prazos';
import { decidirNaBase, desfazerDecisoes } from '@/services/decisoesDaBaseService';
import type { EmpresaParaDecidir, PedidoDeDescarte, PedidoDeNaoAgora } from '@/types/decisoesDaBase';

/** "Indústria X" ou "3 empresas": o sujeito da mensagem. */
function quem(empresas: EmpresaParaDecidir[]): string {
  return empresas.length === 1 ? empresas[0].nome : `${empresas.length.toLocaleString('pt-BR')} empresas`;
}

const plural = (empresas: EmpresaParaDecidir[], singular: string, varias: string) => (empresas.length === 1 ? singular : varias);

/**
 * Descartar e "Não agora" na Base de empresas (US-0010), com a mensagem e o Desfazer. A relação
 * da empresa muda, então a lista, o total e a ficha recarregam.
 */
export function useDecisoesDaBase() {
  const { employee } = useAuth();
  const qc = useQueryClient();

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ['receita-ficha'] });
    qc.invalidateQueries({ queryKey: ['receita-empresas'] });
    qc.invalidateQueries({ queryKey: ['receita-empresas-total'] });
  };

  const desfazer = useMutation({
    mutationFn: desfazerDecisoes,
    onSuccess: () => toast({ title: 'Desfeito', description: 'A empresa voltou para a lista.' }),
    onError: (e) => toast({ variant: 'destructive', title: 'Não deu para desfazer', description: mensagemParaUsuario(e) }),
    onSettled: atualizar,
  });

  const avisar = (titulo: string, descricao: string, ids: string[]) =>
    toast({
      title: titulo,
      description: descricao,
      action: <ToastAction altText="Desfazer" onClick={() => desfazer.mutate(ids)}>Desfazer</ToastAction>,
    });

  const descartar = useMutation({
    mutationFn: (pedido: PedidoDeDescarte) => decidirNaBase({ ...pedido, tenantId: employee!.tenant_id, decisao: 'descartada' }),
    onSuccess: (ids, { empresas }) =>
      avisar(`${quem(empresas)} ${plural(empresas, 'descartada', 'descartadas')}`, 'Saiu da lista para todo o time. Volta pelo filtro de relação.', ids),
    onError: (e) => toast({ variant: 'destructive', title: 'Não deu para descartar', description: mensagemParaUsuario(e) }),
    onSettled: atualizar,
  });

  const naoAgora = useMutation({
    mutationFn: (pedido: PedidoDeNaoAgora) => decidirNaBase({ ...pedido, tenantId: employee!.tenant_id, decisao: 'nao_agora' }),
    onSuccess: (ids, { empresas, voltarEm }) =>
      avisar(
        `${quem(empresas)} em "Não agora"`,
        `Até ${formatarData(voltarEm)}. Nesse dia, um aviso no sino lembra de retomar.`,
        ids,
      ),
    onError: (e) => toast({ variant: 'destructive', title: 'Não deu para marcar "Não agora"', description: mensagemParaUsuario(e) }),
    onSettled: atualizar,
  });

  return { descartar, naoAgora, desfazer };
}
