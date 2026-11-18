import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useColocarParaAbordar } from '@/hooks/useColocarParaAbordar';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import { useHideValues } from '@/contexts/HideValuesContext';
import { formatCNPJ } from '@/lib/masks';
import { nomeDaEmpresa, reaisCurtos, type EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { itemParaAbordar, tiposSugeridos } from '@/lib/prospecting/paraAbordar';
import { faturamentoDaSugestao, motivoSemSugestao } from '@/lib/prospecting/tipoDeConta';
import { TIPOS_DE_CONTA, type TipoDeConta } from '@/types/prospect';
import { cn } from '@/lib/utils';

interface ColocarParaAbordarDialogProps {
  /** As empresas selecionadas (uma, pela ficha; várias, pela lista). */
  empresas: EmpresaReceita[];
  aberta: boolean;
  onAbertaChange: (aberta: boolean) => void;
  /** Depois de colocar: a lista limpa a seleção. */
  onConcluido?: () => void;
}

/**
 * Confirmação de "Colocar para abordar" (US-0008): o responsável (padrão: quem coloca) e o tipo
 * de conta de cada empresa, sugerido pelo faturamento. Sem tipo, "Confirmar" fica indisponível
 * e a empresa aparece destacada. Com várias, a janela mostra o andamento.
 */
export function ColocarParaAbordarDialog(props: ColocarParaAbordarDialogProps) {
  const { empresas, aberta, onAbertaChange, onConcluido } = props;
  const colocar = useColocarParaAbordar();
  const fechar = (nova: boolean) => {
    if (!colocar.isPending) onAbertaChange(nova);
  };
  return (
    <Dialog open={aberta} onOpenChange={fechar}>
      <DialogContent className="max-w-xl">
        <Formulario
          empresas={empresas}
          colocar={colocar}
          onCancelar={() => fechar(false)}
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
  onCancelar: () => void;
  onConcluido: () => void;
}

/** Monta só com a janela aberta: o responsável e as sugestões recomeçam a cada abertura. */
function Formulario(props: FormularioProps) {
  const { empresas, colocar, onCancelar, onConcluido } = props;
  const { employee } = useAuth();
  const { data: diretorio = [] } = useEmployeeDirectory();
  const [ownerId, setOwnerId] = useState(employee?.id ?? '');
  const [tipos, setTipos] = useState(() => tiposSugeridos(empresas));
  const idResponsavel = useId();
  const faltam = empresas.filter((e) => !tipos[e.cnpj]).length;
  const total = empresas.length;

  const confirmar = async () => {
    const itens = empresas.map((e) => itemParaAbordar(e, tipos[e.cnpj] as TipoDeConta));
    await colocar.mutateAsync({ itens, ownerId }).catch(() => undefined);
    onConcluido();
  };

  return (
    <>
      <Cabecalho empresas={empresas} />

      <div className="space-y-1">
        <label htmlFor={idResponsavel} className="text-[12.5px] text-muted-foreground">Responsável</label>
        <Select value={ownerId} onValueChange={setOwnerId} disabled={colocar.isPending}>
          <SelectTrigger id={idResponsavel} className="h-9 text-[13px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {diretorio.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border" aria-label="Empresas e tipo de conta">
        {empresas.map((e) => (
          <LinhaDaEmpresa
            key={e.cnpj}
            empresa={e}
            tipo={tipos[e.cnpj] ?? null}
            sugerido={tiposSugeridos([e])[e.cnpj]}
            desabilitada={colocar.isPending}
            onTipo={(tipo) => setTipos((atual) => ({ ...atual, [e.cnpj]: tipo }))}
          />
        ))}
      </ul>

      {colocar.isPending && total > 1 && <Andamento feitas={colocar.feitas} total={total} />}

      <Rodape faltam={faltam} pronto={faltam === 0 && !!ownerId} colocando={colocar.isPending} onCancelar={onCancelar} onConfirmar={confirmar} />
    </>
  );
}

function Cabecalho({ empresas }: { empresas: EmpresaReceita[] }) {
  const uma = empresas.length === 1;
  return (
    <DialogHeader>
      <DialogTitle>{uma ? `Colocar ${nomeDaEmpresa(empresas[0])} para abordar` : `Colocar ${empresas.length} empresas para abordar`}</DialogTitle>
      <DialogDescription>
        {uma ? 'A empresa entra' : 'As empresas entram'} em A abordar, com os dados da Receita. Confirme o tipo de conta de cada uma.
      </DialogDescription>
    </DialogHeader>
  );
}

interface RodapeProps {
  faltam: number;
  pronto: boolean;
  colocando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

function Rodape(props: RodapeProps) {
  const { faltam, pronto, colocando, onCancelar, onConfirmar } = props;
  return (
    <DialogFooter className="items-center gap-2 sm:justify-between">
      <p className="text-[12.5px] text-muted-foreground" aria-live="polite">
        {faltam > 0 ? `Falta escolher o tipo de ${faltam} empresa${faltam > 1 ? 's' : ''}.` : ''}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancelar} disabled={colocando}>Cancelar</Button>
        <Button onClick={onConfirmar} disabled={!pronto || colocando}>{colocando ? 'Colocando…' : 'Confirmar'}</Button>
      </div>
    </DialogFooter>
  );
}

interface LinhaDaEmpresaProps {
  empresa: EmpresaReceita;
  tipo: TipoDeConta | null;
  sugerido: TipoDeConta | null;
  desabilitada: boolean;
  onTipo: (tipo: TipoDeConta) => void;
}

/** Cenários 3 e 4: o tipo sugerido vem marcado; sem sugestão, a linha explica e fica destacada até a escolha. */
function LinhaDaEmpresa(props: LinhaDaEmpresaProps) {
  const { empresa, tipo, sugerido, desabilitada, onTipo } = props;
  useHideValues();
  const nome = nomeDaEmpresa(empresa);
  const faturamento = faturamentoDaSugestao(empresa);
  const idTipo = useId();
  return (
    <li className={cn('flex items-center gap-3 px-3 py-2.5', !tipo && 'bg-warning-subtle')}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium" title={nome}>{nome}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{formatCNPJ(empresa.cnpj)}</span>
          {faturamento != null && <span> · ≈ {reaisCurtos(faturamento)}</span>}
        </p>
        {!sugerido && <p className="mt-0.5 text-xs text-warning-emphasis">{motivoSemSugestao(empresa)}</p>}
      </div>
      <label htmlFor={idTipo} className="sr-only">Tipo de conta de {nome}</label>
      <Select value={tipo ?? ''} onValueChange={(v) => onTipo(v as TipoDeConta)} disabled={desabilitada}>
        <SelectTrigger id={idTipo} className="h-9 w-[150px] shrink-0 text-[13px]" aria-invalid={!tipo}>
          <SelectValue placeholder="Escolha o tipo" />
        </SelectTrigger>
        <SelectContent>
          {TIPOS_DE_CONTA.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label} <span className="text-muted-foreground">· {t.faixa}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  );
}

function Andamento({ feitas, total }: { feitas: number; total: number }) {
  return (
    <div className="space-y-1" aria-live="polite">
      <Progress value={(feitas / total) * 100} className="h-1.5" />
      <p className="text-[12.5px] text-muted-foreground">
        {feitas} de {total} · a Receita é consultada uma empresa por vez
      </p>
    </div>
  );
}
