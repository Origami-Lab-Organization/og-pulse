
# Migrar Edge Functions para Anthropic SDK

## Objetivo
Substituir o Lovable AI gateway (google/gemini-2.5-flash) pelo Anthropic SDK direto (claude-sonnet-4-20250514) nas duas edge functions de análise de mercado.

A chave `ANTHROPIC_API_KEY` já está configurada nos secrets do projeto.

## Alterações

### 1. `supabase/functions/market-analysis-generate/index.ts`
- Remover chamada ao `ai.gateway.lovable.dev`
- Importar Anthropic SDK via `npm:@anthropic-ai/sdk`
- Usar `ANTHROPIC_API_KEY` em vez de `LOVABLE_API_KEY`
- Criar instância `new Anthropic({ apiKey })` e chamar `client.messages.create()` com modelo `claude-sonnet-4-20250514`, max_tokens 4000
- Extrair texto com `message.content.find(b => b.type === 'text')?.text`
- Manter CORS, MODULE_LABELS e estrutura de resposta iguais

### 2. `supabase/functions/market-analysis-refine/index.ts`
- Mesma migração: Anthropic SDK via `npm:@anthropic-ai/sdk`
- Usar `ANTHROPIC_API_KEY`
- `client.messages.create()` com modelo `claude-sonnet-4-20250514`, max_tokens 2000
- Montar array de messages a partir do chatHistory (convertendo roles para 'user'/'assistant')
- System prompt via parâmetro `system` separado (padrão da API Anthropic)

### Detalhes Técnicos
- Import no Deno: `import Anthropic from "npm:@anthropic-ai/sdk";`
- Tratamento de erros mantido (try/catch com mensagens em PT-BR)
- Nenhuma alteração no frontend (`MarketAnalysisPage.tsx`) -- a interface de resposta JSON permanece a mesma
