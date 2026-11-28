import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUpdateProspectStage } from '@/hooks/useProspects';
import { useTipoDeContaDaEmpresa } from '@/hooks/usePaginaDaEmpresa';
import { ETAPA_A_ABORDAR, TEMPO_DO_PRONTO_MS } from '@/lib/prospecting/faseDaEmpresa.constants';
import { passosDaQualificacao } from '@/lib/prospecting/paginaDaEmpresa';
import { cn } from '@/lib/utils';
import { TIPOS_DE_CONTA, type ProspectCompanyDB, type ProspectWithCompany } from '@/types/prospect';
import type { PassoDoWidget } from '@/types/paginaDaEmpresa';
import { useEdicaoDaEmpresa } from './edicaoDaEmpresa';
import { ICONE_DO_TIPO } from './iconesDoTipo';

const ANEL = 2 * Math.PI * 9;

function Anel({ parte }: { parte: number }) {
  return (
    <svg viewBox="0 0 22 22" className="h-6 w-6 -rotate-90" aria-hidden>
      <circle cx="11" cy="11" r="9" fill="none" strokeWidth="3" className="stroke-muted" />
      <circle cx="11" cy="11" r="9" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={ANEL} strokeDashoffset={ANEL * (1 - parte)} className="stroke-primary transition-all duration-300" />
    </svg>
  );
}

/** O passo que acabou de ficar pronto, por alguns segundos ("Pronto · Site informado"). */
function useRecemFeito(passos: PassoDoWidget[]) {
  const [recem, setRecem] = useState<string | null>(null);
  const antes = useRef<Set<string> | null>(null);
  const feitos = passos.filter((p) => p.feito).map((p) => p.chave);
  const chave = feitos.join(',');
  useEffect(() => {
    const agora = new Set(chave ? chave.split(',') : []);
    const novo = antes.current ? passos.find((p) => agora.has(p.chave) && !antes.current?.has(p.chave)) : undefined;
    antes.current = agora;
    if (!novo) return;
    setRecem(novo.rotulo);
    const t = setTimeout(() => setRecem(null), TEMPO_DO_PRONTO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só à mudança do que está feito
  }, [chave]);
  return recem;
}

function Passo({ passo, onPreencher }: { passo: PassoDoWidget; onPreencher: (p: PassoDoWidget) => void }) {
  const leva = !passo.feito && (passo.campo || passo.secao);
  return (
    <li className="flex items-center gap-2.5 py-1.5 text-[13px]">
      <span aria-hidden="true" className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border', passo.feito && 'border-primary bg-primary text-primary-foreground')}>
        {passo.feito && <Check className="h-3 w-3" />}
      </span>
      <span className={cn('flex-1', passo.feito && 'text-muted-foreground line-through')}>{passo.rotulo}</span>
      {leva && (
        <Button variant="link" size="sm" className="h-auto p-0 text-[12.5px]" onClick={() => onPreencher(passo)}>Preencher</Button>
      )}
    </li>
  );
}

/** O tipo de conta escolhido dentro do widget; dá para trocar depois pelo selo do cabeçalho. */
function TipoDeConta({ empresa }: { empresa: ProspectCompanyDB }) {
  const salvar = useTipoDeContaDaEmpresa();
  return (
    <div className="space-y-1.5 border-t pt-3">
      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo de conta</p>
      <div role="group" aria-label="Tipo de conta" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {TIPOS_DE_CONTA.map((t) => {
          const Icone = ICONE_DO_TIPO[t.value];
          const escolhido = empresa.tipo_conta === t.value;
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={escolhido}
              title={t.faixa}
              disabled={salvar.isPending}
              onClick={() => !escolhido && salvar.mutate({ id: empresa.id, tipo: t.value })}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                escolhido && 'bg-background text-foreground shadow-sm',
              )}
            >
              <Icone className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function textoDoStatus(recem: string | null, feitos: number, total: number) {
  if (recem) return `Pronto · ${recem}`;
  if (feitos === total) return 'Pronta para virar Oportunidade';
  return `${feitos} de ${total} passos`;
}

/**
 * Próximos passos da qualificação como widget (US-0053), no molde do checklist do planejamento:
 * um botão fixo no canto com o andamento; aberto, os passos, o "Preencher" e o tipo de conta.
 * Os passos orientam; quem decide criar a Oportunidade é quem estudou.
 */
export function WidgetDaQualificacao(props: { empresa: ProspectCompanyDB; oportunidade: ProspectWithCompany }) {
  const { empresa, oportunidade } = props;
  const { widgetAberto, abrirWidget, editar, mostrar } = useEdicaoDaEmpresa();
  const criar = useUpdateProspectStage();
  const passos = passosDaQualificacao(empresa, oportunidade);
  const feitos = passos.filter((p) => p.feito).length;
  const tudo = feitos === passos.length;
  const recem = useRecemFeito(passos);
  const status = textoDoStatus(recem, feitos, passos.length);
  const preencher = (p: PassoDoWidget) => {
    abrirWidget(false);
    if (p.campo) editar(p.campo);
    else if (p.secao) mostrar(p.secao);
  };
  return (
    <Popover open={widgetAberto} onOpenChange={abrirWidget}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Qualificação: ${status}`}
          className={cn(
            'fixed bottom-20 right-6 z-40 inline-flex items-center gap-3 rounded-lg border bg-card px-3.5 py-2.5 text-left shadow-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            (recem || tudo) && 'border-primary',
          )}
        >
          {tudo ? <ClipboardCheck className="h-6 w-6 text-primary" aria-hidden /> : <Anel parte={feitos / passos.length} />}
          <span className="grid leading-tight">
            <span className="text-sm font-semibold text-foreground">Qualificação</span>
            <span className={cn('text-xs text-muted-foreground', (recem || tudo) && 'font-medium text-success-emphasis')}>{status}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={10} onCloseAutoFocus={(e) => e.preventDefault()} className="w-[min(340px,calc(100vw-2rem))] space-y-3 p-4">
        <p className="text-[14px] font-semibold">Próximos passos da qualificação</p>
        <ul>{passos.map((p) => <Passo key={p.chave} passo={p} onPreencher={preencher} />)}</ul>
        <TipoDeConta empresa={empresa} />
        {tudo && (
          <Button className="w-full" disabled={criar.isPending} onClick={() => criar.mutate({ id: oportunidade.id, stage: ETAPA_A_ABORDAR })}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Criar Oportunidade
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
