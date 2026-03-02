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

interface JobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result_markdown: string | null;
  error_message: string | null;
  module: string;
  module_label: string;
  updated_at: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useGenerateAnalysis() {
  return useMutation<AnalysisResult, Error, GenerateParams>({
    mutationFn: async ({ module, formData }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get employee tenant
      const { data: empData } = await supabase
        .from("employees")
        .select("tenant_id, id")
        .eq("auth_id", user.id)
        .single();

      if (!empData) throw new Error("Funcionário não encontrado");

      // 1. Start the job
      const { data: startData, error: startError } = await supabase.functions.invoke(
        "market-analysis-start",
        {
          body: {
            module: String(module),
            formData,
            userId: user.id,
            tenantId: empData.tenant_id,
          },
        }
      );

      if (startError) throw new Error("Falha ao iniciar análise: " + startError.message);
      if (startData?.error) throw new Error(startData.error);

      const { jobId } = startData;
      if (!jobId) throw new Error("Job ID não retornado");

      // 2. Poll until completed (every 3s, max 5 minutes)
      const maxAttempts = 100;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await sleep(3000);

        const { data: job, error: statusError } = await supabase.functions.invoke(
          "market-analysis-status",
          { body: { jobId } }
        );

        if (statusError) {
          console.error("Erro ao verificar status:", statusError);
          attempts++;
          continue;
        }

        const jobStatus = job as JobStatus;

        if (jobStatus.status === "completed" && jobStatus.result_markdown) {
          return {
            markdown: jobStatus.result_markdown,
            module: jobStatus.module,
            moduleLabel: jobStatus.module_label,
            timestamp: jobStatus.updated_at,
          };
        }

        if (jobStatus.status === "failed") {
          throw new Error(jobStatus.error_message || "Falha ao gerar análise");
        }

        attempts++;
      }

      throw new Error("Timeout: a análise demorou mais que o esperado. Tente novamente.");
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
