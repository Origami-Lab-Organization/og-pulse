import { supabase } from '@/integrations/supabase/client';

/**
 * Leitura das novidades do produto (ADR-0048). A RLS só deixa ler e gravar as linhas da
 * própria conta; `userId` aqui é só o filtro da consulta.
 */
export const productNewsService = {
  /**
   * Já viu esta edição? Erro conta como "já viu": um anúncio nunca deve abrir por cima de
   * quem está trabalhando só porque não deu para confirmar (mesma regra do tour, PUL-251).
   */
  async hasRead(userId: string, version: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('product_news_reads')
      .select('version')
      .eq('user_id', userId)
      .eq('version', version)
      .maybeSingle();

    if (error) return true;
    return Boolean(data);
  },

  /** Registra que viu. Repetir não duplica nem muda a primeira data (ON CONFLICT DO NOTHING). */
  async markRead(userId: string, version: string): Promise<void> {
    const { error } = await supabase
      .from('product_news_reads')
      .upsert({ user_id: userId, version }, { onConflict: 'user_id,version', ignoreDuplicates: true });

    if (error) throw error;
  },
};
