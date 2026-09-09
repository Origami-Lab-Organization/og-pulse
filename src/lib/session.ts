/**
 * O Supabase guarda a sessão em `localStorage` sob `sb-<ref>-auth-token`. Se a chave
 * existe, a pessoa provavelmente está logada e só recarregou a página: vale esperar o
 * auth resolver (RootEntry) e não tratá-la como visitante (analytics). Sem a chave, é
 * visitante.
 */
export function hasStoredSession(): boolean {
  try {
    return Object.keys(localStorage).some((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
  } catch {
    return false;
  }
}
