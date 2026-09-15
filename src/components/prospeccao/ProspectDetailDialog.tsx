import { useEffect, useState } from 'react';
import { ArrowRightLeft, MoreVertical, Pencil, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useProspectActivities } from '@/hooks/useProspectActivities';
import { useUpdateProspectCompany } from '@/hooks/useProspectCompanies';
import { useDeleteProspect, useReopenProspect, useUpdateProspect } from '@/hooks/useProspects';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import { INTERACTION_CHANNELS, getChannelLabel } from '@/lib/interactionChannels';
import { formatCNPJ } from '@/lib/masks';
import {
  canConvertToLead,
  getDiscardReasonLabel,
  getProspectStageColor,
  getProspectStageLabel,
  isProspectReadOnly,
  type ProspectWithCompany,
} from '@/types/prospect';
import { ProspectActivityTimeline } from './ProspectActivityTimeline';
import { RegisterActivityButtons } from './RegisterActivityButtons';

interface ProspectDetailDialogProps {
  prospect: ProspectWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: (prospect: ProspectWithCompany) => void;
  onConvert: (prospect: ProspectWithCompany) => void;
}

/**
 * O card do contato: informação de um lado, atividade do outro.
 *
 * A separação é o pedido central — quem abre precisa distinguir num relance o que é
 * cadastro do que é histórico. Os campos da empresa (anel, tier, CNPJ) valem para TODOS os
 * contatos dela: editá-los aqui edita a empresa, que é o que torna o cadastro reutilizável.
 */
export function ProspectDetailDialog({
  prospect,
  open,
  onOpenChange,
  onDiscard,
  onConvert,
}: ProspectDetailDialogProps) {
  const { data: atividades = [], isLoading } = useProspectActivities(prospect?.id ?? null);
  const { data: diretorio = [] } = useEmployeeDirectory(open);
  const atualizarContato = useUpdateProspect();
  const atualizarEmpresa = useUpdateProspectCompany();
  const reabrir = useReopenProspect();
  const excluir = useDeleteProspect();

  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !prospect) return;
    setEditando(false);
    setRascunho(rascunhoInicial(prospect));
  }, [open, prospect]);

  if (!prospect) return null;

  const somenteLeitura = isProspectReadOnly(prospect);
  const empresa = prospect.company;
  const salvando = atualizarContato.isPending || atualizarEmpresa.isPending;

  const salvar = async () => {
    if (empresa) {
      await atualizarEmpresa.mutateAsync({
        id: empresa.id,
        input: {
          name: rascunho.company_name || empresa.name,
          cnpj: rascunho.company_cnpj || null,
          linkedin_url: rascunho.company_linkedin || null,
          website: rascunho.company_website || null,
          segment: rascunho.company_segment || null,
          ring: rascunho.company_ring || null,
          tier: rascunho.company_tier || null,
          client_id: empresa.client_id,
          notes: empresa.notes,
        },
      });
    }
    await atualizarContato.mutateAsync({
      id: prospect.id,
      updates: {
        contact_name: rascunho.contact_name || prospect.contact_name,
        contact_role: rascunho.contact_role || null,
        contact_email: rascunho.contact_email || null,
        contact_phone: rascunho.contact_phone || null,
        linkedin_url: rascunho.linkedin_url || null,
        primary_channel: rascunho.primary_channel || prospect.primary_channel,
        owner_id: rascunho.owner_id || prospect.owner_id,
        lever: rascunho.lever || null,
      },
    });
    setEditando(false);
  };

  const definir = (campo: string) => (valor: string) =>
    setRascunho((atual) => ({ ...atual, [campo]: valor }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-2 p-4 pr-14 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-lg">{prospect.contact_name}</DialogTitle>
            <Badge variant="secondary" className={getProspectStageColor(prospect.stage)}>
              {getProspectStageLabel(prospect.stage)}
            </Badge>
            {somenteLeitura && <Badge variant="outline">Somente leitura</Badge>}
          </div>
          <DialogDescription>
            {empresa?.name ?? 'Empresa não informada'}
            {prospect.contact_role ? ` · ${prospect.contact_role}` : ''}
            {' · '}
            Atividade nº {prospect.activity_count}
            {prospect.next_activity_on ? ` · próxima em ${formatarData(prospect.next_activity_on)}` : ''}
          </DialogDescription>
          {prospect.stage === 'descartado' && (
            <p className="text-xs text-muted-foreground">
              Motivo do descarte: {getDiscardReasonLabel(prospect.discard_reason)}
            </p>
          )}
        </DialogHeader>

        <div className="absolute right-12 top-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ações do contato">
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!somenteLeitura && (
                <DropdownMenuItem onSelect={() => setEditando((v) => !v)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  {editando ? 'Cancelar edição' : 'Editar'}
                </DropdownMenuItem>
              )}
              {canConvertToLead(prospect) && (
                <DropdownMenuItem onSelect={() => onConvert(prospect)}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Converter em oportunidade
                </DropdownMenuItem>
              )}
              {!somenteLeitura && prospect.stage !== 'descartado' && (
                <DropdownMenuItem onSelect={() => onDiscard(prospect)}>
                  <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  Descartar
                </DropdownMenuItem>
              )}
              {(prospect.stage === 'descartado' || prospect.stage === 'sem_resposta') && (
                <DropdownMenuItem onSelect={() => reabrir.mutate({ id: prospect.id })}>
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Reabrir
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => {
                  excluir.mutate({ id: prospect.id });
                  onOpenChange(false);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Excluir contato
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator />

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,360px)_1fr]">
          <section
            aria-label="Informação"
            className="min-h-0 space-y-4 overflow-y-auto border-b p-4 md:border-b-0 md:border-r"
          >
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Empresa</h3>
              <Campo label="Nome" valor={empresa?.name} editando={editando}
                     draft={rascunho.company_name} onChange={definir('company_name')} />
              <Campo label="CNPJ" valor={empresa?.cnpj ? formatCNPJ(empresa.cnpj) : null} editando={editando}
                     draft={rascunho.company_cnpj} onChange={definir('company_cnpj')} />
              <Campo label="LinkedIn" valor={empresa?.linkedin_url} editando={editando}
                     draft={rascunho.company_linkedin} onChange={definir('company_linkedin')} />
              <Campo label="Site" valor={empresa?.website} editando={editando}
                     draft={rascunho.company_website} onChange={definir('company_website')} />
              <Campo label="Segmento" valor={empresa?.segment} editando={editando}
                     draft={rascunho.company_segment} onChange={definir('company_segment')} />
              <Campo label="Anel" valor={empresa?.ring} editando={editando}
                     draft={rascunho.company_ring} onChange={definir('company_ring')} />
              <Campo label="Tier" valor={empresa?.tier} editando={editando}
                     draft={rascunho.company_tier} onChange={definir('company_tier')} />
              {editando && (
                <p className="text-xs text-muted-foreground">
                  Os campos da empresa valem para todos os contatos dela.
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Contato</h3>
              <Campo label="Nome" valor={prospect.contact_name} editando={editando}
                     draft={rascunho.contact_name} onChange={definir('contact_name')} />
              <Campo label="Cargo" valor={prospect.contact_role} editando={editando}
                     draft={rascunho.contact_role} onChange={definir('contact_role')} />
              <Campo label="E-mail" valor={prospect.contact_email} editando={editando}
                     draft={rascunho.contact_email} onChange={definir('contact_email')} />
              <Campo label="Telefone" valor={prospect.contact_phone} editando={editando}
                     draft={rascunho.contact_phone} onChange={definir('contact_phone')} />
              <Campo label="LinkedIn" valor={prospect.linkedin_url} editando={editando}
                     draft={rascunho.linkedin_url} onChange={definir('linkedin_url')} />
              <Campo label="Alavanca / origem" valor={prospect.lever} editando={editando}
                     draft={rascunho.lever} onChange={definir('lever')} />

              {editando ? (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Canal principal</Label>
                  <Select value={rascunho.primary_channel} onValueChange={definir('primary_channel')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERACTION_CHANNELS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <LinhaDeLeitura label="Canal principal" valor={getChannelLabel(prospect.primary_channel)} />
              )}

              {editando ? (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <Select value={rascunho.owner_id} onValueChange={definir('owner_id')}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {diretorio.map((pessoa) => (
                        <SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <LinhaDeLeitura
                  label="Responsável"
                  valor={diretorio.find((p) => p.id === prospect.owner_id)?.nome ?? null}
                />
              )}

              <LinhaDeLeitura
                label="1º toque"
                valor={prospect.first_touch_at ? formatarData(prospect.first_touch_at) : null}
              />
            </div>

            {editando && (
              <div className="flex gap-2">
                <Button size="sm" onClick={salvar} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditando(false)} disabled={salvando}>
                  Cancelar
                </Button>
              </div>
            )}
          </section>

          <section aria-label="Atividade" className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
              <h3 className="text-sm font-semibold">Atividades</h3>
              {!somenteLeitura && <RegisterActivityButtons prospect={prospect} />}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ProspectActivityTimeline activities={atividades} isLoading={isLoading} />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  label,
  valor,
  editando,
  draft,
  onChange,
}: {
  label: string;
  valor?: string | null;
  editando: boolean;
  draft?: string;
  onChange: (v: string) => void;
}) {
  if (!editando) return <LinhaDeLeitura label={label} valor={valor ?? null} />;
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={draft ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function LinhaDeLeitura({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-sm">{valor || '—'}</p>
    </div>
  );
}

function rascunhoInicial(prospect: ProspectWithCompany): Record<string, string> {
  const empresa = prospect.company;
  return {
    company_name: empresa?.name ?? '',
    company_cnpj: empresa?.cnpj ?? '',
    company_linkedin: empresa?.linkedin_url ?? '',
    company_website: empresa?.website ?? '',
    company_segment: empresa?.segment ?? '',
    company_ring: empresa?.ring ?? '',
    company_tier: empresa?.tier ?? '',
    contact_name: prospect.contact_name,
    contact_role: prospect.contact_role ?? '',
    contact_email: prospect.contact_email ?? '',
    contact_phone: prospect.contact_phone ?? '',
    linkedin_url: prospect.linkedin_url ?? '',
    primary_channel: prospect.primary_channel,
    owner_id: prospect.owner_id ?? '',
    lever: prospect.lever ?? '',
  };
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
