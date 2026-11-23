/**
 * Qualificação do sócio ou responsável na Receita (QSA), pelo código. A tabela da base de
 * origem veio vazia; os nomes foram conferidos na BrasilAPI (que o Pulse já usa, ADR-0041) em
 * 18/11/2026, para todos os códigos que aparecem nas empresas da base.
 */
const QUALIFICACOES: Record<string, string> = {
  '05': 'Administrador',
  '08': 'Conselheiro de Administração',
  '10': 'Diretor',
  '13': 'Liquidante',
  '16': 'Presidente',
  '17': 'Procurador',
  '18': 'Secretário',
  '20': 'Sociedade Consorciada',
  '21': 'Sociedade Filiada',
  '22': 'Sócio',
  '23': 'Sócio Capitalista',
  '24': 'Sócio Comanditado',
  '25': 'Sócio Comanditário',
  '26': 'Sócio de Indústria',
  '28': 'Sócio-Gerente',
  '29': 'Sócio Incapaz ou Relativamente Incapaz (exceto menor)',
  '30': 'Sócio Menor (Assistido/Representado)',
  '31': 'Sócio Ostensivo',
  '33': 'Tesoureiro',
  '37': 'Sócio Pessoa Jurídica Domiciliado no Exterior',
  '38': 'Sócio Pessoa Física Residente no Exterior',
  '49': 'Sócio-Administrador',
  '52': 'Sócio com Capital',
  '53': 'Sócio sem Capital',
  '54': 'Fundador',
  '56': 'Sócio Comanditário Pessoa Física Residente no Exterior',
  '58': 'Sócio Comanditário Incapaz',
  '59': 'Produtor Rural',
  '63': 'Cotas em Tesouraria',
  '64': 'Administrador Judicial',
  '65': 'Titular Pessoa Física Residente ou Domiciliado no Brasil',
  '66': 'Titular Pessoa Física Residente ou Domiciliado no Exterior',
  '78': 'Titular Pessoa Jurídica Domiciliada no Brasil',
  '79': 'Titular Pessoa Jurídica Domiciliada no Exterior',
};

const NAO_INFORMADA = '00';

/** "Sócio-Administrador"; código fora da tabela aparece como "Qualificação 70". */
export function nomeDaQualificacao(codigo: string | null): string | null {
  if (!codigo || codigo === NAO_INFORMADA) return null;
  return QUALIFICACOES[codigo] ?? `Qualificação ${codigo}`;
}
