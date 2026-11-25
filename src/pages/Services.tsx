import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, ChevronRight, MoreVertical, Pencil, Plus, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ServiceLineFormDialog } from '@/components/services/ServiceLineFormDialog';
import { ServiceSheet } from '@/components/services/ServiceSheet';
import { StatusDoServicoPill } from '@/components/services/StatusDoServicoPill';
import {
  useCreateServiceLine,
  useServiceLines,
  useToggleServiceLineActive,
  useUpdateServiceLine,
} from '@/hooks/useServiceLines';
import { useDeleteService, useProjetosPorServico, useServices, useToggleServiceActive } from '@/hooks/useServices';
import { useServiceRevenueModels } from '@/hooks/useServiceRevenueModels';
import { useCostCenters } from '@/hooks/useCostCenters';
import { foraDasAbasDeLinha, rotuloDoServico, statusDoServico } from '@/lib/catalogo';
import { ABA_DESATIVADOS, CONFIRMACAO_DO_CATALOGO as CONFIRMAR, STATUS_DO_SERVICO } from '@/lib/catalogo.constants';
import { modelosAtivos, rotuloDoModelo, servicoTemPercentual, temFormaAntiga } from '@/lib/formasDeReceita';
import type { Service } from '@/types/service';
import type { CreateServiceLineInput, ServiceLine } from '@/types/serviceLine';
import type { ServiceRevenueModel } from '@/types/serviceRevenueModel';
import { cn } from '@/lib/utils';

/** O que a página pede para confirmar: desativar linha ou serviço, ou excluir serviço. */
type Confirmacao =
  | { tipo: typeof CONFIRMAR.DESATIVAR_LINHA; linha: ServiceLine }
  | { tipo: typeof CONFIRMAR.DESATIVAR_SERVICO; servico: Service }
  | { tipo: typeof CONFIRMAR.EXCLUIR_SERVICO; servico: Service };

const PARAMETRO_DA_ABA = 'linha';

const contem = (texto: string, busca: string) => texto.toLowerCase().includes(busca);

function servicosDaAba(aba: string, services: Service[], lines: ServiceLine[]) {
  if (aba === ABA_DESATIVADOS) return services.filter((s) => foraDasAbasDeLinha(s, lines));
  return services.filter((s) => s.serviceLineId === aba && !s.desativado);
}

function filtrarPorBusca(services: Service[], models: ServiceRevenueModel[], busca: string) {
  const termo = busca.trim().toLowerCase();
  if (!termo) return services;
  return services.filter(
    (s) => contem(s.name, termo) || modelosAtivos(s.id, models).some((m) => contem(rotuloDoModelo(m.formas), termo)),
  );
}

function tituloDaConfirmacao(c: Confirmacao, services: Service[]): string {
  if (c.tipo === CONFIRMAR.EXCLUIR_SERVICO) return `Excluir ${c.servico.name}?`;
  if (c.tipo === CONFIRMAR.DESATIVAR_SERVICO) return `Desativar ${c.servico.name}?`;
  const n = services.filter((s) => s.serviceLineId === c.linha.id && !s.desativado).length;
  const servicos = n === 1 ? 'o serviço' : `os ${n} serviços`;
  return n === 0 ? `Desativar a linha ${c.linha.name}?` : `Desativar a linha ${c.linha.name} e ${servicos} dela?`;
}

// ─── Abas ───────────────────────────────────────────────────────────────────────

function AbasDoCatalogo(props: { lines: ServiceLine[]; services: Service[]; aba: string; onAba: (aba: string) => void }) {
  const { lines, services, aba, onAba } = props;
  const abas = [
    ...lines.filter((l) => l.isActive).map((l) => ({
      id: l.id,
      nome: l.name,
      n: services.filter((s) => s.serviceLineId === l.id && !s.desativado).length,
    })),
    { id: ABA_DESATIVADOS, nome: 'Desativados', n: services.filter((s) => foraDasAbasDeLinha(s, lines)).length },
  ];
  return (
    <div role="tablist" aria-label="Linhas de serviço" className="flex flex-wrap gap-1">
      {abas.map((a) => (
        <button
          key={a.id}
          role="tab"
          type="button"
          aria-selected={aba === a.id}
          onClick={() => onAba(a.id)}
          className={cn(
            '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            aba === a.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {a.nome}
          <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{a.n}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Cabeçalho da aba ───────────────────────────────────────────────────────────

interface CabecalhoProps {
  aba: string;
  lines: ServiceLine[];
  onNovoServico: () => void;
  onEditarLinha: (linha: ServiceLine) => void;
  onDesativarLinha: (linha: ServiceLine) => void;
  onReativarLinha: (linha: ServiceLine) => void;
}

function CabecalhoDosDesativados(props: Pick<CabecalhoProps, 'lines' | 'onReativarLinha'>) {
  const { lines, onReativarLinha } = props;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Desativados</h2>
      <div className="flex flex-wrap gap-2">
        {lines.filter((l) => !l.isActive).map((l) => (
          <Button key={l.id} variant="outline" size="sm" onClick={() => onReativarLinha(l)}>
            Reativar linha {l.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

function CabecalhoDaAba(props: CabecalhoProps) {
  const { aba, lines, onNovoServico, onEditarLinha, onDesativarLinha } = props;
  if (aba === ABA_DESATIVADOS) return <CabecalhoDosDesativados {...props} />;
  const linha = lines.find((l) => l.id === aba);
  if (!linha) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{linha.name}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onNovoServico}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo serviço
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Ações da linha {linha.name}</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEditarLinha(linha)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar linha
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDesativarLinha(linha)} className="text-destructive focus:text-destructive">
              <Ban className="mr-2 h-4 w-4" />
              Desativar linha
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Lista ──────────────────────────────────────────────────────────────────────

interface LinhaDoServicoProps {
  service: Service;
  aba: string;
  lines: ServiceLine[];
  models: ServiceRevenueModel[];
  usos: number;
  centro: string | null;
  onAbrir: (service: Service) => void;
}

function detalhesDoServico(props: LinhaDoServicoProps): string[] {
  const { service, models, usos, centro } = props;
  const detalhes: string[] = [];
  if (servicoTemPercentual(service.id, models)) {
    const chance = service.chancePadraoPercent;
    detalhes.push(chance == null ? 'Chance padrão não informada' : `Chance padrão ${chance}%`);
  }
  if (centro) detalhes.push(`Centro ${centro}`);
  if (usos > 0) detalhes.push(`${usos} projeto${usos > 1 ? 's' : ''}`);
  return detalhes;
}

function ModelosNaLista(props: { modelos: ServiceRevenueModel[] }) {
  const { modelos } = props;
  if (modelos.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-sm">
      {modelos.map((m, i) => (
        <span key={m.id} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground" aria-hidden>·</span>}
          {rotuloDoModelo(m.formas)}
          {temFormaAntiga(m.formas) && <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">Antigo</span>}
        </span>
      ))}
    </div>
  );
}

function LinhaDoServico(props: LinhaDoServicoProps) {
  const { service, aba, lines, models, onAbrir } = props;
  const status = statusDoServico(service, lines);
  return (
    <button
      type="button"
      onClick={() => onAbrir(service)}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t px-4 py-3.5 text-left first:border-t-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{aba === ABA_DESATIVADOS ? rotuloDoServico(service, lines) : service.name}</span>
          {status !== STATUS_DO_SERVICO.ATIVO && <StatusDoServicoPill status={status} />}
        </div>
        <ModelosNaLista modelos={modelosAtivos(service.id, models)} />
        <div className="mt-1 flex flex-wrap gap-x-3.5 text-[13px] text-muted-foreground">
          {detalhesDoServico(props).map((d) => <span key={d}>{d}</span>)}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
    </button>
  );
}

function ListaDeServicos(props: Omit<LinhaDoServicoProps, 'service' | 'usos' | 'centro'> & {
  lista: Service[];
  busca: string;
  usos: Record<string, number>;
  nomeDoCentro: (id: string | null) => string | null;
}) {
  const { lista, busca, usos, nomeDoCentro, ...resto } = props;
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {lista.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{busca ? 'Nenhum serviço encontrado' : 'Nenhum serviço'}</p>
      ) : (
        lista.map((s) => (
          <LinhaDoServico key={s.id} {...resto} service={s} usos={usos[s.id] ?? 0} centro={nomeDoCentro(s.costCenterId)} />
        ))
      )}
    </div>
  );
}

// ─── Confirmação ────────────────────────────────────────────────────────────────

const projetos = (n: number) => `${n} projeto${n === 1 ? '' : 's'}`;

/** Serviços que deixam as escolhas com a desativação, com os projetos que usam cada um. */
function servicosAfetados(c: Confirmacao, services: Service[]): Service[] {
  if (c.tipo === CONFIRMAR.DESATIVAR_LINHA) return services.filter((s) => s.serviceLineId === c.linha.id && !s.desativado);
  return [c.servico];
}

/** O que muda e o que fica, com os números reais, antes de desativar. */
function ImpactoDaDesativacao(props: { afetados: Service[]; usos: Record<string, number> }) {
  const { afetados, usos } = props;
  const total = afetados.reduce((soma, s) => soma + (usos[s.id] ?? 0), 0);
  return (
    <div className="grid gap-3 text-sm">
      {afetados.length > 0 && (
        <div className="grid gap-1.5">
          <p className="font-medium">Deixam de aparecer em orçamentos, Oportunidades e projetos novos</p>
          <ul className="grid gap-1 rounded-md border bg-muted/40 px-3 py-2">
            {afetados.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span>{s.name}</span>
                <span className="text-muted-foreground">{projetos(usos[s.id] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="grid gap-1 text-muted-foreground">
        <li>{total > 0 ? `${projetos(total)} continuam com o serviço que já têm.` : 'Nenhum projeto usa estes serviços.'}</li>
        <li>Orçamentos e Oportunidades existentes não mudam.</li>
        <li>Reativação na aba Desativados.</li>
      </ul>
    </div>
  );
}

function ConfirmacaoDoCatalogo(props: {
  confirmacao: Confirmacao | null;
  services: Service[];
  usos: Record<string, number>;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const { confirmacao, services, usos, onCancelar, onConfirmar } = props;
  if (!confirmacao) return null;
  const acao = confirmacao.tipo === CONFIRMAR.EXCLUIR_SERVICO ? 'Excluir' : 'Desativar';
  return (
    <AlertDialog open onOpenChange={(aberto) => !aberto && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tituloDaConfirmacao(confirmacao, services)}</AlertDialogTitle>
        </AlertDialogHeader>
        {confirmacao.tipo !== CONFIRMAR.EXCLUIR_SERVICO && (
          <ImpactoDaDesativacao afetados={servicosAfetados(confirmacao, services)} usos={usos} />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>{acao}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────────

/** Linha em que nasce o serviço novo: a da aba, ou a primeira ativa quando a aba é Desativados. */
const linhaParaNovoServico = (aba: string, lines: ServiceLine[]) =>
  aba === ABA_DESATIVADOS ? lines.find((l) => l.isActive)?.id ?? '' : aba;

const usosDoPainel = (service: Service | null, usos: Record<string, number>) => (service ? usos[service.id] ?? 0 : 0);

function Carregando() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-10 w-80" />
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
    </div>
  );
}

/** Aba pedida na URL, quando é uma linha ativa ou os Desativados; senão a primeira linha ativa. */
function abaAtual(pedida: string | null, lines: ServiceLine[]): string {
  if (pedida === ABA_DESATIVADOS) return pedida;
  if (pedida && lines.some((l) => l.id === pedida && l.isActive)) return pedida;
  return lines.find((l) => l.isActive)?.id ?? ABA_DESATIVADOS;
}

function useConfirmacaoDoCatalogo(irPara: (aba: string) => void, fecharPainel: () => void) {
  const alternarLinha = useToggleServiceLineActive();
  const alternarServico = useToggleServiceActive();
  const excluirServico = useDeleteService();
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  const confirmar = () => {
    if (!confirmacao) return;
    const fechar = () => { setConfirmacao(null); fecharPainel(); };
    if (confirmacao.tipo === CONFIRMAR.DESATIVAR_LINHA) {
      const onSuccess = () => { setConfirmacao(null); irPara(ABA_DESATIVADOS); };
      return alternarLinha.mutate({ id: confirmacao.linha.id, isActive: false }, { onSuccess });
    }
    if (confirmacao.tipo === CONFIRMAR.DESATIVAR_SERVICO) {
      return alternarServico.mutate({ id: confirmacao.servico.id, isActive: false }, { onSuccess: fechar });
    }
    excluirServico.mutate({ id: confirmacao.servico.id }, { onSuccess: fechar });
  };

  return { confirmacao, setConfirmacao, confirmar, alternarLinha, alternarServico };
}

const Services = () => {
  const [params, setParams] = useSearchParams();
  const { data: lines = [], isLoading: carregandoLinhas } = useServiceLines();
  const { data: services = [], isLoading: carregandoServicos } = useServices();
  const { data: models = [] } = useServiceRevenueModels();
  const { data: usos = {} } = useProjetosPorServico();
  const { data: centros = [] } = useCostCenters();
  const criarLinha = useCreateServiceLine();
  const editarLinha = useUpdateServiceLine();

  const [busca, setBusca] = useState('');
  const [painel, setPainel] = useState<{ aberto: boolean; service: Service | null }>({ aberto: false, service: null });
  const [linhaEmEdicao, setLinhaEmEdicao] = useState<ServiceLine | null | undefined>(undefined);

  const aba = abaAtual(params.get(PARAMETRO_DA_ABA), lines);
  const irPara = (id: string) => setParams({ [PARAMETRO_DA_ABA]: id }, { replace: true });
  const abrirServico = (service: Service | null) => setPainel({ aberto: true, service });
  const fecharPainel = () => setPainel({ aberto: false, service: null });
  const { confirmacao, setConfirmacao, confirmar, alternarLinha, alternarServico } = useConfirmacaoDoCatalogo(irPara, fecharPainel);

  const lista = useMemo(() => filtrarPorBusca(servicosDaAba(aba, services, lines), models, busca), [aba, services, lines, models, busca]);
  const nomeDoCentro = (id: string | null) => centros.find((c) => c.id === id)?.name ?? null;

  const salvarLinha = (dados: CreateServiceLineInput) => {
    const fechar = () => setLinhaEmEdicao(undefined);
    if (linhaEmEdicao) return editarLinha.mutate({ id: linhaEmEdicao.id, updates: dados }, { onSuccess: fechar });
    criarLinha.mutate(dados, { onSuccess: (nova) => { fechar(); irPara(nova.id); } });
  };

  return (
    <AppLayout
      title="Catálogo de serviços"
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Catálogo de serviços' }]}
      actions={
        <Button variant="outline" size="sm" onClick={() => setLinhaEmEdicao(null)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nova linha
        </Button>
      }
    >
      {carregandoLinhas || carregandoServicos ? (
        <Carregando />
      ) : (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b">
            <AbasDoCatalogo lines={lines} services={services} aba={aba} onAba={irPara} />
            <div className="relative mb-1.5 w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar serviço ou modelo"
                aria-label="Buscar serviço ou modelo de receita"
                className="pl-9"
              />
            </div>
          </div>

          <CabecalhoDaAba
            aba={aba}
            lines={lines}
            onNovoServico={() => abrirServico(null)}
            onEditarLinha={(l) => setLinhaEmEdicao(l)}
            onDesativarLinha={(l) => setConfirmacao({ tipo: CONFIRMAR.DESATIVAR_LINHA, linha: l })}
            onReativarLinha={(l) => alternarLinha.mutate({ id: l.id, isActive: true }, { onSuccess: () => irPara(l.id) })}
          />

          <ListaDeServicos
            lista={lista}
            busca={busca}
            aba={aba}
            lines={lines}
            models={models}
            usos={usos}
            nomeDoCentro={nomeDoCentro}
            onAbrir={abrirServico}
          />
        </div>
      )}

      <ServiceSheet
        open={painel.aberto}
        onOpenChange={(aberto) => !aberto && fecharPainel()}
        service={painel.service}
        linhaInicial={linhaParaNovoServico(aba, lines)}
        lines={lines}
        services={services}
        models={models}
        usos={usosDoPainel(painel.service, usos)}
        onDesativar={(s) => setConfirmacao({ tipo: CONFIRMAR.DESATIVAR_SERVICO, servico: s })}
        onReativar={(s) => alternarServico.mutate({ id: s.id, isActive: true }, { onSuccess: fecharPainel })}
        onExcluir={(s) => setConfirmacao({ tipo: CONFIRMAR.EXCLUIR_SERVICO, servico: s })}
      />

      <ServiceLineFormDialog
        open={linhaEmEdicao !== undefined}
        onOpenChange={(aberto) => !aberto && setLinhaEmEdicao(undefined)}
        serviceLine={linhaEmEdicao ?? null}
        onSubmit={salvarLinha}
        isLoading={criarLinha.isPending || editarLinha.isPending}
      />

      <ConfirmacaoDoCatalogo confirmacao={confirmacao} services={services} usos={usos} onCancelar={() => setConfirmacao(null)} onConfirmar={confirmar} />
    </AppLayout>
  );
};

export default Services;
