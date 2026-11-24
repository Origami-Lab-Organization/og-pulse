import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Peças comuns das abas do planejamento (US-0039): introdução, nota de só leitura, lista,
 * formulário de adicionar e erro junto do campo. Visual do protótipo v8.
 */

export function PlanningIntro(props: { title: string; children: React.ReactNode }) {
  return (
    <p className="max-w-[70ch] text-sm text-muted-foreground">
      <b className="font-semibold text-foreground">{props.title}</b> {props.children}
    </p>
  );
}

/** Quem só lê vê os dados sem formulários nem botões de remover (cenário 15). */
export function PlanningReadOnlyNote() {
  return (
    <div className="rounded-md bg-info-subtle px-4 py-3 text-sm text-info-emphasis">
      Você só lê este planejamento. Quem edita é o GP do projeto ou o admin.
    </div>
  );
}

export function PlanningCard(props: { children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-lg border bg-card">{props.children}</section>;
}

export function PlanningRow(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3 border-t px-5 py-3 first:border-t-0', props.className)}>
      {props.children}
    </div>
  );
}

export function PlanningEmpty(props: { children: React.ReactNode }) {
  return <div className="px-5 py-6 text-center text-sm text-muted-foreground">{props.children}</div>;
}

/** Rodapé da lista: contagem à esquerda, totais à direita. */
export function PlanningFoot(props: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-t bg-muted/40 px-5 py-3 text-sm">{props.children}</div>
  );
}

interface AddFormProps {
  onSubmit: () => void;
  children: React.ReactNode;
  /** Erro de validação, mostrado logo abaixo dos campos. */
  error?: string | null;
  label: string;
}

/** Formulário de adicionar no pé da lista; Enter envia. */
export function PlanningAddForm(props: AddFormProps) {
  return (
    <form
      aria-label={props.label}
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
      className="border-t bg-muted/40 px-5 py-3.5"
    >
      <div className="flex flex-wrap items-end gap-2.5">{props.children}</div>
      {props.error && (
        <p role="alert" className="pt-2 text-xs font-medium text-destructive-emphasis">
          {props.error}
        </p>
      )}
    </form>
  );
}

const FIELD_WIDTH = {
  wide: 'flex-[3_1_260px]',
  normal: 'flex-[1_1_160px]',
  narrow: 'flex-[0_1_140px]',
} as const;

/** Rótulo + campo do formulário de adicionar. */
export function PlanningField(props: { label: string; width?: keyof typeof FIELD_WIDTH; children: React.ReactNode }) {
  return (
    <label className={cn('grid min-w-0 gap-1 text-xs font-medium text-foreground', FIELD_WIDTH[props.width ?? 'normal'])}>
      {props.label}
      {props.children}
    </label>
  );
}

export function PlanningRemoveButton(props: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive-emphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
