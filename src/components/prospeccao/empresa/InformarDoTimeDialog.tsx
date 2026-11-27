import { useState, type ReactNode } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONFIANCA_DO_TIME, FONTE_DO_LINKEDIN, ORIGEM_DO_TIME, type ConfiancaDoTime, type OrigemDoTime } from '@/lib/prospecting/funcionarios.constants';
import { cn } from '@/lib/utils';
import type { AtalhoDeFaixa, InformadoPeloTime, UnidadeDoCampo } from '@/types/paginaDaEmpresa';

/** Uma escala só: as três confianças de quem estimou e, no topo, o dado apurado. */
type Certeza = ConfiancaDoTime | typeof ORIGEM_DO_TIME.APURADO;

const CERTEZAS: ReadonlyArray<{ valor: Certeza; rotulo: string }> = [
  ...CONFIANCA_DO_TIME,
  { valor: ORIGEM_DO_TIME.APURADO, rotulo: 'Apurado' },
];

interface Estado {
  origem: OrigemDoTime;
  confianca: ConfiancaDoTime | null;
  de: string;
  /** Vazio: valor exato. */
  ate: string;
  fonte: string;
}

type Mudar = (parte: Partial<Estado>) => void;

function estadoInicial(inicial: InformadoPeloTime | null, unidade: UnidadeDoCampo): Estado {
  if (!inicial) return { origem: ORIGEM_DO_TIME.ESTIMADO, confianca: null, de: '', ate: '', fonte: '' };
  const ate = inicial.ate === inicial.de ? '' : unidade.escrever(inicial.ate);
  return { origem: inicial.origem, confianca: inicial.confianca, de: unidade.escrever(inicial.de), ate, fonte: inicial.fonte ?? '' };
}

/** O que o formulário vira para salvar; nulo enquanto falta ou não fecha. */
function informado(e: Estado, unidade: UnidadeDoCampo): InformadoPeloTime | null {
  const de = unidade.ler(e.de);
  const ate = e.ate.trim() ? unidade.ler(e.ate) : de;
  if (de == null || ate == null || ate < de) return null;
  const confianca = e.origem === ORIGEM_DO_TIME.ESTIMADO ? e.confianca : null;
  return { de, ate, origem: e.origem, confianca, fonte: e.fonte.trim() || null };
}

const certezaDo = (e: Estado): Certeza | null => (e.origem === ORIGEM_DO_TIME.APURADO ? ORIGEM_DO_TIME.APURADO : e.confianca);

const mudancaDa = (c: Certeza): Partial<Estado> =>
  c === ORIGEM_DO_TIME.APURADO ? { origem: ORIGEM_DO_TIME.APURADO, confianca: null } : { origem: ORIGEM_DO_TIME.ESTIMADO, confianca: c };

interface CampoProps {
  id?: string;
  rotulo: string;
  /** Algo à direita do rótulo, na mesma linha. */
  extra?: ReactNode;
  children: ReactNode;
}

function Campo(props: CampoProps) {
  const { id, rotulo, extra, children } = props;
  return (
    <div className="space-y-2">
      <div className="flex h-5 items-center justify-between gap-3">
        <Label htmlFor={id}>{rotulo}</Label>
        {extra}
      </div>
      {children}
    </div>
  );
}

interface CampoDeNumeroProps {
  id: string;
  rotulo: string;
  unidade: UnidadeDoCampo;
  valor: string;
  onChange: (v: string) => void;
}

function CampoDeNumero(props: CampoDeNumeroProps) {
  const { id, rotulo, unidade, valor, onChange } = props;
  return (
    <div className="relative min-w-0 flex-1">
      {unidade.prefixo && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unidade.prefixo}</span>}
      <Input id={id} aria-label={rotulo} inputMode="decimal" value={valor} onChange={(ev) => onChange(ev.target.value)} className={cn('tabular-nums', unidade.prefixo && 'pl-10', 'pr-16')} />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unidade.sufixo}</span>
    </div>
  );
}

interface AtalhosProps {
  atalhos: ReadonlyArray<AtalhoDeFaixa>;
  unidade: UnidadeDoCampo;
  fonte: string;
  mudar: Mudar;
}

/**
 * As faixas do LinkedIn num menu pequeno ao lado do rótulo; escolher preenche o de–até e, se a
 * fonte estiver vazia, ela passa a ser o LinkedIn.
 */
function Atalhos(props: AtalhosProps) {
  const { atalhos, unidade, fonte, mudar } = props;
  const escolher = (a: AtalhoDeFaixa) =>
    mudar({ de: unidade.escrever(a.de), ate: unidade.escrever(a.ate), fonte: fonte.trim() ? fonte : FONTE_DO_LINKEDIN });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Faixa do LinkedIn
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {atalhos.map((a) => (
          <DropdownMenuItem key={a.rotulo} onSelect={() => escolher(a)}>
            {a.rotulo}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ValoresProps {
  unidade: UnidadeDoCampo;
  atalhos?: ReadonlyArray<AtalhoDeFaixa>;
  e: Estado;
  mudar: Mudar;
}

function Valores(props: ValoresProps) {
  const { unidade, atalhos, e, mudar } = props;
  const extra = atalhos ? <Atalhos atalhos={atalhos} unidade={unidade} fonte={e.fonte} mudar={mudar} /> : undefined;
  return (
    <Campo id="informar-de" rotulo="Valor ou faixa" extra={extra}>
      <div className="flex items-center gap-2">
        <CampoDeNumero id="informar-de" rotulo="De" unidade={unidade} valor={e.de} onChange={(de) => mudar({ de })} />
        <span className="text-sm text-muted-foreground">a</span>
        <CampoDeNumero id="informar-ate" rotulo="Até" unidade={unidade} valor={e.ate} onChange={(ate) => mudar({ ate })} />
      </div>
    </Campo>
  );
}

interface CertezaProps {
  e: Estado;
  mudar: Mudar;
}

/** Opções lado a lado, marcadas como as outras escolhas do sistema (borda e fundo do primário). */
function CampoDeCerteza(props: CertezaProps) {
  const { e, mudar } = props;
  const atual = certezaDo(e);
  return (
    <Campo rotulo="Confiança">
      <div role="group" aria-label="Confiança" className="grid grid-cols-4 gap-2">
        {CERTEZAS.map((c) => (
          <button
            key={c.valor}
            type="button"
            aria-pressed={atual === c.valor}
            onClick={() => mudar(mudancaDa(c.valor))}
            className={cn(
              'h-9 rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              atual === c.valor ? 'border-primary bg-primary/5 font-medium text-primary' : 'border-border text-foreground hover:bg-muted/40',
            )}
          >
            {c.rotulo}
          </button>
        ))}
      </div>
    </Campo>
  );
}

interface InformarDoTimeDialogProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  titulo: string;
  /** O que a página mostra hoje (ex.: "R$ 300 a 500 mi · estimado pela base"), para comparar. */
  atual?: string;
  unidade: UnidadeDoCampo;
  inicial: InformadoPeloTime | null;
  atalhos?: ReadonlyArray<AtalhoDeFaixa>;
  pendente: boolean;
  onSalvar: (informado: InformadoPeloTime) => void;
  /** "Voltar à RAIS": apaga o que o time informou. */
  textoDeLimpar?: string;
  onLimpar?: () => void;
}

type RodapeProps = Pick<InformarDoTimeDialogProps, 'onAbertoChange' | 'pendente' | 'textoDeLimpar' | 'onLimpar'> & { pronto: boolean };

function Rodape(props: RodapeProps) {
  const { onAbertoChange, pendente, textoDeLimpar, onLimpar, pronto } = props;
  return (
    <DialogFooter className="gap-2 pt-2 sm:justify-between">
      {onLimpar ? <Button type="button" variant="ghost" className="-ml-3" onClick={onLimpar} disabled={pendente}>{textoDeLimpar}</Button> : <span />}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => onAbertoChange(false)}>Cancelar</Button>
        <Button type="submit" disabled={!pronto || pendente}>
          {pendente && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Salvar
        </Button>
      </div>
    </DialogFooter>
  );
}

type FormularioProps = Omit<InformarDoTimeDialogProps, 'aberto' | 'titulo' | 'atual'>;

/** Montado só com o modal aberto: o estado nasce do valor salvo, sem efeito para reiniciar. */
function Formulario(props: FormularioProps) {
  const { unidade, inicial, atalhos, onSalvar } = props;
  const [e, setE] = useState<Estado>(() => estadoInicial(inicial, unidade));
  const mudar: Mudar = (parte) => setE((atual) => ({ ...atual, ...parte }));
  const pronto = informado(e, unidade);
  const salvar = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (pronto) onSalvar(pronto);
  };
  return (
    <form onSubmit={salvar} className="space-y-5">
      <Valores unidade={unidade} atalhos={atalhos} e={e} mudar={mudar} />
      <CampoDeCerteza e={e} mudar={mudar} />
      <Campo id="informar-fonte" rotulo="Fonte">
        <Input id="informar-fonte" value={e.fonte} maxLength={300} onChange={(ev) => mudar({ fonte: ev.target.value })} />
      </Campo>
      <Rodape {...props} pronto={!!pronto} />
    </form>
  );
}

/** Ao abrir, o foco vai para o número, não para o primeiro botão. */
function focarNoValor(ev: Event) {
  ev.preventDefault();
  document.getElementById('informar-de')?.focus();
}

/**
 * O que o time sabe de faturamento ou funcionários (US-0056): valor exato ou faixa ("até" vazio é
 * valor exato), a confiança de quem estimou ou "Apurado" e, se quiser, a fonte. O ponto médio vale nas contas.
 */
export function InformarDoTimeDialog(props: InformarDoTimeDialogProps) {
  const { aberto, onAbertoChange, titulo, atual } = props;
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={focarNoValor}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {atual && <DialogDescription>Hoje: {atual}</DialogDescription>}
        </DialogHeader>
        {aberto && <Formulario {...props} />}
      </DialogContent>
    </Dialog>
  );
}
