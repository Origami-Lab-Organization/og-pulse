/**
 * Identificadores do app registrado no Microsoft Entra ID.
 *
 * Ficam versionados de propósito. Num app SPA (Authorization Code + PKCE) não
 * existe client secret, e estes dois valores são embutidos no bundle público em
 * qualquer build — qualquer pessoa os lê abrindo o JavaScript do site. A
 * segurança do fluxo vem do PKCE e da authority amarrada ao tenant, não do
 * sigilo deles.
 *
 * Versionar também é o que faz a integração funcionar no Lovable Cloud, que não
 * oferece variável de ambiente de build: o painel de Secrets é do servidor
 * (Edge Functions) e recusa nomes com prefixo `VITE_`.
 *
 * `VITE_MICROSOFT_*` continua tendo prioridade, para apontar um app diferente
 * em desenvolvimento sem tocar no código.
 */

const FALLBACK_CLIENT_ID = '53d51c7c-a706-4c82-ba99-63192a93202f';
const FALLBACK_TENANT_ID = 'a3d591d4-0b3e-4a17-9745-b78bcf007f74';

export const MICROSOFT_CLIENT_ID =
  import.meta.env.VITE_MICROSOFT_CLIENT_ID || FALLBACK_CLIENT_ID;

export const MICROSOFT_TENANT_ID =
  import.meta.env.VITE_MICROSOFT_TENANT_ID || FALLBACK_TENANT_ID;
