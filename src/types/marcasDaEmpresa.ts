/** A empresa que recebe a marca (US-0051): o CNPJ e o que a carteira mostra sem ler a Base. */
export interface EmpresaParaMarcar {
  cnpj: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
}

/** Uma marca por vez: Parceiro, ou o ano de "Cliente antes do Pulse" (nulo tira a marca). */
export type MarcaDaEmpresa = { parceiro: boolean } | { cliente_antes_do_pulse: number | null };

export interface PedidoDeMarca {
  empresa: EmpresaParaMarcar;
  marca: MarcaDaEmpresa;
}
