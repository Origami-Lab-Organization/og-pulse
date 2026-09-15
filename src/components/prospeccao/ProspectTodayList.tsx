import { CalendarCheck2, CircleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getChannelLabel } from '@/lib/interactionChannels';
import { cn } from '@/lib/utils';
import {
  getProspectStageColor,
  getProspectStageLabel,
  isOverdue,
  type ProspectWithCompany,
} from '@/types/prospect';
import { RegisterActivityButtons } from './RegisterActivityButtons';

interface ProspectTodayListProps {
  prospects: ProspectWithCompany[];
  isLoading: boolean;
  onOpen: (prospect: ProspectWithCompany) => void;
}

/**
 * "Atividades de hoje" — o que a planilha não fazia e que justifica o módulo.
 *
 * Vazia, o dia de prospecção acabou. Com 40 itens, você está atrasado. Não há filtro para
 * configurar: é `próxima atividade <= hoje` e `responsável = eu`, e mais nada.
 */
export function ProspectTodayList({ prospects, isLoading, onOpen }: ProspectTodayListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Carregando atividades de hoje">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <CalendarCheck2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Seu dia de prospecção acabou.</p>
          <p className="text-sm text-muted-foreground">
            Nada vence hoje. Novos contatos aparecem aqui assim que você os cadastra.
          </p>
        </CardContent>
      </Card>
    );
  }

  const atrasados = prospects.filter((p) => isOverdue(p)).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{prospects.length} para hoje</span>
        {atrasados > 0 && (
          <span className="inline-flex items-center gap-1 text-destructive">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
            {atrasados} em atraso
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {prospects.map((prospect) => (
          <li key={prospect.id}>
            <ProspectTodayRow prospect={prospect} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProspectTodayRow({
  prospect,
  onOpen,
}: {
  prospect: ProspectWithCompany;
  onOpen: (p: ProspectWithCompany) => void;
}) {
  const atrasado = isOverdue(prospect);

  return (
    <Card className={cn('transition-colors hover:bg-accent/40', atrasado && 'border-destructive/40')}>
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="h-auto flex-1 justify-start p-0 text-left hover:bg-transparent"
          onClick={() => onOpen(prospect)}
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium">{prospect.contact_name}</span>
              <Badge variant="secondary" className={getProspectStageColor(prospect.stage)}>
                {getProspectStageLabel(prospect.stage)}
              </Badge>
            </span>
            <span className="truncate text-sm text-muted-foreground">
              {prospect.company?.name ?? 'Empresa não informada'}
              {prospect.contact_role ? ` · ${prospect.contact_role}` : ''}
            </span>
            <span className={cn('text-xs', atrasado ? 'text-destructive' : 'text-muted-foreground')}>
              Atividade nº {prospect.activity_count + 1} · {getChannelLabel(prospect.primary_channel)}
              {prospect.next_activity_on ? ` · vence ${formatarData(prospect.next_activity_on)}` : ''}
            </span>
          </span>
        </Button>

        <div className="shrink-0">
          <RegisterActivityButtons prospect={prospect} />
        </div>
      </CardContent>
    </Card>
  );
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
