import { tabela } from '@/services/prospectingTables';
import type { PedidoDeMarca } from '@/types/marcasDaEmpresa';

/**
 * Marcas Parceiro e "Cliente antes do Pulse" (US-0051), uma linha por raiz do CNPJ. O banco
 * confere a capacidade de cada marca e grava quem e quando (migration 20261127120000).
 */

const LIMITE_DO_NOME = 200;
const LIMITE_DA_CIDADE = 100;
const UF = /^[A-Z]{2}$/;

const digitos = (cnpj: string) => cnpj.replace(/\D/g, '');
const ufValida = (estado: string | null) => (estado && UF.test(estado.toUpperCase()) ? estado.toUpperCase() : null);

export async function gravarMarca(tenantId: string, { empresa, marca }: PedidoDeMarca): Promise<void> {
  const linha = {
    tenant_id: tenantId,
    cnpj: digitos(empresa.cnpj),
    empresa_nome: empresa.nome.trim().slice(0, LIMITE_DO_NOME),
    cidade: empresa.cidade?.trim().slice(0, LIMITE_DA_CIDADE) || null,
    estado: ufValida(empresa.estado),
    ...marca,
  };
  const { error } = await tabela('prospect_marcas_da_empresa').upsert(linha, { onConflict: 'tenant_id,cnpj_raiz' });
  if (error) throw error;
}
