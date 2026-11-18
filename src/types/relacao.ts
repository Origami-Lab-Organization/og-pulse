/**
 * Relação da Origami com uma empresa (US-0019). A regra mora em
 * supabase/functions/_shared/relacao.ts, que a Edge Function `empresas-receita` usa; a tela só
 * mostra o que vem calculado.
 */
export type {
  DadosDaRelacao,
  OportunidadeDaRelacao,
  ProjetoDaRelacao,
  Relacao,
  RelacaoDaEmpresa,
} from '../../supabase/functions/_shared/relacaoTipos';
