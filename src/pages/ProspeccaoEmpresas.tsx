import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyDetailDialog } from '@/components/prospeccao/CompanyDetailDialog';
import { CompanyFilterButton } from '@/components/prospeccao/CompanyFilterButton';
import { CompanyTable } from '@/components/prospeccao/CompanyTable';
import { ConvertProspectDialog } from '@/components/prospeccao/ConvertProspectDialog';
import { DiscardProspectDialog } from '@/components/prospeccao/DiscardProspectDialog';
import { ProspectDetailDialog } from '@/components/prospeccao/ProspectDetailDialog';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useProspectCompanies } from '@/hooks/useProspectCompanies';
import { useProspects } from '@/hooks/useProspects';
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
import { cn } from '@/lib/utils';
import type { ProspectWithCompany } from '@/types/prospect';

const POR_PAGINA = 25;

const ABAS: ReadonlyArray<{ valor: CompanyTab; rotulo: string }> = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'abordar', rotulo: 'Abordar' },
  { valor: 'nao_abordar', rotulo: 'Não abordar' },
];

/**
 * Empresas da prospecção (24/09/2026) — a visão por CONTA do pipeline frio.
 *
 * Existe para responder antes de abrir o LinkedIn: "posso abordar esta empresa?". Um
 * contato de "Respondeu" em diante ocupa a empresa inteira; quem pediu para parar bloqueia
 * a conta. Cadência sozinha não bloqueia. A regra mora em `companyProspectStatus` — a tela só exibe.
 */
export default function ProspeccaoEmpresas() {
  const { data: empresas = [], isLoading: carregandoEmpresas } = useProspectCompanies();
  const { data: contatos = [], isLoading: carregandoContatos } = useProspects();
  const { byId } = useEmployeeDirectoryMap();

  const [consulta, setConsulta] = useState<CompanyQuery>({ tab: 'todas', busca: '', filtros: FILTROS_VAZIOS });
  const [sort, setSort] = useState<CompanySort>({ key: 'name', dir: 1 });
  const [pagina, setPagina] = useState(0);
  const [empresaAberta, setEmpresaAberta] = useState<string | null>(null);
  const [contatoAberto, setContatoAberto] = useState<ProspectWithCompany | null>(null);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [convertendo, setConvertendo] = useState<ProspectWithCompany | null>(null);

  const linhas = useMemo(() => buildCompanyRows(empresas, contatos), [empresas, contatos]);
  const visiveis = useMemo(() => ordenar(aplicarConsulta(linhas, consulta), sort), [linhas, consulta, sort]);
  const contagem = useMemo(() => contarAbas(linhas, consulta), [linhas, consulta]);

  const totalDePaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  useEffect(() => setPagina(0), [consulta, sort]);

  // Os popups leem a linha atual, não a cópia do clique: editar a empresa atualiza o modal.
  const empresaAtual = linhas.find((l) => l.company.id === empresaAberta) ?? null;
  const contatoAtual = versaoAtual(contatoAberto, contatos);

  const filtrando = temFiltroAtivo(consulta);
  const limparTudo = () => setConsulta({ tab: 'todas', busca: '', filtros: FILTROS_VAZIOS });
  const definirFiltro = (key: CompanyFacetKey) => (valores: string[]) =>
    setConsulta((c) => ({ ...c, filtros: { ...c.filtros, [key]: valores } }));
  const alternarOrdem = (key: CompanySortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const rotuloDoValor = (key: CompanyFacetKey) => (valor: string) => rotuloDeFaceta(key, valor, byId);

  return (
    <AppLayout
      title="Empresas"
      description="Contas da prospecção: quem já está sendo abordado e quem está livre"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Empresas' }]}
    >
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <AbasDeAbordagem
            valor={consulta.tab}
            contagem={contagem}
            onChange={(tab) => setConsulta((c) => ({ ...c, tab }))}
          />

          <div className="hidden h-[22px] w-px bg-border sm:block" aria-hidden="true" />

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
              carregando={carregandoEmpresas || carregandoContatos}
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
        onOpenContact={setContatoAberto}
      />

      <ProspectDetailDialog
        prospect={contatoAtual}
        open={!!contatoAberto}
        onOpenChange={(aberto) => !aberto && setContatoAberto(null)}
        onDiscard={setDescartando}
        onConvert={setConvertendo}
      />

      <DiscardProspectDialog
        prospect={descartando}
        open={!!descartando}
        onOpenChange={(aberto) => !aberto && setDescartando(null)}
      />

      <ConvertProspectDialog
        prospect={convertendo}
        open={!!convertendo}
        onOpenChange={(aberto) => !aberto && setConvertendo(null)}
      />
    </AppLayout>
  );
}

function AbasDeAbordagem({
  valor,
  contagem,
  onChange,
}: {
  valor: CompanyTab;
  contagem: Record<CompanyTab, number>;
  onChange: (tab: CompanyTab) => void;
}) {
  return (
    <div role="tablist" aria-label="Filtrar por abordagem" className="flex gap-0.5 rounded-[9px] bg-muted p-[3px]">
      {ABAS.map((aba) => {
        const ativa = aba.valor === valor;
        return (
          <button
            key={aba.valor}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => onChange(aba.valor)}
            className={cn(
              'flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              ativa ? 'bg-card text-foreground shadow-sm' : 'text-foreground/70 hover:text-foreground',
            )}
          >
            {aba.rotulo}
            <span className="font-medium text-muted-foreground">{contagem[aba.valor]}</span>
          </button>
        );
      })}
    </div>
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
        titulo="Nenhuma empresa cadastrada ainda"
        texto="As empresas entram ao cadastrar um contato na Prospecção."
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

function EstadoVazio({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
      <p className="text-[14.5px] font-medium">{titulo}</p>
      <p className="text-[13px] text-muted-foreground">{texto}</p>
      {children}
    </div>
  );
}

function Rodape({
  exibidas,
  total,
  filtrado,
  pagina,
  totalDePaginas,
  onPagina,
}: {
  exibidas: number;
  total: number;
  filtrado: boolean;
  pagina: number;
  totalDePaginas: number;
  onPagina: (pagina: number) => void;
}) {
  const texto = `${exibidas} ${exibidas === 1 ? 'empresa' : 'empresas'}${filtrado ? ` de ${total}` : ''}`;
  return (
    <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-5 py-2.5 text-[12.5px] text-muted-foreground">
      <span>{texto}</span>
      <div className="flex items-center gap-1.5">
        {totalDePaginas > 1 && <span className="mr-1">{pagina + 1} de {totalDePaginas}</span>}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          aria-label="Página anterior"
          disabled={pagina === 0}
          onClick={() => onPagina(pagina - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          aria-label="Próxima página"
          disabled={pagina >= totalDePaginas - 1}
          onClick={() => onPagina(pagina + 1)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

/** O contato recém-invalidado, não a cópia do clique. */
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
