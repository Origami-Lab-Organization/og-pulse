import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyDetailDialog } from '@/components/prospeccao/CompanyDetailDialog';
import { CompanyFilterButton } from '@/components/prospeccao/CompanyFilterButton';
import { CompanyTable } from '@/components/prospeccao/CompanyTable';
import { DiscardProspectDialog } from '@/components/prospeccao/DiscardProspectDialog';
import { EstadoVazio, RodapeDaLista } from '@/components/prospeccao/ListaDeCadastro';
import { ProspectDetailDialog } from '@/components/prospeccao/ProspectDetailDialog';
import { ProspectWonDialog } from '@/components/prospeccao/ProspectWonDialog';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useProspectCompanies } from '@/hooks/useProspectCompanies';
import { usePendingProspectTasks } from '@/hooks/useProspectTasks';
import { useProspects } from '@/hooks/useProspects';
import { useProspectContacts } from '@/hooks/useProspectContacts';
import {
  aplicarConsulta,
  temFiltroAtivo,
  COMPANY_FACETS,
  contarAbas,
  FILTROS_VAZIOS,
  opcoesDaFaceta,
  ordenar,
  paginar,
  SEM_RESPONSAVEL,
  type CompanyFacetKey,
  type CompanyQuery,
  type CompanySort,
  type CompanySortKey,
  type CompanyTab,
} from '@/lib/prospecting/companyList';
import { buildCompanyRows, type CompanyRow } from '@/lib/prospecting/companyStatus';
import type { ProspectWithCompany } from '@/types/prospect';

const POR_PAGINA = 25;
const ORDEM_FIT: CompanySortKey = 'fit';

/** As antigas abas da tela viraram filtro de abordagem (decisão de 16/11/2026, US-0002). */
const ABORDAGENS: ReadonlyArray<{ valor: CompanyTab; rotulo: string }> = [
  { valor: 'todas', rotulo: 'Todas as abordagens' },
  { valor: 'abordar', rotulo: 'Abordar' },
  { valor: 'nao_abordar', rotulo: 'Não abordar' },
];

/**
 * Aba "Na Prospecção" da tela Empresas: as contas que já estão na Prospecção do tenant
 * (24/09/2026, movida para cá em 16/11/2026).
 *
 * Existe para responder antes de abrir o LinkedIn: "posso abordar esta empresa?". Uma
 * oportunidade de "Respondeu" em diante ocupa a empresa inteira; quem pediu para parar bloqueia
 * a conta. Cadência sozinha não bloqueia. A regra mora em `companyProspectStatus` — a tela só exibe.
 */
export function ContasDaProspeccao() {
  const { data: empresas = [], isLoading: carregandoEmpresas } = useProspectCompanies();
  const { data: oportunidades = [], isLoading: carregandoOportunidades } = useProspects();
  const { data: pessoas = [], isLoading: carregandoPessoas } = useProspectContacts();
  const { byId } = useEmployeeDirectoryMap();

  const [consulta, setConsulta] = useState<CompanyQuery>({ tab: 'todas', busca: '', filtros: FILTROS_VAZIOS });
  const [sort, setSort] = useState<CompanySort>({ key: 'name', dir: 1 });
  const [pagina, setPagina] = useState(0);
  const [empresaAberta, setEmpresaAberta] = useState<string | null>(null);
  const [oportunidadeAberta, setOportunidadeAberta] = useState<ProspectWithCompany | null>(null);
  // `?empresa=<id>`: o link das notificações de gatilho (company-watch) abre a ficha. Ao ler,
  // troca o parâmetro pela aba, numa atualização só, para a tela continuar nesta aba.
  const [params, setParams] = useSearchParams();
  const empresaDoLink = params.get('empresa');
  useEffect(() => {
    if (!empresaDoLink) return;
    setEmpresaAberta(empresaDoLink);
    setParams((atual) => {
      atual.delete('empresa');
      atual.set('aba', 'prospeccao');
      return atual;
    }, { replace: true });
  }, [empresaDoLink, setParams]);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [ganhando, setGanhando] = useState<ProspectWithCompany | null>(null);

  const { porContato: proximaTarefa } = usePendingProspectTasks();
  const linhas = useMemo(
    () => buildCompanyRows(empresas, oportunidades, proximaTarefa, pessoas),
    [empresas, oportunidades, proximaTarefa, pessoas],
  );
  const visiveis = useMemo(() => ordenar(aplicarConsulta(linhas, consulta), sort), [linhas, consulta, sort]);
  const contagem = useMemo(() => contarAbas(linhas, consulta), [linhas, consulta]);

  const totalDePaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  useEffect(() => setPagina(0), [consulta, sort]);

  // Os popups leem a linha atual, não a cópia do clique: editar a empresa atualiza o modal.
  const empresaAtual = linhas.find((l) => l.company.id === empresaAberta) ?? null;
  const oportunidadeAtual = versaoAtual(oportunidadeAberta, oportunidades);

  const filtrando = temFiltroAtivo(consulta);
  const limparTudo = () => setConsulta({ tab: 'todas', busca: '', filtros: FILTROS_VAZIOS });
  const definirFiltro = (key: CompanyFacetKey) => (valores: string[]) =>
    setConsulta((c) => ({ ...c, filtros: { ...c.filtros, [key]: valores } }));
  const alternarOrdem = (key: CompanySortKey) =>
    // Fit começa do maior: a pergunta é "quem vale abordar primeiro".
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === ORDEM_FIT ? -1 : 1 }));
  const rotuloDoValor = (key: CompanyFacetKey) => (valor: string) => rotuloDeFaceta(key, valor, byId);

  return (
    <>
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={consulta.tab} onValueChange={(tab) => setConsulta((c) => ({ ...c, tab: tab as CompanyTab }))}>
            <SelectTrigger className="h-8 w-auto gap-1.5 text-[13px]" aria-label="Filtrar por abordagem">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ABORDAGENS.map((a) => (
                <SelectItem key={a.valor} value={a.valor}>
                  {a.rotulo} ({contagem[a.valor]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-center gap-1.5">
            {COMPANY_FACETS.map((faceta) => (
              <CompanyFilterButton
                key={faceta.key}
                label={faceta.label}
                options={opcoesDaFaceta(linhas, faceta.key, consulta)}
                selected={consulta.filtros[faceta.key]}
                onChange={definirFiltro(faceta.key)}
                labelOf={rotuloDoValor(faceta.key)}
              />
            ))}
            {filtrando && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-[13px] text-muted-foreground" onClick={limparTudo}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="relative ml-auto min-w-[220px] flex-[0_1_320px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={consulta.busca}
              onChange={(e) => setConsulta((c) => ({ ...c, busca: e.target.value }))}
              placeholder="Buscar por nome, CNPJ ou setor"
              aria-label="Buscar empresa"
              className="h-[34px] pl-9 text-[13.5px]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Conteudo
              carregando={carregandoEmpresas || carregandoOportunidades || carregandoPessoas}
              semEmpresas={linhas.length === 0}
              linhas={paginar(visiveis, pagina, POR_PAGINA)}
              sort={sort}
              onSort={alternarOrdem}
              onOpen={(row) => setEmpresaAberta(row.company.id)}
              onLimpar={limparTudo}
            />
          </div>
          <Rodape
            exibidas={visiveis.length}
            total={linhas.length}
            filtrado={filtrando || consulta.tab !== 'todas'}
            pagina={pagina}
            totalDePaginas={totalDePaginas}
            onPagina={setPagina}
          />
        </div>
      </div>

      <CompanyDetailDialog
        row={empresaAtual}
        open={!!empresaAtual}
        onOpenChange={(aberto) => !aberto && setEmpresaAberta(null)}
        onOpenOpportunity={setOportunidadeAberta}
      />

      <ProspectDetailDialog
        prospect={oportunidadeAtual}
        open={!!oportunidadeAberta}
        onOpenChange={(aberto) => !aberto && setOportunidadeAberta(null)}
        onDiscard={setDescartando}
        onWin={setGanhando}
      />

      <DiscardProspectDialog
        prospect={descartando}
        open={!!descartando}
        onOpenChange={(aberto) => !aberto && setDescartando(null)}
      />

      <ProspectWonDialog
        prospect={ganhando}
        open={!!ganhando}
        onOpenChange={(aberto) => !aberto && setGanhando(null)}
      />
    </>
  );
}

function Conteudo({
  carregando,
  semEmpresas,
  linhas,
  sort,
  onSort,
  onOpen,
  onLimpar,
}: {
  carregando: boolean;
  semEmpresas: boolean;
  linhas: CompanyRow[];
  sort: CompanySort;
  onSort: (key: CompanySortKey) => void;
  onOpen: (row: CompanyRow) => void;
  onLimpar: () => void;
}) {
  if (carregando) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label="Carregando empresas">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  if (semEmpresas) {
    return (
      <EstadoVazio
        titulo="Nenhuma empresa na Prospecção ainda"
        texto="As empresas entram ao abrir uma oportunidade, cadastrar um contato ou importar CNPJs."
      />
    );
  }
  if (linhas.length === 0) {
    return (
      <EstadoVazio titulo="Nenhuma empresa encontrada" texto="Ajuste a busca ou os filtros aplicados.">
        <Button variant="outline" size="sm" className="mt-1" onClick={onLimpar}>Limpar tudo</Button>
      </EstadoVazio>
    );
  }
  return <CompanyTable rows={linhas} sort={sort} onSort={onSort} onOpen={onOpen} />;
}

function Rodape(props: {
  exibidas: number;
  total: number;
  filtrado: boolean;
  pagina: number;
  totalDePaginas: number;
  onPagina: (pagina: number) => void;
}) {
  const { exibidas, total, filtrado, ...paginacao } = props;
  const texto = `${exibidas} ${exibidas === 1 ? 'empresa' : 'empresas'}${filtrado ? ` de ${total}` : ''}`;
  return <RodapeDaLista texto={texto} {...paginacao} />;
}

/** A oportunidade recém-invalidada, não a cópia do clique. */
function versaoAtual(
  aberto: ProspectWithCompany | null,
  contatos: ProspectWithCompany[],
): ProspectWithCompany | null {
  if (!aberto) return null;
  return contatos.find((c) => c.id === aberto.id) ?? aberto;
}

function rotuloDeFaceta(key: CompanyFacetKey, valor: string, byId: Map<string, { nome: string }>): string {
  return key === 'resp' ? nomeDoResponsavel(valor, byId) : valor;
}

function nomeDoResponsavel(id: string, byId: Map<string, { nome: string }>): string {
  if (id === SEM_RESPONSAVEL) return 'Sem responsável';
  return byId.get(id)?.nome ?? 'Pessoa removida';
}
