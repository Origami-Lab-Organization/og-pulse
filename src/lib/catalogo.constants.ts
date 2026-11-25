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
