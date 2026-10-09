import {
  toISODate,
  type ArquivoDaOportunidade,
  type ProspectActivityWithOwner,
  type ProspectFileDB,
} from '@/types/prospect';

/**
 * A aba Arquivos da oportunidade (09/10/2026) lê duas fontes: os anexados direto na ficha
 * (`prospect_files`) e os anexos de cada atividade. Aqui as duas viram uma lista só, do mais
 * recente ao mais antigo.
 */
export function juntarArquivos(
  arquivos: ProspectFileDB[],
  atividades: ProspectActivityWithOwner[],
): ArquivoDaOportunidade[] {
  const daFicha = arquivos.map((arquivo) => ({
    chave: arquivo.id,
    anexo: arquivo,
    // O dia de quem olha, não o de UTC: anexo das 22h não pode cair no dia seguinte.
    dia: toISODate(new Date(arquivo.created_at)),
    arquivo,
  }));
  const dasAtividades = atividades.flatMap((a) =>
    (a.attachments ?? []).map((anexo) => ({
      chave: `${a.id}:${anexo.path}`,
      anexo,
      dia: a.activity_date,
      atividade: a.sequence_no,
    })),
  );
  return [...daFicha, ...dasAtividades].sort((x, y) => y.dia.localeCompare(x.dia));
}
