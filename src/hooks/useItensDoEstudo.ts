import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { acquireGraphTokenForScopes } from '@/integrations/microsoft/msalClient';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { TIPO_DE_ITEM_DO_ESTUDO } from '@/lib/prospecting/faseDaEmpresa.constants';
import { nomeDaPastaDaEmpresa } from '@/lib/prospecting/paginaDaEmpresa';
import { FILES_SCOPES, GraphError, deleteDriveItem, ensureDriveFolder, uploadDriveFile } from '@/services/microsoftGraphService';
import { estudoDaContaService } from '@/services/estudoDaContaService';
import { GRAPH_ERROR_CODE, type DriveFolder } from '@/types/microsoftGraph';
import type { ItemDoEstudoDaConta, NovoItemDoEstudo, PastaDoComercial } from '@/types/paginaDaEmpresa';
import type { ProspectCompanyDB } from '@/types/prospect';

const chaveDosItens = (companyId: string | null) => ['estudo-da-conta', companyId];
const CHAVE_DA_PASTA = ['onedrive-do-comercial'];

const falhou = (titulo: string) => (erro: unknown) => toast({ title: titulo, description: mensagemParaUsuario(erro), variant: 'destructive' });

export function useItensDoEstudo(companyId: string | null) {
  return useQuery({
    queryKey: chaveDosItens(companyId),
    queryFn: () => estudoDaContaService.listar(companyId as string),
    enabled: !!companyId,
  });
}

/** A pasta do Comercial no OneDrive (US-0053); nula até o admin escolher. */
export function usePastaDoComercial() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id ?? null;
  return useQuery({
    queryKey: [...CHAVE_DA_PASTA, tenantId],
    queryFn: () => estudoDaContaService.pastaDoComercial(tenantId as string),
    enabled: !!tenantId,
  });
}

export function useLigarPastaDoComercial() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (pasta: DriveFolder) => estudoDaContaService.ligarPastaDoComercial(employee!.tenant_id, pasta, employee?.id ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHAVE_DA_PASTA });
      toast({ title: 'Pasta do Comercial escolhida' });
    },
    onError: falhou('Não deu para guardar a pasta'),
  });
}

function useIncluir(companyId: string) {
  const { employee } = useAuth();
  return (item: NovoItemDoEstudo) =>
    estudoDaContaService.incluir({ tenantId: employee!.tenant_id, companyId, criadoPor: employee?.id ?? null, item });
}

/** Link ou nota no estudo. */
export function useIncluirNoEstudo(companyId: string) {
  const qc = useQueryClient();
  const incluir = useIncluir(companyId);
  return useMutation({
    mutationFn: incluir,
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveDosItens(companyId) }),
    onError: falhou('Não deu para guardar no estudo'),
  });
}

/** A pasta da empresa dentro da pasta do Comercial: a que já existe, ou criada agora. */
async function pastaDaEmpresa(token: string, empresa: ProspectCompanyDB, comercial: PastaDoComercial) {
  if (empresa.onedrive_drive_id && empresa.onedrive_item_id) return { driveId: empresa.onedrive_drive_id, id: empresa.onedrive_item_id };
  const pasta = await ensureDriveFolder(token, comercial.drive_id, comercial.item_id, nomeDaPastaDaEmpresa(empresa));
  await estudoDaContaService.guardarPastaDaEmpresa(empresa.id, pasta.driveId, pasta.id);
  return { driveId: pasta.driveId, id: pasta.id };
}

/** Arquivo do estudo: vai para a pasta da empresa no OneDrive do Comercial, criada na primeira vez. */
export function useAnexarArquivo(empresa: ProspectCompanyDB) {
  const qc = useQueryClient();
  const incluir = useIncluir(empresa.id);
  const { data: comercial } = usePastaDoComercial();
  return useMutation({
    mutationFn: async (arquivo: File) => {
      if (!comercial) throw new Error('A pasta do Comercial no OneDrive ainda não foi escolhida.');
      const token = await acquireGraphTokenForScopes(FILES_SCOPES);
      const pasta = await pastaDaEmpresa(token, empresa, comercial);
      const enviado = await uploadDriveFile(token, pasta.driveId, pasta.id, arquivo, arquivo.name);
      await incluir({ tipo: TIPO_DE_ITEM_DO_ESTUDO.ARQUIVO, titulo: enviado.name, url: enviado.webUrl, drive_id: enviado.driveId, item_id: enviado.id, tamanho: enviado.size });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaveDosItens(empresa.id) });
      qc.invalidateQueries({ queryKey: ['prospect-companies'] });
      qc.invalidateQueries({ queryKey: ['prospect-companies', 'por-cnpj'] });
    },
    onError: falhou('Não deu para enviar o arquivo'),
  });
}

/** O arquivo que já não está no OneDrive não impede tirar o item do estudo. */
async function apagarNoOneDrive(item: ItemDoEstudoDaConta) {
  if (item.tipo !== TIPO_DE_ITEM_DO_ESTUDO.ARQUIVO || !item.drive_id || !item.item_id) return;
  const token = await acquireGraphTokenForScopes(FILES_SCOPES);
  try {
    await deleteDriveItem(token, item.drive_id, item.item_id);
  } catch (erro) {
    if (!(erro instanceof GraphError && erro.code === GRAPH_ERROR_CODE.NOT_FOUND)) throw erro;
  }
}

/** Tira do estudo; o arquivo sai também do OneDrive (decisão de 26/11/2026). */
export function useRemoverDoEstudo(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: ItemDoEstudoDaConta) => {
      await apagarNoOneDrive(item);
      await estudoDaContaService.remover(item.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveDosItens(companyId) }),
    onError: falhou('Não deu para tirar do estudo'),
  });
}
