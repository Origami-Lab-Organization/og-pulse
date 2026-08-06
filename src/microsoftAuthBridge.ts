import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

/**
 * Entry point da página de retorno do OAuth da Microsoft (microsoft-auth.html).
 *
 * A partir da MSAL v5 a janela-mãe não lê mais a URL do popup: é a página de
 * retorno que precisa repassar a resposta pelo BroadcastChannel. Sem este
 * script o código do OAuth chega na URL, o popup fica aberto em "Autorizando…"
 * e nenhuma conta é gravada.
 *
 * Página deliberadamente fora da SPA — carregar o app aqui faria o roteador
 * apagar o fragmento com o código antes desta chamada acontecer.
 */
broadcastResponseToMainFrame().catch((error) => {
  // Sem DevTools disponível (política da organização), a mensagem tem que
  // aparecer na própria página. Nenhum token é exibido: só o erro do fluxo.
  const message = error instanceof Error ? error.message : String(error);
  document.body.textContent = `Falha ao concluir a autorização: ${message}`;
});
