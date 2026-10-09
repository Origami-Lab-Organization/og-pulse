import { useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Loader2, Paperclip, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useDeleteProspectFile, useUploadProspectFiles } from '@/hooks/useProspectFiles';
import {
  ALLOWED_ATTACHMENT_LABEL,
  ALLOWED_ATTACHMENT_TYPES,
  formatFileSize,
  getProspectAttachmentUrl,
  validateAttachment,
  type ProspectAttachment,
} from '@/lib/prospectAttachments';
import type { ArquivoDaOportunidade, ProspectFileDB } from '@/types/prospect';

interface ProspectFilesListProps {
  itens: ArquivoDaOportunidade[];
  carregando: boolean;
  podeEditar: boolean;
}

/** A lista da aba Arquivos (09/10/2026). */
export function ProspectFilesList(props: ProspectFilesListProps) {
  const { itens, carregando, podeEditar } = props;
  if (carregando) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Carregando arquivos">
        {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }
  if (itens.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum arquivo ainda. Os anexos das atividades aparecem aqui, e dá para anexar direto.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {itens.map((item) => (
        <li key={item.chave}>
          <LinhaDeArquivo item={item} podeEditar={podeEditar} />
        </li>
      ))}
    </ul>
  );
}

function LinhaDeArquivo({ item, podeEditar }: { item: ArquivoDaOportunidade; podeEditar: boolean }) {
  const { anexo } = item;
  const Icone = anexo.type.startsWith('image/') ? ImageIcon : FileText;
  const origem = item.atividade ? `Atividade nº ${item.atividade}` : 'Anexado na ficha';

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Icone className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={anexo.name}>{anexo.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[formatFileSize(anexo.size), origem, formatarData(item.dia)].join(' · ')}
        </p>
      </div>
      <BotaoAbrir anexo={anexo} />
      {podeEditar && item.arquivo && <BotaoExcluir arquivo={item.arquivo} />}
    </div>
  );
}

function BotaoAbrir({ anexo }: { anexo: ProspectAttachment }) {
  const [abrindo, setAbrindo] = useState(false);
  const abrir = async () => {
    setAbrindo(true);
    try {
      window.open(await getProspectAttachmentUrl(anexo), '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: 'Não foi possível abrir o arquivo', variant: 'destructive' });
    } finally {
      setAbrindo(false);
    }
  };
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={abrir} disabled={abrindo} aria-label={`Abrir ${anexo.name}`}>
      {abrindo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );
}

function BotaoExcluir({ arquivo }: { arquivo: ProspectFileDB }) {
  const excluir = useDeleteProspectFile();
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => setConfirmando(true)}
        disabled={excluir.isPending}
        aria-label={`Excluir ${arquivo.name}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {arquivo.name}?</AlertDialogTitle>
            <AlertDialogDescription>O arquivo sai da oportunidade e não pode ser recuperado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluir.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={excluir.isPending}
              onClick={() => excluir.mutate(arquivo)}
            >
              Excluir arquivo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Anexar direto na oportunidade: não registra atividade, então não conta toque nem mexe na
 * cadência — é para o contrato, a proposta assinada, o material que a empresa mandou.
 */
export function ProspectFilesUploader({ prospectId }: { prospectId: string }) {
  const enviar = useUploadProspectFiles();
  const input = useRef<HTMLInputElement>(null);

  const escolher = (lista: FileList | null) => {
    const aceitos = Array.from(lista ?? []).filter((arquivo) => {
      const erro = validateAttachment(arquivo);
      if (erro) toast({ title: 'Arquivo não aceito', description: erro, variant: 'destructive' });
      return !erro;
    });
    if (aceitos.length > 0) enviar.mutate({ prospectId, arquivos: aceitos });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
        onChange={(e) => {
          escolher(e.target.files);
          e.target.value = '';
        }}
      />
      <Button type="button" size="sm" onClick={() => input.current?.click()} disabled={enviar.isPending}>
        {enviar.isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Paperclip className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        )}
        {enviar.isPending ? 'Anexando...' : 'Anexar arquivos'}
      </Button>
      <p className="text-xs text-muted-foreground">{ALLOWED_ATTACHMENT_LABEL}. Não conta como atividade.</p>
    </div>
  );
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
