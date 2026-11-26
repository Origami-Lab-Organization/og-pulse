import { Link } from 'react-router-dom';
import { Check, FolderKanban, Target, X } from 'lucide-react';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { formatarData } from '@/lib/prospecting/prazos';
import { SECAO_DA_EMPRESA, TIPO_DE_EVENTO, type TipoDeEvento } from '@/lib/prospecting/faseDaEmpresa.constants';
import { eventosDoHistorico, numerosDoHistorico } from '@/lib/prospecting/paginaDaEmpresa';
import { cn } from '@/lib/utils';
import type { FichaReceita } from '@/types/fichaReceita';
import type { EventoDoHistorico } from '@/types/paginaDaEmpresa';
import { Secao } from './PecasDaPagina';

const ESTILO_DO_EVENTO: Record<TipoDeEvento, { icone: typeof Check; cor: string }> = {
  [TIPO_DE_EVENTO.GANHO]: { icone: Check, cor: 'border-success-emphasis text-success-emphasis' },
  [TIPO_DE_EVENTO.PERDA]: { icone: X, cor: 'border-destructive text-destructive' },
  [TIPO_DE_EVENTO.ANDAMENTO]: { icone: Target, cor: 'border-primary text-primary' },
  [TIPO_DE_EVENTO.PROJETO]: { icone: FolderKanban, cor: 'border-border text-foreground' },
};

/** Um ponto da linha do tempo; o traço liga ao próximo, à direita. */
function Evento({ evento }: { evento: EventoDoHistorico }) {
  const { icone: Icone, cor } = ESTILO_DO_EVENTO[evento.tipo];
  return (
    <li className="relative min-w-[210px] flex-1 pr-5 after:absolute after:left-8 after:right-0 after:top-[37px] after:h-0.5 after:bg-border last:after:hidden">
      <Link to={evento.href} className="group grid gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="h-[18px] font-mono text-[12px] tabular-nums text-muted-foreground">{evento.data ? formatarData(evento.data) : '—'}</span>
        <span aria-hidden="true" className={cn('relative z-[1] mb-1 grid h-7 w-7 place-items-center rounded-full border-2 bg-card', cor)}><Icone className="h-3.5 w-3.5" /></span>
        <span className="text-[13.5px] font-semibold group-hover:text-primary group-hover:underline">{evento.titulo}</span>
        <span className="text-[12.5px] text-muted-foreground">{evento.detalhe}</span>
      </Link>
    </li>
  );
}

function Numeros({ ficha }: { ficha: FichaReceita }) {
  const n = numerosDoHistorico(ficha.historico);
  const numeros: Array<[number, string, string]> = [
    [n.oportunidades, 'Oportunidade', 'Oportunidades'],
    [n.ganhos, 'Ganho', 'Ganhos'],
    [n.perdas, 'Perda', 'Perdas'],
    [n.projetos, 'Projeto', 'Projetos'],
  ];
  return (
    <div className="mb-3.5 flex flex-wrap gap-x-6 gap-y-1.5 border-b pb-3">
      {numeros.map(([valor, um, varios]) => (
        <span key={varios} className="text-[13px] text-muted-foreground">
          <b className="mr-1.5 font-mono text-[17px] tabular-nums text-foreground">{valor}</b>
          {valor === 1 ? um : varios}
        </span>
      ))}
    </div>
  );
}

/** Histórico com a Origami (US-0053): os números e a linha do tempo, na horizontal. */
export function SecaoHistorico({ ficha }: { ficha: FichaReceita }) {
  const { byId } = useEmployeeDirectoryMap();
  const nomeDe = (id: string | null) => (id ? byId.get(id)?.nome ?? 'responsável' : 'sem responsável');
  const eventos = eventosDoHistorico(ficha.historico, nomeDe);
  return (
    <Secao id={SECAO_DA_EMPRESA.HISTORICO} titulo="Histórico com a Origami">
      {ficha.relacao_indisponivel ? (
        <p className="text-[13px] text-muted-foreground">O histórico não carregou agora.</p>
      ) : (
        <div className="rounded-xl border bg-card px-4 pb-3 pt-3.5">
          <Numeros ficha={ficha} />
          {eventos.length > 0 && (
            <ol aria-label="Linha do tempo, da mais antiga para a mais recente" className="flex overflow-x-auto pb-1">
              {eventos.map((e) => <Evento key={`${e.tipo}-${e.id}`} evento={e} />)}
            </ol>
          )}
        </div>
      )}
    </Secao>
  );
}
