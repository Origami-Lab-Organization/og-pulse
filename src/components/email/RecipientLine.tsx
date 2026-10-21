import { useState } from 'react';

/** Nomes visíveis antes do "+N" — o resto abre sob demanda, como no Outlook. */
const RECIPIENTS_PREVIEW = 3;

export function RecipientLine({ label, names }: { label: string; names: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!names.length) return null;

  const visible = expanded ? names : names.slice(0, RECIPIENTS_PREVIEW);
  const hidden = names.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      {visible.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className="max-w-56 truncate rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
        >
          {name}
        </span>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-full px-2 py-0.5 text-xs text-primary hover:bg-muted
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          +{hidden}
        </button>
      )}
      {expanded && names.length > RECIPIENTS_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="px-1 text-xs text-muted-foreground hover:text-foreground
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          mostrar menos
        </button>
      )}
    </div>
  );
}
