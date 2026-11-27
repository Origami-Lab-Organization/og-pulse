import { useRef, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CampoDaEmpresa, SecaoDaEmpresa } from '@/lib/prospecting/faseDaEmpresa.constants';
import { useCampoAberto } from './edicaoDaEmpresa';

/** Uma seção da página, aberta pela aba dela (US-0053); o título fica para o leitor de tela. */
export function Secao(props: { id: SecaoDaEmpresa; titulo: string; selo?: ReactNode; acao?: ReactNode; children: ReactNode }) {
  const { id, titulo, selo, acao, children } = props;
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="space-y-3">
      <h2 id={`${id}-titulo`} className="sr-only">{titulo}</h2>
      {(selo || acao) && (
        <div className="flex flex-wrap items-center gap-2">
          {selo}
          {acao && <span className="ml-auto">{acao}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Cartão com título, no padrão dos cartões Porte, Perfil e Onde e relação; a ação fica à direita. */
export function Bloco(props: { titulo: string; acao?: ReactNode; className?: string; children: ReactNode }) {
  const { titulo, acao, className, children } = props;
  return (
    <section aria-label={titulo} className={cn('flex min-w-0 flex-col gap-3 rounded-xl border bg-card px-[18px] py-3.5', className)}>
      <div className="flex min-h-7 items-center gap-2">
        <h3 className="ui-label">{titulo}</h3>
        {acao && <span className="ml-auto">{acao}</span>}
      </div>
      {children}
    </section>
  );
}

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border bg-card p-4', className)}>{children}</div>;
}

export const ETIQUETA = 'rounded px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground';

interface CampoNoLugarProps {
  campo: CampoDaEmpresa;
  rotulo: string;
  placeholder?: string;
  valorInicial?: string;
  onSalvar: (valor: string) => void;
  /** O que aparece fora da edição: o botão ou o cartão vazio. */
  children: ReactNode;
  className?: string;
}

export function EdicaoDoCampo(props: { rotulo: string; placeholder?: string; valorInicial: string; aceitaVazio?: boolean; onSalvar: (v: string) => void; onSair: () => void }) {
  const { rotulo, placeholder, valorInicial, aceitaVazio = false, onSalvar, onSair } = props;
  const [valor, setValor] = useState(valorInicial);
  const feito = useRef(false);
  const sair = (salvar: boolean) => {
    if (feito.current) return;
    feito.current = true;
    const novo = valor.trim();
    const vale = novo !== '' || (aceitaVazio && valorInicial !== '');
    if (salvar && vale && novo !== valorInicial) onSalvar(novo);
    onSair();
  };
  return (
    <Input
      autoFocus
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => sair(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') sair(true);
        if (e.key === 'Escape') sair(false);
      }}
      placeholder={placeholder}
      aria-label={rotulo}
      className="h-8 text-[13px]"
    />
  );
}

/**
 * Dado que quem estuda a empresa sabe e informa ali mesmo (US-0053): clique, digite, Enter. O
 * "Preencher" do widget abre o mesmo campo.
 */
export function CampoNoLugar(props: CampoNoLugarProps) {
  const { campo, rotulo, placeholder, valorInicial = '', onSalvar, children, className } = props;
  const { aberto, ancora, abrir, fechar } = useCampoAberto(campo);
  return (
    <div ref={ancora} id={`campo-${campo}`} className={className}>
      {aberto ? (
        <EdicaoDoCampo rotulo={rotulo} placeholder={placeholder} valorInicial={valorInicial} onSalvar={onSalvar} onSair={fechar} />
      ) : (
        <button type="button" onClick={abrir} aria-label={rotulo} className="w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {children}
        </button>
      )}
    </div>
  );
}
