import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LeadInteraction,
  CHANNEL_LABELS,
  useLeadInteractions,
  useCreateInteraction,
  useUpdateInteraction,
  useDeleteInteraction,
} from '@/hooks/useLeadInteractions';

const CHANNEL_BADGE: Record<string, string> = {
  phone: 'bg-gray-100 text-gray-700 border-gray-200',
  whatsapp: 'bg-green-100 text-green-700 border-green-200',
  email: 'bg-blue-100 text-blue-700 border-blue-200',
  in_person: 'bg-purple-100 text-purple-700 border-purple-200',
  video_call: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  linkedin: 'bg-sky-100 text-sky-700 border-sky-200',
  other: 'bg-muted text-muted-foreground border-border',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface InlineFormProps {
  initial?: Pick<LeadInteraction, 'message' | 'interaction_date' | 'channel'>;
  onSave: (values: { message: string; interaction_date: string; channel: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}

function InlineForm({ initial, onSave, onCancel, isPending }: InlineFormProps) {
  const [message, setMessage] = useState(initial?.message ?? '');
  const [date, setDate] = useState(initial?.interaction_date ?? todayStr());
  const [channel, setChannel] = useState(initial?.channel ?? '');

  const canSubmit = message.trim() && date && channel;

  return (
    <div className="rounded-md border p-3 space-y-3 bg-muted/30">
      <Textarea
        placeholder="O que foi conversado, observado ou combinado..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="text-sm resize-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Data da interação</p>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs h-8"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Canal</p>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          disabled={!canSubmit || isPending}
          onClick={() => onSave({ message: message.trim(), interaction_date: date, channel })}
        >
          {isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

interface LeadInteractionsTabProps {
  leadId: string;
  disabled?: boolean;
}

export function LeadInteractionsTab({ leadId, disabled }: LeadInteractionsTabProps) {
  const { data: interactions = [], isLoading } = useLeadInteractions(leadId);
  const createInteraction = useCreateInteraction();
  const updateInteraction = useUpdateInteraction();
  const deleteInteraction = useDeleteInteraction();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = (values: { message: string; interaction_date: string; channel: string }) => {
    createInteraction.mutate(
      { lead_id: leadId, ...values },
      { onSuccess: () => setShowForm(false) }
    );
  };

  const handleUpdate = (item: LeadInteraction, values: { message: string; interaction_date: string; channel: string }) => {
    updateInteraction.mutate(
      {
        id: item.id,
        lead_id: item.lead_id,
        ...values,
        previous: { message: item.message, interaction_date: item.interaction_date, channel: item.channel },
      },
      { onSuccess: () => setEditingId(null) }
    );
  };

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
            onClick={() => { setShowForm((v) => !v); setEditingId(null); }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Registrar
          </Button>
        )}
      </div>

      {showForm && !disabled && (
        <InlineForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          isPending={createInteraction.isPending}
        />
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : interactions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum follow-up registrado.</p>
      ) : (
        <div className="space-y-2">
          {interactions.map((item) =>
            editingId === item.id ? (
              <InlineForm
                key={item.id}
                initial={{ message: item.message, interaction_date: item.interaction_date, channel: item.channel }}
                onSave={(values) => handleUpdate(item, values)}
                onCancel={() => setEditingId(null)}
                isPending={updateInteraction.isPending}
              />
            ) : (
              <div key={item.id} className="rounded-md border bg-background p-2.5 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none',
                    CHANNEL_BADGE[item.channel] ?? CHANNEL_BADGE.other
                  )}>
                    {CHANNEL_LABELS[item.channel] ?? item.channel}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(item.interaction_date)}</span>
                  {item.creator && (
                    <span className="text-[10px] text-muted-foreground ml-auto">{item.creator.nome}</span>
                  )}
                </div>
                <p className="text-xs leading-snug">{item.message}</p>
                {!disabled && (
                  <div className="flex items-center gap-1 justify-end pt-0.5">
                    <button
                      type="button"
                      title="Editar"
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition-colors"
                      onClick={() => { setEditingId(item.id); setShowForm(false); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-destructive transition-colors"
                      onClick={() => deleteInteraction.mutate({ id: item.id, lead_id: item.lead_id })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
