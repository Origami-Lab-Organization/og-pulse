import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Peças da ficha da oportunidade (09/10/2026): o cartão do painel, a linha
 * rótulo-à-esquerda/valor-à-direita e os campos de edição. Uma peça só por desenho, para
 * Negócio, Contatos, Empresa, Fit e Receita lerem do mesmo jeito.
 */

interface CartaoDaFichaProps {
  titulo: ReactNode;
  /** Rótulo acessível da seção, quando o título não é só texto. */
  rotulo?: string;
  /** O que fica à direita do título: "Editar", "Incluir", "Atualizar". */
  acao?: ReactNode;
  /** O essencial à vista com o cartão fechado: "R$ 35 mil vendido", "Consultoria · 55". */
  resumo?: ReactNode;
  /** Fit e Receita começam fechados: são consulta, não leitura de todo dia. */
  inicialAberto?: boolean;
  children: ReactNode;
}

/**
 * Uma seção do painel da ficha. Desde 27/10/2026 sem moldura — seções separadas por uma
 * linha, no lugar de cartões com borda sobre fundo cinza — e todas recolhem (pedido do
 * Italo): abrem e fecham pelo título e, fechadas, deixam o resumo à vista. A ação do
 * cabeçalho abre a seção — "Editar" ou "Incluir" com ela fechada não mostraria nada.
 */
export function CartaoDaFicha(props: CartaoDaFichaProps) {
  const { titulo, rotulo, acao, resumo, inicialAberto = true, children } = props;
  const [aberto, setAberto] = useState(inicialAberto);
  return (
    <Collapsible open={aberto} onOpenChange={setAberto} asChild>
      <section
        className="border-b last:border-b-0"
        aria-label={rotulo ?? (typeof titulo === 'string' ? titulo : undefined)}
      >
        <header className="flex min-h-12 items-center gap-2 px-5 py-2">
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight
              className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-90')}
              aria-hidden="true"
            />
            <h3 className="shrink-0 text-sm font-semibold">{titulo}</h3>
            {resumo && !aberto && <span className="min-w-0 truncate text-xs text-muted-foreground">{resumo}</span>}
          </CollapsibleTrigger>
          {acao && <span className="shrink-0" onClickCapture={() => setAberto(true)}>{acao}</span>}
        </header>
        <CollapsibleContent className="px-5 pb-4">{children}</CollapsibleContent>
      </section>
    </Collapsible>
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
