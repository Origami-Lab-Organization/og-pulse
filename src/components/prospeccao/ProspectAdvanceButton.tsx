import { ArrowRight, CalendarCheck, CircleCheck, Handshake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdateProspectStage } from '@/hooks/useProspects';
import {
  PROSPECT_NEXT_STAGE,
  PROSPECT_STAGES_WITH_PROMPT,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';

/**
 * O rótulo diz a AÇÃO, não a etapa de destino: "Reunião feita" é o que a pessoa fez,
 * "Reunião agendada" seria o nome da coluna. Botão nomeado por coluna obriga a traduzir
 * mentalmente antes de clicar.
 */
const ACAO: Partial<Record<ProspectStage, { label: string; icon: LucideIcon }>> = {
  reuniao_agendada: { label: 'Agendar reunião', icon: CalendarCheck },
  reuniao_feita: { label: 'Marcar reunião feita', icon: Handshake },
  qualificado: { label: 'Qualificar oportunidade', icon: CircleCheck },
};

interface ProspectAdvanceButtonProps {
  prospect: ProspectWithCompany;
  /** Chamado quando a etapa de destino abre um registro antes de avançar. */
  onPrompt: (stage: ProspectStage) => void;
  size?: 'sm' | 'default';
}

/**
 * Um botão só, sempre com o próximo passo daquele contato.
 *
 * É a alternativa ao arraste para quem está dentro do card — e o caminho principal no
 * celular, onde arrastar entre seis colunas não é uma interação honesta.
 *
 * Não aparece em "A abordar" nem em "Em cadência": quem move as duas é o registro de
 * atividade, decidido pela cadência no banco. Um botão de avanço ali ofereceria um
 * segundo dono para a mesma regra.
 */
export function ProspectAdvanceButton({ prospect, onPrompt, size = 'sm' }: ProspectAdvanceButtonProps) {
  const moverEtapa = useUpdateProspectStage();
  const proxima = PROSPECT_NEXT_STAGE[prospect.stage];
  const acao = proxima ? ACAO[proxima] : undefined;

  if (!proxima || !acao) return null;

  const avancar = () => {
    if (PROSPECT_STAGES_WITH_PROMPT.includes(proxima)) {
      onPrompt(proxima);
      return;
    }
    moverEtapa.mutate({ id: prospect.id, stage: proxima });
  };

  const Icone = acao.icon;

  return (
    <Button type="button" size={size} onClick={avancar} disabled={moverEtapa.isPending}>
      <Icone className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      {acao.label}
      <ArrowRight className="ml-1.5 h-3.5 w-3.5 opacity-70" aria-hidden="true" />
    </Button>
  );
}
