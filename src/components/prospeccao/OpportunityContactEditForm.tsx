import { useState, type Dispatch, type SetStateAction } from 'react';
import { Loader2, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProspectContactDuplicate, useUpdateProspectContact } from '@/hooks/useProspectContacts';
import { useRemoveOpportunityContact } from '@/hooks/useProspects';
import type { ProspectOpportunityContact } from '@/types/prospect';

type Pessoa = NonNullable<ProspectOpportunityContact['contact']>;
type CampoEditavel = 'name' | 'role' | 'email' | 'phone' | 'linkedin_url' | 'instagram_url';

const CAMPOS: ReadonlyArray<{ campo: CampoEditavel; rotulo: string; tipo?: string }> = [
  { campo: 'name', rotulo: 'Nome' },
  { campo: 'role', rotulo: 'Cargo' },
  { campo: 'email', rotulo: 'E-mail', tipo: 'email' },
  { campo: 'phone', rotulo: 'Telefone', tipo: 'tel' },
  { campo: 'linkedin_url', rotulo: 'LinkedIn' },
  { campo: 'instagram_url', rotulo: 'Instagram' },
];

const NOME_MINIMO = 2;
const CAMPO_DO_NOME: CampoEditavel = 'name';
const TECLA_DE_FECHAR = 'Escape';

type DadosDoContato = Record<CampoEditavel, string>;

interface OpportunityContactEditFormProps {
  prospectId: string;
  pessoa: Pessoa;
  onFechar: () => void;
}

const nomeValido = (dados: DadosDoContato) => dados.name.trim().length >= NOME_MINIMO;

/**
 * Editar o contato dentro da ficha da oportunidade (26/11/2026).
 *
 * Os dados são do cadastro da pessoa — valem para todas as oportunidades em que ela está, e o
 * formulário avisa isso. E-mail e LinkedIn seguem a mesma deduplicação do cadastro, ignorando
 * a própria pessoa. Retirar da oportunidade só existe aqui, na edição: na leitura não há um X
 * à mão para tirar alguém por engano. Retirar não apaga a pessoa nem as atividades com ela.
 */
export function OpportunityContactEditForm(props: OpportunityContactEditFormProps) {
  const { prospectId, pessoa, onFechar } = props;
  const atualizar = useUpdateProspectContact();
  const retirar = useRemoveOpportunityContact();
  const [dados, setDados] = useState<DadosDoContato>(() => dadosIniciais(pessoa));
  const duplicado = useProspectContactDuplicate(dados.email, dados.linkedin_url, pessoa.id).data ?? null;
  const ocupado = atualizar.isPending || retirar.isPending;
  const bloqueado = ocupado || !!duplicado || !nomeValido(dados);

  const salvar = () => {
    if (!bloqueado) atualizar.mutate({ id: pessoa.id, input: dados }, { onSuccess: onFechar });
  };

  return (
    <form
      aria-label={`Editar ${pessoa.name}`}
      // Esc aqui cancela só a edição: a ficha não fecha (ver onEscapeKeyDown do diálogo).
      data-esc-local
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
      onKeyDown={(e) => {
        if (e.key !== TECLA_DE_FECHAR || ocupado) return;
        e.stopPropagation();
        onFechar();
      }}
    >
      <CamposDoContato idBase={`contato-${pessoa.id}`} dados={dados} setDados={setDados} ocupado={ocupado} />
      {duplicado && <AvisoDeDuplicado nome={duplicado.name} empresa={duplicado.company?.name} />}
      <p className="text-xs text-muted-foreground">
        As mudanças valem para todas as oportunidades em que {pessoa.name} participa.
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={bloqueado}>
          {atualizar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Salvar contato
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onFechar} disabled={ocupado}>
          Cancelar
        </Button>
      </div>
      <RetirarDaOportunidade
        retirando={retirar.isPending}
        ocupado={ocupado}
        onRetirar={() => retirar.mutate({ prospectId, contactId: pessoa.id })}
      />
    </form>
  );
}

interface CamposDoContatoProps {
  idBase: string;
  dados: DadosDoContato;
  setDados: Dispatch<SetStateAction<DadosDoContato>>;
  ocupado: boolean;
}

function CamposDoContato(props: CamposDoContatoProps) {
  const { idBase, dados, setDados, ocupado } = props;
  return (
    <>
      {CAMPOS.map(({ campo, rotulo, tipo }, indice) => (
        <div key={campo} className="space-y-1">
          <Label htmlFor={`${idBase}-${campo}`} className="text-xs text-muted-foreground">{rotulo}</Label>
          <Input
            id={`${idBase}-${campo}`}
            type={tipo}
            autoFocus={indice === 0}
            value={dados[campo]}
            onChange={(e) => setDados((atual) => ({ ...atual, [campo]: e.target.value }))}
            disabled={ocupado}
            aria-invalid={campo === CAMPO_DO_NOME && !nomeValido(dados)}
          />
        </div>
      ))}
    </>
  );
}

function AvisoDeDuplicado(props: { nome: string; empresa?: string | null }) {
  const { nome, empresa } = props;
  return (
    <p role="alert" className="rounded-md border border-warning/40 bg-warning-subtle p-2 text-xs text-warning-emphasis">
      Já existe <span className="font-medium">{nome}</span>
      {empresa && <> ({empresa})</>} com este e-mail ou LinkedIn.
    </p>
  );
}

function RetirarDaOportunidade(props: { retirando: boolean; ocupado: boolean; onRetirar: () => void }) {
  const { retirando, ocupado, onRetirar } = props;
  const Icone = retirando ? Loader2 : UserMinus;
  return (
    <div className="border-t pt-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onRetirar}
        disabled={ocupado}
      >
        <Icone className={retirando ? 'mr-1.5 h-3.5 w-3.5 animate-spin' : 'mr-1.5 h-3.5 w-3.5'} aria-hidden="true" />
        Retirar da oportunidade
      </Button>
      <p className="mt-1 text-xs text-muted-foreground">O contato continua cadastrado, e as atividades com ele também.</p>
    </div>
  );
}

function dadosIniciais(pessoa: Pessoa): DadosDoContato {
  return {
    name: pessoa.name ?? '',
    role: pessoa.role ?? '',
    email: pessoa.email ?? '',
    phone: pessoa.phone ?? '',
    linkedin_url: pessoa.linkedin_url ?? '',
    instagram_url: pessoa.instagram_url ?? '',
  };
}
