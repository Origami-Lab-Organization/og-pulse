import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormLabel } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useSaveCompanyReceita } from '@/hooks/useCompanyReceita';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useCreateProspectCompany, useProspectCompanies } from '@/hooks/useProspectCompanies';
import { useProspectContacts } from '@/hooks/useProspectContacts';
import { useAddOpportunityContact, useCreateProspect, useProspects } from '@/hooks/useProspects';
import { cn } from '@/lib/utils';
import {
  getProspectStageColor,
  getProspectStageLabel,
  isProspectClosed,
  PROSPECT_CONTACT_ROLES,
  type ProspectContactDB,
  type ProspectContactRole,
  type ProspectContactWithCompany,
  type ProspectWithCompany,
} from '@/types/prospect';
import { OpportunityContactRoleSelect } from './OpportunityContactRoleSelect';
import {
  CamposDaOportunidade,
  schema,
  SecaoDaEmpresa,
  useEmpresaNova,
  validarEmpresa,
  type FormData,
} from './ProspectFormFields';

interface OpportunityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A pessoa de onde se partiu — "Incluir em oportunidade", na ficha do contato. */
  contatoInicial?: ProspectContactWithCompany | null;
  /** Abre a ficha: a recém-criada, ou uma que já existia na empresa. */
  onOpenOpportunity?: (oportunidade: ProspectWithCompany) => void;
}

/** Papel escolhido para cada pessoa marcada; `null` = sem papel. */
type Escolhidos = Map<string, ProspectContactRole | null>;

/**
 * Nova oportunidade (09/10/2026). Começa pela EMPRESA, porque a oportunidade é dela e leva o
 * nome dela; depois, opcionalmente, quem participa — entre as pessoas já cadastradas na
 * empresa, cada uma com um papel. Pessoa nova se cadastra na ficha da oportunidade, que abre
 * logo depois de criar.
 *
 * A empresa pode ter várias oportunidades. Quando já existe uma em andamento, o formulário
 * mostra antes de criar outra — com o atalho para abrir, ou incluir a pessoa nela.
 */
export function OpportunityFormDialog(props: OpportunityFormDialogProps) {
  const { open, onOpenChange } = props;
  const cadastro = useCadastroDeOportunidade(props);
  const { form, empresaNova, salvando } = cadastro;
  const temEmpresa = !!empresaNova.empresa || empresaNova.cadastrando;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
          <DialogDescription>
            A oportunidade é da empresa e entra em “A abordar”. Os contatos podem ser incluídos agora ou depois.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="opportunity-form" onSubmit={form.handleSubmit(cadastro.enviar)} className="space-y-4">
            <CorpoDoFormulario cadastro={cadastro} contatoInicial={props.contatoInicial ?? null} aberto={open} />
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" form="opportunity-form" disabled={salvando || !temEmpresa}>
            {salvando ? 'Salvando...' : 'Criar oportunidade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CadastroDeOportunidade = ReturnType<typeof useCadastroDeOportunidade>;

/** Empresa primeiro; quem participa e o negócio só depois que há empresa. */
function CorpoDoFormulario(props: {
  cadastro: CadastroDeOportunidade;
  contatoInicial: ProspectContactWithCompany | null;
  aberto: boolean;
}) {
  const { cadastro, contatoInicial, aberto } = props;
  const { form, empresaNova, salvando } = cadastro;
  const temEmpresa = !!empresaNova.empresa || empresaNova.cadastrando;

  return (
    <>
      <SecaoDaEmpresa form={form} empresaNova={empresaNova} disabled={salvando} />
      {cadastro.erro && <p role="alert" className="text-sm font-medium text-destructive">{cadastro.erro}</p>}
      <OportunidadesEmAndamento
        oportunidades={cadastro.emAndamento}
        contatoInicial={contatoInicial}
        onAbrir={cadastro.abrir}
        onIncluir={cadastro.incluirNaExistente}
        ocupado={salvando}
      />
      {temEmpresa && (
        <>
          <Separator />
          <ContatosDaEmpresa
            pessoas={cadastro.pessoasDaEmpresa}
            escolhidos={cadastro.escolhidos}
            onAlternar={cadastro.alternar}
            onPapel={cadastro.definirPapel}
            disabled={salvando}
          />
          <Separator />
          <p className="text-sm font-medium">Negócio</p>
          <CamposDaOportunidade form={form} aberto={aberto} />
        </>
      )}
    </>
  );
}

/** Estado e escrita: a empresa, quem participa e o negócio. */
function useCadastroDeOportunidade(props: OpportunityFormDialogProps) {
  const { open, onOpenChange, contatoInicial = null, onOpenOpportunity } = props;
  const { employee } = useAuth();
  const criarEmpresa = useCreateProspectCompany();
  const gravarReceita = useSaveCompanyReceita();
  const criarOportunidade = useCreateProspect();
  const incluirContato = useAddOpportunityContact();
  const { data: empresas = [] } = useProspectCompanies();
  const { data: pessoas = [] } = useProspectContacts();
  const { data: oportunidades = [] } = useProspects();

  const [escolhidos, setEscolhidos] = useState<Escolhidos>(new Map());
  const [erro, setErro] = useState<string | null>(null);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { primary_channel: 'email', owner_id: '' },
  });
  const empresaNova = useEmpresaNova(form);
  const { reiniciar: reiniciarEmpresa, setEmpresa } = empresaNova;

  // A empresa da pessoa de onde se partiu já vem escolhida — uma vez só por abertura: um
  // refetch das empresas não pode desfazer a troca que a pessoa fez no seletor.
  const empresaPreenchida = useRef(false);
  const empresaDoContato = contatoInicial ? empresas.find((e) => e.id === contatoInicial.company_id) ?? null : null;

  useEffect(() => {
    if (!open) return;
    form.reset({ primary_channel: 'email', owner_id: employee?.id ?? '' });
    setErro(null);
    reiniciarEmpresa();
    setEscolhidos(contatoInicial ? new Map([[contatoInicial.id, null]]) : new Map());
    empresaPreenchida.current = false;
  }, [open, employee?.id, contatoInicial, form, reiniciarEmpresa]);

  useEffect(() => {
    if (!open || !empresaDoContato || empresaPreenchida.current) return;
    empresaPreenchida.current = true;
    setEmpresa(empresaDoContato);
  }, [open, empresaDoContato, setEmpresa]);

  const empresaId = empresaNova.empresa?.id ?? null;
  const pessoasDaEmpresa = useMemo(
    () => (empresaId ? pessoas.filter((p) => p.company_id === empresaId) : []),
    [pessoas, empresaId],
  );
  const emAndamento = useMemo(
    () => (empresaId ? oportunidades.filter((o) => o.company_id === empresaId && !isProspectClosed(o.stage)) : []),
    [oportunidades, empresaId],
  );

  const alternar = (id: string, marcado: boolean) =>
    setEscolhidos((atual) => {
      const novo = new Map(atual);
      if (marcado) novo.set(id, null);
      else novo.delete(id);
      return novo;
    });
  const definirPapel = (id: string, papel: ProspectContactRole | null) =>
    setEscolhidos((atual) => new Map(atual).set(id, papel));

  const abrir = (oportunidade: ProspectWithCompany) => {
    onOpenChange(false);
    onOpenOpportunity?.(oportunidade);
  };

  const incluirNaExistente = async (oportunidade: ProspectWithCompany) => {
    if (!contatoInicial) return;
    await incluirContato.mutateAsync({ prospectId: oportunidade.id, contactId: contatoInicial.id });
    abrir(oportunidade);
  };

  const enviar = async (values: FormData) => {
    const falha = validarEmpresa(values, empresaNova);
    if (falha) {
      if (falha.campo) form.setError(falha.campo, { message: falha.mensagem });
      else setErro(falha.mensagem);
      return;
    }
    const companyId = empresaId ?? (await empresaNova.criar(values, criarEmpresa, gravarReceita));
    const criada = await criarOportunidade.mutateAsync(negocioDoFormulario(values, companyId));
    // Só quem está na lista da empresa escolhida: trocar de empresa não leva marcação antiga.
    for (const [contactId, role] of participantes(escolhidos, pessoasDaEmpresa)) {
      await incluirContato.mutateAsync({ prospectId: criada.id, contactId, role });
    }
    abrir(criada);
  };

  const salvando = [criarEmpresa, gravarReceita, criarOportunidade, incluirContato].some((m) => m.isPending);

  return {
    form,
    empresaNova,
    pessoasDaEmpresa,
    emAndamento,
    escolhidos,
    erro,
    salvando,
    alternar,
    definirPapel,
    abrir,
    incluirNaExistente: (o: ProspectWithCompany) => incluirNaExistente(o).catch(() => undefined),
    enviar,
  };
}

/** Decisor primeiro: o primeiro vínculo vira o contato principal da oportunidade. */
function participantes(escolhidos: Escolhidos, pessoasDaEmpresa: ProspectContactDB[]) {
  const validos = new Set(pessoasDaEmpresa.map((p) => p.id));
  const ordem = (role: ProspectContactRole | null) => {
    const i = PROSPECT_CONTACT_ROLES.findIndex((r) => r.value === role);
    return i < 0 ? PROSPECT_CONTACT_ROLES.length : i;
  };
  return [...escolhidos].filter(([id]) => validos.has(id)).sort(([, a], [, b]) => ordem(a) - ordem(b));
}

function negocioDoFormulario(values: FormData, companyId: string) {
  return {
    company_id: companyId,
    primary_channel: values.primary_channel,
    owner_id: values.owner_id,
    lever: values.lever || null,
    estimated_value: values.estimated_value || null,
    notes: values.notes?.trim() || null,
  };
}

/** A empresa já tem oportunidade no funil: mostra antes de abrir outra, sem proibir. */
function OportunidadesEmAndamento(props: {
  oportunidades: ProspectWithCompany[];
  contatoInicial: ProspectContactWithCompany | null;
  onAbrir: (o: ProspectWithCompany) => void;
  onIncluir: (o: ProspectWithCompany) => void;
  ocupado: boolean;
}) {
  const { oportunidades, contatoInicial, onAbrir, onIncluir, ocupado } = props;
  const { byId } = useEmployeeDirectoryMap();
  if (oportunidades.length === 0) return null;

  return (
    <div role="note" className="space-y-2 rounded-md border border-warning/40 bg-warning-subtle p-3 text-xs text-warning-emphasis">
      <p className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {oportunidades.length === 1
          ? 'Esta empresa já tem uma oportunidade em andamento. Se for o mesmo negócio, continue nela.'
          : `Esta empresa já tem ${oportunidades.length} oportunidades em andamento. Se for o mesmo negócio, continue numa delas.`}
      </p>
      <ul className="space-y-1.5">
        {oportunidades.map((o) => {
          const dono = o.owner_id ? byId.get(o.owner_id)?.nome : null;
          const jaEsta = !!contatoInicial && (o.contacts ?? []).some((c) => c.contact_id === contatoInicial.id);
          return (
            <li key={o.id} className="flex flex-wrap items-center gap-2 text-foreground">
              <Badge variant="secondary" className={cn('font-normal', getProspectStageColor(o.stage))}>
                {getProspectStageLabel(o.stage)}
              </Badge>
              <span className="text-muted-foreground">{dono ? `com ${dono}` : 'sem responsável'}</span>
              <span className="ml-auto flex gap-1.5">
                {contatoInicial && !jaEsta && (
                  <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={ocupado} onClick={() => onIncluir(o)}>
                    Incluir {contatoInicial.name} nela
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={ocupado} onClick={() => onAbrir(o)}>
                  Abrir
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** As pessoas da empresa, para marcar quem participa e com que papel. */
function ContatosDaEmpresa(props: {
  pessoas: ProspectContactDB[];
  escolhidos: Escolhidos;
  onAlternar: (id: string, marcado: boolean) => void;
  onPapel: (id: string, papel: ProspectContactRole | null) => void;
  disabled: boolean;
}) {
  const { pessoas, escolhidos, onAlternar, onPapel, disabled } = props;
  return (
    <div className="space-y-2">
      <FormLabel>Contatos <span className="font-normal text-muted-foreground">(opcional)</span></FormLabel>
      {pessoas.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum contato cadastrado nesta empresa. Inclua pessoas na ficha da oportunidade, que abre ao criar.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {pessoas.map((pessoa) => {
            const marcado = escolhidos.has(pessoa.id);
            const idDoCampo = `oportunidade-contato-${pessoa.id}`;
            return (
              <li key={pessoa.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <Checkbox
                  id={idDoCampo}
                  checked={marcado}
                  onCheckedChange={(v) => onAlternar(pessoa.id, v === true)}
                  disabled={disabled}
                />
                <label htmlFor={idDoCampo} className="min-w-0 flex-1 cursor-pointer text-sm">
                  <span className="block truncate font-medium">{pessoa.name}</span>
                  {pessoa.role && <span className="block truncate text-xs text-muted-foreground">{pessoa.role}</span>}
                </label>
                {marcado && (
                  <OpportunityContactRoleSelect
                    value={escolhidos.get(pessoa.id) ?? null}
                    onChange={(papel) => onPapel(pessoa.id, papel)}
                    nome={pessoa.name}
                    disabled={disabled}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
