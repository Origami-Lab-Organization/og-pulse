import { Mail } from 'lucide-react';
import { MessageReader } from './MessageReader';

interface ReadingPaneProps {
  messageId: string | null;
}

/** Coluna da direita com o e-mail aberto, como o painel de leitura do Outlook. */
export function ReadingPane(props: ReadingPaneProps) {
  const { messageId } = props;

  return (
    <section
      aria-label="E-mail aberto"
      className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border bg-card p-5"
    >
      {messageId ? (
        <MessageReader
          key={messageId}
          messageId={messageId}
          renderTitle={(subject) => (
            <h2 className="text-lg font-semibold leading-snug text-foreground">{subject}</h2>
          )}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Mail className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Selecione um e-mail para ler.</p>
        </div>
      )}
    </section>
  );
}
