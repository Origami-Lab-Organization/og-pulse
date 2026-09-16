import { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Clock,
  Globe,
  Linkedin,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { iniciaisDe } from '@/lib/prospecting/iniciais';
import { formatCNPJ } from '@/lib/masks';
import { cn } from '@/lib/utils';
import {
  canConvertToLead,
  getDiscardReasonLabel,
  getProspectStageColor,
  getProspectStageLabel,
  isProspectReadOnly,
  type ProspectCompanyDB,
  type ProspectWithCompany,
} from '@/types/prospect';
import { ProspectActivityTimeline } from './ProspectActivityTimeline';
import { ProspectStageStepper } from './ProspectStageStepper';
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
  const respostas = atividades.filter((a) => a.got_response).length;
  const ultima = atividades[0]?.activity_date ?? null;
  const responsavel = diretorio.find((p) => p.id === prospect.owner_id)?.nome ?? null;

  const salvar = async () => {
    if (empresa) {
      await atualizarEmpresa.mutateAsync({ id: empresa.id, input: empresaDoRascunho(rascunho, empresa) });
    }
    await atualizarContato.mutateAsync({ id: prospect.id, updates: contatoDoRascunho(rascunho, prospect) });
    setEditando(false);
  };

  const definir = (campo: string) => (valor: string) =>
    setRascunho((atual) => ({ ...atual, [campo]: valor }));

  const abrirEdicao = () => setEditando(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-4 border-b p-4 pr-24 text-left sm:pr-24">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {iniciaisDe(prospect.contact_name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg leading-tight">{prospect.contact_name}</DialogTitle>
                <Badge variant="secondary" className={getProspectStageColor(prospect.stage)}>
                  {getProspectStageLabel(prospect.stage)}
                </Badge>
                {somenteLeitura && <Badge variant="outline">Somente leitura</Badge>}
              </div>

              <DialogDescription className="text-xs">
                {[
                  empresa?.name ?? 'Empresa não informada',
                  prospect.contact_role,
                  `${prospect.activity_count} ${prospect.activity_count === 1 ? 'atividade' : 'atividades'}`,
                  ultima ? `último em ${formatarData(ultima)}` : null,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </DialogDescription>

              {prospect.stage === 'descartado' && (
                <p className="text-xs text-muted-foreground">
                  Motivo do descarte: {getDiscardReasonLabel(prospect.discard_reason)}
                </p>
              )}
            </div>

            <AcoesDoContato
              className="absolute right-12 top-3"
              prospect={prospect}
              somenteLeitura={somenteLeitura}
              editando={editando}
              onEditar={() => setEditando((v) => !v)}
              onConverter={() => onConvert(prospect)}
              onDescartar={() => onDiscard(prospect)}
              onReabrir={() => reabrir.mutate({ id: prospect.id })}
              onExcluir={() => {
                excluir.mutate({ id: prospect.id });
                onOpenChange(false);
              }}
            />
          </div>

          <ProspectStageStepper stage={prospect.stage} />
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,370px)_1fr]">
          <section
            aria-label="Informação"
            className="min-h-0 space-y-3 overflow-y-auto border-b bg-muted/20 p-4 md:border-b-0 md:border-r"
          >
            <Indicadores
              atividades={prospect.activity_count}
              respostas={respostas}
              proxima={prospect.next_activity_on}
            />

            <CartaoEmpresa
              empresa={empresa}
              editando={editando}
              rascunho={rascunho}
              definir={definir}
              podeEditar={!somenteLeitura}
              onEditar={abrirEdicao}
            />

            <CartaoContato
              prospect={prospect}
              responsavel={responsavel}
              diretorio={diretorio}
              editando={editando}
              rascunho={rascunho}
              definir={definir}
              podeEditar={!somenteLeitura}
              onEditar={abrirEdicao}
            />

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
            <div className="space-y-3 p-4">
              <ProximoPasso
                proxima={prospect.next_activity_on}
                numero={prospect.activity_count + 1}
                responsavel={responsavel}
                encerrado={somenteLeitura}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  Atividades
                  <Badge variant="secondary">{atividades.length}</Badge>
                </h3>
                {!somenteLeitura && <RegisterActivityButtons prospect={prospect} />}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <ProspectActivityTimeline
                prospect={prospect}
                activities={atividades}
                isLoading={isLoading}
              />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AcoesDoContato({
  className,
  prospect,
  somenteLeitura,
  editando,
  onEditar,
  onConverter,
  onDescartar,
  onReabrir,
  onExcluir,
}: {
  className?: string;
  prospect: ProspectWithCompany;
  somenteLeitura: boolean;
  editando: boolean;
  onEditar: () => void;
  onConverter: () => void;
  onDescartar: () => void;
  onReabrir: () => void;
  onExcluir: () => void;
}) {
  const encerrado = prospect.stage === 'descartado' || prospect.stage === 'sem_resposta';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('shrink-0', className)} aria-label="Ações do contato">
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!somenteLeitura && (
          <DropdownMenuItem onSelect={onEditar}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            {editando ? 'Cancelar edição' : 'Editar'}
          </DropdownMenuItem>
        )}
        {canConvertToLead(prospect) && (
          <DropdownMenuItem onSelect={onConverter}>
            <ArrowRightLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Converter em oportunidade
          </DropdownMenuItem>
        )}
        {!somenteLeitura && prospect.stage !== 'descartado' && (
          <DropdownMenuItem onSelect={onDescartar}>
            <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Descartar
          </DropdownMenuItem>
        )}
        {encerrado && (
          <DropdownMenuItem onSelect={onReabrir}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reabrir
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onExcluir}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Excluir contato
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Os três números que respondem "como esta conversa vai indo" sem descer à linha do tempo.
 *
 * O terceiro é a PRÓXIMA data, não uma contagem de reuniões: reunião não é dado que o
 * módulo guarda, e exibir um contador que nada alimenta seria um número decorativo.
 */
function Indicadores({
  atividades,
  respostas,
  proxima,
}: {
  atividades: number;
  respostas: number;
  proxima: string | null;
}) {
  const itens = [
    { rotulo: 'Atividades', valor: String(atividades) },
    { rotulo: 'Respostas', valor: String(respostas) },
    { rotulo: 'Próxima', valor: proxima ? formatarDataCurta(proxima) : '—' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {itens.map((item) => (
        <div key={item.rotulo} className="rounded-lg border bg-card p-3">
          <p className="text-xl font-semibold leading-none">{item.valor}</p>
          <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {item.rotulo}
          </p>
        </div>
      ))}
    </div>
  );
}

/** A próxima data em destaque: é o que decide se este contato entra no dia de hoje. */
function ProximoPasso({
  proxima,
  numero,
  responsavel,
  encerrado,
}: {
  proxima: string | null;
  numero: number;
  responsavel: string | null;
  encerrado: boolean;
}) {
  if (!proxima || encerrado) return null;

  const dias = diasAte(proxima);
  const atrasado = dias < 0;

  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-lg border p-3',
        atrasado
          ? 'border-destructive/30 bg-destructive/10'
          : 'border-warning/30 bg-warning-subtle',
      )}
    >
      <Clock
        className={cn('mt-0.5 h-4 w-4 shrink-0', atrasado ? 'text-destructive' : 'text-warning-emphasis')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', atrasado ? 'text-destructive' : 'text-warning-emphasis')}>
          Próximo passo: registrar a atividade nº {numero}
        </p>
        <p className="text-xs text-muted-foreground">
          {atrasado ? 'Venceu' : 'Vence'} em {formatarData(proxima)} · {descreverPrazo(dias)}
          {responsavel ? ` · responsável ${responsavel}` : ''}
        </p>
      </div>
    </div>
  );
}

function CartaoEmpresa({
  empresa,
  editando,
  rascunho,
  definir,
  podeEditar,
  onEditar,
}: {
  empresa?: ProspectCompanyDB | null;
  editando: boolean;
  rascunho: Record<string, string>;
  definir: (campo: string) => (valor: string) => void;
  podeEditar: boolean;
  onEditar: () => void;
}) {
  const chips = [empresa?.segment, empresa?.ring && `Anel ${empresa.ring}`, empresa?.tier && `Tier ${empresa.tier}`]
    .filter(Boolean) as string[];

  return (
    <section className="rounded-lg border bg-card p-3">
      <CabecalhoDoCartao titulo="Empresa" podeEditar={podeEditar && !editando} onEditar={onEditar} />

      {editando ? (
        <div className="space-y-3">
          <Campo label="Nome" draft={rascunho.company_name} onChange={definir('company_name')} />
          <Campo label="CNPJ" draft={rascunho.company_cnpj} onChange={definir('company_cnpj')} />
          <Campo label="LinkedIn" draft={rascunho.company_linkedin} onChange={definir('company_linkedin')} />
          <Campo label="Site" draft={rascunho.company_website} onChange={definir('company_website')} />
          <Campo label="Segmento" draft={rascunho.company_segment} onChange={definir('company_segment')} />
          <Campo label="Anel" draft={rascunho.company_ring} onChange={definir('company_ring')} />
          <Campo label="Tier" draft={rascunho.company_tier} onChange={definir('company_tier')} />
          <p className="text-xs text-muted-foreground">
            Os campos da empresa valem para todos os contatos dela.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium leading-snug">{empresa?.name ?? 'Empresa não informada'}</p>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <Badge key={chip} variant="secondary" className="font-normal">{chip}</Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <LinkExterno href={empresa?.website} icone={Globe} rotulo={textoDeSite(empresa?.website)} />
            <LinkExterno href={empresa?.linkedin_url} icone={Linkedin} rotulo="LinkedIn" />
          </div>

          <Separator />

          <CampoOpcional
            label="CNPJ"
            valor={empresa?.cnpj ? formatCNPJ(empresa.cnpj) : null}
            acao="Adicionar CNPJ"
            podeEditar={podeEditar}
            onEditar={onEditar}
          />
        </div>
      )}
    </section>
  );
}

function CartaoContato({
  prospect,
  responsavel,
  diretorio,
  editando,
  rascunho,
  definir,
  podeEditar,
  onEditar,
}: {
  prospect: ProspectWithCompany;
  responsavel: string | null;
  diretorio: Array<{ id: string; nome: string }>;
  editando: boolean;
  rascunho: Record<string, string>;
  definir: (campo: string) => (valor: string) => void;
  podeEditar: boolean;
  onEditar: () => void;
}) {
  return (
    <section className="rounded-lg border bg-card p-3">
      <CabecalhoDoCartao titulo="Contato" podeEditar={podeEditar && !editando} onEditar={onEditar} />

      {editando ? (
        <div className="space-y-3">
          <Campo label="Nome" draft={rascunho.contact_name} onChange={definir('contact_name')} />
          <Campo label="Cargo" draft={rascunho.contact_role} onChange={definir('contact_role')} />
          <Campo label="E-mail" draft={rascunho.contact_email} onChange={definir('contact_email')} />
          <Campo label="Telefone" draft={rascunho.contact_phone} onChange={definir('contact_phone')} />
          <Campo label="LinkedIn" draft={rascunho.linkedin_url} onChange={definir('linkedin_url')} />
          <Campo label="Alavanca / origem" draft={rascunho.lever} onChange={definir('lever')} />

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
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{prospect.contact_name}</p>
            {prospect.contact_role && (
              <p className="text-xs text-muted-foreground">{prospect.contact_role}</p>
            )}
          </div>

          {prospect.linkedin_url && (
            <LinkExterno href={prospect.linkedin_url} icone={Linkedin} rotulo="Perfil no LinkedIn" />
          )}

          <CampoOpcional
            label="E-mail"
            valor={prospect.contact_email}
            acao="Adicionar e-mail"
            podeEditar={podeEditar}
            onEditar={onEditar}
          />
          <CampoOpcional
            label="Telefone"
            valor={prospect.contact_phone}
            acao="Adicionar telefone"
            podeEditar={podeEditar}
            onEditar={onEditar}
          />

          <Separator />

          <dl className="grid grid-cols-3 gap-2">
            <Resumo termo="Alavanca" valor={prospect.lever} />
            <Resumo termo="Canal principal" valor={getChannelLabel(prospect.primary_channel)} />
            <Resumo termo="Responsável" valor={responsavel} />
          </dl>

          {prospect.first_touch_at && (
            <p className="text-xs text-muted-foreground">
              1º toque em {formatarData(prospect.first_touch_at)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function CabecalhoDoCartao({
  titulo,
  podeEditar,
  onEditar,
}: {
  titulo: string;
  podeEditar: boolean;
  onEditar: () => void;
}) {
  return (
    <header className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {podeEditar && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEditar}>
          Editar
        </Button>
      )}
    </header>
  );
}

/**
 * Campo vazio não vira traço mudo: vira o convite para preencher.
 *
 * O botão não cria caminho novo de escrita — abre a mesma edição do cartão. É só o
 * atalho para o campo que está faltando, que é onde a pessoa já estava olhando.
 */
function CampoOpcional({
  label,
  valor,
  acao,
  podeEditar,
  onEditar,
}: {
  label: string;
  valor?: string | null;
  acao: string;
  podeEditar: boolean;
  onEditar: () => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {valor ? (
        <p className="break-words text-sm">{valor}</p>
      ) : podeEditar ? (
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-normal" onClick={onEditar}>
          <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
          {acao}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

function Resumo({ termo, valor }: { termo: string; valor?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{termo}</dt>
      <dd className="break-words text-sm leading-snug">{valor || '—'}</dd>
    </div>
  );
}

function LinkExterno({
  href,
  icone: Icone,
  rotulo,
}: {
  href?: string | null;
  icone: typeof Globe;
  rotulo: string;
}) {
  if (!href) return null;
  return (
    <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-normal" asChild>
      <a href={comProtocolo(href)} target="_blank" rel="noopener noreferrer">
        <Icone className="mr-1 h-3 w-3" aria-hidden="true" />
        {rotulo}
      </a>
    </Button>
  );
}

function Campo({
  label,
  draft,
  onChange,
}: {
  label: string;
  draft?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={draft ?? ''} onChange={(e) => onChange(e.target.value)} />
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

function empresaDoRascunho(rascunho: Record<string, string>, empresa: ProspectCompanyDB) {
  return {
    name: rascunho.company_name || empresa.name,
    cnpj: rascunho.company_cnpj || null,
    linkedin_url: rascunho.company_linkedin || null,
    website: rascunho.company_website || null,
    segment: rascunho.company_segment || null,
    ring: rascunho.company_ring || null,
    tier: rascunho.company_tier || null,
    client_id: empresa.client_id,
    notes: empresa.notes,
  };
}

function contatoDoRascunho(rascunho: Record<string, string>, prospect: ProspectWithCompany) {
  return {
    contact_name: rascunho.contact_name || prospect.contact_name,
    contact_role: rascunho.contact_role || null,
    contact_email: rascunho.contact_email || null,
    contact_phone: rascunho.contact_phone || null,
    linkedin_url: rascunho.linkedin_url || null,
    primary_channel: rascunho.primary_channel || prospect.primary_channel,
    owner_id: rascunho.owner_id || prospect.owner_id,
    lever: rascunho.lever || null,
  };
}

function comProtocolo(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function textoDeSite(url?: string | null): string {
  if (!url) return 'Site';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function diasAte(iso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

function descreverPrazo(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'há 1 dia';
  if (dias > 1) return `${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}
