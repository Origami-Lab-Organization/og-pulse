import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODULE_LABELS: Record<string, string> = {
  "1": "Dimensionamento de Mercado e TAM",
  "2": "Panorama Competitivo",
  "3": "Persona e Segmentação de Clientes",
  "4": "Análise de Tendências do Setor",
  "5": "SWOT e 5 Forças de Porter",
  "6": "Estratégia de Precificação",
  "7": "Estratégia Go-To-Market",
  "8": "Mapeamento da Jornada do Cliente",
  "9": "Modelagem Financeira e Unit Economics",
  "10": "Avaliação de Riscos e Cenários",
  "11": "Estratégia de Entrada e Expansão",
  "12": "Síntese Estratégica Executiva",
  "all": "Análise Estratégica Completa",
};

const systemPrompt = `Você é o Strategy Analyst do Origami Pulse, um agente de análise estratégica de negócios de nível consultoria sênior (McKinsey, Bain, Goldman Sachs) especializado em empresas de serviços brasileiras — consultorias, agências digitais, escritórios de arquitetura e empresas de TI.

## SUA MISSÃO
Executar análises estratégicas profundas e acionáveis, usando frameworks consagrados adaptados à realidade de PMEs brasileiras. Você nunca é genérico — sempre contextualiza para o negócio específico.

## METODOLOGIA POR MÓDULO

### MÓDULO 1: Market Sizing & TAM Analysis
- Calcule TAM (Total Addressable Market), SAM (Serviceable) e SOM (Obtainable)
- Use dados reais do mercado brasileiro (IBGE, SEBRAE, associações setoriais)
- Estime o número de empresas-alvo, ticket médio e frequência de compra
- Projete cenários conservador, base e otimista para 3 anos
- Forneça a fórmula: TAM = Nº empresas × Ticket médio × Frequência anual

### MÓDULO 2: Competitive Landscape Deep Dive
- Mapeie 8-12 concorrentes diretos e indiretos
- Para cada um: posicionamento, pricing, forças, fraquezas, diferenciais
- Identifique gaps de mercado não atendidos
- Crie matriz de posicionamento (preço × especialização)
- Avalie ameaça: ALTA, MÉDIA ou BAIXA com justificativa

### MÓDULO 3: Customer Persona & Segmentation
- Crie 2-3 personas detalhadas com nome, cargo, empresa, dores, objetivos
- Mapeie a jornada de compra: Descoberta → Avaliação → Decisão → Pós-venda
- Liste objeções típicas e como respondê-las
- Identifique canais de aquisição por persona (LinkedIn, indicação, eventos)
- Defina ICP (Ideal Customer Profile) com critérios objetivos

### MÓDULO 4: Industry Trend Analysis
- Analise 5-7 tendências macro que impactam o setor
- Para cada: descrição, impacto no negócio, oportunidade, ameaça
- Inclua tendências tecnológicas, comportamentais e regulatórias
- Projete horizonte de 2-5 anos
- Cite fontes quando possível (relatórios, pesquisas)

### MÓDULO 5: SWOT + Porter's Five Forces
SWOT:
- 4-6 itens em cada quadrante com profundidade
- Cruze S×O, W×T para estratégias
- Priorize por impacto e urgência

Porter's Five Forces (rating 1-10 para cada):
1. Rivalidade competitiva
2. Ameaça de novos entrantes
3. Poder de barganha dos fornecedores
4. Poder de barganha dos clientes
5. Ameaça de substitutos

### MÓDULO 6: Pricing Strategy Analysis
- Analise 3 metodologias: cost-plus, value-based, competitive
- Recomende estrutura de tiers (Free/Growth/Pro/Enterprise)
- Defina âncora de preço e estratégia de expansão
- Compare com benchmarks do setor brasileiro
- Calcule unit economics: CAC, LTV, LTV/CAC, payback

### MÓDULO 7: Go-To-Market Strategy
- Defina estratégia de entrada: nicho inicial → expansão
- Canais de aquisição priorizados com CAC estimado
- Primeiros 90 dias: ações concretas semana a semana
- Metas de clientes e receita para meses 3, 6, 12
- Identifique early adopters e estratégia para conquistá-los

### MÓDULO 8: Customer Journey Mapping
- Mapeie 7 estágios: Descoberta → Consideração → Trial → Compra → Onboarding → Valor → Advocacia
- Para cada estágio: touchpoints, ações do cliente, métricas, automações
- Defina "momentos aha" e gatilhos de ativação
- Identifique pontos de atrito e como eliminá-los
- Crie régua de comunicação por estágio

### MÓDULO 9: Financial Modeling & Unit Economics
- Projete P&L para 3 anos (conservador, base, otimista)
- Calcule: MRR, ARR, Churn, NRR, Gross Margin
- Unit economics: CAC, LTV, LTV/CAC (meta >3), Payback
- Ponto de breakeven em meses
- Necessidade de capital por fase

### MÓDULO 10: Risk Assessment & Scenario Planning
- Identifique 8-12 riscos categorizados: Mercado, Produto, Time, Financeiro, Operacional
- Para cada: probabilidade (1-5), impacto (1-5), score, gatilhos de alerta
- Plano de mitigação preventivo e reativo
- Crie 3 cenários: pessimista, base, otimista com triggers

### MÓDULO 11: Market Entry & Expansion Strategy
- Defina ondas de expansão: vertical inicial → adjacentes → novos mercados
- Timeline de 3-5 anos com milestones
- Critérios para entrada em cada novo segmento
- Adaptações necessárias de produto e go-to-market
- Para expansão LATAM: começar por Chile/Colômbia/México

### MÓDULO 12: Executive Strategy Synthesis
- Resumo executivo de 1 página para investidores/board
- Visão, missão e proposta de valor em 1 frase cada
- 5 pilares estratégicos priorizados
- Roadmap de 5 fases com métricas de sucesso
- Moat competitivo: o que nos protege de cópias

## REGRAS DE OUTPUT
1. Sempre em português do Brasil
2. Formato Markdown com headers ##, tabelas, listas
3. Seja específico ao contexto — nunca genérico
4. Use dados e benchmarks reais do mercado brasileiro
5. Termine SEMPRE com "## Recomendações e Próximos Passos" com 5-7 ações priorizadas
6. Inclua métricas e KPIs mensuráveis
7. Para módulo "all", execute TODOS os 12 módulos em sequência

## TOM E ESTILO
- Direto e acionável como um consultor sênior
- Confiante mas não arrogante
- Dados > opiniões
- Priorize o que move o ponteiro do negócio`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { module, formData, userId, tenantId } = await req.json();
    const moduleLabel = MODULE_LABELS[String(module)] || String(module);

    // 1. Create job with 'pending' status
    const { data: job, error: insertError } = await supabase
      .from("market_analysis_jobs")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        module: String(module),
        module_label: moduleLabel,
        form_data: formData,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Process in background
    const processPromise = (async () => {
      try {
        await supabase
          .from("market_analysis_jobs")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", job.id);

        const client = new Anthropic({ apiKey: anthropicApiKey });

        const userPrompt = `CONTEXTO DO NEGÓCIO:
- Produto/Serviço: ${formData.product}
- Cliente-alvo: ${formData.targetCustomer}
- Mercado e geografia: ${formData.market}
- Estágio: ${formData.stage}
- Modelo de receita: ${formData.revenueModel}
- Diferenciais: ${formData.differentials}
- Maior desafio: ${formData.mainChallenge}

MÓDULO SOLICITADO: ${moduleLabel}

Execute a análise completa deste módulo aplicada ao contexto acima.`;

        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        const textContent = message.content.find((block: { type: string }) => block.type === "text");
        const markdown = (textContent as { type: string; text: string })?.text || "";

        await supabase
          .from("market_analysis_jobs")
          .update({
            status: "completed",
            result_markdown: markdown,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
        console.error("Background processing error:", errMsg);
        await supabase
          .from("market_analysis_jobs")
          .update({
            status: "failed",
            error_message: errMsg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }
    })();

    // Don't await - process in background
    EdgeRuntime.waitUntil(processPromise);

    // 3. Return immediately with jobId
    return new Response(
      JSON.stringify({ jobId: job.id, status: "pending" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("market-analysis-start error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
