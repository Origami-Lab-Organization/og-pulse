/** Separador entre a linha e o serviço nas listas de escolha: "Governo › Dev. de Software" (US-0046). */
export const SEPARADOR_LINHA_SERVICO = ' › ';

/** Marca do serviço desativado que ainda aparece porque o registro já o usa (US-0046, cenário 6). */
export const MARCA_DE_DESATIVADO = 'Desativado';

/** Situação do serviço no catálogo (US-0046). */
export const STATUS_DO_SERVICO = {
  ATIVO: 'ativo',
  SEM_MODELO: 'sem_modelo',
  DESATIVADO: 'desativado',
  LINHA_DESATIVADA: 'linha_desativada',
} as const;

export type StatusDoServico = (typeof STATUS_DO_SERVICO)[keyof typeof STATUS_DO_SERVICO];

export const ROTULO_DO_STATUS: Record<StatusDoServico, string> = {
  ativo: 'Ativo',
  sem_modelo: 'Inativo · sem modelo de receita',
  desativado: 'Desativado',
  linha_desativada: 'Linha desativada',
};

/** Aba que reúne o que está fora das escolhas por vontade de alguém (US-0046). */
export const ABA_DESATIVADOS = 'desativados';

/** O que a tela do catálogo pede para confirmar (US-0046). */
export const CONFIRMACAO_DO_CATALOGO = {
  DESATIVAR_LINHA: 'desativar-linha',
  DESATIVAR_SERVICO: 'desativar-servico',
  EXCLUIR_SERVICO: 'excluir-servico',
} as const;

/** Separa o serviço do modelo de receita no valor da escolha do projeto (US-0046). */
export const SEPARADOR_DA_ESCOLHA = '::';

/** Valor do campo "Fit" do serviço quando ele não usa nenhuma regra (US-0047). */
export const SEM_REGRA_DE_FIT = 'sem_fit';

/** Opção do filtro de serviço para projetos sem serviço (US-0048). */
export const SEM_SERVICO = 'sem_servico';

/** Opção "todas/todos" dos filtros de linha e de serviço (o Select não aceita valor vazio). */
export const TODOS_DO_FILTRO = '__todos__';

/** Valor que nenhum projeto tem: filtra "linha sem serviço" sem trazer projeto (US-0048). */
export const NENHUM_SERVICO = '__nenhum__';

/** US-0048: ícones que o admin escolhe para a linha (chaves do CHECK em service_lines.icone). */
export const ICONES_DA_LINHA = [
  'camadas', 'maleta', 'moedas', 'predio', 'foguete', 'codigo', 'lampada', 'grafico', 'capelo', 'aperto_de_maos',
] as const;
export type IconeDaLinha = (typeof ICONES_DA_LINHA)[number];
export const ICONE_PADRAO_DA_LINHA: IconeDaLinha = 'camadas';

/** Nome de cada ícone para leitores de tela. */
export const NOME_DO_ICONE: Record<IconeDaLinha, string> = {
  camadas: 'Camadas',
  maleta: 'Maleta',
  moedas: 'Moedas',
  predio: 'Prédio público',
  foguete: 'Foguete',
  codigo: 'Código',
  lampada: 'Lâmpada',
  grafico: 'Gráfico',
  capelo: 'Capelo',
  aperto_de_maos: 'Aperto de mãos',
};
