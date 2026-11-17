/**
 * Setores e ramos da CNAE 2.0 do IBGE (US-0003, 17/11/2026).
 *
 * A CNAE é hierárquica: a SEÇÃO (letra, 21 no total) é o setor; a DIVISÃO (dois primeiros
 * dígitos do código) é o ramo. Os filtros da tela Empresas usam os dois níveis, e a carga da
 * base (scripts/receita/sincronizar-base.ts) grava setor e ramo prontos com este mesmo módulo.
 * Fonte: CONCLA/IBGE, estrutura da CNAE 2.0. Nomes encurtados para caber num filtro.
 *
 * Módulo puro: sem React, sem Supabase — a carga roda fora do navegador.
 */

interface Setor {
  letra: string;
  nome: string;
  /** Divisões do setor, em ordem. */
  divisoes: readonly string[];
}

const faixa = (de: number, ate: number): string[] =>
  Array.from({ length: ate - de + 1 }, (_, i) => String(de + i).padStart(2, '0'));

export const SETORES: readonly Setor[] = [
  { letra: 'A', nome: 'Agropecuária, florestal e pesca', divisoes: faixa(1, 3) },
  { letra: 'B', nome: 'Indústrias extrativas', divisoes: faixa(5, 9) },
  { letra: 'C', nome: 'Indústria de transformação', divisoes: faixa(10, 33) },
  { letra: 'D', nome: 'Eletricidade e gás', divisoes: ['35'] },
  { letra: 'E', nome: 'Água, esgoto e resíduos', divisoes: faixa(36, 39) },
  { letra: 'F', nome: 'Construção', divisoes: faixa(41, 43) },
  { letra: 'G', nome: 'Comércio e reparação de veículos', divisoes: faixa(45, 47) },
  { letra: 'H', nome: 'Transporte, armazenagem e correio', divisoes: faixa(49, 53) },
  { letra: 'I', nome: 'Alojamento e alimentação', divisoes: faixa(55, 56) },
  { letra: 'J', nome: 'Informação e comunicação', divisoes: faixa(58, 63) },
  { letra: 'K', nome: 'Finanças e seguros', divisoes: faixa(64, 66) },
  { letra: 'L', nome: 'Atividades imobiliárias', divisoes: ['68'] },
  { letra: 'M', nome: 'Serviços profissionais, científicos e técnicos', divisoes: faixa(69, 75) },
  { letra: 'N', nome: 'Serviços administrativos e complementares', divisoes: faixa(77, 82) },
  { letra: 'O', nome: 'Administração pública', divisoes: ['84'] },
  { letra: 'P', nome: 'Educação', divisoes: ['85'] },
  { letra: 'Q', nome: 'Saúde e serviços sociais', divisoes: faixa(86, 88) },
  { letra: 'R', nome: 'Artes, cultura, esporte e lazer', divisoes: faixa(90, 93) },
  { letra: 'S', nome: 'Outros serviços', divisoes: faixa(94, 96) },
  { letra: 'T', nome: 'Serviços domésticos', divisoes: ['97'] },
  { letra: 'U', nome: 'Organismos internacionais', divisoes: ['99'] },
];

/** O ramo de cada divisão. As da indústria (05–33) são os mesmos nomes da nota de fit. */
export const RAMOS: Readonly<Record<string, string>> = {
  '01': 'Agricultura e pecuária',
  '02': 'Produção florestal',
  '03': 'Pesca e aquicultura',
  '05': 'Carvão mineral',
  '06': 'Petróleo e gás',
  '07': 'Mineração (metálicos)',
  '08': 'Mineração (não metálicos)',
  '09': 'Apoio à extração mineral',
  '10': 'Alimentos',
  '11': 'Bebidas',
  '12': 'Fumo',
  '13': 'Têxtil',
  '14': 'Vestuário',
  '15': 'Couro e calçados',
  '16': 'Madeira',
  '17': 'Papel e celulose',
  '18': 'Gráfica',
  '19': 'Derivados de petróleo e biocombustíveis',
  '20': 'Química',
  '21': 'Farmacêutica',
  '22': 'Borracha e plástico',
  '23': 'Minerais não metálicos',
  '24': 'Metalurgia',
  '25': 'Produtos de metal',
  '26': 'Eletrônicos e informática',
  '27': 'Máquinas e materiais elétricos',
  '28': 'Máquinas e equipamentos',
  '29': 'Automotiva',
  '30': 'Outros equipamentos de transporte',
  '31': 'Móveis',
  '32': 'Produtos diversos',
  '33': 'Manutenção e instalação de máquinas',
  '35': 'Eletricidade e gás',
  '36': 'Água',
  '37': 'Esgoto',
  '38': 'Resíduos e reciclagem',
  '39': 'Descontaminação',
  '41': 'Construção de edifícios',
  '42': 'Obras de infraestrutura',
  '43': 'Serviços para construção',
  '45': 'Veículos: comércio e reparação',
  '46': 'Comércio atacadista',
  '47': 'Comércio varejista',
  '49': 'Transporte terrestre',
  '50': 'Transporte aquaviário',
  '51': 'Transporte aéreo',
  '52': 'Armazenagem e apoio ao transporte',
  '53': 'Correio e entregas',
  '55': 'Alojamento',
  '56': 'Alimentação',
  '58': 'Edição',
  '59': 'Cinema, vídeo, TV e música',
  '60': 'Rádio e televisão',
  '61': 'Telecomunicações',
  '62': 'Tecnologia da informação',
  '63': 'Serviços de informação',
  '64': 'Serviços financeiros',
  '65': 'Seguros e previdência',
  '66': 'Auxiliares de finanças e seguros',
  '68': 'Atividades imobiliárias',
  '69': 'Jurídico e contabilidade',
  '70': 'Sedes e consultoria em gestão',
  '71': 'Arquitetura e engenharia',
  '72': 'Pesquisa e desenvolvimento',
  '73': 'Publicidade e pesquisa de mercado',
  '74': 'Outros serviços técnicos',
  '75': 'Veterinária',
  '77': 'Aluguéis não imobiliários',
  '78': 'Mão de obra',
  '79': 'Agências de viagem',
  '80': 'Vigilância e segurança',
  '81': 'Serviços para edifícios',
  '82': 'Apoio administrativo',
  '84': 'Administração pública',
  '85': 'Educação',
  '86': 'Saúde',
  '87': 'Saúde com assistência social',
  '88': 'Assistência social',
  '90': 'Artes e espetáculos',
  '91': 'Patrimônio cultural e ambiental',
  '92': 'Jogos e apostas',
  '93': 'Esporte e lazer',
  '94': 'Organizações associativas',
  '95': 'Reparação de equipamentos e objetos',
  '96': 'Serviços pessoais',
  '97': 'Serviços domésticos',
  '99': 'Organismos internacionais',
};

const SETOR_DA_DIVISAO: Readonly<Record<string, string>> = Object.fromEntries(
  SETORES.flatMap((s) => s.divisoes.map((d) => [d, s.letra])),
);

/** A divisão (2 dígitos) do CNAE; a BrasilAPI manda número e perde o zero à esquerda. */
export function divisaoDoCnae(codigo: string): string {
  return codigo.replace(/\D/g, '').padStart(7, '0').slice(0, 2);
}

/** Setor (letra) do CNAE; nulo para código fora da CNAE 2.0. */
export function setorDoCnae(codigo: string): string | null {
  return SETOR_DA_DIVISAO[divisaoDoCnae(codigo)] ?? null;
}

export const nomeDoRamo = (divisao: string): string | null => RAMOS[divisao] ?? null;

/** Os ramos dos setores marcados, na ordem da CNAE. */
export function ramosDosSetores(letras: readonly string[]): string[] {
  const marcados = new Set(letras);
  return SETORES.filter((s) => marcados.has(s.letra)).flatMap((s) => s.divisoes);
}

/** Setores e ramos distintos de uma lista de CNAEs (os secundários de uma empresa). */
export function setoresERamos(codigos: readonly string[]): { setores: string[]; ramos: string[] } {
  const ramos = [...new Set(codigos.map(divisaoDoCnae))].filter((d) => SETOR_DA_DIVISAO[d]);
  const setores = [...new Set(ramos.map((d) => SETOR_DA_DIVISAO[d]))];
  return { setores, ramos };
}
