import { useState } from 'react';
import { ChevronDown, MessageSquareReply, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToastAction } from '@/components/ui/toast';
import { toast } from '@/hooks/use-toast';
import { useDeleteProspectActivity, useRegisterActivity } from '@/hooks/useProspectActivities';
import { INTERACTION_CHANNELS, getChannelLabel } from '@/lib/interactionChannels';
import { RegisterActivityDialog } from './RegisterActivityDialog';
import type { ProspectWithCompany } from '@/types/prospect';

interface RegisterActivityButtonsProps {
  prospect: ProspectWithCompany;
  size?: 'sm' | 'default';
}

/**
 * O teste de aceite do módulo: registrar uma atividade custa UM clique.
 *
 * "Registrar" usa o canal principal do contato e assume sem resposta — o caso comum.
 * "Respondeu" é o mesmo clique com o desfecho oposto. O menu cobre o caso raro (outro
 * canal, outra data, observação) e o caminho comum não passa por ele.
 *
 * Se registrar exigisse escolher canal e data toda vez, ninguém registraria, e pipeline
 * frio sem registro é pior que planilha: dá sensação de controle sem o dado.
 */
export function RegisterActivityButtons({ prospect, size = 'sm' }: RegisterActivityButtonsProps) {
  const registrar = useRegisterActivity();
  const desfazer = useDeleteProspectActivity();
  const [detalhesAberto, setDetalhesAberto] = useState(false);

  const registrarComCanal = (channel: string, gotResponse: boolean) => {
    registrar.mutate(
      { prospect_id: prospect.id, channel, got_response: gotResponse },
      {
        onSuccess: (atividade) => {
          toast({
            title: gotResponse ? 'Resposta registrada' : `Atividade nº ${atividade.sequence_no} registrada`,
            description: descreverResultado(gotResponse, getChannelLabel(channel)),
            action: (
              <ToastAction
                altText="Desfazer o registro"
                onClick={() => desfazer.mutate({ id: atividade.id, prospect_id: prospect.id })}
              >
                Desfazer
              </ToastAction>
            ),
          });
        },
      },
    );
  };

  const ocupado = registrar.isPending || desfazer.isPending;

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size={size}
          variant="default"
          disabled={ocupado}
          onClick={() => registrarComCanal(prospect.primary_channel, false)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Registrar
        </Button>

        <Button
          type="button"
          size={size}
          variant="outline"
          disabled={ocupado}
          onClick={() => registrarComCanal(prospect.primary_channel, true)}
        >
          <MessageSquareReply className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Respondeu
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size={size} variant="ghost" disabled={ocupado} aria-label="Mais opções de registro">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Registrar por outro canal</DropdownMenuLabel>
            {INTERACTION_CHANNELS.filter((c) => c.value !== prospect.primary_channel).map((c) => (
              <DropdownMenuItem key={c.value} onSelect={() => registrarComCanal(c.value, false)}>
                {c.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDetalhesAberto(true)}>
              Registrar com detalhes...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RegisterActivityDialog
        prospect={prospect}
        open={detalhesAberto}
        onOpenChange={setDetalhesAberto}
      />
    </>
  );
}

function descreverResultado(gotResponse: boolean, canal: string): string {
  if (gotResponse) return `${canal}. O contato foi para "Respondeu" e saiu da lista de hoje.`;
  return `${canal}. A próxima data foi agendada pela cadência.`;
}
