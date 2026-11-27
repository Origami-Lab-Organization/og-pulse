# Runner de insights de IA

Gera os insights da página da empresa (US-0057): produtos e serviços, clientes, concorrentes,
notícias e a proposta de porte, sempre com fonte. Roda **no Mac de quem gera**, com a assinatura
do Claude dessa pessoa, e atende **só os pedidos dela**.

Decisão e motivos: [`.harness/adr/0057`](../../.harness/adr/0057-insights-de-ia-por-runner-local-com-a-assinatura-de-quem-gera.md).

## Como ele se encaixa

```
Pulse (navegador)              Supabase                           seu Mac
─────────────────              ────────                           ───────
"Gerar insights com IA" ─────▶ prospect_insights_pedidos (fila)
                               só aceita com o seu runner ativo
                                         │
                               prospect_insights_runners ◀─────── sinal a cada 30 s
                                         └──────────────────────▶ puxa o pedido (a cada 5 s)
                                                                  roda o Claude Code
                                                                  (busca e leitura na web)
                               prospect_company_insights ◀─────── grava os temas
                               prospect_porte_propostas  ◀─────── e a proposta de porte
```

**Ninguém chama o seu Mac.** O runner só faz conexão de saída. Com ele parado, a página mostra
"Runner indisponível" e o botão fica desabilitado.

O runner entra no Pulse com o **seu login** e a chave publicável, como o MCP da Prospecção. Nunca
usa a chave de serviço: a RLS confere cada escrita. A pessoa precisa da capacidade
`prospeccao:gerar-insights`, que hoje só o Victor tem.

## Instalar

Precisa de Node 20 ou mais novo e do Claude Code instalado e logado com a sua assinatura
(`claude` no terminal).

1. Crie `~/.og-pulse/insights-runner.env`, só legível por você (`chmod 600`):

   ```
   SUPABASE_URL=https://<projeto>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=<chave publicável do Pulse>
   PULSE_EMAIL=<seu e-mail do Pulse>
   PULSE_PASSWORD=<sua senha do Pulse>
   ```

   São os mesmos valores do MCP da Prospecção. Se o `claude` não estiver no `PATH`, acrescente
   `CLAUDE_BIN=/caminho/do/claude`.

2. Instale e rode:

   ```bash
   cd apps/insights-runner
   npm install
   npm start
   ```

   "Runner de insights no ar." aparece no terminal. Deixe a janela aberta enquanto quiser gerar.

## O que ele faz em cada pedido

- Roda o Claude Code isolado: só `WebSearch` e `WebFetch`, sem MCP, sem as suas configurações e
  ganchos, numa pasta temporária vazia e sem guardar a sessão.
- Até 15 minutos por pedido. Passou disso, ou a assinatura chegou ao limite, o pedido fica como
  falhou, com o motivo, e dá para pedir de novo.
- Ao iniciar, marca como falhou o que ficou "gerando" quando o runner parou.
- O terminal mostra só o id do pedido e o resultado; nada da empresa nem da resposta.
