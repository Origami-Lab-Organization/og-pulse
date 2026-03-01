import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODULE_LABELS: Record<string, string> = {
  "1": "Market Sizing & TAM Analysis",
  "2": "Competitive Landscape Deep Dive",
  "3": "Customer Persona & Segmentation",
  "4": "Industry Trend Analysis",
  "5": "SWOT + Porter's Five Forces",
  "6": "Pricing Strategy Analysis",
  "7": "Go-To-Market Strategy",
  "8": "Customer Journey Mapping",
  "9": "Financial Modeling & Unit Economics",
  "10": "Risk Assessment & Scenario Planning",
  "11": "Market Entry & Expansion Strategy",
  "12": "Executive Strategy Synthesis",
  all: "Análise Estratégica Completa (Módulos 1-12)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { module, formData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const moduleLabel = MODULE_LABELS[String(module)] || String(module);

    const systemPrompt = `Você é o Strategy Analyst, um agente de análise estratégica de negócios de nível consultoria sênior. Você combina o rigor analítico de McKinsey, Bain e Goldman Sachs com a velocidade e praticidade que founders precisam.

Você receberá o contexto de um negócio e o módulo de análise solicitado. Execute a análise diretamente, sem fazer perguntas adicionais.

Retorne a análise completa em português do Brasil, formatada em Markdown com:
- Seções claras com headers ##
- Tabelas quando relevante
- Listas com insights específicos
- Sempre termine com uma seção "## Recomendações e Próximos Passos" com ações concretas priorizadas

Seja específico ao contexto fornecido. Nunca seja genérico. Use benchmarks reais do setor quando citar dados.`;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar análise" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const markdown = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({
      markdown,
      module: String(module),
      moduleLabel,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("market-analysis-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
