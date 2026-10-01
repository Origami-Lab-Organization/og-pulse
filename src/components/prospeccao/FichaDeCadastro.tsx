import type { ReactNode } from 'react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { urlCurta } from '@/lib/prospecting/links';

/**
 * Peças das fichas de cadastro da Prospecção — Empresa e Contato (01/10/2026). As duas fichas
 * têm o mesmo desenho: seções de rótulo e valor, link externo e rodapé de ações.
 */

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="pb-1.5 pt-3.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        {titulo}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

/** Uma linha rótulo/valor. Valor vazio vira "Não informado", nunca um traço mudo. */
export function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const vazio = children === null || children === undefined || children === '' || children === false;
  return (
    <div className="grid min-h-10 grid-cols-[130px_minmax(0,1fr)] items-center gap-4 border-b border-border/60 text-[13.5px]">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        {vazio ? <span className="text-muted-foreground/80">Não informado</span> : children}
      </dd>
    </div>
  );
}

export function LinkExterno({ href, icone: Icone }: { href?: string | null; icone: LucideIcon }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 items-center gap-[7px] rounded-sm text-success-emphasis hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{urlCurta(href)}</span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

export function Rodape({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 border-t bg-muted/40 px-6 py-3.5">{children}</div>;
}
