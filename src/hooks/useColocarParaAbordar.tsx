import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ToastAction } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { listaDeNomes, resumirParaAbordar } from '@/lib/prospecting/paraAbordar';
import { colocarParaAbordar, desfazerAberturas } from '@/services/abrirOportunidadeService';
import { getProspectStageLabel, type PedidoParaAbordar, type ResumoParaAbordar } from '@/types/prospect';

const linkDaOportunidade = (id: string) => `/comercial/prospeccao?oportunidade=${encodeURIComponent(id)}`;
const EM_ANDAMENTO_VISIVEIS = 3;

/**
 * Coloca uma ou várias empresas da base para abordar (US-0008), uma por vez, e confirma numa
 * mensagem com Desfazer. As que já estão sendo abordadas ficam de fora, com a etapa e quem
 * cuida; as que a Receita não respondeu vêm numa segunda mensagem, com "Tentar de novo".
 */
export function useColocarParaAbordar() {
  const { employee } = useAuth();
  const { byId } = useEmployeeDirectoryMap();
  const qc = useQueryClient();
  const [feitas, setFeitas] = useState(0);
  const nomeDe = (id: string | null) => (id ? byId.get(id)?.nome ?? 'responsável' : 'sem responsável');

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ['receita-ficha'] });
    // A relação com a Origami (US-0019) muda: a lista e o total com filtro de relação também.
    qc.invalidateQueries({ queryKey: ['receita-empresas'] });
    qc.invalidateQueries({ queryKey: ['receita-empresas-total'] });
    qc.invalidateQueries({ queryKey: ['prospects'] });
    qc.invalidateQueries({ queryKey: ['prospect-companies'] });
  };

  const desfazer = async (ids: string[]) => {
    try {
      const ficaram = await desfazerAberturas(ids);
      avisarDesfeitas(ids.length, ficaram);
    } finally {
      atualizar();
    }
  };

  const mutation = useMutation({
    mutationFn: ({ itens, ownerId }: PedidoParaAbordar) => {
      setFeitas(0);
      return colocarParaAbordar(itens, { tenantId: employee!.tenant_id, employeeId: employee!.id, ownerId }, setFeitas);
    },
    onSuccess: (resultados, pedido) => {
      atualizar();
      const resumo = resumirParaAbordar(resultados);
      avisarColocadas(resumo, nomeDe, desfazer);
      if (resumo.falhas.length) {
        avisarFalhas(resumo, () => mutation.mutate({ itens: resumo.falhas, ownerId: pedido.ownerId }));
      }
    },
    onError: (erro) =>
      toast({ title: 'Não deu para mover para abordar', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });

  return { ...mutation, feitas };
}

type NomeDe = (id: string | null) => string;

function linhasEmAndamento(resumo: ResumoParaAbordar, nomeDe: NomeDe): string[] {
  const linhas = resumo.emAndamento
    .slice(0, EM_ANDAMENTO_VISIVEIS)
    .map(({ item, oportunidade }) => `${item.nome} já está em ${getProspectStageLabel(oportunidade.stage)}, com ${nomeDe(oportunidade.owner_id)}.`);
  const resto = resumo.emAndamento.length - EM_ANDAMENTO_VISIVEIS;
  return resto > 0 ? [...linhas, `E mais ${resto} já sendo abordada${resto > 1 ? 's' : ''}.`] : linhas;
}

function tituloDasColocadas({ abertas }: ResumoParaAbordar): string {
  if (abertas.length === 1) return `${abertas[0].item.nome} em A abordar`;
  return `${abertas.length} empresas em A abordar`;
}

/** Cenários 1, 2 e 5: quantas entraram, com quem, e quais ficaram de fora por já estarem em andamento. */
function avisarColocadas(resumo: ResumoParaAbordar, nomeDe: NomeDe, desfazer: (ids: string[]) => void) {
  const { abertas } = resumo;
  const andamento = linhasEmAndamento(resumo, nomeDe);
  if (!abertas.length && !andamento.length) return;
  if (!abertas.length) {
    toast({ title: 'Nenhuma empresa entrou', description: andamento.join(' ') });
    return;
  }
  const ids = abertas.map((a) => a.prospect.id);
  const unica = abertas.length === 1 ? abertas[0].prospect.id : null;
  toast({
    title: tituloDasColocadas(resumo),
    description: (
      <span className="block space-y-1">
        <span className="block">
          Com {nomeDe(abertas[0].prospect.owner_id)}.{' '}
          {unica && <Link to={linkDaOportunidade(unica)} className="underline">Ver oportunidade</Link>}
        </span>
        {andamento.map((l) => <span key={l} className="block">{l}</span>)}
      </span>
    ),
    action: <ToastAction altText="Desfazer: tirar de A abordar" onClick={() => desfazer(ids)}>Desfazer</ToastAction>,
  });
}

/** Cenário 10: a Receita não respondeu para algumas; as outras já entraram. */
function avisarFalhas(resumo: ResumoParaAbordar, tentarDeNovo: () => void) {
  const nomes = resumo.falhas.map((f) => f.nome);
  toast({
    title: nomes.length === 1 ? `${nomes[0]} não entrou` : `${nomes.length} empresas não entraram`,
    description: `Não deu para consultar a Receita agora: ${listaDeNomes(nomes)}.`,
    variant: 'destructive',
    action: <ToastAction altText="Tentar mover de novo as que faltaram" onClick={tentarDeNovo}>Tentar de novo</ToastAction>,
  });
}

/** Cenário 7: as que já têm atividade, tarefa ou contato ficam; o caminho é a Perda. */
function avisarDesfeitas(total: number, ficaram: number) {
  if (!ficaram) {
    const titulo = total === 1 ? 'Oportunidade desfeita' : `${total} oportunidades desfeitas`;
    toast({ title: titulo, description: 'Saíram de A abordar. O cadastro das empresas, com os dados da Receita e o tipo de conta, continua no Pulse.' });
    return;
  }
  toast({
    title: ficaram === total ? 'Não deu para desfazer' : `${total - ficaram} desfeitas, ${ficaram} ficaram`,
    description: 'Oportunidade com atividade, tarefa ou contato fica. Registre a Perda no Pipeline.',
    variant: 'destructive',
  });
}
