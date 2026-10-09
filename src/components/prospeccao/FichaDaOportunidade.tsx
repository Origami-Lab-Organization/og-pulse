import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Peças da ficha da oportunidade (09/10/2026): o cartão das colunas laterais, a linha
 * rótulo-à-esquerda/valor-à-direita e os campos de edição. Uma peça só por desenho, para os
 * cartões de Contatos, Condução, Negócio e Empresa lerem do mesmo jeito.
 */

interface CartaoDaFichaProps {
  titulo: ReactNode;
  /** Rótulo acessível da seção, quando o título não é só texto. */
  rotulo?: string;
  /** O que fica à direita do título: "Editar", "Incluir", "Atualizar". */
  acao?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function CartaoDaFicha(props: CartaoDaFichaProps) {
  const { titulo, rotulo, acao, className, children } = props;
  return (
    <section className={cn('rounded-lg border bg-card p-4', className)} aria-label={rotulo ?? (typeof titulo === 'string' ? titulo : undefined)}>
      <header className="mb-3 flex min-h-7 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {acao}
      </header>
      {children}
    </section>
  );
}

export function BotaoEditar({ onClick, rotulo = 'Editar' }: { onClick: () => void; rotulo?: string }) {
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onClick}>
      {rotulo}
    </Button>
  );
}

/** Rótulo à esquerda, valor à direita — a leitura rápida dos cartões laterais. */
export function LinhaDeDado({ termo, children }: { termo: string; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{termo}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{children || <span className="font-normal text-muted-foreground">—</span>}</dd>
    </div>
  );
}

interface CampoProps {
  label: string;
  draft?: string;
  onChange: (v: string) => void;
}

export function Campo(props: CampoProps) {
  const { label, draft, onChange } = props;
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={draft ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

interface BotoesDeSalvarProps {
  rotulo: string;
  salvando: boolean;
  onSalvar: () => Promise<void>;
  onCancelar: () => void;
}

/** Salvar e cancelar ao pé da coluna que está sendo editada — cada lado grava só o que é dele. */
export function BotoesDeSalvar(props: BotoesDeSalvarProps) {
  const { rotulo, salvando, onSalvar, onCancelar } = props;
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => onSalvar().catch(() => undefined)} disabled={salvando}>
        {salvando ? 'Salvando...' : rotulo}
      </Button>
      <Button size="sm" variant="outline" onClick={onCancelar} disabled={salvando}>
        Cancelar
      </Button>
    </div>
  );
}
