import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectStakeholder, InfluenceLevel, InterestLevel, SponsorshipLevel, StakeholderAction } from '@/types/projectStakeholder';

export const useClientStakeholders = (
  clientId: string | undefined,
  currentProjectId: string | undefined,
  currentStakeholders: ProjectStakeholder[]
) => {
  return useQuery({
    queryKey: ['client-stakeholders', clientId, currentProjectId],
    queryFn: async () => {
      // Os candidatos são TODOS os stakeholders do cliente menos os deste projeto: tanto os
      // cadastrados na conta (`project_id` nulo) quanto os que vivem em projetos irmãos.
      // Antes esta consulta partia dos projetos do cliente, e por isso a ficha da conta ficava
      // invisível aqui — cadastrar na conta e não encontrar na importação seria o pior dos
      // dois mundos. Lê por `client_id`, que o banco carimba na escrita.
      const { data: stakeholders, error: stError } = await supabase
        .from('project_stakeholders')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });

      if (stError) throw stError;
      if (!stakeholders?.length) return [];

      // 3. Deduplicate by name+email, keeping most recent
      const seen = new Map<string, ProjectStakeholder>();
      for (const s of stakeholders) {
        if (s.project_id === currentProjectId) continue;
        const key = `${s.name.toLowerCase().trim()}|${(s.email || '').toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.set(key, {
            ...s,
            influence_level: s.influence_level as InfluenceLevel | null,
            interest_level: s.interest_level as InterestLevel | null,
            sponsorship_level: s.sponsorship_level as SponsorshipLevel | null,
            action: s.action as StakeholderAction | null,
          });
        }
      }

      // 4. Filter out stakeholders already in current project
      const currentNames = new Set(
        currentStakeholders.map(
          (s) => `${s.name.toLowerCase().trim()}|${(s.email || '').toLowerCase().trim()}`
        )
      );

      return Array.from(seen.values()).filter(
        (s) => !currentNames.has(`${s.name.toLowerCase().trim()}|${(s.email || '').toLowerCase().trim()}`)
      );
    },
    enabled: !!clientId && !!currentProjectId,
  });
};


/** Um stakeholder do cliente, com os projetos em que ele aparece. */
export interface ClientStakeholder extends ProjectStakeholder {
  /** Nomes dos projetos em que a pessoa aparece. Vazio = cadastro da conta, sem projeto. */
  projetos: string[];
}

/**
 * Os stakeholders de um cliente: os cadastrados na conta e os que vieram dos projetos dele.
 *
 * Uma consulta só, por `client_id`, porque o banco carimba o cliente do projeto na própria
 * linha (migration `20260917150000_stakeholder_do_cliente`) — a tela não precisa de join.
 *
 * A mesma pessoa costuma aparecer em vários projetos, então a lista é deduplicada por
 * nome+e-mail. Sem isso, um patrocinador de quatro projetos apareceria quatro vezes e a aba
 * viraria um relatório de duplicatas. O registro que fica é o mais recente, e a linha de
 * CONTA tem preferência sobre a de projeto: é ela que a pessoa edita nesta tela.
 */
export const useClientStakeholderDirectory = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ['client-stakeholder-directory', clientId],
    queryFn: async (): Promise<ClientStakeholder[]> => {
      const { data: linhas, error } = await supabase
        .from('project_stakeholders')
        .select('*, projeto:projects(name)')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const porPessoa = new Map<string, ClientStakeholder>();
      for (const linha of linhas ?? []) {
        const { projeto, ...s } = linha as typeof linha & { projeto: { name: string } | null };
        const chave = `${s.name.toLowerCase().trim()}|${(s.email || '').toLowerCase().trim()}`;
        const existente = porPessoa.get(chave);

        if (existente) {
          if (projeto?.name && !existente.projetos.includes(projeto.name)) {
            existente.projetos.push(projeto.name);
          }
          // Linha de conta assume a ficha: é a que esta tela edita e apaga.
          if (s.project_id === null) {
            porPessoa.set(chave, { ...mapear(s), projetos: existente.projetos });
          }
          continue;
        }

        porPessoa.set(chave, {
          ...mapear(s),
          projetos: projeto?.name ? [projeto.name] : [],
        });
      }

      return [...porPessoa.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },
    enabled: !!clientId,
  });
};

/** Os quatro campos que o Postgres devolve como texto livre e o domínio trata como enum. */
function mapear(s: Record<string, unknown>): ProjectStakeholder {
  return {
    ...(s as unknown as ProjectStakeholder),
    influence_level: s.influence_level as InfluenceLevel | null,
    interest_level: s.interest_level as InterestLevel | null,
    sponsorship_level: s.sponsorship_level as SponsorshipLevel | null,
    action: s.action as StakeholderAction | null,
  };
}
