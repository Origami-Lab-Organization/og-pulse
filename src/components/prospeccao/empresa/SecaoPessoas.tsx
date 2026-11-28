import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyPartners } from '@/hooks/useCompanyReceita';
import { useTrazerSocio } from '@/hooks/useEstudoDaConta';
import { useUpdateProspectContact } from '@/hooks/useProspectContacts';
import { useAddOpportunityContact, useUpdateOpportunityContactRole } from '@/hooks/useProspects';
import { ORIGEM_DA_PESSOA, SECAO_DA_EMPRESA } from '@/lib/prospecting/faseDaEmpresa.constants';
import { pessoasDaEmpresa } from '@/lib/prospecting/paginaDaEmpresa';
import { cn } from '@/lib/utils';
import { getContactRoleLabel, type ProspectWithCompany } from '@/types/prospect';
import type { ContatoDaPessoa, PessoaDaEmpresa } from '@/types/paginaDaEmpresa';
import { NovoContatoDaOportunidade } from '@/components/prospeccao/OpportunityNewContactForm';
import { OpportunityContactRoleSelect } from '@/components/prospeccao/OpportunityContactRoleSelect';
import { Cartao, EdicaoDoCampo, Secao } from './PecasDaPagina';
import type { EmpresaDaPagina } from './useEmpresaDaPagina';

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const TRACO = <span className="text-muted-foreground">—</span>;
const TH = 'pb-2 pr-3 text-[11.5px] font-semibold text-muted-foreground';
const BOTAO_PEQUENO = 'h-7 text-xs';

/** Cargo de quem o time cadastrou: informado ou corrigido ali mesmo. */
function CargoCadastrado({ contato, podeEditar }: { contato: ContatoDaPessoa; podeEditar: boolean }) {
  const [editando, setEditando] = useState(false);
  const atualizar = useUpdateProspectContact();
  const qc = useQueryClient();
  const salvar = (cargo: string) =>
    atualizar.mutate(
      { id: contato.id, input: { name: contato.name, role: cargo, email: contato.email, phone: contato.phone, linkedin_url: contato.linkedin_url, instagram_url: contato.instagram_url } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: ['prospects'] }) },
    );
  if (editando) return <EdicaoDoCampo rotulo={`Cargo de ${contato.name}`} placeholder="Ex.: Diretor Industrial" valorInicial={contato.role ?? ''} onSalvar={salvar} onSair={() => setEditando(false)} />;
  if (!podeEditar) return contato.role ?? TRACO;
  if (!contato.role) {
    return (
      <button type="button" onClick={() => setEditando(true)} className="inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Informar
      </button>
    );
  }
  return (
    <span className="group inline-flex items-center gap-1.5">
      {contato.role}
      <button type="button" onClick={() => setEditando(true)} aria-label={`Editar o cargo de ${contato.name}`} className="rounded-sm text-muted-foreground opacity-0 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100">
        <Pencil className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

function Cargo({ pessoa, podeEditar }: { pessoa: PessoaDaEmpresa; podeEditar: boolean }) {
  if (pessoa.origem === ORIGEM_DA_PESSOA.CADASTRADA && pessoa.contato) return <CargoCadastrado contato={pessoa.contato} podeEditar={podeEditar} />;
  return <>{pessoa.cargo ?? TRACO}</>;
}

function Papel({ pessoa, oportunidade, podeEditar }: { pessoa: PessoaDaEmpresa; oportunidade: ProspectWithCompany | null; podeEditar: boolean }) {
  const mudar = useUpdateOpportunityContactRole();
  const { vinculo } = pessoa;
  if (!vinculo || !oportunidade) return TRACO;
  if (!podeEditar) return <>{getContactRoleLabel(vinculo.role) ?? TRACO}</>;
  return (
    <OpportunityContactRoleSelect
      value={vinculo.role}
      nome={pessoa.nome}
      disabled={mudar.isPending}
      onChange={(role) => mudar.mutate({ prospectId: oportunidade.id, contactId: vinculo.contact_id, role })}
      className="h-8 w-[150px] text-[13px]"
    />
  );
}

function IncluirNaOportunidade({ contatoId, oportunidade }: { contatoId: string; oportunidade: ProspectWithCompany }) {
  const incluir = useAddOpportunityContact();
  return (
    <Button variant="outline" size="sm" className={BOTAO_PEQUENO} disabled={incluir.isPending} onClick={() => incluir.mutate({ prospectId: oportunidade.id, contactId: contatoId })}>
      Incluir na Oportunidade
    </Button>
  );
}

function VirarContato({ pessoa, oportunidade }: { pessoa: PessoaDaEmpresa; oportunidade: ProspectWithCompany }) {
  const trazer = useTrazerSocio(oportunidade.id);
  const socio = pessoa.socio;
  if (!socio) return null;
  return (
    <Button variant="outline" size="sm" className={BOTAO_PEQUENO} disabled={trazer.isPending} onClick={() => trazer.mutate(socio)}>
      Virar contato
    </Button>
  );
}

function Acao({ pessoa, oportunidade }: { pessoa: PessoaDaEmpresa; oportunidade: ProspectWithCompany }) {
  if (pessoa.socio) return <VirarContato pessoa={pessoa} oportunidade={oportunidade} />;
  if (pessoa.contato && !pessoa.vinculo) return <IncluirNaOportunidade contatoId={pessoa.contato.id} oportunidade={oportunidade} />;
  return null;
}

function Linha(props: { pessoa: PessoaDaEmpresa; oportunidade: ProspectWithCompany | null; podeEditar: boolean }) {
  const { pessoa, oportunidade, podeEditar } = props;
  const daReceita = pessoa.origem === ORIGEM_DA_PESSOA.RECEITA;
  return (
    <tr className="border-t">
      <td className="py-2 pr-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">{iniciais(pessoa.nome)}</span>
          <span className="truncate text-[13px] font-semibold">{pessoa.nome}</span>
        </span>
      </td>
      <td className="py-2 pr-3">
        <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold', daReceita ? 'bg-muted text-muted-foreground' : 'bg-info-subtle text-info-emphasis')}>{pessoa.origem}</span>
      </td>
      <td className="py-2 pr-3 text-[13px]"><Cargo pessoa={pessoa} podeEditar={podeEditar} /></td>
      <td className="py-2 pr-3 text-[13px]"><Papel pessoa={pessoa} oportunidade={oportunidade} podeEditar={podeEditar} /></td>
      <td className="py-2 text-right">{oportunidade && podeEditar && <Acao pessoa={pessoa} oportunidade={oportunidade} />}</td>
    </tr>
  );
}

function NovaPessoa({ oportunidade }: { oportunidade: ProspectWithCompany }) {
  const [aberto, setAberto] = useState(false);
  const incluir = useAddOpportunityContact();
  return (
    <>
      <Button variant="outline" size="sm" className="h-8" onClick={() => setAberto(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Pessoa
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nova pessoa</DialogTitle></DialogHeader>
          <NovoContatoDaOportunidade
            prospect={oportunidade}
            onUsarExistente={(c) => incluir.mutate({ prospectId: oportunidade.id, contactId: c.id }, { onSuccess: () => setAberto(false) })}
            onIncluido={() => setAberto(false)}
            onCancelar={() => setAberto(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Tabela({ children }: { children: ReactNode }) {
  return (
    <Cartao className="overflow-x-auto pb-2 pt-3">
      <table className="w-full min-w-[680px] table-fixed text-left">
        <colgroup><col /><col className="w-[150px]" /><col className="w-[200px]" /><col className="w-[180px]" /><col className="w-[190px]" /></colgroup>
        <thead>
          <tr><th className={TH}>Pessoa</th><th className={TH}>Origem</th><th className={TH}>Cargo</th><th className={TH}>Papel</th><th className={TH}><span className="sr-only">Ação</span></th></tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Cartao>
  );
}

/** Pessoas da empresa (US-0053): origem (Receita Federal ou cadastro), cargo e papel na Oportunidade. */
export function SecaoPessoas({ pagina }: { pagina: EmpresaDaPagina }) {
  const { can } = useAuth();
  const podeEditar = can('prospeccao:editar');
  const { ativa, linha, empresaDoPulse, ficha } = pagina;
  const { data: parceiros = [] } = useCompanyPartners(empresaDoPulse?.id ?? null);
  const pessoas = pessoasDaEmpresa({ vinculos: ativa?.contacts ?? [], contatos: linha?.contacts ?? [], parceiros, sociosDaFicha: ficha.data?.socios ?? [] });
  const acao = ativa && podeEditar ? <NovaPessoa oportunidade={ativa} /> : undefined;
  return (
    <Secao id={SECAO_DA_EMPRESA.PESSOAS} titulo="Pessoas" acao={acao}>
      {pessoas.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nenhuma pessoa ainda.</p>
      ) : (
        <Tabela>{pessoas.map((p) => <Linha key={p.chave} pessoa={p} oportunidade={ativa} podeEditar={podeEditar} />)}</Tabela>
      )}
    </Secao>
  );
}
