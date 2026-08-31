import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";
import { z } from "npm:zod@3";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// O contrato de saída é o mesmo de antes — o front consome estes campos.
// Com output_config o modelo é obrigado a respeitar o schema, o que elimina o
// tratamento de markdown que existia aqui (o gateway devolvia texto livre e o
// código raspava ```json à mão).
const CartaoCnpj = z.object({
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
  cnpj: z.string().describe("apenas números, 14 dígitos"),
  cep: z.string().describe("apenas números, 8 dígitos"),
  logradouro: z.string(),
  numero: z.string(),
  complemento: z.string().nullable().describe("ex: SALA 101, ANDAR 5, BLOCO A"),
  bairro: z.string(),
  cidade: z.string(),
  estado: z.string().describe("2 letras maiúsculas"),
  segment: z.string().nullable().describe("atividade econômica principal (CNAE) do Cartão CNPJ"),
  email: z.string().nullable().describe("campo ENDEREÇO ELETRÔNICO"),
  telefone: z.string().nullable().describe("apenas números, DDD + número"),
});

const SYSTEM = `Você extrai dados de Cartões CNPJ da Receita Federal.
Leia o documento e preencha cada campo com o que estiver escrito nele.
Use null em qualquer campo que não constar no documento — nunca invente,
nunca infira a partir de conhecimento externo.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return json({ error: "PDF base64 é obrigatório" }, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not configured");
      return json({ error: "Chave de API não configurada" }, 500);
    }

    console.log("Processing CNPJ card PDF extraction...");

    const client = new Anthropic({ apiKey });

    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { format: zodOutputFormat(CartaoCnpj) },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            { type: "text", text: "Extraia os dados deste Cartão CNPJ." },
          ],
        },
      ],
    });

    // O modelo pode recusar (stop_reason "refusal") ou o parse pode falhar;
    // nos dois casos parsed_output vem nulo e não há o que devolver ao front.
    if (response.stop_reason === "refusal") {
      console.error("Model refused:", response.stop_details?.category);
      return json({ error: "Não foi possível extrair dados do documento" }, 500);
    }

    const extractedData = response.parsed_output;
    if (!extractedData) {
      console.error("No parsed output; stop_reason:", response.stop_reason);
      return json({ error: "Não foi possível interpretar os dados extraídos" }, 500);
    }

    console.log("Data extracted successfully");
    return json(extractedData, 200);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.error("Rate limit exceeded");
      return json(
        { error: "Limite de requisições excedido. Tente novamente em alguns segundos." },
        429,
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic authentication failed");
      return json({ error: "Chave de API inválida. Avise o administrador." }, 500);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error:", error.status, error.message);
      return json({ error: "Erro ao processar o documento" }, 500);
    }
    console.error("Error processing CNPJ card:", error);
    return json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      500,
    );
  }
});
