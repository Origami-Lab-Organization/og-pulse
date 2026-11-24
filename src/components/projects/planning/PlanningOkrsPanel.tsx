import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteKeyResult, useDeleteOKR, useProjectOKRs } from '@/hooks/useProjectOKRs';
import type { ProjectKeyResult, ProjectOKR } from '@/types/projectOkr';
import { PlanningObjectiveDialog } from './PlanningObjectiveDialog';
import {
  PlanningCard,
  PlanningEmpty,
  PlanningIntro,
  PlanningReadOnlyNote,
  PlanningRemoveButton,
} from './PlanningPanelParts';

interface PlanningOkrsPanelProps {
  projectId: string;
  canEdit: boolean;
}

const formatNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : Number(value).toLocaleString('pt-BR');

/** "9 → 2 dias · até 31/05/2027": de onde parte, aonde quer chegar e até quando. */
function keyResultTarget(kr: ProjectKeyResult) {
  const unit = kr.unit ? ` ${kr.unit}` : '';
  const from = kr.baseline_value ?? null;
  const range = from === null ? `meta ${formatNumber(kr.target_value)}${unit}` : `${formatNumber(from)} → ${formatNumber(kr.target_value)}${unit}`;
  return kr.target_date ? `${range} · até ${format(parseISO(kr.target_date), 'dd/MM/yyyy')}` : range;
}

function KeyResultLine(props: { kr: ProjectKeyResult; canEdit: boolean; onRemove: () => void }) {
  const { kr, canEdit, onRemove } = props;
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span className="grid min-w-0 flex-1">
        <span className="break-words">{kr.description}</span>
        <small className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{keyResultTarget(kr)}</span>
          {kr.measurement && ` · ${kr.measurement}`}
        </small>
      </span>
      {canEdit && <PlanningRemoveButton label={`Remover resultado-chave ${kr.description}`} onClick={onRemove} />}
    </li>
  );
}

interface ObjectiveBlockProps {
  okr: ProjectOKR;
  projectId: string;
  canEdit: boolean;
  onAddKeyResults: (okr: ProjectOKR) => void;
}

function ObjectiveBlock(props: ObjectiveBlockProps) {
  const { okr, projectId, canEdit, onAddKeyResults } = props;
  const deleteOkr = useDeleteOKR();
  const deleteKr = useDeleteKeyResult();
  const keyResults = okr.key_results ?? [];
  return (
    <div className="grid gap-2 border-t px-5 py-4 first:border-t-0">
      <div className="flex items-start gap-2.5">
        <p className="flex-1 break-words font-semibold text-foreground">{okr.objective}</p>
        {canEdit && (
          <PlanningRemoveButton label={`Remover objetivo ${okr.objective}`} onClick={() => deleteOkr.mutate({ id: okr.id, projectId })} />
        )}
      </div>
      {keyResults.length ? (
        <ul className="grid gap-1.5">
          {keyResults.map((kr) => (
            <KeyResultLine key={kr.id} kr={kr} canEdit={canEdit} onRemove={() => deleteKr.mutate({ id: kr.id, projectId })} />
          ))}
        </ul>
      ) : (
        <span className="text-xs font-medium text-warning-emphasis">Sem resultado-chave: o objetivo só conta com pelo menos 1.</span>
      )}
      {canEdit && (
        <Button variant="ghost" size="sm" className="justify-self-start gap-1.5 px-2" onClick={() => onAddKeyResults(okr)}>
          <Plus className="h-4 w-4" />
          Resultado-chave
        </Button>
      )}
    </div>
  );
}

/** Aba Objetivos do planejamento (US-0039, cenário 4): objetivo e resultados-chave de uma vez. */
export function PlanningOkrsPanel(props: PlanningOkrsPanelProps) {
  const { projectId, canEdit } = props;
  const { data: okrs = [] } = useProjectOKRs(projectId);
  const [dialog, setDialog] = useState<{ open: boolean; okr: ProjectOKR | null }>({ open: false, okr: null });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PlanningIntro title="Por que este projeto existe.">
          Escreva o resultado que o cliente quer e, para cada um, como medir, de onde parte e aonde quer chegar. No encerramento,
          é isto que se apresenta ao cliente.
        </PlanningIntro>
        {canEdit && (
          <Button className="gap-1.5" onClick={() => setDialog({ open: true, okr: null })}>
            <Plus className="h-4 w-4" />
            Novo objetivo
          </Button>
        )}
      </div>
      {!canEdit && <PlanningReadOnlyNote />}
      <PlanningCard>
        {okrs.length ? (
          okrs.map((okr) => (
            <ObjectiveBlock
              key={okr.id}
              okr={okr}
              projectId={projectId}
              canEdit={canEdit}
              onAddKeyResults={(target) => setDialog({ open: true, okr: target })}
            />
          ))
        ) : (
          <PlanningEmpty>Nenhum objetivo ainda.</PlanningEmpty>
        )}
      </PlanningCard>
      <PlanningObjectiveDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        projectId={projectId}
        objective={dialog.okr ? { id: dialog.okr.id, text: dialog.okr.objective } : null}
      />
    </div>
  );
}
