import { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileUp, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MAX_SUMMARY_CHARS, MAX_SUMMARY_FILE_BYTES } from '@/lib/meetingTranscription';

/**
 * Markdown como a IA costuma entregar (títulos, listas, negrito, tabela), com os tokens do
 * tema. Sem `rehype-raw`: HTML colado aparece como texto, nunca é executado.
 */
const MARKDOWN_CLASS = [
  'text-sm text-foreground break-words',
  '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold',
  '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold',
  '[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium',
  '[&_p]:my-2 [&_strong]:font-semibold',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
  '[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
  '[&_table]:my-2 [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
  '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1',
].join(' ');

export function MarkdownText(props: { text: string }) {
  return (
    <div className={MARKDOWN_CLASS}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.text}</ReactMarkdown>
    </div>
  );
}

function authorship(updatedAt: string | null, updatedByName: string | null): string | null {
  if (!updatedAt) return null;
  const when = format(parseISO(updatedAt), "d 'de' MMM 'às' HH:mm", { locale: ptBR });
  return `Atualizado por ${updatedByName ?? 'alguém da equipe'} em ${when}`;
}

async function readTextFile(file: File): Promise<string | null> {
  if (file.size > MAX_SUMMARY_FILE_BYTES) {
    toast.error('Arquivo grande demais para um resumo. Use um .md ou .txt de até 500 KB.');
    return null;
  }
  return (await file.text()).slice(0, MAX_SUMMARY_CHARS);
}

interface EditFormProps {
  initial: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (text: string) => void;
}

function EditForm(props: EditFormProps) {
  const { initial, isSaving, onCancel, onSave } = props;
  const [draft, setDraft] = useState(initial);
  const fileInput = useRef<HTMLInputElement>(null);

  const importFile = async (file: File | undefined) => {
    const text = file ? await readTextFile(file) : null;
    if (text !== null) setDraft(text);
  };

  return (
    <div className="space-y-2">
      <Textarea
        aria-label="Resumo e notas"
        value={draft}
        maxLength={MAX_SUMMARY_CHARS}
        onChange={(changed) => setDraft(changed.target.value)}
        placeholder="Cole aqui o resumo que a sua IA gerou, ou escreva as notas da reunião. Markdown funciona: # títulos, - listas, **negrito**."
        className="min-h-[240px] text-sm"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <input
            ref={fileInput}
            type="file"
            accept=".md,.markdown,.txt,text/plain,text/markdown"
            className="hidden"
            onChange={(changed) => importFile(changed.target.files?.[0])}
          />
          <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()} disabled={isSaving}>
            <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
            Importar arquivo (.md, .txt)
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => onSave(draft)} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MeetingNotesEditorProps {
  value: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
  canEdit: boolean;
  isSaving: boolean;
  /** Chave do registro: trocar de reunião não pode herdar o modo de edição. */
  recordId: string;
  onSave: (text: string, done: () => void) => void;
  /** O que dizer — e oferecer — quando ainda não há nada escrito. */
  emptyState: ReactNode;
}

/**
 * Resumo ou notas da reunião, trazidos pela equipe: gerados na IA de cada um e colados, ou
 * importados de um .md/.txt. O Pulse não resume; guarda e mostra quem trouxe e quando.
 */
export function MeetingNotesEditor(props: MeetingNotesEditorProps) {
  const { value, updatedAt, updatedByName, canEdit, isSaving, recordId, onSave, emptyState } = props;
  const [editing, setEditing] = useState(false);

  useEffect(() => setEditing(false), [recordId]);

  if (editing) {
    return (
      <EditForm
        initial={value ?? ''}
        isSaving={isSaving}
        onCancel={() => setEditing(false)}
        onSave={(text) => onSave(text, () => setEditing(false))}
      />
    );
  }

  if (!value) {
    return (
      <div className="space-y-3 rounded-md border border-dashed border-border p-4">
        {emptyState}
        {canEdit && (
          <Button size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Escrever ou colar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <MarkdownText text={value} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <p className="text-xs text-muted-foreground">{authorship(updatedAt, updatedByName)}</p>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Editar
          </Button>
        )}
      </div>
    </div>
  );
}
