import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PropsDoGerarDeNovo } from '@/types/insights';

const LIMITE = 1000;

/** "Gerar de novo" de um bloco do Estudo da conta (US-0057): o que buscar desta vez, opcional. */
export function GerarDeNovoDialog(props: PropsDoGerarDeNovo) {
  const { aberto, rotulo, pendente, onFechar, onGerar } = props;
  const [texto, setTexto] = useState('');
  useEffect(() => {
    if (aberto) setTexto('');
  }, [aberto]);
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar de novo · {rotulo}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="orientacao-do-pedido">O que buscar</Label>
          <Textarea id="orientacao-do-pedido" autoFocus value={texto} maxLength={LIMITE} onChange={(e) => setTexto(e.target.value)} className="min-h-[110px]" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button disabled={pendente} onClick={() => onGerar(texto.trim())}>Gerar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
