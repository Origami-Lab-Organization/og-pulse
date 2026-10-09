import { useRef, useState } from 'react';
import { Download, Loader2, Paperclip, Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useUpdateProspectActivity } from '@/hooks/useProspectActivities';
import { INTERACTION_CHANNELS, getChannelLabel } from '@/lib/interactionChannels';
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
import type { ProspectActivityWithOwner, ProspectOpportunityContact } from '@/types/prospect';
import { ActivityContactSelect } from './ActivityContactSelect';

interface ProspectActivityItemProps {
  activity: ProspectActivityWithOwner;
  prospectId: string;
  /** Os contatos da oportunidade: as opções de "com quem" na edição. */
  contatos: ProspectOpportunityContact[];
  autorNome?: string;
  podeEditar: boolean;
  /** Aberta ao montar — a mais recente. As outras ficam recolhidas a uma linha (09/10/2026). */
  inicialmenteAberta?: boolean;
}

/**
 * Uma atividade da linha do tempo. Recolhida, é uma linha (número, canal, resposta e data):
 * a linha do tempo longa se lê de relance e abre o que interessa. Aberta, mostra quem
 * registrou, com quem foi, o relato e os anexos.
 */
export function ProspectActivityItem(props: ProspectActivityItemProps) {
  const { activity, prospectId, contatos, inicialmenteAberta = false } = props;
  const [editando, setEditando] = useState(false);
  const [aberta, setAberta] = useState(inicialmenteAberta);

  if (editando) {
    return (
      <EditorDeAtividade
        activity={activity}
        prospectId={prospectId}
        contatos={contatos}
        onFechar={() => setEditando(false)}
      />
    );
  }
  if (!aberta) return <AtividadeRecolhida activity={activity} onAbrir={() => setAberta(true)} />;
  return <AtividadeAberta {...props} onRecolher={() => setAberta(false)} onEditar={() => setEditando(true)} />;
}

function AtividadeRecolhida({ activity, onAbrir }: { activity: ProspectActivityWithOwner; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-expanded={false}
      className="flex w-full flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-sm font-semibold">Atividade nº {activity.sequence_no}</span>
      <SelosDaAtividade activity={activity} />
      <time className="ml-auto text-xs text-muted-foreground" dateTime={activity.activity_date}>
        {formatarData(activity.activity_date)}
      </time>
    </button>
  );
}

type AtividadeAbertaProps = ProspectActivityItemProps & { onRecolher: () => void; onEditar: () => void };

function AtividadeAberta(props: AtividadeAbertaProps) {
  const anexos = props.activity.attachments ?? [];
  const temCorpo = !!props.activity.notes || anexos.length > 0;
  return (
    <article className="overflow-hidden rounded-lg border bg-card">
      <CabecalhoDaAtividade {...props} comBorda={temCorpo} />
      {temCorpo && <CorpoDaAtividade notas={props.activity.notes} anexos={anexos} />}
    </article>
  );
}

function CabecalhoDaAtividade(props: AtividadeAbertaProps & { comBorda: boolean }) {
  const { activity, autorNome, podeEditar, onRecolher, onEditar, comBorda } = props;
  return (
    <header className={cn('space-y-1 bg-muted/40 px-4 py-2.5', comBorda && 'border-b')}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRecolher}
          aria-expanded
          className="rounded text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Atividade nº {activity.sequence_no}
        </button>
        <SelosDaAtividade activity={activity} />
        {activity.contact && <span className="text-xs text-muted-foreground">com {activity.contact.name}</span>}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <time dateTime={activity.activity_date}>{formatarData(activity.activity_date)}</time>
        {autorNome && <span>· {autorNome}</span>}
        {podeEditar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label={`Editar atividade nº ${activity.sequence_no}`}
            onClick={onEditar}
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
          </Button>
        )}
      </div>
    </header>
  );
}

function CorpoDaAtividade({ notas, anexos }: { notas: string | null; anexos: ProspectAttachment[] }) {
  return (
    <div className="space-y-3 px-4 py-3">
      {notas && <p className="whitespace-pre-wrap break-words text-sm">{notas}</p>}
      {anexos.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {anexos.map((anexo) => (
            <li key={anexo.path}><LinkDeAnexo anexo={anexo} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Canal e resposta: os dois selos que dizem, de relance, que toque foi esse. */
function SelosDaAtividade({ activity }: { activity: ProspectActivityWithOwner }) {
  return (
    <>
      <Badge variant="outline" className="rounded-full bg-background font-normal">{getChannelLabel(activity.channel)}</Badge>
      <Badge
        variant="outline"
        className={cn(
          'rounded-full border-transparent font-normal',
          activity.got_response ? 'bg-success-subtle text-success-emphasis' : 'bg-muted text-muted-foreground',
        )}
      >
        {activity.got_response ? 'Respondeu' : 'Sem resposta'}
      </Badge>
    </>
  );
}

/**
 * Edição do conteúdo da atividade: canal, com quem, relato e anexos.
 *
 * O número, a data e "teve resposta" ficam de fora e seguem visíveis como cabeçalho: os
 * três já produziram efeito quando a atividade foi criada — contaram o toque, agendaram a
 * próxima data e moveram a etapa. Deixá-los editáveis mudaria a métrica sem desfazer o
 * efeito.
 */
function EditorDeAtividade({
  activity,
  prospectId,
  contatos,
  onFechar,
}: {
  activity: ProspectActivityWithOwner;
  prospectId: string;
  contatos: ProspectOpportunityContact[];
  onFechar: () => void;
}) {
  const { employee } = useAuth();
  const atualizar = useUpdateProspectActivity();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const originais = activity.attachments ?? [];
  const [canal, setCanal] = useState(activity.channel);
  const [comQuem, setComQuem] = useState<string | null>(activity.contact_id);
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
          contact_id: comQuem,
          notes: texto.trim() || null,
          attachments: [...mantidos, ...enviados],
        },
      });

      // Só depois de a linha estar salva sem eles: arquivo órfão é menos grave que anexo quebrado.
      const removidos = originais
        .filter((a) => !mantidos.some((m) => m.path === a.path));
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

        <ActivityContactSelect
          contatos={contatos}
          value={comQuem}
          onChange={setComQuem}
          atual={activity.contact}
          disabled={ocupado}
        />

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
      const url = await getProspectAttachmentUrl(anexo);
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
