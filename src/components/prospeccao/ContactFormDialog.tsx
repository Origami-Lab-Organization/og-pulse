import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useCreateProspectCompany } from '@/hooks/useProspectCompanies';
import { useCreateProspectContact, useProspectContactDuplicate } from '@/hooks/useProspectContacts';
import { useSaveCompanyReceita } from '@/hooks/useCompanyReceita';
import { toast } from '@/hooks/use-toast';
import type { ProspectContactWithCompany } from '@/types/prospect';
import { ProspectContactSelect } from './ProspectContactSelect';
import {
  CampoDeTexto,
  schema,
  SecaoDaEmpresa,
  useEmpresaNova,
  validarEmpresa,
  type EmpresaNova,
  type ErroDeValidacao,
  type FormData,
  type Formulario,
} from './ProspectFormFields';

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Escolheu quem já existe — a tela abre a ficha dele em vez de duplicar. */
  onExistingContact?: (contato: ProspectContactWithCompany) => void;
}

/**
 * Cadastro de contato (01/10/2026, ADR-0045), na tela Contatos. Começa pela pessoa, como o
 * cadastro de empresa começa pela empresa: quem já existe aparece para ser escolhido, e só quem
 * não está cadastrado ganha os campos de pessoa. O contato fica no cadastro, fora do Pipeline,
 * até alguém incluí-lo numa oportunidade (09/10/2026: a oportunidade é da empresa).
 */
export function ContactFormDialog(props: ContactFormDialogProps) {
  const { open, onOpenChange } = props;
  const cadastro = useCadastroDeContato(props);
  const { form, salvando, cadastrandoPessoa } = cadastro;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo contato</DialogTitle>
          <DialogDescription>
            Busque antes de cadastrar: quem já existe aparece na lista. O contato fica em Contatos, fora do Pipeline.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="contact-form" onSubmit={form.handleSubmit(cadastro.enviar)} className="space-y-4">
            <div className="space-y-2">
              <FormLabel>Contato</FormLabel>
              <ProspectContactSelect
                value={null}
                onChange={cadastro.escolherExistente}
                onCreateNew={cadastro.iniciarCadastro}
                disabled={salvando}
              />
              {cadastro.erro && <p role="alert" className="text-sm font-medium text-destructive">{cadastro.erro}</p>}
            </div>
            {cadastrandoPessoa && <SecaoDaPessoaNova cadastro={cadastro} />}
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" form="contact-form" disabled={salvando || !cadastrandoPessoa}>
            {salvando ? 'Salvando...' : 'Cadastrar contato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Estado e escrita do cadastro: a pessoa nova e a empresa dela. */
function useCadastroDeContato(props: ContactFormDialogProps) {
  const { open, onOpenChange, onExistingContact } = props;
  const criarEmpresa = useCreateProspectCompany();
  const criarPessoa = useCreateProspectContact();
  const gravarReceita = useSaveCompanyReceita();

  const [cadastrandoPessoa, setCadastrandoPessoa] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { primary_channel: 'email', owner_id: '-' },
  });
  const empresaNova = useEmpresaNova(form);
  const { reiniciar: reiniciarEmpresa } = empresaNova;

  useEffect(() => {
    if (!open) return;
    // Canal e responsável são do negócio, não da pessoa: só preenchem o schema comum.
    form.reset({ primary_channel: 'email', owner_id: '-' });
    setCadastrandoPessoa(false);
    setErro(null);
    reiniciarEmpresa();
  }, [open, form, reiniciarEmpresa]);

  const duplicado =
    useProspectContactDuplicate(
      cadastrandoPessoa ? form.watch('contact_email') ?? '' : '',
      cadastrandoPessoa ? form.watch('linkedin_url') ?? '' : '',
    ).data ?? null;

  // Escolher quem já existe é abrir a ficha — nunca cadastrar de novo.
  const escolherExistente = (contato: ProspectContactWithCompany | null) => {
    if (!contato) return;
    onOpenChange(false);
    onExistingContact?.(contato);
  };

  const iniciarCadastro = (nome: string) => {
    setErro(null);
    setCadastrandoPessoa(true);
    form.setValue('contact_name', nome);
  };

  const enviar = async (values: FormData) => {
    const falha = validarPessoaNova(values, duplicado, empresaNova);
    if (falha) {
      if (falha.campo) form.setError(falha.campo, { message: falha.mensagem });
      else setErro(falha.mensagem);
      return;
    }
    const companyId = empresaNova.empresa?.id ?? (await empresaNova.criar(values, criarEmpresa, gravarReceita));
    const contato = await criarPessoa.mutateAsync(pessoaDoFormulario(values, companyId));
    toast({ title: 'Contato cadastrado', description: `${contato.name} está em Contatos, fora do Pipeline.` });
    onOpenChange(false);
  };

  const salvando = [criarEmpresa, criarPessoa, gravarReceita].some((m) => m.isPending);

  return {
    form,
    cadastrandoPessoa,
    erro,
    duplicado,
    empresaNova,
    salvando,
    escolherExistente,
    iniciarCadastro,
    enviar,
  };
}

type CadastroDeContato = ReturnType<typeof useCadastroDeContato>;

/** Os services aparam e trocam vazio por nulo: aqui só se diz o que vai para onde. */
function pessoaDoFormulario(values: FormData, companyId: string) {
  return {
    company_id: companyId,
    name: values.contact_name ?? '',
    role: values.contact_role,
    email: values.contact_email,
    phone: values.contact_phone,
    linkedin_url: values.linkedin_url,
    instagram_url: values.instagram_url,
  };
}

function SecaoDaPessoaNova({ cadastro }: { cadastro: CadastroDeContato }) {
  const { form, duplicado } = cadastro;
  return (
    <>
      <SecaoDaEmpresa form={form} empresaNova={cadastro.empresaNova} disabled={cadastro.salvando} />
      <Separator />
      <p className="text-sm font-medium">Dados do contato</p>
      <CamposDaPessoa form={form} />
      {duplicado && (
        <AvisoDeDuplicado contato={duplicado} onUsar={() => cadastro.escolherExistente(duplicado)} />
      )}
    </>
  );
}

function CamposDaPessoa({ form }: { form: Formulario }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CampoDeTexto form={form} name="contact_name" label="Nome" />
      <CampoDeTexto form={form} name="contact_role" label="Cargo" />
      <CampoDeTexto form={form} name="contact_email" label="E-mail" tipo="email" descricao="E-mail ou LinkedIn evitam contato duplicado." />
      <CampoDeTexto form={form} name="contact_phone" label="Telefone" />
      <CampoDeTexto form={form} name="linkedin_url" label="LinkedIn do contato" />
      <CampoDeTexto form={form} name="instagram_url" label="Instagram do contato" placeholder="@contato ou link do perfil" />
    </div>
  );
}

function AvisoDeDuplicado({ contato, onUsar }: { contato: ProspectContactWithCompany; onUsar: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle p-3 text-xs text-warning-emphasis">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-2">
        <p>
          Já existe um contato com este e-mail ou LinkedIn: <span className="font-medium">{contato.name}</span>
          {contato.company?.name && <> ({contato.company.name})</>}.
        </p>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onUsar}>
          Abrir este contato
        </Button>
      </div>
    </div>
  );
}

/**
 * A pessoa nova precisa de nome e empresa, e o e-mail ou o LinkedIn não podem ser de outra
 * pessoa: deixar passar quebraria a deduplicação, que é o motivo de o cadastro existir.
 */
function validarPessoaNova(
  values: FormData,
  duplicado: ProspectContactWithCompany | null,
  empresaNova: EmpresaNova,
): ErroDeValidacao | null {
  if ((values.contact_name ?? '').trim().length < 2) {
    return { campo: 'contact_name', mensagem: 'Informe o nome do contato' };
  }
  if (duplicado) {
    return { campo: 'contact_email', mensagem: 'Já existe um contato com este e-mail ou LinkedIn. Use o existente.' };
  }
  return validarEmpresa(values, empresaNova);
}
