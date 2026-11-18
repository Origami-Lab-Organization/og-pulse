import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { desfazerAbertura, NaoDaMaisParaDesfazer } from '@/services/abrirOportunidadeService';
import { opportunityName, type ProspectWithCompany } from '@/types/prospect';

/**
 * "Devolver para a lista" (US-0008, cenário 11): tira de A abordar a oportunidade que ainda não
 * tem atividade, tarefa nem contato, como o Desfazer. A empresa continua cadastrada, com os
 * dados da Receita e o tipo de conta, e a ficha da tela Empresas volta a oferecer "Mover para
 * abordar". Com atividade, tarefa ou contato, o caminho é a Perda.
 */
export function useDevolverParaALista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prospect: ProspectWithCompany) => desfazerAbertura(prospect.id),
    onSuccess: (_, prospect) => {
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['prospect-companies'] });
      qc.invalidateQueries({ queryKey: ['receita-ficha'] });
      qc.invalidateQueries({ queryKey: ['receita-empresas'] });
      qc.invalidateQueries({ queryKey: ['receita-empresas-total'] });
      toast({
        title: `${opportunityName(prospect)} voltou para a lista`,
        description: 'Saiu de A abordar. Para mover de novo, use a tela Empresas.',
      });
    },
    onError: (erro) =>
      toast({
        title: 'Não deu para devolver para a lista',
        description: erro instanceof NaoDaMaisParaDesfazer ? erro.message : mensagemParaUsuario(erro),
        variant: 'destructive',
      }),
  });
}
