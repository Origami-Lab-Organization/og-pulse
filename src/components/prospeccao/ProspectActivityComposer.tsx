import { useRef, useState } from 'react';
import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useRegisterActivity } from '@/hooks/useProspectActivities';
import { INTERACTION_CHANNELS } from '@/lib/interactionChannels';
import {
  ALLOWED_ATTACHMENT_LABEL,
  ALLOWED_ATTACHMENT_TYPES,
  formatFileSize,
  uploadProspectAttachment,
  validateAttachment,
  type ProspectAttachment,
} from '@/lib/prospectAttachments';
import type { ProspectWithCompany } from '@/types/prospect';

interface ProspectActivityComposerProps {
  prospect: ProspectWithCompany;
}

/**
 * A caixa de registro, no rodapé da linha do tempo.
 *
 * O teste de aceite do módulo continua de pé: registrar uma atividade custa UM clique —
 * texto e anexo são opcionais, e clicar em "Registrar" com a caixa vazia grava a atividade
 * no canal selecionado, como o botão antigo fazia. O que mudou é que agora cabe contexto
 * sem passar por um diálogo.
 *
 * O canal fica à esquerda do envio porque é decisão da atividade, não do contato: o canal
 * principal só define o valor inicial.
 */
export function ProspectActivityComposer({ prospect }: ProspectActivityComposerProps) {
  const { employee } = useAuth();
  const registrar = useRegisterActivity();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState('');
  const [canal, setCanal] = useState(prospect.primary_channel);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);

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
    setArquivos((atual) => [...atual, ...aceitos]);
  };

  const registrarAtividade = async () => {
    setEnviando(true);
    try {
      const anexos = await subirAnexos(arquivos, employee!.tenant_id, prospect.id);
      const atividade = await registrar.mutateAsync({
        prospect_id: prospect.id,
        channel: canal,
        got_response: false,
        notes: texto.trim() || null,
        attachments: anexos,
      });
      setTexto('');
      setArquivos([]);
      setCanal(prospect.primary_channel);
      toast({
        title: `Atividade nº ${atividade.sequence_no} registrada`,
        description: 'A próxima data foi agendada pela cadência.',
      });
    } catch (erro) {
      toast({
        title: 'Não foi possível registrar',
        description: erro instanceof Error ? erro.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setEnviando(false);
    }
  };

  const ocupado = enviando || registrar.isPending;

  return (
    <div className="rounded-lg border bg-card p-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') registrarAtividade();
        }}
        rows={3}
        placeholder="O que aconteceu? (opcional — dá para registrar só o toque)"
        className="resize-none border-0 p-2 shadow-none focus-visible:ring-0"
        disabled={ocupado}
      />

      {arquivos.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-2 pb-2">
          {arquivos.map((arquivo, indice) => (
            <li
              key={`${arquivo.name}-${indice}`}
              className="flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{arquivo.name}</span>
              <span className="shrink-0 text-muted-foreground">{formatFileSize(arquivo.size)}</span>
              <button
                type="button"
                aria-label={`Remover ${arquivo.name}`}
                className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setArquivos((atual) => atual.filter((_, i) => i !== indice))}
                disabled={ocupado}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t px-2 pt-2">
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
          aria-label={`Anexar arquivo — ${ALLOWED_ATTACHMENT_LABEL}`}
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

        <Button
          type="button"
          size="sm"
          className="ml-auto"
          disabled={ocupado}
          onClick={registrarAtividade}
        >
          {ocupado ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          )}
          Registrar
        </Button>
      </div>
    </div>
  );
}

/**
 * Sobe os anexos ANTES de gravar a atividade: se um upload falhar, nada é registrado e a
 * pessoa não perde o texto. O inverso deixaria a linha do tempo com uma atividade que
 * promete um arquivo inexistente.
 */
async function subirAnexos(
  arquivos: File[],
  tenantId: string,
  prospectId: string,
): Promise<ProspectAttachment[]> {
  if (arquivos.length === 0) return [];
  return Promise.all(
    arquivos.map((arquivo) => uploadProspectAttachment(arquivo, { tenantId, prospectId })),
  );
}
