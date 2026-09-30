import type { ProspectCompanyDB } from '@/types/prospect';

export interface CnpjExtraction {
  /** 14 dígitos, sem repetição, na ordem em que apareceram. */
  validos: string[];
  /** Como estavam no texto — dígito verificador não confere. */
  invalidos: string[];
  /** Quantos passaram do limite do lote e ficam para o próximo. */
  excedente: number;
}

export type BulkRowStatus = 'fila' | 'consultando' | 'criada' | 'existente' | 'falhou';

export interface BulkRow {
  cnpj: string;
  status: BulkRowStatus;
  empresa?: Pick<ProspectCompanyDB, 'id' | 'name'>;
  /** Por que falhou, ou o que ficou de fora (ex.: "sem dados da Receita"). */
  mensagem?: string;
  socios?: number;
}
