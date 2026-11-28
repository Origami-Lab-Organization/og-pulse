import type { ClienteDaCarteira } from '@/services/clientService';
import type { Relacao, RelacaoDaEmpresa } from '@/types/relacao';

/**
 * A relação no formato do selo da US-0019: o projeto que a explica, o Ganho ou o ano de antes do
 * Pulse (US-0051). Nula para o Parceiro que não é cliente.
 */
export function relacaoDoCliente(c: ClienteDaCarteira): RelacaoDaEmpresa | null {
  if (!c.relacao) return null;
  return {
    relacao: c.relacao as Relacao,
    pediuParaParar: false,
    projeto: c.projeto_id
      ? { id: c.projeto_id, name: c.projeto_nome ?? '', status: c.projeto_status ?? '', data: c.projeto_data }
      : null,
    oportunidade: c.ganho_id
      ? { id: c.ganho_id, title: c.ganho_titulo, stage: 'ganho', owner_id: c.ganho_responsavel, discard_reason: null, data: c.ganho_em }
      : null,
    antesDoPulse: c.antes_do_pulse,
  };
}

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca por nome, razão social, CNPJ (com ou sem máscara) ou cidade. */
export function clienteNaBusca(c: ClienteDaCarteira, busca: string): boolean {
  const termo = semAcento(busca.trim());
  if (!termo) return true;
  const digitos = termo.replace(/\D/g, '');
  const texto = semAcento([c.nome, c.razao_social, c.cidade ?? ''].join(' '));
  const cnpj = (c.cnpj ?? '').replace(/\D/g, '');
  return texto.includes(termo) || (digitos.length >= 3 && cnpj.includes(digitos));
}
