import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleDashed, FileUp, Loader2, MinusCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useBulkCompanyImport } from '@/hooks/useBulkCompanyImport';
import { formatCNPJ } from '@/lib/masks';
import { extractCnpjs, MAX_CNPJS_POR_LOTE } from '@/lib/prospecting/bulkCnpj';
import { cn } from '@/lib/utils';
import type { BulkRow, BulkRowStatus } from '@/types/bulkImport';

interface BulkCompanyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONSULTANDO: BulkRowStatus = 'consultando';
const LIMITE_ARQUIVO = 2 * 1024 * 1024; // 2 MB de texto é lista de sobra

const STATUS: Record<BulkRowStatus, { rotulo: string; icone: typeof CheckCircle2; cor: string }> = {
  fila: { rotulo: 'Na fila', icone: CircleDashed, cor: 'text-muted-foreground' },
  consultando: { rotulo: 'Consultando', icone: Loader2, cor: 'text-muted-foreground' },
  criada: { rotulo: 'Cadastrada', icone: CheckCircle2, cor: 'text-success-emphasis' },
  existente: { rotulo: 'Já existia', icone: MinusCircle, cor: 'text-muted-foreground' },
  falhou: { rotulo: 'Falhou', icone: XCircle, cor: 'text-destructive' },
};

/**
 * Cadastro de empresas em lote (29/09/2026): cola a lista ou sobe o CSV da feira, do
 * sindicato ou da Rede Origami, e cada CNPJ vira empresa com os dados da Receita e a rede de
 * sócios. O que já existe fica como está. Contato não é criado — a rede mostra com quem falar.
 */
export function BulkCompanyImportDialog({ open, onOpenChange }: BulkCompanyImportDialogProps) {
  const lote = useBulkCompanyImport();
  const [texto, setTexto] = useState('');
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const extraidos = useMemo(() => extractCnpjs(texto), [texto]);
  const comecou = lote.linhas.length > 0;

  const fechar = (aberto: boolean) => {
    if (lote.rodando) return;
    if (!aberto) {
      lote.reiniciar();
      setTexto('');
      setErroArquivo(null);
    }
    onOpenChange(aberto);
  };

  const lerArquivo = async (file: File | undefined) => {
    setErroArquivo(null);
    if (!file) return;
    if (file.size > LIMITE_ARQUIVO) return setErroArquivo('Arquivo acima de 2 MB. Divida a lista.');
    setTexto(await file.text());
  };

  const importar = () => lote.iniciar(extraidos.validos.slice(0, MAX_CNPJS_POR_LOTE));

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Importar empresas por CNPJ</DialogTitle>
          <DialogDescription>
            Cada CNPJ vira empresa com os dados da Receita e a rede de sócios. As que já existem
            ficam como estão; nenhum contato é criado.
          </DialogDescription>
        </DialogHeader>

        {comecou ? (
          <Progresso linhas={lote.linhas} />
        ) : (
          <div className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="lote-cnpjs">CNPJs</Label>
              <Textarea
                id="lote-cnpjs"
                rows={8}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Cole a lista: um por linha, com ou sem máscara, ou a planilha inteira."
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ResumoDaLista validos={extraidos.validos.length} invalidos={extraidos.invalidos} excedente={extraidos.excedente} />
                <Button type="button" variant="outline" size="sm" onClick={() => arquivo.current?.click()}>
                  <FileUp className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Subir CSV ou TXT
                </Button>
                <input
                  ref={arquivo}
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="sr-only"
                  aria-label="Arquivo com CNPJs"
                  onChange={(e) => lerArquivo(e.target.files?.[0])}
                />
              </div>
              {erroArquivo && <p role="alert" className="text-xs text-destructive">{erroArquivo}</p>}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {lote.rodando ? (
            <Button variant="outline" onClick={lote.interromper}>Parar</Button>
          ) : (
            <Button variant="outline" onClick={() => fechar(false)}>{comecou ? 'Fechar' : 'Cancelar'}</Button>
          )}
          {!comecou && (
            <Button onClick={importar} disabled={extraidos.validos.length === 0}>
              Importar {Math.min(extraidos.validos.length, MAX_CNPJS_POR_LOTE) || ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResumoDaLista(props: { validos: number; invalidos: string[]; excedente: number }) {
  const { validos, invalidos, excedente } = props;
  const partes = [
    `${validos} ${validos === 1 ? 'CNPJ válido' : 'CNPJs válidos'}`,
    invalidos.length > 0 ? `${invalidos.length} com dígito errado (${invalidos.slice(0, 3).join(', ')}${invalidos.length > 3 ? '…' : ''})` : null,
    excedente > 0 ? `${excedente} além do limite de ${MAX_CNPJS_POR_LOTE} ficam para o próximo lote` : null,
  ].filter(Boolean);
  return <p className="text-xs text-muted-foreground" role="status">{partes.join(' · ')}</p>;
}

function Progresso({ linhas }: { linhas: BulkRow[] }) {
  const conta = (status: BulkRowStatus) => linhas.filter((l) => l.status === status).length;
  const feitas = linhas.length - conta('fila') - conta('consultando');
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="space-y-1.5" role="status">
        <Progress value={(feitas / linhas.length) * 100} aria-label="Progresso da importação" />
        <p className="text-xs text-muted-foreground">
          {feitas} de {linhas.length} · {conta('criada')} cadastradas · {conta('existente')} já existiam · {conta('falhou')} falharam
        </p>
      </div>
      <ul className="min-h-0 flex-1 divide-y overflow-y-auto rounded-md border">
        {linhas.map((linha) => (
          <LinhaDoLote key={linha.cnpj} linha={linha} />
        ))}
      </ul>
    </div>
  );
}

function LinhaDoLote({ linha }: { linha: BulkRow }) {
  const meta = STATUS[linha.status];
  const Icone = meta.icone;
  const detalhe = linha.mensagem ?? (linha.socios != null ? `${linha.socios} sócios na rede` : null);
  return (
    <li className="flex items-start gap-2 px-3 py-2 text-sm">
      <Icone className={cn('mt-0.5 h-4 w-4 shrink-0', meta.cor, linha.status === CONSULTANDO && 'animate-spin')} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate">{linha.empresa?.name ?? formatCNPJ(linha.cnpj)}</p>
        <p className="text-xs text-muted-foreground">
          {[formatCNPJ(linha.cnpj), meta.rotulo, detalhe].filter(Boolean).join(' · ')}
        </p>
      </div>
    </li>
  );
}
