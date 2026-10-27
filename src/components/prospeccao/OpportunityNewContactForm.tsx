import { useState, type Dispatch, type SetStateAction } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProspectContact, useProspectContactDuplicate } from '@/hooks/useProspectContacts';
import { useAddOpportunityContact } from '@/hooks/useProspects';
import { cn } from '@/lib/utils';
import { opportunityName, type ProspectContactWithCompany, type ProspectWithCompany } from '@/types/prospect';

type CampoDaPessoa = 'name' | 'role' | 'email' | 'phone' | 'linkedin_url';

const CAMPOS_DA_PESSOA: ReadonlyArray<{ campo: CampoDaPessoa; rotulo: string; tipo?: string }> = [
  { campo: 'name', rotulo: 'Nome' },
  { campo: 'role', rotulo: 'Cargo' },
  { campo: 'email', rotulo: 'E-mail', tipo: 'email' },
  { campo: 'phone', rotulo: 'Telefone' },
  { campo: 'linkedin_url', rotulo: 'LinkedIn' },
];

interface NovoContatoDaOportunidadeProps {
  prospect: ProspectWithCompany;
  nomeInicial?: string;
  /** Já existe alguém com o e-mail ou LinkedIn: quem chamou decide como incluir essa pessoa. */
  onUsarExistente: (contato: ProspectContactWithCompany) => void;
  /** A pessoa nova já cadastrada na empresa e incluída na oportunidade. */
  onIncluido: (pessoa: { id: string; name: string }) => void;
  onCancelar: () => void;
  /** Dentro do cartão de Contatos: título próprio e campos baixos. Sem ele, o diálogo dá o título. */
  compacto?: boolean;
}

/**
 * Cadastra a pessoa nova já na empresa da oportunidade e a inclui nela, com a mesma
 * deduplicação por e-mail e LinkedIn. Serve ao "Incluir" do cartão de Contatos e, desde
 * 27/10/2026, ao "Novo contato" de quem registra a atividade — a conversa costuma ser com
 * alguém que ainda não está cadastrado.
 */
export function NovoContatoDaOportunidade(props: NovoContatoDaOportunidadeProps) {
  const { prospect, nomeInicial = '', onUsarExistente, onIncluido, onCancelar, compacto = false } = props;
  const criar = useCreateProspectContact();
  const incluir = useAddOpportunityContact();
  const [dados, setDados] = useState<Record<CampoDaPessoa, string>>({
    name: nomeInicial, role: '', email: '', phone: '', linkedin_url: '',
  });
  const duplicado = useProspectContactDuplicate(dados.email, dados.linkedin_url).data ?? null;
  const ocupado = criar.isPending || incluir.isPending;
  const bloqueado = ocupado || !!duplicado || dados.name.trim().length < 2;

  const salvar = async () => {
    const pessoa = await criar.mutateAsync({ ...dados, company_id: prospect.company_id });
    await incluir.mutateAsync({ prospectId: prospect.id, contactId: pessoa.id });
    onIncluido({ id: pessoa.id, name: pessoa.name });
  };

  return (
    <form
      className={compacto ? 'space-y-2' : 'space-y-3'}
      onSubmit={(e) => {
        e.preventDefault();
        salvar().catch(() => undefined);
      }}
    >
      {compacto && <p className="text-xs font-medium">Novo contato em {opportunityName(prospect)}</p>}
      <CamposDaPessoa dados={dados} setDados={setDados} ocupado={ocupado} compacto={compacto} />
      {duplicado && <AvisoDeDuplicado contato={duplicado} onUsar={() => onUsarExistente(duplicado)} />}
      <Rodape compacto={compacto} ocupado={ocupado} bloqueado={bloqueado} onCancelar={onCancelar} />
    </form>
  );
}

interface CamposDaPessoaProps {
  dados: Record<CampoDaPessoa, string>;
  setDados: Dispatch<SetStateAction<Record<CampoDaPessoa, string>>>;
  ocupado: boolean;
  compacto: boolean;
}

function CamposDaPessoa(props: CamposDaPessoaProps) {
  const { dados, setDados, ocupado, compacto } = props;
  return (
    <>
      {CAMPOS_DA_PESSOA.map(({ campo, rotulo, tipo }, indice) => (
        <div key={campo} className="space-y-1">
          <Label htmlFor={`novo-contato-${campo}`} className="text-xs text-muted-foreground">{rotulo}</Label>
          <Input
            id={`novo-contato-${campo}`}
            type={tipo}
            // No diálogo o cursor já começa no nome, o primeiro campo.
            autoFocus={!compacto && indice === 0}
            value={dados[campo]}
            onChange={(e) => setDados((atual) => ({ ...atual, [campo]: e.target.value }))}
            disabled={ocupado}
            className={cn(compacto && 'h-8')}
          />
        </div>
      ))}
    </>
  );
}

/** No cartão, salvar vem primeiro, como nos outros cartões; no diálogo, cancelar à esquerda. */
function Rodape(props: { compacto: boolean; ocupado: boolean; bloqueado: boolean; onCancelar: () => void }) {
  const { compacto, ocupado, bloqueado, onCancelar } = props;
  const cancelar = <BotaoCancelar onClick={onCancelar} disabled={ocupado} />;
  return (
    <div className={cn('flex gap-2', !compacto && 'justify-end pt-1')}>
      {!compacto && cancelar}
      <Button type="submit" size="sm" disabled={bloqueado}>
        {ocupado && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        Cadastrar e incluir
      </Button>
      {compacto && cancelar}
    </div>
  );
}

function BotaoCancelar(props: { onClick: () => void; disabled: boolean }) {
  const { onClick, disabled } = props;
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      Cancelar
    </Button>
  );
}

/** A deduplicação vale aqui também: quem já usa o e-mail ou LinkedIn é incluído, não recriado. */
function AvisoDeDuplicado(props: { contato: ProspectContactWithCompany; onUsar: () => void }) {
  const { contato, onUsar } = props;
  return (
    <div role="alert" className="space-y-1.5 rounded-md border border-warning/40 bg-warning-subtle p-2 text-xs text-warning-emphasis">
      <p>
        Já existe <span className="font-medium">{contato.name}</span>
        {contato.company?.name && <> ({contato.company.name})</>} com este e-mail ou LinkedIn.
      </p>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onUsar}>
        Incluir este contato
      </Button>
    </div>
  );
}
