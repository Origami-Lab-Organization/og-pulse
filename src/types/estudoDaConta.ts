import type { ProspectContactRole, ProspectOpportunityContact } from '@/types/prospect';

/** Um item do "o que falta" no estudo da conta (US-0020, cenário 5). */
export interface ItemDoEstudo {
  chave: 'decisor' | 'alavanca' | 'funcionarios';
  rotulo: string;
  feito: boolean;
}

/** As pessoas da oportunidade com um mesmo papel na decisão; `papel` nulo = "Sem papel". */
export interface GrupoDePessoas {
  papel: ProspectContactRole | null;
  rotulo: string;
  pessoas: ProspectOpportunityContact[];
}
