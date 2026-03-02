import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export interface AnalysisResult {
  markdown: string;
  module: string;
  moduleLabel: string;
  timestamp: string;
}

export interface SavedAnalysis {
  id: string;
  tenant_id: string;
  user_id: string;
  module: string;
  module_label: string;
  form_data: MarketFormData;
  result_markdown: string;
  chat_history: Array<{ role: string; content: string }>;
  created_at: string;
  updated_at: string;
}

export function useGenerateAnalysis() {
  return useMutation<AnalysisResult, Error, GenerateParams>({
    mutationFn: async ({ module, formData }) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      try {
        const { data, error } = await supabase.functions.invoke("market-analysis-generate", {
          body: { module: String(module), formData },
        });
        if (error) throw new Error(error.message || "Falha ao gerar análise");
        if (data?.error) throw new Error(data.error);
        return data as AnalysisResult;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          throw new Error("A análise excedeu o tempo limite de 90 segundos. Tente novamente.");
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
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

export function useMarketAnalyses(userId: string | undefined) {
  return useQuery<SavedAnalysis[]>({
    queryKey: ["market-analyses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_analyses" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
    enabled: !!userId,
  });
}

export function useSaveAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tenant_id: string;
      user_id: string;
      module: string;
      module_label: string;
      form_data: MarketFormData;
      result_markdown: string;
      chat_history?: Array<{ role: string; content: string }>;
    }) => {
      const { data, error } = await supabase
        .from("market_analyses" as any)
        .insert(params as any)
        .select()
        .single();
      if (error) throw error;
      return data as any as SavedAnalysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-analyses"] });
    },
  });
}

export function useUpdateAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; chat_history?: any; result_markdown?: string }) => {
      const { error } = await supabase
        .from("market_analyses" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-analyses"] });
    },
  });
}

export function useDeleteAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("market_analyses" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-analyses"] });
    },
  });
}
