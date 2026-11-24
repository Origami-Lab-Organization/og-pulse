import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { emptyKeyResult, isPastDate, keyResultProblem, toKeyResultInput } from '@/lib/planningObjectives';
import { addKeyResults, createObjectiveWithKeyResults } from '@/services/projectPlanningService';
import type { KeyResultDraft } from '@/types/projectPlanning';
import { PlanningField, PlanningRemoveButton } from './PlanningPanelParts';

interface PlanningObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Com objetivo: só acrescenta resultados-chave a ele. Sem: cadastra o objetivo novo. */
  objective?: { id: string; text: string } | null;
}

interface KeyResultFieldsProps {
  index: number;
  draft: KeyResultDraft;
  error: string | null;
  onChange: (draft: KeyResultDraft) => void;
  onRemove?: () => void;
}

function KeyResultFields(props: KeyResultFieldsProps) {
  const { index, draft, error, onChange, onRemove } = props;
  const today = format(new Date(), 'yyyy-MM-dd');
  const set = (field: keyof KeyResultDraft) => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...draft, [field]: event.target.value });
  return (
    <fieldset className="grid gap-2.5 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-semibold">Resultado-chave {index + 1}</legend>
        {onRemove && <PlanningRemoveButton label={`Remover resultado-chave ${index + 1}`} onClick={onRemove} />}
      </div>
      <PlanningField label="O que vai mudar" width="wide">
        <Input value={draft.description} onChange={set('description')} placeholder="Ex.: Fatura emitida em até 2 dias após a entrega" />
      </PlanningField>
      <PlanningField label="Como medir (indicador e fonte)" width="wide">
        <Input value={draft.measurement} onChange={set('measurement')} placeholder="Ex.: relatório de faturamento do ERP, todo mês" />
      </PlanningField>
      {/* Linha de base e meta com o mesmo peso; a unidade é curta ("dias", "%"). */}
      <div className="grid grid-cols-2 items-end gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem_minmax(0,10rem)]">
        <PlanningField label="Linha de base">
          <Input value={draft.baseline} onChange={set('baseline')} inputMode="decimal" placeholder="Ex.: 9" />
        </PlanningField>
        <PlanningField label="Meta">
          <Input value={draft.target} onChange={set('target')} inputMode="decimal" placeholder="Ex.: 2" />
        </PlanningField>
        <PlanningField label="Unidade">
          <Input value={draft.unit} onChange={set('unit')} placeholder="dias" maxLength={12} />
        </PlanningField>
        <PlanningField label="Prazo">
          <Input type="date" value={draft.targetDate} onChange={set('targetDate')} aria-required />
        </PlanningField>
      </div>
      {isPastDate(draft.targetDate, today) && (
        <p className="text-xs font-medium text-warning-emphasis">O prazo já passou. Confira se é isso mesmo; o normal é uma data futura.</p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive-emphasis">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Objetivo em branco não é salvo; cada resultado-chave precisa estar completo (cenário 4). */
function validate(objectiveText: string | null, drafts: KeyResultDraft[]) {
  const objectiveError = objectiveText !== null && !objectiveText.trim() ? 'Escreva o objetivo: o resultado que o cliente quer.' : null;
  const keyResultErrors = drafts.map((draft) => keyResultProblem(draft));
  return { objectiveError, keyResultErrors, ok: !objectiveError && keyResultErrors.every((problem) => !problem) };
}

/**
 * Cadastro do objetivo já com os resultados-chave (US-0039, cenário 4, ajuste de 24/11/2026):
 * quem planeja diz de uma vez o que quer, como vai medir, de onde parte e aonde quer chegar.
 */
export function PlanningObjectiveDialog(props: PlanningObjectiveDialogProps) {
  const { open, onOpenChange, projectId, objective } = props;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<KeyResultDraft[]>([emptyKeyResult()]);
  const [errors, setErrors] = useState<{ objectiveError: string | null; keyResultErrors: (string | null)[] }>({ objectiveError: null, keyResultErrors: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText('');
    setDrafts([emptyKeyResult()]);
    setErrors({ objectiveError: null, keyResultErrors: [] });
  }, [open]);

  const save = async () => {
    const result = validate(objective ? null : text, drafts);
    setErrors(result);
    if (!result.ok) return;
    setSaving(true);
    try {
      const keyResults = drafts.map(toKeyResultInput);
      if (objective) await addKeyResults(objective.id, keyResults);
      else await createObjectiveWithKeyResults({ projectId, objective: text.trim(), keyResults });
      queryClient.invalidateQueries({ queryKey: ['project-okrs', projectId] });
      toast({ title: objective ? 'Resultados-chave adicionados' : 'Objetivo adicionado' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Não deu para salvar o objetivo', description: mensagemParaUsuario(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = (index: number) => (draft: KeyResultDraft) => setDrafts((current) => current.map((d, i) => (i === index ? draft : d)));
  const remove = (index: number) => () => setDrafts((current) => current.filter((_, i) => i !== index));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Cabeçalho e rodapé fixos; só os campos rolam. */}
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 pb-4 pt-6 pr-12">
          <DialogTitle>{objective ? 'Novos resultados-chave' : 'Novo objetivo'}</DialogTitle>
          <DialogDescription>
            {objective
              ? objective.text
              : 'O resultado que o cliente quer e como vocês vão saber que deu certo. No encerramento, é isto que se apresenta ao cliente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4">
          {!objective && (
            <div className="grid gap-1">
              <Label htmlFor="planning-objective">Objetivo</Label>
              <Input
                id="planning-objective"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ex.: Reduzir o tempo de faturamento do cliente"
                aria-invalid={Boolean(errors.objectiveError)}
              />
              {errors.objectiveError && (
                <p role="alert" className="text-xs font-medium text-destructive-emphasis">
                  {errors.objectiveError}
                </p>
              )}
            </div>
          )}
          <div className="grid gap-3">
            {drafts.map((draft, index) => (
              <KeyResultFields
                key={index}
                index={index}
                draft={draft}
                error={errors.keyResultErrors[index] ?? null}
                  onChange={update(index)}
                onRemove={drafts.length > 1 ? remove(index) : undefined}
              />
            ))}
            <Button type="button" variant="outline" className="justify-self-start gap-1.5" onClick={() => setDrafts((current) => [...current, emptyKeyResult()])}>
              <Plus className="h-4 w-4" />
              Resultado-chave
            </Button>
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : objective ? 'Salvar resultados-chave' : 'Salvar objetivo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
