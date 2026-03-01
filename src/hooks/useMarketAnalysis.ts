import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketFormData {
  product: string;
  targetCustomer: string;
  market: string;
  stage: string;
  revenueModel: string;
  differentials: string;
  mainChallenge: string;
}

interface GenerateParams {
  module: string | number;
  formData: MarketFormData;
}

interface AnalysisResult {
  markdown: string;
  module: string;
  moduleLabel: string;
  timestamp: string;
}

export function useGenerateAnalysis() {
  return useMutation<AnalysisResult, Error, GenerateParams>({
    mutationFn: async ({ module, formData }) => {
      const { data, error } = await supabase.functions.invoke("market-analysis-generate", {
        body: { module: String(module), formData },
      });
      if (error) throw new Error(error.message || "Falha ao gerar análise");
      if (data?.error) throw new Error(data.error);
      return data as AnalysisResult;
    },
  });
}

export function useRefineAnalysis() {
  return useMutation({
    mutationFn: async ({
      currentMarkdown,
      question,
      chatHistory,
    }: {
      currentMarkdown: string;
      question: string;
      chatHistory: Array<{ role: string; content: string }>;
    }) => {
      const { data, error } = await supabase.functions.invoke("market-analysis-refine", {
        body: { currentMarkdown, question, chatHistory },
      });
      if (error) throw new Error(error.message || "Falha ao refinar análise");
      if (data?.error) throw new Error(data.error);
      return data as { response: string };
    },
  });
}
