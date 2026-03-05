import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { terminationService } from '@/services/terminationService';
import { TerminationDocumentType } from '@/types/termination';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ─── List documents ───────────────────────────────────────────
export const useTerminationDocuments = (terminationId: string | undefined) => {
  return useQuery({
    queryKey: ['termination-documents', terminationId],
    queryFn: () => terminationService.getDocuments(terminationId!),
    enabled: !!terminationId,
    staleTime: 5 * 60 * 1000,
  });
};

// ─── Upload document ──────────────────────────────────────────
export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: ({
      terminationId,
      file,
      documentType,
    }: {
      terminationId: string;
      file: File;
      documentType: TerminationDocumentType;
    }) => terminationService.addDocument(terminationId, file, documentType, employee?.id),

    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['termination-documents', vars.terminationId] });
      queryClient.invalidateQueries({ queryKey: ['termination', vars.terminationId] });
      toast({ title: 'Documento enviado', description: 'Arquivo anexado com sucesso.' });
    },

    onError: (error: Error) => {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    },
  });
};

// ─── Delete document ──────────────────────────────────────────
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ docId, terminationId }: { docId: string; terminationId: string }) =>
      terminationService.deleteDocument(docId),

    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['termination-documents', vars.terminationId] });
      queryClient.invalidateQueries({ queryKey: ['termination', vars.terminationId] });
      toast({ title: 'Documento removido' });
    },

    onError: (error: Error) => {
      toast({ title: 'Erro ao remover documento', description: error.message, variant: 'destructive' });
    },
  });
};
