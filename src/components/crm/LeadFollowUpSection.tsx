import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarClock, Check, SkipForward, Trash2, Plus, Loader2, Undo2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LeadFollowUp,
  useLeadFollowUps,
  useCreateFollowUp,
  useUpdateFollowUp,
  useDeleteFollowUp,
} from '@/hooks/useLeadFollowUps';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useResumeLeadFromStandBy } from '@/hooks/useLeads';
import { getFollowUpUrgency, suggestFollowUpDate, toLocalDatetimeInputValue } from '@/lib/followUps';
import { CRMStage, getStageLabel } from '@/types/lead';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LeadFollowUpSectionProps {
  leadId: string;
  disabled?: boolean;
  /** Em Stand By, concluir o último retorno sem reagendar deixa a oportunidade órfã. */
  inStandBy?: boolean;
  resumeStage?: CRMStage;
  /**
   * Oportunidade ganha: aqui o follow-up é acompanhamento de relacionamento
   * (checkpoint pós-projeto, case de sucesso, expansão), não avanço de funil.
   */
  isWon?: boolean;
}

function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);

  const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Hoje às ${timeStr}`;
  if (diffDays === 1) return `Amanhã às ${timeStr}`;
  if (diffDays === -1) return `Ontem às ${timeStr}`;
  if (diffDays < 0) return `${dateStr} ${timeStr} (atrasado)`;
  return `${dateStr} às ${timeStr}`;
}

/**
 * Sugestão de data do formulário. Em oportunidade ganha o próximo contato é um
 * checkpoint de relacionamento, não um retorno de negociação — sugerir "daqui a
 * uma hora" só obrigaria a corrigir a data toda vez.
 */
const WON_FOLLOW_UP_SUGGESTION_DAYS = 30;

function toLocalDatetimeValue(isWon?: boolean): string {
  return toLocalDatetimeInputValue(
    suggestFollowUpDate(isWon ? WON_FOLLOW_UP_SUGGESTION_DAYS : 0),
  );
}

export function LeadFollowUpSection({ leadId, disabled, inStandBy, resumeStage, isWon }: LeadFollowUpSectionProps) {
  const { employee } = useAuth();
  const { data: followUps = [], isLoading } = useLeadFollowUps(leadId);
  const { data: employees = [] } = useEmployees();
  const createFollowUp = useCreateFollowUp();
  const updateFollowUp = useUpdateFollowUp();
  const deleteFollowUp = useDeleteFollowUp();
  const resumeFromStandBy = useResumeLeadFromStandBy();

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => toLocalDatetimeValue(isWon));
  const [assignedTo, setAssignedTo] = useState<string>('');

  const activeEmployees = employees.filter(e => e.status === 'ativo');
  const employeeName = (id: string | null) =>
    (id ? employees.find(e => e.id === id)?.nome ?? null : null);

  const handleCreate = () => {
    if (!description.trim() || !scheduledAt) return;
    const isoDate = new Date(scheduledAt).toISOString();
    createFollowUp.mutate(
      {
        lead_id: leadId,
        description: description.trim(),
        scheduled_at: isoDate,
        assigned_to: assignedTo || employee!.id,
      },
      {
        onSuccess: () => {
          setDescription('');
          setScheduledAt(toLocalDatetimeValue(isWon));
          setAssignedTo('');
          setShowForm(false);
        },
      }
    );
  };

  const handleStatusChange = (followUp: LeadFollowUp, status: 'done' | 'skipped') => {
    updateFollowUp.mutate({ id: followUp.id, leadId: followUp.lead_id, status });
  };

  const handleDelete = (followUp: LeadFollowUp) => {
    deleteFollowUp.mutate({ id: followUp.id, leadId: followUp.lead_id });
  };

  const pending = followUps.filter(f => f.status === 'pending');
  const completed = followUps.filter(f => f.status !== 'pending');
  // Follow Up sem retorno agendado: o negócio ficaria esquecido justamente na
  // coluna criada para não esquecer. Oferecemos os próximos passos possíveis.
  const needsNextStep = !!inStandBy && !isLoading && pending.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Follow-ups
        </p>
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setShowForm(v => !v)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Agendar
          </Button>
        )}
      </div>

      {isWon && (
        <div className="flex items-start gap-1.5 rounded-md border bg-muted/30 p-2.5">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-snug">
            Negócio ganho — use os retornos para acompanhamento pós-projeto,
            coleta de case de sucesso e novas oportunidades com o cliente.
          </p>
        </div>
      )}

      {needsNextStep && !showForm && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            Em Stand By sem retorno agendado
          </div>
          <p className="text-xs text-muted-foreground">
            Defina o próximo passo para esta oportunidade não ficar esquecida.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Agendar novo retorno
            </Button>
            {resumeStage && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => resumeFromStandBy.mutate({ id: leadId, targetStage: resumeStage })}
                disabled={resumeFromStandBy.isPending}
              >
                {resumeFromStandBy.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Undo2 className="h-3 w-3 mr-1" />
                )}
                Retomar em {getStageLabel(resumeStage)}
              </Button>
            )}
          </div>
        </div>
      )}

      {showForm && !disabled && (
        <div className="rounded-md border p-3 space-y-3 bg-muted/30">
          <Textarea
            placeholder={isWon
              ? 'Ex.: checkpoint de 30 dias, coletar depoimento para o case...'
              : 'Descreva a ação de follow-up...'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Data e hora</p>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Responsável</p>
              <Select value={assignedTo || employee!.id} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCreate}
              disabled={!description.trim() || !scheduledAt || createFollowUp.isPending}
            >
              {createFollowUp.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : pending.length === 0 && completed.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum follow-up agendado.</p>
      ) : (
        <div className="space-y-1.5">
          {pending.map(fu => {
            const urgency = getFollowUpUrgency(fu);
            return (
              <div
                key={fu.id}
                className={cn(
                  'flex items-start gap-2 rounded-md border p-2.5',
                  urgency === 'overdue' && 'border-red-300 bg-red-50 dark:bg-red-950/20',
                  urgency === 'today' && 'border-amber-300 bg-amber-50 dark:bg-amber-950/20',
                  urgency === 'upcoming' && 'border-border bg-background',
                )}
              >
                <CalendarClock className={cn(
                  'h-3.5 w-3.5 mt-0.5 shrink-0',
                  urgency === 'overdue' && 'text-red-500',
                  urgency === 'today' && 'text-amber-500',
                  urgency === 'upcoming' && 'text-muted-foreground',
                )} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs leading-snug">{fu.description}</p>
                  <p className={cn(
                    'text-[10px]',
                    urgency === 'overdue' && 'text-red-500 font-medium',
                    urgency === 'today' && 'text-amber-600',
                    urgency === 'upcoming' && 'text-muted-foreground',
                  )}>
                    {formatScheduledAt(fu.scheduled_at)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(fu.created_at), { addSuffix: true, locale: ptBR })}
                    {employeeName(fu.created_by) && ` · ${employeeName(fu.created_by)}`}
                  </p>
                </div>
                {!disabled && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Marcar como feito"
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                      onClick={() => handleStatusChange(fu, 'done')}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Pular"
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition-colors"
                      onClick={() => handleStatusChange(fu, 'skipped')}
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-destructive transition-colors"
                      onClick={() => handleDelete(fu)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {completed.length > 0 && (
            <>
              {pending.length > 0 && <Separator className="my-1" />}
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Concluídos</p>
              {completed.map(fu => {
                const completedByEmployee = fu.completed_by
                  ? employees.find(e => e.id === fu.completed_by)
                  : null;
                return (
                  <div key={fu.id} className="flex items-start gap-2 rounded-md border border-border/40 bg-muted/30 p-2.5 opacity-60">
                    <CalendarClock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs line-through text-muted-foreground leading-snug">{fu.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatScheduledAt(fu.scheduled_at)}
                        {completedByEmployee && (
                          <span className="ml-1">· por {completedByEmployee.nome}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(fu.created_at), { addSuffix: true, locale: ptBR })}
                        {employeeName(fu.created_by) && ` · ${employeeName(fu.created_by)}`}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[9px] h-4 px-1.5',
                        fu.status === 'done' && 'bg-green-100 text-green-700 dark:bg-green-900/30',
                        fu.status === 'skipped' && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {fu.status === 'done' ? 'Feito' : 'Pulado'}
                    </Badge>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
