import { useRef, useEffect } from 'react';
import { Bold, Italic, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  error?: boolean;
}

export function RichTextArea({
  value,
  onChange,
  placeholder,
  minHeight = '120px',
  error,
}: RichTextAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>(value || '');
  const isUserInputRef = useRef(false);

  // Set initial content on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
      lastValueRef.current = value || '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external changes (e.g., form reset to a different record)
  useEffect(() => {
    if (!isUserInputRef.current && editorRef.current && value !== lastValueRef.current) {
      editorRef.current.innerHTML = value || '';
      lastValueRef.current = value || '';
    }
  }, [value]);

  const handleInput = () => {
    isUserInputRef.current = true;
    const html = editorRef.current?.innerHTML || '';
    lastValueRef.current = html;
    onChange(html);
    isUserInputRef.current = false;
  };

  const execCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, undefined);
    // Capture updated content after command
    requestAnimationFrame(() => {
      const html = editorRef.current?.innerHTML || '';
      lastValueRef.current = html;
      onChange(html);
    });
  };

  const isEmpty =
    !value ||
    !value
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();

  return (
    <div className={cn('rounded-md border overflow-hidden', error && 'border-destructive')}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('bold');
          }}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('italic');
          }}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('insertUnorderedList');
          }}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Lista com marcadores"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor */}
      <div className="relative">
        {isEmpty && placeholder && (
          <div className="absolute top-0 left-0 right-0 px-3 py-2.5 text-sm text-muted-foreground pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          style={{ minHeight }}
          className="px-3 py-2.5 text-sm focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic"
        />
      </div>
    </div>
  );
}
