import { useState } from 'react';
import { FileText, Link2, Loader2, StickyNote, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useIncluirNoEstudo, useRemoverDoEstudo } from '@/hooks/useItensDoEstudo';
import { formatarData } from '@/lib/prospecting/prazos';
import { comProtocolo, urlCurta } from '@/lib/prospecting/links';
import { TIPO_DE_ITEM_DO_ESTUDO, type TipoDeItemDoEstudo } from '@/lib/prospecting/faseDaEmpresa.constants';
import { tamanhoDoArquivo } from '@/lib/prospecting/paginaDaEmpresa';
import type { ItemDoEstudoDaConta } from '@/types/paginaDaEmpresa';

const ICONE: Record<TipoDeItemDoEstudo, typeof Link2> = {
  [TIPO_DE_ITEM_DO_ESTUDO.LINK]: Link2,
  [TIPO_DE_ITEM_DO_ESTUDO.NOTA]: StickyNote,
  [TIPO_DE_ITEM_DO_ESTUDO.ARQUIVO]: FileText,
};

function Botoes(props: { pendente: boolean; podeGuardar: boolean; onCancelar: () => void }) {
  const { pendente, podeGuardar, onCancelar } = props;
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onCancelar}>Cancelar</Button>
      <Button type="submit" size="sm" disabled={!podeGuardar || pendente}>
        {pendente && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        Guardar
      </Button>
    </div>
  );
}

/** Link do estudo: o endereço e, se quiser, um título. */
export function NovoLink({ companyId, onFechar }: { companyId: string; onFechar: () => void }) {
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const incluir = useIncluirNoEstudo(companyId);
  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const endereco = comProtocolo(url.trim());
    incluir.mutate({ tipo: TIPO_DE_ITEM_DO_ESTUDO.LINK, url: endereco, titulo: titulo.trim() || urlCurta(endereco) }, { onSuccess: onFechar });
  };
  return (
    <form onSubmit={guardar} className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2">
      <Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" aria-label="Endereço do link" />
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" aria-label="Título do link" />
      <div className="sm:col-span-2"><Botoes pendente={incluir.isPending} podeGuardar={!!url.trim()} onCancelar={onFechar} /></div>
    </form>
  );
}

/** Nota do estudo: um título e o que se descobriu. */
export function NovaNota({ companyId, onFechar }: { companyId: string; onFechar: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const incluir = useIncluirNoEstudo(companyId);
  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    incluir.mutate({ tipo: TIPO_DE_ITEM_DO_ESTUDO.NOTA, titulo: titulo.trim(), texto: texto.trim() }, { onSuccess: onFechar });
  };
  return (
    <form onSubmit={guardar} className="grid gap-2 rounded-xl border bg-card p-3">
      <Input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" aria-label="Título da nota" />
      <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O que você descobriu" aria-label="Texto da nota" className="min-h-[90px]" />
      <Botoes pendente={incluir.isPending} podeGuardar={!!titulo.trim() && !!texto.trim()} onCancelar={onFechar} />
    </form>
  );
}

function useDetalhe(item: ItemDoEstudoDaConta): string {
  const { byId } = useEmployeeDirectoryMap();
  const quem = item.created_by ? byId.get(item.created_by)?.nome : null;
  const quando = formatarData(item.created_at);
  if (item.tipo === TIPO_DE_ITEM_DO_ESTUDO.ARQUIVO) return [tamanhoDoArquivo(item.tamanho), quem, quando].filter(Boolean).join(' · ');
  if (item.tipo === TIPO_DE_ITEM_DO_ESTUDO.LINK && item.url) return [urlCurta(item.url), quem, quando].filter(Boolean).join(' · ');
  return [quem, quando].filter(Boolean).join(' · ');
}

function ConfirmarRemocao(props: { item: ItemDoEstudoDaConta | null; pendente: boolean; onConfirmar: () => void; onCancelar: () => void }) {
  const { item, pendente, onConfirmar, onCancelar } = props;
  const arquivo = item?.tipo === TIPO_DE_ITEM_DO_ESTUDO.ARQUIVO;
  return (
    <AlertDialog open={item !== null} onOpenChange={(aberto) => !aberto && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tirar “{item?.titulo}” do estudo?</AlertDialogTitle>
          {arquivo && <AlertDialogDescription>O arquivo também é apagado do OneDrive.</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar} disabled={pendente} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {pendente && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {arquivo ? 'Tirar e apagar' : 'Tirar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Item({ item, podeEditar, onTirar }: { item: ItemDoEstudoDaConta; podeEditar: boolean; onTirar: () => void }) {
  const Icone = ICONE[item.tipo];
  const detalhe = useDetalhe(item);
  const titulo = item.url
    ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.titulo}</a>
    : item.titulo;
  return (
    <li className="flex items-start gap-3 border-t px-4 py-3 first:border-t-0">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted"><Icone className="h-4 w-4" /></span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-[13.5px] font-semibold [overflow-wrap:anywhere]">{titulo}</span>
        {item.texto && <span className="whitespace-pre-line text-[13px] leading-snug">{item.texto}</span>}
        <span className="text-[12px] text-muted-foreground">{detalhe}</span>
      </span>
      {podeEditar && (
        <button type="button" onClick={onTirar} aria-label={`Tirar ${item.titulo} do estudo`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

/** Os links, notas e arquivos do estudo, do mais novo para o mais antigo. */
export function ListaDoEstudo(props: { companyId: string; itens: ItemDoEstudoDaConta[]; podeEditar: boolean }) {
  const { companyId, itens, podeEditar } = props;
  const [tirando, setTirando] = useState<ItemDoEstudoDaConta | null>(null);
  const remover = useRemoverDoEstudo(companyId);
  if (itens.length === 0) return null;
  return (
    <>
      <ul className="overflow-hidden rounded-xl border bg-card">
        {itens.map((i) => <Item key={i.id} item={i} podeEditar={podeEditar} onTirar={() => setTirando(i)} />)}
      </ul>
      <ConfirmarRemocao
        item={tirando}
        pendente={remover.isPending}
        onCancelar={() => setTirando(null)}
        onConfirmar={() => tirando && remover.mutate(tirando, { onSuccess: () => setTirando(null) })}
      />
    </>
  );
}
