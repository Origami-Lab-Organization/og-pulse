import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotesPanel } from '@/components/notes/NotesPanel';
import { useAuth } from '@/contexts/AuthContext';
import { NOTE_URL_PARAM } from '@/lib/notes.constants';

/**
 * Notas no cabeçalho (ADR-0051). A notificação de compartilhamento chega com `?nota=<id>`:
 * o painel abre nessa nota, e o parâmetro sai da URL para não reabrir a cada navegação.
 */
export function NotesButton() {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
  const requested = searchParams.get(NOTE_URL_PARAM);

  useEffect(() => {
    if (!requested) return;
    setFocusNoteId(requested);
    setOpen(true);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(NOTE_URL_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [requested, setSearchParams]);

  const handleFocusHandled = useCallback(() => setFocusNoteId(null), []);

  if (!can('nota:usar')) return null;

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Notas" onClick={() => setOpen(true)}>
        <NotebookPen className="h-5 w-5" aria-hidden="true" />
      </Button>
      <NotesPanel
        open={open}
        onOpenChange={setOpen}
        focusNoteId={focusNoteId}
        onFocusHandled={handleFocusHandled}
      />
    </>
  );
}
