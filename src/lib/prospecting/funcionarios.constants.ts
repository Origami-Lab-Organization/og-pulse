/**
 * Faixas de funcionários do LinkedIn (US-0054), as mesmas que a página da empresa no LinkedIn
 * mostra. O valor é o que o banco guarda (`prospect_companies.funcionarios_faixa`); nas contas de
 * faturamento estimado e fit entra o ponto médio (decisão do Victor, 26/11/2026).
 */
export const FAIXAS_DO_LINKEDIN = [
  { valor: '0-1', rotulo: '0 a 1', meio: 1 },
  { valor: '2-10', rotulo: '2 a 10', meio: 6 },
  { valor: '11-50', rotulo: '11 a 50', meio: 30 },
  { valor: '51-200', rotulo: '51 a 200', meio: 125 },
  { valor: '201-500', rotulo: '201 a 500', meio: 350 },
  { valor: '501-1000', rotulo: '501 a 1.000', meio: 750 },
  { valor: '1001-5000', rotulo: '1.001 a 5.000', meio: 3000 },
  { valor: '5001-10000', rotulo: '5.001 a 10.000', meio: 7500 },
  // Sem teto: 1,5 vez o começo da faixa, como estimativa conservadora.
  { valor: '10001+', rotulo: 'mais de 10.000', meio: 15000 },
] as const;

export type FaixaDoLinkedin = (typeof FAIXAS_DO_LINKEDIN)[number]['valor'];

/**
 * RAIS improvável (US-0054, regra V2 escolhida pelo Victor em 26/11/2026, medida na Base: 1.448
 * empresas, 0,26%): RAIS abaixo de 10, capital a partir de R$ 10 mi, fora dos ramos que registram
 * os funcionários em outro CNPJ do grupo, e a estimativa por empresas parecidas de pelo menos 50.
 */
export const RAIS_IMPROVAVEL = {
  RAIS_ABAIXO_DE: 10,
  CAPITAL_A_PARTIR_DE: 10_000_000,
  ESTIMATIVA_A_PARTIR_DE: 50,
  /** Holdings e serviços financeiros (64) e atividades imobiliárias (68). */
  DIVISOES_FORA: ['64', '68'] as readonly string[],
  /** Sedes de grupo (7020) e incorporação de empreendimentos imobiliários (4110). */
  GRUPOS_FORA: ['7020', '4110'] as readonly string[],
} as const;

/**
 * RAIS incompleta (US-0054, decisão de 26/11/2026): a RAIS achou funcionário em menos da metade dos
 * estabelecimentos de uma empresa com pelo menos 3 filiais. Não muda o número; a página mostra em
 * quantos estabelecimentos a RAIS achou gente, para o time conferir e informar a faixa.
 */
export const RAIS_INCOMPLETA = { FILIAIS_A_PARTIR_DE: 3 } as const;
