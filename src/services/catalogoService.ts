import { supabase } from '@/integrations/supabase/client';
import { serviceService } from '@/services/serviceService';
import { SEM_SERVICO } from '@/lib/catalogo.constants';
import { SERVICE_LINE_LABELS } from '@/types/serviceLine';
import { serviceRevenueModelService } from '@/services/serviceRevenueModelService';
import { modelTypeDoModelo, rotuloDoModelo } from '@/lib/formasDeReceita';
import type { CreateServiceInput, ServiceDB } from '@/types/service';
import type { FormaDeReceita } from '@/types/serviceRevenueModel';

export interface SalvarServicoInput {
  tenantId: string;
  /** `null` cria o serviço. */
  id: string | null;
  dados: CreateServiceInput;
  /** Modelos de receita a criar, cada um com as suas formas. */
  modelosNovos: FormaDeReceita[][];
  /** Ids dos modelos de receita tirados no painel. */
  modelosRemovidos: string[];
}

/**
 * Grava o serviço e os modelos de receita do painel do catálogo (US-0046). O serviço nasce sem
 * modelo; o banco o deixa ativo quando o primeiro modelo entra e inativo quando o último sai
 * (20261125110000). Por isso o serviço é lido de novo no fim.
 */
export const catalogoService = {
  async salvarServico(input: SalvarServicoInput): Promise<ServiceDB> {
    const { tenantId, id, dados, modelosNovos, modelosRemovidos } = input;
    const servico = id ? await serviceService.update(id, dados) : await serviceService.create(dados, tenantId);

    for (const modeloId of modelosRemovidos) await serviceRevenueModelService.delete(modeloId);
    for (const formas of modelosNovos) {
      await serviceRevenueModelService.create(
        {
          serviceId: servico.id,
          name: rotuloDoModelo(formas),
          formas,
          modelType: modelTypeDoModelo(formas),
          baseValue: null,
          billingUnit: null,
        },
        tenantId,
      );
    }

    const atualizados = await serviceService.getAll(tenantId);
    return atualizados.find((s) => s.id === servico.id) ?? servico;
  },

  /**
   * Linha de serviço de cada projeto, para os relatórios agruparem por linha (US-0048).
   * `projects.service_line` guarda o id do serviço; projetos antigos guardam um código fixo.
   */
  async resolvedorDeLinha(tenantId: string): Promise<ResolvedorDeLinha> {
    const [servicos, linhas] = await Promise.all([
      supabase.from('services').select('id, service_line_id').eq('tenant_id', tenantId),
      supabase.from('service_lines').select('id, name, is_active, sort_order').eq('tenant_id', tenantId).order('sort_order'),
    ]);
    const linhaDoServico = new Map((servicos.data ?? []).map((s) => [s.id, s.service_line_id]));
    const nomeDaLinha = new Map((linhas.data ?? []).map((l) => [l.id, l.name]));
    const linhaDe = (serviceLine: string | null): LinhaDoProjeto => {
      if (!serviceLine) return { chave: SEM_SERVICO, rotulo: 'Sem serviço' };
      const linhaId = linhaDoServico.get(serviceLine);
      if (linhaId) return { chave: linhaId, rotulo: nomeDaLinha.get(linhaId) ?? 'Sem linha' };
      return { chave: serviceLine, rotulo: SERVICE_LINE_LABELS[serviceLine] ?? serviceLine };
    };
    const linhasAtivas = (linhas.data ?? []).filter((l) => l.is_active).map((l) => ({ chave: l.id, rotulo: l.name }));
    return { linhaDe, linhasAtivas };
  },
};

export interface LinhaDoProjeto {
  chave: string;
  rotulo: string;
}

export interface ResolvedorDeLinha {
  linhaDe: (serviceLine: string | null) => LinhaDoProjeto;
  /** Linhas ativas do tenant, para o relatório mostrar todas, mesmo sem projeto no período. */
  linhasAtivas: LinhaDoProjeto[];
}
