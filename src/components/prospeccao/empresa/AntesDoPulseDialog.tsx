import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMarcarEmpresa } from '@/hooks/useMarcasDaEmpresa';
import { ANOS_ANTES_DO_PULSE } from '@/lib/prospecting/marcasDaEmpresa.constants';
import type { EmpresaParaMarcar } from '@/types/marcasDaEmpresa';

interface AntesDoPulseDialogProps {
  aberto: boolean;
  onFechar: () => void;
  empresa: EmpresaParaMarcar;
  /** O ano já marcado; nulo quando não há marca. */
  atual: number | null;
}

type FormularioProps = Omit<AntesDoPulseDialogProps, 'aberto'>;

/** Montado só com o modal aberto: o ano nasce do que está marcado. */
function Formulario(props: FormularioProps) {
  const { onFechar, empresa, atual } = props;
  const marcar = useMarcarEmpresa();
  const [ano, setAno] = useState(atual == null ? '' : String(atual));
  const gravar = (valor: number | null) => marcar.mutate({ empresa, marca: { cliente_antes_do_pulse: valor } }, { onSuccess: onFechar });
  const salvar = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (ano) gravar(Number(ano));
  };
  return (
    <form onSubmit={salvar} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="antes-do-pulse-ano">Ano</Label>
        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger id="antes-do-pulse-ano" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {ANOS_ANTES_DO_PULSE.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="gap-2 pt-2 sm:justify-between">
        {atual != null ? <Button type="button" variant="ghost" className="-ml-3" disabled={marcar.isPending} onClick={() => gravar(null)}>Tirar marca</Button> : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" disabled={!ano || marcar.isPending}>
            {marcar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Salvar
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

/** "Cliente antes do Pulse" (US-0051): o admin marca o ano; a relação passa a "Já foi cliente". */
export function AntesDoPulseDialog(props: AntesDoPulseDialogProps) {
  const { aberto, onFechar, empresa } = props;
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cliente antes do Pulse</DialogTitle>
          <DialogDescription>{empresa.nome}</DialogDescription>
        </DialogHeader>
        {aberto && <Formulario {...props} />}
      </DialogContent>
    </Dialog>
  );
}
