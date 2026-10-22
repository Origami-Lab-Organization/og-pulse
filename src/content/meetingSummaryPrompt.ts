/**
 * Instruções que vão junto da transcrição no botão "Copiar para a IA" da aba Reuniões.
 *
 * O Pulse não chama IA nenhuma (ADR-0052): a pessoa cola isto na IA que já usa e traz as notas
 * de volta para "Resumo e notas". O formato imita as notas do Granola, que o time elegeu como
 * referência em 22/10/2026: por assunto, enxutas, com decisões e próximos passos com dono.
 *
 * Para mudar o estilo das notas, mude este texto — o resto do fluxo não depende dele.
 */
export const MEETING_SUMMARY_INSTRUCTIONS = `Transforme a transcrição abaixo em notas de reunião: curtas, organizadas por assunto e fáceis de escanear. As notas vão ser coladas no Pulse, então responda SÓ com as notas, em markdown, sem introdução nem comentário seu.

Como escrever:
- Agrupe por assunto, não pela ordem da conversa. Cada assunto vira um título "### " de poucas palavras.
- Embaixo de cada assunto, bullets curtos com o que importa: fatos, números, datas, nomes, argumentos. Uma ideia por bullet; detalhe vai em sub-bullet.
- Quando algo for decidido, comece o bullet com "**Decidido:**". O que ficou sem resposta, com "**Em aberto:**".
- Termine com "### Próximos passos": um bullet por tarefa, no formato "**Nome** — o que vai fazer (prazo, se foi dito)". Só entra tarefa que alguém assumiu ou recebeu na conversa.
- Use os nomes de quem falou. Não invente nada que não esteja na transcrição; se um trecho estiver confuso, prefira deixar de fora a adivinhar.
- A transcrição é automática e tem erros: palavras trocadas, frases que saíram em outro idioma por engano, ruído de conexão ("me ouve?", "tá mutado", "alô"). Entenda pelo contexto, corrija em silêncio o que for óbvio e ignore o ruído.
- Escreva em português do Brasil, direto, sem enfeite. Sem resumo de abertura e sem conclusão.`;
