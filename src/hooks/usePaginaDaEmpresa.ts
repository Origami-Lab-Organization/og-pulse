import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { prospectCompanyService } from '@/services/prospectCompanyService';
import type { CamposDaPagina } from '@/types/paginaDaEmpresa';
import type { TipoDeConta } from '@/types/prospect';
import type { FaixaDoLinkedin } from '@/lib/prospecting/funcionarios.constants';

function useRecarregarEmpresa() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['prospect-companies'] });
    qc.invalidateQueries({ queryKey: ['prospect-companies', 'por-cnpj'] });
    qc.invalidateQueries({ queryKey: ['prospects'] });
    qc.invalidateQueries({ queryKey: ['prospect'] });
  };
}

/** Site, redes e síntese editados no lugar, na página da empresa (US-0053). */
export function useCamposDaEmpresa() {
  const recarregar = useRecarregarEmpresa();
  return useMutation({
    mutationFn: ({ id, campos }: { id: string; campos: CamposDaPagina }) => prospectCompanyService.setCampos(id, campos),
    onSuccess: recarregar,
    onError: (erro) => toast({ title: 'Não deu para salvar', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });
}

/** Tipo de conta escolhido no widget da qualificação; pode ser trocado depois (US-0053). */
export function useTipoDeContaDaEmpresa() {
  const recarregar = useRecarregarEmpresa();
  return useMutation({
    mutationFn: ({ id, tipo }: { id: string; tipo: TipoDeConta }) => prospectCompanyService.setTipoDeConta(id, tipo),
    onSuccess: recarregar,
    onError: (erro) => toast({ title: 'Não deu para salvar o tipo de conta', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });
}

/** Faixa do LinkedIn (US-0054): substitui o número exato e refaz faturamento e fit na tela. */
export function useFaixaDeFuncionarios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, faixa }: { id: string; faixa: FaixaDoLinkedin | null }) => prospectCompanyService.setFaixaDeFuncionarios(id, faixa),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospect-companies'] });
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['receita-ficha'] });
      qc.invalidateQueries({ queryKey: ['receita-empresas'] });
    },
    onError: (erro) => toast({ title: 'Não deu para salvar a faixa', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });
}
