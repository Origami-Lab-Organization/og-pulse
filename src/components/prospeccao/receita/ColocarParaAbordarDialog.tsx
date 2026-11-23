import { useId, useState, type ReactNode } from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useHideValues } from '@/contexts/HideValuesContext';
import { useColocarParaAbordar } from '@/hooks/useColocarParaAbordar';
import { useResponsaveisDaProspeccao } from '@/hooks/useResponsaveisDaProspeccao';
import { formatCNPJ } from '@/lib/masks';
import { formatarData } from '@/lib/prospecting/prazos';
import { emTitulo, nomeDaEmpresa, reaisCurtos, type EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { textoDoFaturamento } from '@/lib/prospecting/faturamentoEstimado';
import { itemParaAbordar, tipoSugerido, tiposSugeridos } from '@/lib/prospecting/paraAbordar';
import { motivoSemSugestao } from '@/lib/prospecting/tipoDeConta';
import { TIPOS_DE_CONTA, type TipoDeConta } from '@/types/prospect';
import { cn } from '@/lib/utils';

interface ColocarParaAbordarDialogProps {
  /** As empresas selecionadas (uma, pela ficha; várias, pela lista). */
  empresas: EmpresaReceita[];
  aberta: boolean;
  onAbertaChange: (aberta: boolean) => void;
  /** Depois de mover: a lista limpa a seleção. */
  onConcluido?: () => void;
}

/**
 * "Mover para qualificação" (US-0008, US-0023; redesenhada em 18/11/2026). A empresa entra
 * na etapa Qualificação, onde é estudada antes de virar abordagem (19/11/2026). Só o que decide a entrada: o tipo
 * de conta, sugerido pelo faturamento estimado (que aparece para apoiar a escolha), e o
 * responsável. Faturamento e funcionários são confirmados depois, no estudo da conta, com a
 * oportunidade já no Pipeline (decisão do Victor, 18/11/2026).
 */
export function ColocarParaAbordarDialog(props: ColocarParaAbordarDialogProps) {
  const { empresas, aberta, onAbertaChange, onConcluido } = props;
  const colocar = useColocarParaAbordar();
  const fechar = (nova: boolean) => {
    if (!colocar.isPending) onAbertaChange(nova);
  };
  return (
    <Dialog open={aberta} onOpenChange={fechar}>
      {/* Coluna (não grade): um conteúdo largo não alarga a janela além da borda. */}
      <DialogContent className={cn('flex flex-col gap-0 overflow-hidden p-0 focus:outline-none', empresas.length > 1 ? 'max-w-3xl' : 'max-w-xl')}>
        <Formulario
          empresas={empresas}
          colocar={colocar}
          onConcluido={() => {
            onConcluido?.();
            onAbertaChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

interface FormularioProps {
  empresas: EmpresaReceita[];
  colocar: ReturnType<typeof useColocarParaAbordar>;
  onConcluido: () => void;
}

/** Monta só com a janela aberta: responsável e sugestões recomeçam a cada abertura. */
function Formulario(props: FormularioProps) {
  const { empresas, colocar, onConcluido } = props;
  const { employee } = useAuth();
  const [ownerId, setOwnerId] = useState(employee?.id ?? '');
  const [tipos, setTipos] = useState(() => tiposSugeridos(empresas));
  const escolher = (cnpj: string, tipo: TipoDeConta) => setTipos((atual) => ({ ...atual, [cnpj]: tipo }));
  const faltam = empresas.filter((e) => !tipos[e.cnpj]).length;

  const confirmar = async () => {
    const itens = empresas.map((e) => itemParaAbordar(e, tipos[e.cnpj] as TipoDeConta));
    await colocar.mutateAsync({ itens, ownerId }).catch(() => undefined);
    onConcluido();
  };

  const desabilitado = colocar.isPending;
  const corpo = empresas.length === 1
    ? <UmaEmpresa empresa={empresas[0]} tipo={tipos[empresas[0].cnpj] ?? null} desabilitado={desabilitado} onTipo={(t) => escolher(empresas[0].cnpj, t)} />
    : <VariasEmpresas empresas={empresas} tipos={tipos} desabilitado={desabilitado} onTipo={escolher} />;

  return (
    <>
      <Cabecalho empresas={empresas} />
      <div className="max-h-[60vh] min-w-0 overflow-y-auto px-6 pb-6">{corpo}</div>
      {colocar.isPending && empresas.length > 1 && <Andamento feitas={colocar.feitas} total={empresas.length} />}
      <Rodape
        responsavel={<Responsavel ownerId={ownerId} onOwnerId={setOwnerId} desabilitado={desabilitado} />}
        pronto={faltam === 0 && !!ownerId}
        colocando={colocar.isPending}
        onConfirmar={confirmar}
      />
    </>
  );
}

/** O faturamento que apoia a sugestão: o do time ou a estimativa da base. */
function faturamentoParaMostrar(e: EmpresaReceita): string | null {
  if (e.faturamento_informado != null) return reaisCurtos(Number(e.faturamento_informado));
  if (e.faturamento_estimado == null || !e.faturamento_base) return null;
  return textoDoFaturamento(Number(e.faturamento_estimado), e.faturamento_base);
}

function Cabecalho({ empresas }: { empresas: EmpresaReceita[] }) {
  const uma = empresas.length === 1 ? empresas[0] : null;
  const local = uma ? [emTitulo(uma.municipio), uma.uf].filter(Boolean).join(' · ') : '';
  return (
    <DialogHeader className="space-y-0.5 px-6 pb-5 pt-5 text-left">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mover para qualificação</p>
      <DialogTitle className="text-xl leading-snug">{uma ? nomeDaEmpresa(uma) : `${empresas.length} empresas`}</DialogTitle>
      <DialogDescription className="text-[13px]">
        {uma ? (
          <>
            <span className="font-mono tabular-nums">{formatCNPJ(uma.cnpj)}</span>
            {local && ` · ${local}`}
          </>
        ) : (
          'Confirme o tipo de conta de cada uma. Elas entram em Qualificação no Pipeline.'
        )}
      </DialogDescription>
    </DialogHeader>
  );
}

interface UmaEmpresaProps {
  empresa: EmpresaReceita;
  tipo: TipoDeConta | null;
  desabilitado: boolean;
  onTipo: (tipo: TipoDeConta) => void;
}

/** Uma empresa: o tipo de conta em cartões, com o faturamento que apoia a sugestão. */
function UmaEmpresa(props: UmaEmpresaProps) {
  const { empresa, tipo, desabilitado, onTipo } = props;
  useHideValues();
  const sugerido = tipoSugerido(empresa);
  const faturamento = faturamentoParaMostrar(empresa);
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo de conta</h3>
        {faturamento && (
          <p className="truncate text-[12px] text-muted-foreground">
            Faturamento estimado <span className="font-mono font-medium text-foreground tabular-nums">{faturamento}</span>
          </p>
        )}
      </div>
      <TiposEmCartoes nome={nomeDaEmpresa(empresa)} tipo={tipo} sugerido={sugerido} desabilitado={desabilitado} onTipo={onTipo} />
      <Avisos empresa={empresa} sugerido={sugerido} tipo={tipo} />
    </section>
  );
}

interface TiposProps {
  nome: string;
  tipo: TipoDeConta | null;
  sugerido: TipoDeConta | null;
  desabilitado: boolean;
  onTipo: (tipo: TipoDeConta) => void;
}

/** Do menor para o maior, como a régua de faturamento. */
const TIPOS_EM_ORDEM = [...TIPOS_DE_CONTA].reverse();

/** Três cartões escolhíveis (radiogroup: setas do teclado trocam), com a faixa e o "Sugerido". */
function TiposEmCartoes(props: TiposProps) {
  const { nome, tipo, sugerido, desabilitado, onTipo } = props;
  return (
    <RadioGroupPrimitive.Root
      value={tipo ?? ''}
      onValueChange={(v) => onTipo(v as TipoDeConta)}
      disabled={desabilitado}
      aria-label={`Tipo de conta de ${nome}`}
      className="grid grid-cols-3 gap-2"
    >
      {TIPOS_EM_ORDEM.map((t) => (
        <RadioGroupPrimitive.Item
          key={t.value}
          value={t.value}
          className={cn(
            'relative flex min-w-0 flex-col items-start gap-0.5 rounded-lg border bg-card px-3 pb-2.5 pt-2 text-left transition-colors',
            'hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
            'data-[state=checked]:border-primary data-[state=checked]:bg-accent-subtle data-[state=checked]:ring-1 data-[state=checked]:ring-primary',
          )}
        >
          {t.value === sugerido && (
            <span className="absolute right-2 top-2 rounded-full bg-success-subtle px-1.5 py-px text-[10.5px] font-medium text-success-emphasis">Sugerido</span>
          )}
          <span className="text-sm font-semibold">{t.label}</span>
          <span className="text-xs text-muted-foreground">{t.faixa}</span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

interface VariasEmpresasProps {
  empresas: EmpresaReceita[];
  tipos: Record<string, TipoDeConta | null>;
  desabilitado: boolean;
  onTipo: (cnpj: string, tipo: TipoDeConta) => void;
}

/** Várias empresas: uma linha por empresa, com o faturamento estimado e o tipo de conta. */
function VariasEmpresas(props: VariasEmpresasProps) {
  const { empresas, tipos, desabilitado, onTipo } = props;
  useHideValues();
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th scope="col" className="py-2 pr-3 font-medium">Empresa</th>
          <th scope="col" className="w-32 px-2 py-2 text-right font-medium">Faturamento</th>
          <th scope="col" className="w-44 py-2 pl-3 font-medium">Tipo de conta</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {empresas.map((e) => (
          <LinhaDaEmpresa key={e.cnpj} empresa={e} tipo={tipos[e.cnpj] ?? null} desabilitado={desabilitado} onTipo={(t) => onTipo(e.cnpj, t)} />
        ))}
      </tbody>
    </table>
  );
}

function LinhaDaEmpresa(props: UmaEmpresaProps) {
  const { empresa, tipo, desabilitado, onTipo } = props;
  const sugerido = tipoSugerido(empresa);
  const nome = nomeDaEmpresa(empresa);
  return (
    <tr className="align-top">
      <td className="py-3 pr-3">
        <p className="max-w-[300px] truncate font-medium" title={nome}>{nome}</p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">{formatCNPJ(empresa.cnpj)}</p>
        <Avisos empresa={empresa} sugerido={sugerido} tipo={tipo} />
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-right font-mono tabular-nums">{faturamentoParaMostrar(empresa) ?? '—'}</td>
      <td className="py-3 pl-3">
        <TipoNoSeletor nome={nome} tipo={tipo} sugerido={sugerido} desabilitado={desabilitado} onTipo={onTipo} />
      </td>
    </tr>
  );
}

/** Na tabela, um seletor; a faixa vai no item e o "Sugerido", embaixo. */
function TipoNoSeletor(props: TiposProps) {
  const { nome, tipo, sugerido, desabilitado, onTipo } = props;
  return (
    <div className="space-y-1">
      <Select value={tipo ?? ''} onValueChange={(v) => onTipo(v as TipoDeConta)} disabled={desabilitado}>
        <SelectTrigger className={cn('h-9 text-[13px]', !tipo && 'border-warning')} aria-label={`Tipo de conta de ${nome}`} aria-invalid={!tipo}>
          <SelectValue placeholder="Escolha" />
        </SelectTrigger>
        <SelectContent>
          {TIPOS_EM_ORDEM.map((t) => <SelectItem key={t.value} value={t.value}>{t.label} · {t.faixa}</SelectItem>)}
        </SelectContent>
      </Select>
      {tipo && tipo === sugerido && <p className="text-[11px] text-success-emphasis">Sugerido</p>}
    </div>
  );
}

function Avisos(props: { empresa: EmpresaReceita; sugerido: TipoDeConta | null; tipo: TipoDeConta | null }) {
  const { empresa, sugerido, tipo } = props;
  const pediu = empresa.relacao?.pediuParaParar;
  const semTipo = !sugerido && !tipo;
  if (!semTipo && !pediu) return null;
  return (
    <div className="mt-2 space-y-1">
      {semTipo && <p className="text-xs text-muted-foreground">{motivoSemSugestao(empresa)}</p>}
      {pediu && <AvisoPediuParaParar data={empresa.relacao?.oportunidade?.data ?? null} />}
    </div>
  );
}

/** US-0019, cenário 5: avisa, sem impedir. */
function AvisoPediuParaParar({ data }: { data: string | null }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-destructive-emphasis" role="note">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Pediu para parar{data ? ` em ${formatarData(data)}` : ''}. Confirme antes de abordar de novo.
    </p>
  );
}

interface RodapeProps {
  responsavel: ReactNode;
  pronto: boolean;
  colocando: boolean;
  onConfirmar: () => void;
}

/**
 * Uma linha só: o responsável e, na frente dele, "Mover para abordar" (18/11/2026). Sem
 * "Cancelar": o "x", o Esc e o clique fora fecham.
 */
function Rodape(props: RodapeProps) {
  const { responsavel, pronto, colocando, onConfirmar } = props;
  return (
    <DialogFooter className="flex-row items-center gap-3 border-t bg-muted/30 px-6 py-3.5 sm:space-x-0">
      {responsavel}
      <Button className="shrink-0" onClick={onConfirmar} disabled={!pronto || colocando}>{colocando ? 'Movendo…' : 'Mover para qualificação'}</Button>
    </DialogFooter>
  );
}

/** Só quem pode editar a Prospecção e está ativo (hoje Admin e Gerente; 18/11/2026). */
function Responsavel(props: { ownerId: string; onOwnerId: (id: string) => void; desabilitado: boolean }) {
  const { ownerId, onOwnerId, desabilitado } = props;
  const { data: responsaveis = [] } = useResponsaveisDaProspeccao();
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Label htmlFor={id} className="shrink-0 text-xs text-muted-foreground">Responsável</Label>
      <Select value={ownerId} onValueChange={onOwnerId} disabled={desabilitado}>
        <SelectTrigger id={id} className="h-9 min-w-0 flex-1 bg-card text-[13px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>
          {responsaveis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Andamento({ feitas, total }: { feitas: number; total: number }) {
  return (
    <div className="space-y-1 px-6 pb-4" aria-live="polite">
      <Progress value={(feitas / total) * 100} className="h-1.5" />
      <p className="text-[12.5px] text-muted-foreground">
        {feitas} de {total} · a Receita é consultada uma empresa por vez
      </p>
    </div>
  );
}
