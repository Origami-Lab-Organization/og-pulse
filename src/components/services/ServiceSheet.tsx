import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CostCenterSelect } from '@/components/costCenters/CostCenterSelect';
import { ModeloDeReceitaPicker } from '@/components/services/ModeloDeReceitaPicker';
import { StatusDoServicoPill } from '@/components/services/StatusDoServicoPill';
import { useSalvarServico } from '@/hooks/useServices';
import { statusDoRascunho } from '@/lib/catalogo';
import { SEM_REGRA_DE_FIT, STATUS_DO_SERVICO } from '@/lib/catalogo.constants';
import { FRENTES_DO_FIT, ROTULO_DA_FRENTE } from '@/lib/prospecting/fit';
import type { FitFront } from '@/types/receita';
import { erroDoModelo, rotuloDoModelo, temFormaAntiga, temPercentual } from '@/lib/formasDeReceita';
import type { Service } from '@/types/service';
import type { ServiceLine } from '@/types/serviceLine';
import type { FormaDeReceita, FormaQualquer, ServiceRevenueModel } from '@/types/serviceRevenueModel';

interface ModeloNoPainel {
  /** Ausente no modelo que ainda vai ser criado. */
  id?: string;
  formas: FormaQualquer[];
}

interface Rascunho {
  nome: string;
  linhaId: string;
  centroId: string;
  descricao: string;
  chance: string;
  /** Regra de fit na Prospecção, ou `SEM_REGRA_DE_FIT` (US-0047). */
  regra: string;
  modelos: ModeloNoPainel[];
  removidos: string[];
}

interface ServiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` cria um serviço na linha `linhaInicial`. */
  service: Service | null;
  linhaInicial: string;
  lines: ServiceLine[];
  services: Service[];
  models: ServiceRevenueModel[];
  /** Projetos que usam o serviço; sem nenhum, ele pode ser excluído. */
  usos: number;
  onDesativar: (service: Service) => void;
  onReativar: (service: Service) => void;
  onExcluir: (service: Service) => void;
}

function rascunhoInicial(service: Service | null, linhaInicial: string, models: ServiceRevenueModel[]): Rascunho {
  const modelos = service
    ? models.filter((m) => m.serviceId === service.id && m.isActive).map((m) => ({ id: m.id, formas: m.formas }))
    : [];
  return {
    nome: service?.name ?? '',
    linhaId: service?.serviceLineId ?? linhaInicial,
    centroId: service?.costCenterId ?? '',
    descricao: service?.description ?? '',
    chance: service?.chancePadraoPercent == null ? '' : String(service.chancePadraoPercent),
    regra: service?.regraDeFit ?? SEM_REGRA_DE_FIT,
    modelos,
    removidos: [],
  };
}

/** `null` para vazio, o número de 1 a 100, ou `undefined` quando inválido. */
function chanceDoTexto(texto: string): number | null | undefined {
  const limpo = texto.trim().replace(',', '.');
  if (limpo.length === 0) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) && numero > 0 && numero <= 100 ? numero : undefined;
}

function erroDoRascunho(r: Rascunho, service: Service | null, services: Service[]): string | null {
  if (r.nome.trim().length < 2) return 'Dê um nome ao serviço.';
  if (!r.centroId) return 'Escolha o centro de custo.';
  if (chanceDoTexto(r.chance) === undefined) return 'A chance padrão vai de 1 a 100%.';
  const repetido = services.some(
    (s) => s.id !== service?.id && s.serviceLineId === r.linhaId && s.name.trim().toLowerCase() === r.nome.trim().toLowerCase(),
  );
  return repetido ? 'Já existe um serviço com esse nome nesta linha.' : null;
}

/** Os modelos de receita do serviço e a adição de um novo (US-0046). */
function ModelosDoServico(props: { modelos: ModeloNoPainel[]; onChange: (modelos: ModeloNoPainel[], removido?: string) => void }) {
  const { modelos, onChange } = props;
  const [novo, setNovo] = useState<FormaDeReceita[] | null>(null);
  const [tentou, setTentou] = useState(false);
  const erro = novo ? erroDoModelo(novo, modelos.map((m) => m.formas)) : null;

  const adicionar = () => {
    setTentou(true);
    if (!novo || erro) return;
    onChange([...modelos, { formas: novo }]);
    setNovo(null);
    setTentou(false);
  };

  return (
    <div className="grid gap-2">
      {modelos.map((modelo, i) => (
        <div key={modelo.id ?? `novo-${i}`} className="flex items-center gap-2 rounded-md border px-3 py-1.5">
          <span className="min-w-0 flex-1 text-sm font-medium">{rotuloDoModelo(modelo.formas)}</span>
          {temFormaAntiga(modelo.formas) && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Antigo</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={`Tirar o modelo de receita ${rotuloDoModelo(modelo.formas)}`}
            onClick={() => onChange(modelos.filter((_, j) => j !== i), modelo.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {novo ? (
        <div className="grid gap-3 rounded-md border border-dashed p-3">
          <ModeloDeReceitaPicker value={novo} onChange={setNovo} erro={tentou || novo.length > 0 ? erro : null} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setNovo(null)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={adicionar}>
              Adicionar
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setNovo([])}>
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar modelo de receita
        </Button>
      )}
    </div>
  );
}

/** Desativar, reativar ou excluir, no fim do painel. */
function AcoesDoServico(props: Pick<ServiceSheetProps, 'onDesativar' | 'onReativar' | 'onExcluir' | 'usos'> & { service: Service }) {
  const { service, usos, onDesativar, onReativar, onExcluir } = props;
  return (
    <div className="flex flex-wrap gap-2 border-t pt-4">
      {service.desativado ? (
        <Button type="button" variant="outline" onClick={() => onReativar(service)}>
          Reativar serviço
        </Button>
      ) : (
        <Button type="button" variant="outline" className="text-destructive" onClick={() => onDesativar(service)}>
          Desativar serviço
        </Button>
      )}
      {usos === 0 && (
        <Button type="button" variant="ghost" className="text-destructive" onClick={() => onExcluir(service)}>
          Excluir
        </Button>
      )}
    </div>
  );
}

function dadosParaSalvar(r: Rascunho, service: Service | null) {
  return {
    id: service?.id ?? null,
    dados: {
      serviceLineId: r.linhaId,
      costCenterId: r.centroId,
      name: r.nome.trim(),
      description: r.descricao.trim(),
      chancePadraoPercent: chanceDoTexto(r.chance) ?? null,
      regraDeFit: r.regra === SEM_REGRA_DE_FIT ? null : (r.regra as FitFront),
    },
    modelosNovos: r.modelos.filter((m) => !m.id).map((m) => m.formas as FormaDeReceita[]),
    modelosRemovidos: r.removidos,
  };
}

function subtituloDoPainel(linhaNome: string, service: Service | null, usos: number) {
  if (!service || usos === 0) return linhaNome;
  return `${linhaNome} · ${usos} projeto${usos > 1 ? 's' : ''}`;
}

interface CamposProps {
  r: Rascunho;
  set: (campos: Partial<Rascunho>) => void;
  lines: ServiceLine[];
}

/** Nome, linha, centro de custo e descrição. */
function DadosDoServico(props: CamposProps) {
  const { r, set, lines } = props;
  const linhasDaEscolha = lines.filter((l) => l.isActive || l.id === r.linhaId);
  return (
    <section className="grid gap-4" aria-labelledby="servico-dados">
      <h3 id="servico-dados" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados</h3>
      <div className="grid gap-1.5">
        <Label htmlFor="servico-nome">Nome do serviço</Label>
        <Input id="servico-nome" value={r.nome} onChange={(e) => set({ nome: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="servico-linha">Linha</Label>
          <Select value={r.linhaId} onValueChange={(linhaId) => set({ linhaId })}>
            <SelectTrigger id="servico-linha"><SelectValue /></SelectTrigger>
            <SelectContent>
              {linhasDaEscolha.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="servico-centro">Centro de custo</Label>
          <CostCenterSelect id="servico-centro" value={r.centroId} onChange={(centroId) => set({ centroId })} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="servico-descricao">
          Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea id="servico-descricao" rows={3} className="resize-none" value={r.descricao} onChange={(e) => set({ descricao: e.target.value })} />
      </div>
    </section>
  );
}

/** Modelos de receita e, quando há Percentual, a chance padrão. */
function ReceitaDoServico(props: Omit<CamposProps, 'lines'>) {
  const { r, set } = props;
  return (
    <section className="grid gap-3" aria-labelledby="servico-modelos">
      <h3 id="servico-modelos" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modelos de receita</h3>
      <ModelosDoServico
        modelos={r.modelos}
        onChange={(modelos, removido) => set({ modelos, removidos: removido ? [...r.removidos, removido] : r.removidos })}
      />
      {r.modelos.some((m) => temPercentual(m.formas)) && (
        <div className="grid gap-1.5">
          <Label htmlFor="servico-chance">Chance padrão do Percentual (%)</Label>
          <Input id="servico-chance" inputMode="decimal" className="w-28" value={r.chance} onChange={(e) => set({ chance: e.target.value })} />
        </div>
      )}
    </section>
  );
}

/** A regra de fit que o serviço usa na Prospecção (US-0047). */
function ProspeccaoDoServico(props: Omit<CamposProps, 'lines'>) {
  const { r, set } = props;
  return (
    <section className="grid gap-3" aria-labelledby="servico-prospeccao">
      <h3 id="servico-prospeccao" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prospecção</h3>
      <div className="grid gap-1.5 sm:w-64">
        <Label htmlFor="servico-fit">Fit</Label>
        <Select value={r.regra} onValueChange={(regra) => set({ regra })}>
          <SelectTrigger id="servico-fit"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FRENTES_DO_FIT.map((f) => (
              <SelectItem key={f} value={f}>{ROTULO_DA_FRENTE[f]}</SelectItem>
            ))}
            <SelectItem value={SEM_REGRA_DE_FIT}>Sem fit</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

/** Conteúdo do painel; montado a cada abertura, então o rascunho nasce do serviço aberto. */
function PainelDoServico(props: ServiceSheetProps) {
  const { onOpenChange, service, linhaInicial, lines, services, models, usos } = props;
  const salvar = useSalvarServico();
  const [r, setR] = useState<Rascunho>(() => rascunhoInicial(service, linhaInicial, models));
  const [erro, setErro] = useState<string | null>(null);

  const set = (campos: Partial<Rascunho>) => setR((atual) => ({ ...atual, ...campos }));
  const status = statusDoRascunho(service?.desativado ?? false, r.modelos.some((m) => !temFormaAntiga(m.formas)));
  const linhaNome = lines.find((l) => l.id === r.linhaId)?.name ?? '';

  const enviar = () => {
    const problema = erroDoRascunho(r, service, services);
    setErro(problema);
    if (!problema) salvar.mutate(dadosParaSalvar(r, service), { onSuccess: () => onOpenChange(false) });
  };

  return (
    <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
      <SheetHeader className="border-b px-6 py-4 text-left">
        <SheetTitle className="flex flex-wrap items-center gap-2 pr-8">
          {service ? service.name : 'Novo serviço'}
          <StatusDoServicoPill status={status} />
        </SheetTitle>
        <SheetDescription>{subtituloDoPainel(linhaNome, service, usos)}</SheetDescription>
      </SheetHeader>

      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-6 py-5">
        <DadosDoServico r={r} set={set} lines={lines} />
        <ReceitaDoServico r={r} set={set} />
        <ProspeccaoDoServico r={r} set={set} />
        {service && status !== STATUS_DO_SERVICO.SEM_MODELO && (
          <AcoesDoServico service={service} usos={usos} onDesativar={props.onDesativar} onReativar={props.onReativar} onExcluir={props.onExcluir} />
        )}
        {erro && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {erro}
          </p>
        )}
      </div>

      <SheetFooter className="border-t px-6 py-3">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={salvar.isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={enviar} disabled={salvar.isPending}>
          {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {service ? 'Salvar' : 'Criar serviço'}
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}

/** Criar e editar o serviço do catálogo num lugar só (US-0046). */
export function ServiceSheet(props: ServiceSheetProps) {
  const { open, onOpenChange, service } = props;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open && <PainelDoServico key={service?.id ?? 'novo'} {...props} />}
    </Sheet>
  );
}
