import { useRef, useState } from 'react';
import { Download, Loader2, Paperclip, Pencil, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useUpdateProspectActivity } from '@/hooks/useProspectActivities';
import { INTERACTION_CHANNELS, getChannelLabel } from '@/lib/interactionChannels';
import { iniciaisDe } from '@/lib/prospecting/iniciais';
import {
  ALLOWED_ATTACHMENT_LABEL,
  ALLOWED_ATTACHMENT_TYPES,
  deleteProspectAttachments,
  formatFileSize,
  getProspectAttachmentUrl,
  uploadProspectAttachment,
  validateAttachment,
  type ProspectAttachment,
} from '@/lib/prospectAttachments';
import { cn } from '@/lib/utils';
import type { ProspectActivityWithOwner } from '@/types/prospect';

interface ProspectActivityItemProps {
  activity: ProspectActivityWithOwner;
  prospectId: string;
  autorNome?: string;
  podeEditar: boolean;
}

export function ProspectActivityItem({
  activity,
  prospectId,
  autorNome,
  podeEditar,
}: ProspectActivityItemProps) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <EditorDeAtividade
        activity={activity}
        prospectId={prospectId}
        onFechar={() => setEditando(false)}
      />
    );
  }

  const anexos = activity.attachments ?? [];

  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">Atividade nº {activity.sequence_no}</h4>
        <Badge variant="outline" className="font-normal">{getChannelLabel(activity.channel)}</Badge>
        <Badge
          variant="outline"
          className={cn(
            'font-normal',
            activity.got_response
              ? 'border-transparent bg-success-subtle text-success-emphasis'
              : 'border-transparent bg-muted text-muted-foreground',
          )}
        >
          {activity.got_response ? 'Teve resposta' : 'Sem resposta'}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <time className="text-xs text-muted-foreground" dateTime={activity.activity_date}>
            {formatarData(activity.activity_date)}
          </time>
          {podeEditar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={`Editar atividade nº ${activity.sequence_no}`}
              onClick={() => setEditando(true)}
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
            </Button>
          )}
        </div>
      </header>

      {activity.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{activity.notes}</p>}

      {anexos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {anexos.map((anexo) => (
            <li key={anexo.path}><LinkDeAnexo anexo={anexo} /></li>
          ))}
        </ul>
      )}

      {autorNome && (
        <footer className="mt-3 flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">{iniciaisDe(autorNome)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{autorNome}</span>
        </footer>
      )}
    </article>
  );
}

/**
 * Edição do conteúdo da atividade: canal, relato e anexos.
 *
 * O número, a data e "teve resposta" ficam de fora e seguem visíveis como cabeçalho: os
 * três já produziram efeito quando a atividade foi criada — contaram o toque, agendaram a
 * próxima data e moveram a etapa. Deixá-los editáveis mudaria a métrica sem desfazer o
 * efeito.
 */
function EditorDeAtividade({
  activity,
  prospectId,
  onFechar,
}: {
  activity: ProspectActivityWithOwner;
  prospectId: string;
  onFechar: () => void;
}) {
  const { employee } = useAuth();
  const atualizar = useUpdateProspectActivity();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const originais = activity.attachments ?? [];
  const [canal, setCanal] = useState(activity.channel);
  const [texto, setTexto] = useState(activity.notes ?? '');
  const [mantidos, setMantidos] = useState<ProspectAttachment[]>(originais);
  const [novos, setNovos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);

  const escolherArquivos = (lista: FileList | null) => {
    if (!lista) return;
    const aceitos: File[] = [];
    for (const arquivo of Array.from(lista)) {
      const erro = validateAttachment(arquivo);
      if (erro) {
        toast({ title: 'Anexo não aceito', description: erro, variant: 'destructive' });
        continue;
      }
      aceitos.push(arquivo);
    }
    setNovos((atual) => [...atual, ...aceitos]);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const enviados = await Promise.all(
        novos.map((arquivo) =>
          uploadProspectAttachment(arquivo, { tenantId: employee!.tenant_id, prospectId }),
        ),
      );
      await atualizar.mutateAsync({
        prospect_id: prospectId,
        input: {
          id: activity.id,
          channel: canal,
          notes: texto.trim() || null,
          attachments: [...mantidos, ...enviados],
        },
      });

      // Só depois de a linha estar salva sem eles: arquivo órfão é menos grave que anexo quebrado.
      const removidos = originais
        .filter((a) => !mantidos.some((m) => m.path === a.path))
        .map((a) => a.path);
      await deleteProspectAttachments(removidos).catch(console.warn);

      onFechar();
    } catch (erro) {
      toast({
        title: 'Não foi possível salvar',
        description: erro instanceof Error ? erro.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSalvando(false);
    }
  };

  const ocupado = salvando || atualizar.isPending;

  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm">
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">Atividade nº {activity.sequence_no}</h4>
        <Badge variant="outline" className="font-normal">
          {activity.got_response ? 'Teve resposta' : 'Sem resposta'}
        </Badge>
        <time className="ml-auto text-xs text-muted-foreground" dateTime={activity.activity_date}>
          {formatarData(activity.activity_date)}
        </time>
      </header>

      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="O que aconteceu?"
        disabled={ocupado}
      />

      {(mantidos.length > 0 || novos.length > 0) && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {mantidos.map((anexo) => (
            <li key={anexo.path}>
              <Chip
                nome={anexo.name}
                detalhe={formatFileSize(anexo.size)}
                onRemover={() => setMantidos((a) => a.filter((x) => x.path !== anexo.path))}
                disabled={ocupado}
              />
            </li>
          ))}
          {novos.map((arquivo, indice) => (
            <li key={`${arquivo.name}-${indice}`}>
              <Chip
                nome={arquivo.name}
                detalhe={`${formatFileSize(arquivo.size)} · novo`}
                onRemover={() => setNovos((a) => a.filter((_, i) => i !== indice))}
                disabled={ocupado}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={inputArquivo}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
          onChange={(e) => {
            escolherArquivos(e.target.files);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Anexar arquivo: ${ALLOWED_ATTACHMENT_LABEL}`}
          title={ALLOWED_ATTACHMENT_LABEL}
          disabled={ocupado}
          onClick={() => inputArquivo.current?.click()}
        >
          <Paperclip className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Select value={canal} onValueChange={setCanal} disabled={ocupado}>
          <SelectTrigger className="h-8 w-40" aria-label="Canal da atividade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERACTION_CHANNELS.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onFechar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={salvar} disabled={ocupado}>
            {ocupado && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Salvar
          </Button>
        </div>
      </div>
    </article>
  );
}

function Chip({
  nome,
  detalhe,
  onRemover,
  disabled,
}: {
  nome: string;
  detalhe: string;
  onRemover: () => void;
  disabled?: boolean;
}) {
  return (
    <span className="flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs">
      <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{nome}</span>
      <span className="shrink-0 text-muted-foreground">{detalhe}</span>
      <button
        type="button"
        aria-label={`Remover ${nome}`}
        className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onRemover}
        disabled={disabled}
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/** Gera a URL assinada só no clique: link pronto de antemão vazaria acesso ao expirar longe. */
function LinkDeAnexo({ anexo }: { anexo: ProspectAttachment }) {
  const [carregando, setCarregando] = useState(false);

  const abrir = async () => {
    setCarregando(true);
    try {
      const url = await getProspectAttachmentUrl(anexo.path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: 'Não foi possível abrir o anexo', variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={carregando}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {carregando ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{anexo.name}</span>
      <Download className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
