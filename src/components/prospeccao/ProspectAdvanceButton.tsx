import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useRegisterActivity } from '@/hooks/useProspectActivities';
import { useUpdateProspectStage } from '@/hooks/useProspects';
import {
  PROSPECT_NEXT_STAGE,
  advanceModeFor,
  canConvertToLead,
  getProspectStageLabel,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';

interface ProspectAdvanceButtonProps {
  prospect: ProspectWithCompany;
  /** Chamado quando a etapa de destino abre um registro antes de avançar. */
  onPrompt: (stage: ProspectStage) => void;
  /** Chamado no fim do funil, onde o próximo passo é sair para o comercial. */
  onConvert: () => void;
}

/**
 * Um botão só, sempre com o próximo passo daquele contato, nomeado pela etapa de destino.
 *
 * É o caminho principal de avanço; arrastar no Kanban continua valendo como alternativa.
 * Concentrar tudo aqui foi o que permitiu tirar o botão "Respondeu" de perto de
 * "Registrar": os dois ficavam lado a lado parecendo variações da mesma ação, quando um
 * anota um toque e o outro muda a etapa do contato.
 *
 * Cada destino tem sua regra, e elas não são intercambiáveis:
 * registrar resposta (o banco move), abrir o registro da reunião, ou mover direto.
 */
export function ProspectAdvanceButton({
  prospect,
  onPrompt,
  onConvert,
  size = 'default',
}: ProspectAdvanceButtonProps & { size?: 'sm' | 'default' }) {
  const registrar = useRegisterActivity();
  const moverEtapa = useUpdateProspectStage();
  const proxima = PROSPECT_NEXT_STAGE[prospect.stage];

  if (!proxima) {
    if (!canConvertToLead(prospect)) return null;
    return (
      <Botao size={size} onClick={onConvert} label="Converter em oportunidade" />
    );
  }

  /**
   * Quem move para "Em cadência" e "Respondeu" é o trigger, a partir da atividade — a tela
   * não escreve essas etapas. É a mesma fonte que decide a cadência.
   */
  const registrarAtividade = (comResposta: boolean) =>
    registrar.mutate(
      { prospect_id: prospect.id, channel: prospect.primary_channel, got_response: comResposta },
      {
        onSuccess: (atividade) =>
          toast({
            title: comResposta
              ? 'Resposta registrada'
              : `Atividade nº ${atividade.sequence_no} registrada`,
            description: comResposta
              ? 'O contato foi para "Respondeu" e saiu da cadência automática.'
              : 'O contato entrou em cadência e já tem a próxima data agendada.',
          }),
      },
    );

  const avancar = () => {
    const modo = advanceModeFor(proxima);
    if (modo === 'activity') return registrarAtividade(false);
    if (modo === 'response') return registrarAtividade(true);
    if (modo === 'prompt') return onPrompt(proxima);
    moverEtapa.mutate({ id: prospect.id, stage: proxima });
  };

  return (
    <Botao
      size={size}
      onClick={avancar}
      label={getProspectStageLabel(proxima)}
      disabled={registrar.isPending || moverEtapa.isPending}
    />
  );
}

function Botao({
  label,
  onClick,
  disabled,
  size,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size: 'sm' | 'default';
}) {
  // Secundário de propósito: o primário desta tela é "Registrar", no compositor. Dois botões
  // preenchidos lado a lado disputariam o olho sem dizer qual é o caminho comum — e o comum
  // é registrar a atividade, não mudar a etapa.
  return (
    <Button type="button" variant="outline" size={size} onClick={onClick} disabled={disabled}>
      {label}
      <ArrowRight className="ml-1.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </Button>
  );
}
