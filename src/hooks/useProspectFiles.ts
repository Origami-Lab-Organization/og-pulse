import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { deleteProspectAttachments, uploadProspectAttachment } from '@/lib/prospectAttachments';
import { createProspectFile, deleteProspectFile, fetchProspectFiles } from '@/services/prospectService';
import type { ProspectFileDB } from '@/types/prospect';

export function useProspectFiles(prospectId: string | null) {
  const { employee } = useAuth();
  return useQuery<ProspectFileDB[]>({
    queryKey: ['prospect-files', prospectId],
    queryFn: () => fetchProspectFiles(prospectId!),
    enabled: !!prospectId && !!employee?.tenant_id,
  });
}

/**
 * Anexa direto na oportunidade (09/10/2026): sobe cada arquivo e registra a linha. Um arquivo
 * que falha não segura os outros; a mensagem diz quantos entraram.
 */
export function useUploadProspectFiles() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async ({ prospectId, arquivos }: { prospectId: string; arquivos: File[] }) => {
      let primeiroErro: unknown = null;
      const anexar = async (arquivo: File) => {
        const anexo = await uploadProspectAttachment(arquivo, { tenantId: employee!.tenant_id, prospectId });
        await createProspectFile({ prospect_id: prospectId, anexo, created_by: employee!.id });
      };
      const entrou = await Promise.all(
        arquivos.map((arquivo) =>
          anexar(arquivo).then(
            () => true,
            (erro: unknown) => {
              primeiroErro ??= erro;
              return false;
            },
          ),
        ),
      );
      const enviados = entrou.filter(Boolean).length;
      if (enviados === 0) throw primeiroErro;
      return { enviados, falhas: arquivos.length - enviados };
    },
    onSuccess: ({ enviados, falhas }, { prospectId }) => {
      qc.invalidateQueries({ queryKey: ['prospect-files', prospectId] });
      toast({
        title: enviados === 1 ? 'Arquivo anexado' : `${enviados} arquivos anexados`,
        description: falhas > 0 ? `${falhas} não ${falhas === 1 ? 'entrou' : 'entraram'}. Tente de novo.` : undefined,
        variant: falhas > 0 ? 'destructive' : undefined,
      });
    },
    onError: (err: unknown) => {
      toast({ title: 'Não foi possível anexar', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

/**
 * Exclui o arquivo anexado direto. A linha sai primeiro e o objeto depois: arquivo órfão no
 * bucket é menos grave que a lista apontando para um arquivo que não existe.
 */
export function useDeleteProspectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arquivo: ProspectFileDB) => {
      await deleteProspectFile(arquivo.id);
      await deleteProspectAttachments([arquivo]).catch(console.warn);
    },
    onSuccess: (_data, arquivo) => {
      qc.invalidateQueries({ queryKey: ['prospect-files', arquivo.prospect_id] });
      toast({ title: 'Arquivo excluído' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao excluir o arquivo', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}
