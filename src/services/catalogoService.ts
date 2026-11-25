import { serviceService } from '@/services/serviceService';
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
};
