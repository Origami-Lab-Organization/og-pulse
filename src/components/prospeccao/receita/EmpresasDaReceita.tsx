import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EstadoVazio, RodapeDaLista } from '@/components/prospeccao/ListaDeCadastro';
import { ErroDaBase, LIMITE_DE_NAVEGACAO, POR_PAGINA_RECEITA, useEmpresasReceita } from '@/hooks/useEmpresasReceita';
import {
  alternarOrdenacao,
  dataDaBase,
  ORDENACAO_PADRAO,
  type OrdemReceita,
  type PaginaReceita,
} from '@/lib/prospecting/empresasReceita';
import { cn } from '@/lib/utils';
import { EmpresasReceitaTable } from './EmpresasReceitaTable';

const RECORTE = 'Empresas baixadas, inaptas ou suspensas, filiais, ME e EPP não entram nesta lista. As filiais aparecem na ficha da matriz.';

/** Aba "A classificar" da tela Empresas: a base da Receita, página por página (US-0002). */
export function EmpresasDaReceita() {
  const [ordenacao, setOrdenacao] = useState(ORDENACAO_PADRAO);
  const [pagina, setPagina] = useState(0);
  const consulta = useEmpresasReceita(ordenacao, pagina);

  const ordenar = (ordem: OrdemReceita) => {
    setOrdenacao((atual) => alternarOrdenacao(atual, ordem));
    setPagina(0);
  };

  return (
    <div className="space-y-3">
      {consulta.data?.total != null && <LinhaDoTotal pagina={consulta.data} />}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Conteudo
          consulta={consulta}
          trocandoDePagina={consulta.isPlaceholderData}
          ordenacao={ordenacao}
          onOrdenar={ordenar}
        />
        {consulta.data?.total ? (
          <RodapeDaLista
            texto={textoDoRodape(pagina, consulta.data.total)}
            pagina={pagina}
            totalDePaginas={Math.ceil(Math.min(consulta.data.total, LIMITE_DE_NAVEGACAO) / POR_PAGINA_RECEITA)}
            onPagina={setPagina}
          />
        ) : null}
      </div>
    </div>
  );
}

function LinhaDoTotal({ pagina }: { pagina: PaginaReceita }) {
  const data = dataDaBase(pagina.carregadaEm);
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] text-muted-foreground">
      <b className="font-mono font-semibold tabular-nums text-foreground">{(pagina.total ?? 0).toLocaleString('pt-BR')}</b>
      <span>empresas</span>
      <span title={RECORTE}>· só matrizes ativas, médias e grandes</span>
      {data && <span>· base de {data}</span>}
    </p>
  );
}

function Conteudo(props: {
  consulta: ReturnType<typeof useEmpresasReceita>;
  trocandoDePagina: boolean;
  ordenacao: typeof ORDENACAO_PADRAO;
  onOrdenar: (ordem: OrdemReceita) => void;
}) {
  const { consulta, trocandoDePagina, ordenacao, onOrdenar } = props;
  if (consulta.isLoading) return <Carregando />;
  if (consulta.error) return <Falha erro={consulta.error} onTentar={() => consulta.refetch()} />;
  if (!consulta.data || consulta.data.total == null) {
    return (
      <EstadoVazio
        titulo="A base da Receita ainda não foi carregada"
        texto="Quando a primeira carga terminar, as médias e grandes empresas do país aparecem aqui."
      />
    );
  }
  return (
    <div className={cn('overflow-x-auto transition-opacity', trocandoDePagina && 'opacity-60')} aria-busy={trocandoDePagina}>
      <EmpresasReceitaTable linhas={consulta.data.linhas} ordenacao={ordenacao} onOrdenar={onOrdenar} />
    </div>
  );
}

function Carregando() {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-label="Carregando empresas">
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

function Falha({ erro, onTentar }: { erro: Error; onTentar: () => void }) {
  if (erro instanceof ErroDaBase && erro.falha === 'sem_permissao') {
    return (
      <EstadoVazio
        titulo="Você não tem acesso à base da Receita"
        texto="Peça a quem administra o Pulse a permissão de ver a Prospecção."
      />
    );
  }
  return (
    <EstadoVazio
      titulo="A base da Receita está indisponível agora"
      texto="Tente de novo em alguns minutos. O restante do Pulse continua funcionando."
    >
      <Button variant="outline" size="sm" className="mt-1" onClick={onTentar}>Tentar de novo</Button>
    </EstadoVazio>
  );
}

function textoDoRodape(pagina: number, total: number): string {
  const inicio = pagina * POR_PAGINA_RECEITA + 1;
  const fim = Math.min(total, (pagina + 1) * POR_PAGINA_RECEITA);
  const faixa = `${inicio.toLocaleString('pt-BR')}–${fim.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} empresas`;
  return total > LIMITE_DE_NAVEGACAO ? `${faixa} · a lista vai até as 10 mil primeiras; use os filtros para as outras` : faixa;
}
