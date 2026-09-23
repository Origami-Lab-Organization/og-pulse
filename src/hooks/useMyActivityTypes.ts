import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MyActivityType {
  id: string;
  name: string;
  description: string | null;
  /** O centro de custo do item. É por ele que a grade agrupa as linhas (PUL-222). */
  costCenterId: string | null;
  costCenterName: string | null;
}

/**
 * As atividades em que ESTA pessoa pode lançar hora, com o centro de custo de cada uma.
 *
 * O filtro por `activity_type_employees` FICA (decisão da PUL-222). Ele é anterior a esta
 * onda e responde outra pergunta: é sobre RELEVÂNCIA — "Recrutamento" não precisa aparecer
 * para quem não é do RH —, não sobre permissão por centro de custo. O filtro por centro é que
 * caiu, porque prendia o lançamento a um cadastro: esquecer de associar alguém impediria essa
 * pessoa de lançar hora. Aqui, esquecer o vínculo só deixa a lista mais curta, e
 * `applies_to_all` é o padrão.
 *
 * A consulta pede só colunas que existem. `cost_centers` não tem `code` — o nome já carrega o
 * código (ex.: "OG001_Administrativo") — e pedir coluna inexistente derruba a consulta inteira:
 * a grade recebe lista vazia e a seção fora de projeto simplesmente some, sem erro visível.
 *
 * @param weekEndDate - último dia da semana exibida (yyyy-MM-dd). Só atividades criadas até
 *   essa data voltam, para semana passada não mostrar item que ainda não existia.
 */
export const useMyActivityTypes = (employeeId: string | undefined, weekEndDate?: string) => {
  return useQuery({
    queryKey: ['my-activity-types', employeeId, weekEndDate],
    queryFn: async (): Promise<MyActivityType[]> => {
      if (!employeeId) return [];

      const ativas = supabase
        .from('activity_types')
        .select(`
          id, name, description, applies_to_all,
          cost_center:cost_centers(id, name),
          activity_type_employees(employee_id)
        `)
        .eq('is_active', true);

      // Só atividades que já existiam na semana exibida.
      const daSemana = weekEndDate ? ativas.lte('created_at', weekEndDate + 'T23:59:59Z') : ativas;

      const { data, error } = await daSemana.order('name');
      if (error) throw error;

      return (data ?? [])
        .filter(
          (at) =>
            at.applies_to_all || at.activity_type_employees.some((e) => e.employee_id === employeeId)
        )
        .map((at) => ({
          id: at.id,
          name: at.name,
          description: at.description,
          costCenterId: at.cost_center?.id ?? null,
          costCenterName: at.cost_center?.name ?? null,
        }));
    },
    enabled: !!employeeId,
  });
};
