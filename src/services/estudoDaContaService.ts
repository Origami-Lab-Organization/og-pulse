import { tabela } from '@/services/prospectingTables';
import type { DriveFolder } from '@/types/microsoftGraph';
import type { ItemDoEstudoDaConta, NovoItemDoEstudo, PastaDoComercial } from '@/types/paginaDaEmpresa';

/**
 * Estudo da conta (US-0053): links, notas e arquivos da empresa, e as pastas do OneDrive. O
 * arquivo em si é enviado e apagado pelo Graph, com a conta de quem usa; aqui só os registros.
 */
export const estudoDaContaService = {
  async listar(companyId: string): Promise<ItemDoEstudoDaConta[]> {
    const { data, error } = await tabela('prospect_company_estudo').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ItemDoEstudoDaConta[];
  },

  async incluir(input: { tenantId: string; companyId: string; criadoPor: string | null; item: NovoItemDoEstudo }): Promise<void> {
    const { tenantId, companyId, criadoPor, item } = input;
    const { error } = await tabela('prospect_company_estudo').insert({ ...item, tenant_id: tenantId, company_id: companyId, created_by: criadoPor });
    if (error) throw error;
  },

  async remover(id: string): Promise<void> {
    const { error } = await tabela('prospect_company_estudo').delete().eq('id', id);
    if (error) throw error;
  },

  async pastaDoComercial(tenantId: string): Promise<PastaDoComercial | null> {
    const { data, error } = await tabela('onedrive_do_comercial').select('*').eq('tenant_id', tenantId).maybeSingle();
    if (error) throw error;
    return (data ?? null) as PastaDoComercial | null;
  },

  async ligarPastaDoComercial(tenantId: string, pasta: DriveFolder, ligadaPor: string | null): Promise<void> {
    const { error } = await tabela('onedrive_do_comercial').upsert({
      tenant_id: tenantId,
      drive_id: pasta.driveId,
      item_id: pasta.id,
      caminho: pasta.path || pasta.name,
      ligada_por: ligadaPor,
      ligada_em: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async guardarPastaDaEmpresa(companyId: string, driveId: string, itemId: string): Promise<void> {
    const { error } = await tabela('prospect_companies').update({ onedrive_drive_id: driveId, onedrive_item_id: itemId }).eq('id', companyId);
    if (error) throw error;
  },
};
