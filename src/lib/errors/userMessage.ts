/**
 * Traduz erro de banco em frase que a pessoa na tela consegue agir.
 *
 * Existe porque o toast mostrava `error.message` cru, e um usuário leu
 * "function public.has_role(uuid, uuid, unknown) does not exist" ao tentar mudar hora
 * planejada. Isso não diz o que fazer, não diz de quem é o problema, e nem era sobre
 * permissão — era função removida numa migration.
 *
 * A regra é uma só: só chega à tela a frase que alguém escreveu PARA a tela.
 *
 * - `PU001` é o SQLSTATE que o banco usa para mensagem redigida ao usuário
 *   (convenção de 20260908150000). Passa direto.
 * - Erro de permissão vira frase de permissão — nunca o texto da policy, que cita nome
 *   de tabela e não ajuda ninguém.
 * - O resto é falha técnica: frase acionável, e o detalhe vai para o console, onde o
 *   time acha sem expor o interno para quem só queria salvar uma linha.
 */

/** SQLSTATE reservado para mensagem já redigida ao usuário final. */
export const CODIGO_MENSAGEM_DE_USUARIO = 'PU001';

type ErroDeBanco = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const PERMISSAO = new Set([
  '42501', // insufficient_privilege — inclui recusa de RLS
  'PGRST301', // PostgREST: JWT ausente ou expirado
]);

const GENERICA =
  'Não foi possível salvar. Isso é uma falha do sistema, não uma restrição sua. Tente de novo em instantes; se continuar, avise o time com o horário.';

const SEM_PERMISSAO =
  'Você não tem permissão para esta alteração. Se precisa dela, peça a quem administra o sistema.';

function comoErroDeBanco(erro: unknown): ErroDeBanco | null {
  if (!erro || typeof erro !== 'object') return null;
  const e = erro as ErroDeBanco;
  const temFormato = typeof e.code === 'string' || typeof e.message === 'string';
  return temFormato ? e : null;
}

/** Frase que o banco escreveu para a tela (convenção `PU001`). */
function ehRedigidaNoBanco(e: ErroDeBanco): boolean {
  return e.code === CODIGO_MENSAGEM_DE_USUARIO && Boolean(e.message);
}

/** Recusa de acesso — a frase do Postgres cita tabela e policy, e não serve ao usuário. */
function ehRecusaDeAcesso(e: ErroDeBanco): boolean {
  return Boolean(e.code) && PERMISSAO.has(e.code as string);
}

/** `throw new Error(...)` do próprio front: sem `code`, e quem escreveu sabia quem ia ler. */
function ehRedigidaNoFront(erro: unknown, e: ErroDeBanco): boolean {
  return erro instanceof Error && !e.code && Boolean(e.message);
}

/**
 * @param erro o que o Supabase ou o `throw` devolveu
 * @param generica frase de falha técnica específica da tela, quando "não foi possível
 *   salvar" não couber (por exemplo numa leitura)
 */
export function mensagemParaUsuario(erro: unknown, generica: string = GENERICA): string {
  const e = comoErroDeBanco(erro);
  if (!e) return generica;
  if (ehRedigidaNoBanco(e)) return e.message as string;
  if (ehRecusaDeAcesso(e)) return SEM_PERMISSAO;
  if (ehRedigidaNoFront(erro, e)) return e.message as string;

  console.error('[pulse] erro técnico não exibido ao usuário:', e.code, e.message, e.details);
  return generica;
}
