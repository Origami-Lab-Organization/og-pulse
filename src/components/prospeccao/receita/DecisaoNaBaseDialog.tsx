import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useDecisoesDaBase } from '@/hooks/useDecisoesDaBase';
import { LIMITE_DO_TEXTO, MOTIVO_OUTRO, MOTIVOS_DO_DESCARTE } from '@/lib/prospecting/decisoesDaBase';
import { CampoVoltarEm } from '../CampoVoltarEm';
import type { EmpresaParaDecidir, ModoDaDecisao } from '@/types/decisoesDaBase';
import type { MotivoDoDescarte } from '@/types/relacao';

interface DecisaoNaBaseDialogProps {
  modo: ModoDaDecisao | null;
  empresas: EmpresaParaDecidir[];
  onFechar: () => void;
  /** Depois de gravar: a lista limpa a seleção. */
  onConcluido?: () => void;
}

const TITULO: Record<ModoDaDecisao, (sujeito: string) => string> = {
  descartar: (s) => `Descartar ${s}`,
  nao_agora: (s) => `"Não agora" para ${s}`,
};

const DESCRICAO: Record<ModoDaDecisao, string> = {
  descartar: 'Sai da lista para todo o time, sem virar oportunidade. Dá para desfazer pelo filtro de relação.',
  nao_agora: 'Sai da lista até a data. Nesse dia, um aviso no sino lembra de retomar, e a empresa volta com a marca "Retomar".',
};

const MODO_DESCARTAR: ModoDaDecisao = 'descartar';

const sujeito = (empresas: EmpresaParaDecidir[]) =>
  empresas.length === 1 ? empresas[0].nome : `${empresas.length.toLocaleString('pt-BR')} empresas`;

/**
 * Descartar ou marcar "Não agora" na Base de empresas (US-0010): uma pela ficha, várias pela
 * seleção. Sem Cancelar no rodapé, como a janela de mover (18/11/2026): o "x" e o Esc fecham.
 */
export function DecisaoNaBaseDialog(props: DecisaoNaBaseDialogProps) {
  const { modo, empresas, onFechar, onConcluido } = props;
  const decisoes = useDecisoesDaBase();
  const gravando = decisoes.descartar.isPending || decisoes.naoAgora.isPending;
  return (
    <Dialog open={!!modo} onOpenChange={(aberta) => !aberta && !gravando && onFechar()}>
      <DialogContent className="max-w-md">
        {modo && (
          <>
            <DialogHeader>
              <DialogTitle className="leading-snug">{TITULO[modo](sujeito(empresas))}</DialogTitle>
              <DialogDescription>{DESCRICAO[modo]}</DialogDescription>
            </DialogHeader>
            {modo === MODO_DESCARTAR
              ? <FormularioDoDescarte empresas={empresas} decisoes={decisoes} onConcluido={() => { onConcluido?.(); onFechar(); }} />
              : <FormularioDoNaoAgora empresas={empresas} decisoes={decisoes} onConcluido={() => { onConcluido?.(); onFechar(); }} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormularioProps {
  empresas: EmpresaParaDecidir[];
  decisoes: ReturnType<typeof useDecisoesDaBase>;
  onConcluido: () => void;
}

function FormularioDoDescarte(props: FormularioProps) {
  const { empresas, decisoes, onConcluido } = props;
  const id = useId();
  const [motivo, setMotivo] = useState<MotivoDoDescarte | null>(null);
  const [texto, setTexto] = useState('');
  const outro = motivo === MOTIVO_OUTRO;
  const pronto = !!motivo && (!outro || !!texto.trim());

  const confirmar = async () => {
    if (!motivo) return;
    await decisoes.descartar.mutateAsync({ empresas, motivo, texto: outro ? texto : null }).catch(() => undefined);
    onConcluido();
  };

  return (
    <>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Motivo</legend>
        <RadioGroup value={motivo ?? ''} onValueChange={(v) => setMotivo(v as MotivoDoDescarte)} className="gap-2">
          {MOTIVOS_DO_DESCARTE.map((m) => (
            <div key={m.valor} className="flex items-center gap-2">
              <RadioGroupItem id={`${id}-${m.valor}`} value={m.valor} />
              <Label htmlFor={`${id}-${m.valor}`} className="font-normal">{m.rotulo}</Label>
            </div>
          ))}
        </RadioGroup>
        {outro && (
          <div className="space-y-1 pt-1">
            <Label htmlFor={`${id}-texto`}>Qual motivo?</Label>
            <Textarea id={`${id}-texto`} value={texto} maxLength={LIMITE_DO_TEXTO} onChange={(e) => setTexto(e.target.value)} rows={2} autoFocus />
          </div>
        )}
      </fieldset>
      <DialogFooter>
        <Button onClick={confirmar} disabled={!pronto || decisoes.descartar.isPending}>
          {decisoes.descartar.isPending ? 'Descartando…' : 'Descartar'}
        </Button>
      </DialogFooter>
    </>
  );
}

function FormularioDoNaoAgora(props: FormularioProps) {
  const { empresas, decisoes, onConcluido } = props;
  const [voltarEm, setVoltarEm] = useState<string | null>(null);

  const confirmar = async () => {
    if (!voltarEm) return;
    await decisoes.naoAgora.mutateAsync({ empresas, voltarEm }).catch(() => undefined);
    onConcluido();
  };

  return (
    <>
      <CampoVoltarEm onChange={setVoltarEm} desabilitado={decisoes.naoAgora.isPending} />
      <DialogFooter>
        <Button onClick={confirmar} disabled={!voltarEm || decisoes.naoAgora.isPending}>
          {decisoes.naoAgora.isPending ? 'Marcando…' : 'Marcar "Não agora"'}
        </Button>
      </DialogFooter>
    </>
  );
}
