import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useRegisterActivity } from '@/hooks/useProspectActivities';
import { useUpdateProspectStage } from '@/hooks/useProspects';
import {
  PROSPECT_NEXT_STAGE,
  advanceModeFor,
  getProspectStageLabel,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';

interface ProspectAdvanceButtonProps {
  prospect: ProspectWithCompany;
  /** Chamado quando a etapa de destino abre um registro antes de avançar. */
  onPrompt: (stage: ProspectStage) => void;
  /** Chamado quando o próximo passo é Ganho: abre o registro da venda (data e valor). */
  onWin: () => void;
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
export function ProspectAdvanceButton(
  props: ProspectAdvanceButtonProps & { size?: 'sm' | 'default'; variant?: 'default' | 'outline' },
) {
  const { prospect, onPrompt, onWin, size = 'default', variant = 'outline' } = props;
  const registrar = useRegisterActivity();
  const moverEtapa = useUpdateProspectStage();
  const proxima = PROSPECT_NEXT_STAGE[prospect.stage];

  // Ganho e Perda não têm próximo passo: o card saiu do trabalho.
  if (!proxima) return null;

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
              ? 'A oportunidade foi para "Respondeu" e saiu da cadência automática.'
              : 'A oportunidade entrou em cadência e já tem a próxima data agendada.',
          }),
      },
    );

  const avancar = () => {
    const modo = advanceModeFor(proxima);
    if (modo === 'activity') return registrarAtividade(false);
    if (modo === 'response') return registrarAtividade(true);
    if (modo === 'prompt') return onPrompt(proxima);
    if (modo === 'win') return onWin();
    moverEtapa.mutate({ id: prospect.id, stage: proxima });
  };

  return (
    <Botao
      size={size}
      variant={variant}
      onClick={avancar}
      label={proxima === ETAPA_GANHO ? 'Marcar ganho' : getProspectStageLabel(proxima)}
      ganho={proxima === ETAPA_GANHO}
      disabled={registrar.isPending || moverEtapa.isPending}
    />
  );
}

const ETAPA_GANHO: ProspectStage = 'ganho';

/**
 * Desde 09/10/2026 o botão mora no cabeçalho da ficha, ao lado da régua de etapas e longe do
 * "Registrar" do compositor — por isso pode ser o primário dali sem disputar com ele.
 */
function Botao({
  label,
  onClick,
  disabled,
  size,
  variant,
  ganho,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size: 'sm' | 'default';
  variant: 'default' | 'outline';
  ganho: boolean;
}) {
  const Icone = ganho ? Check : ArrowRight;
  return (
    <Button type="button" variant={variant} size={size} onClick={onClick} disabled={disabled}>
      {label}
      <Icone className={cn('ml-1.5 h-4 w-4', variant === 'outline' && 'text-muted-foreground')} aria-hidden="true" />
    </Button>
  );
}
