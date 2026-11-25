import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  lerEscolha,
  linhasParaEscolha,
  modelosParaEscolha,
  servicosParaEscolha,
  valorDaEscolha,
  type OpcaoSimples,
} from '@/lib/catalogo';
import { MARCA_DE_DESATIVADO } from '@/lib/catalogo.constants';
import type { Service } from '@/types/service';
import type { ServiceLine } from '@/types/serviceLine';
import type { ServiceRevenueModel } from '@/types/serviceRevenueModel';

interface ServicoDoProjetoFieldProps {
  /** Escolha gravada no formulário: serviço e modelo de receita juntos (`valorDaEscolha`). */
  value: string;
  onChange: (valor: string) => void;
  services: Service[];
  lines: ServiceLine[];
  models: ServiceRevenueModel[];
}

function CampoDeEscolha(props: {
  id: string;
  label: string;
  value: string;
  opcoes: OpcaoSimples[];
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  const { id, label, value, opcoes, disabled, onChange } = props;
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Escolha" />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.rotulo}
              {o.desativado && <span className="ml-1.5 text-xs text-muted-foreground">— {MARCA_DE_DESATIVADO}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Linha › Serviço › Modelo de receita do projeto, em três campos (US-0046). Cada um filtra o
 * próximo; trocar a linha limpa o serviço, e serviço com um modelo só já vem com ele escolhido.
 */
export function ServicoDoProjetoField(props: ServicoDoProjetoFieldProps) {
  const { value, onChange, services, lines, models } = props;
  const escolha = lerEscolha(value);
  const servico = services.find((s) => s.id === escolha.serviceId) ?? null;
  const [linhaEscolhida, setLinhaEscolhida] = useState<string | null>(null);
  const linhaId = servico?.serviceLineId ?? linhaEscolhida;

  const linhas = linhasParaEscolha(lines, linhaId);
  const servicos = servicosParaEscolha(services, lines, linhaId, escolha.serviceId || null);
  const modelos = modelosParaEscolha(models, escolha.serviceId || null, escolha.modelId);

  const escolherLinha = (id: string) => {
    setLinhaEscolhida(id);
    onChange('');
  };
  const escolherServico = (id: string) => {
    const validos = modelosParaEscolha(models, id, null);
    onChange(valorDaEscolha({ serviceId: id, modelId: validos.length === 1 ? validos[0].id : null }));
  };
  const escolherModelo = (id: string) => onChange(valorDaEscolha({ serviceId: escolha.serviceId, modelId: id }));

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <CampoDeEscolha id="projeto-linha" label="Linha de serviço" value={linhaId ?? ''} opcoes={linhas} onChange={escolherLinha} />
      <CampoDeEscolha
        id="projeto-servico"
        label="Serviço"
        value={escolha.serviceId}
        opcoes={servicos}
        disabled={!linhaId}
        onChange={escolherServico}
      />
      <CampoDeEscolha
        id="projeto-modelo"
        label="Modelo de receita"
        value={escolha.modelId ?? ''}
        opcoes={modelos}
        disabled={!escolha.serviceId}
        onChange={escolherModelo}
      />
    </div>
  );
}
