import type { Relacao } from '@/types/relacao';

/** US-0049: as relações da carteira (cliente = empresa com Ganho ou projeto, ADR-0056). */
export const CLIENTE_ATIVO: Relacao = 'cliente_ativo';
export const JA_FOI_CLIENTE: Relacao = 'ja_foi_cliente';
export const RELACOES_DA_CARTEIRA: readonly Relacao[] = [CLIENTE_ATIVO, JA_FOI_CLIENTE];

/** Aba Clientes da tela Empresas (`?aba=clientes`). */
export const ABA_CLIENTES = 'clientes';
export const ROTA_DA_CARTEIRA = `/comercial/empresas?aba=${ABA_CLIENTES}`;

/** Quem abre Empresas e a ficha do cliente: a carteira ou a Prospecção (US-0049). */
export const CARTEIRA_OU_PROSPECCAO = ['cliente:ler', 'prospeccao:ler'] as const;
