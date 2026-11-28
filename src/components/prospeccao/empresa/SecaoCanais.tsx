import type { ReactNode } from 'react';
import { Building2, Globe, Instagram, Linkedin, Mail, Pencil, Phone, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCamposDaEmpresa } from '@/hooks/usePaginaDaEmpresa';
import { comProtocolo, urlCurta, urlDoInstagram } from '@/lib/prospecting/links';
import { telefoneDaReceita } from '@/lib/prospecting/paginaDaEmpresa';
import { CAMPO_DA_EMPRESA, SECAO_DA_EMPRESA, type CampoDaEmpresa } from '@/lib/prospecting/faseDaEmpresa.constants';
import { cn } from '@/lib/utils';
import type { ContatoDaFicha } from '@/types/fichaReceita';
import type { CamposDaPagina } from '@/types/paginaDaEmpresa';
import type { ProspectCompanyDB } from '@/types/prospect';
import { FiliaisDaEmpresa } from '@/components/prospeccao/FiliaisDaEmpresa';
import { EdicaoDoCampo, Secao } from './PecasDaPagina';
import { useCampoAberto } from './edicaoDaEmpresa';

const LINK = 'rounded-sm text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const VAZIO = <span className="text-muted-foreground">—</span>;

/** Uma linha do canal: ícone, nome, o valor inteiro e, à direita, a ação. */
function Linha(props: { icone: LucideIcon; nome: string; children: ReactNode; acao?: ReactNode; ancora?: React.Ref<HTMLDivElement>; id?: string }) {
  const { icone: Icone, nome, children, acao, ancora, id } = props;
  return (
    <div ref={ancora} id={id} className="grid min-h-11 grid-cols-[18px_84px_minmax(0,1fr)_32px] items-center gap-2.5 border-t py-1.5 first:border-t-0">
      <Icone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-[13px] text-muted-foreground">{nome}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13.5px] [overflow-wrap:anywhere]">{children}</span>
      <span>{acao}</span>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-4 pb-1.5 pt-2.5">
      <h3 className="mb-0.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h3>
      <div>{children}</div>
    </div>
  );
}

interface CanalEditavelProps {
  campo: CampoDaEmpresa;
  icone: LucideIcon;
  nome: string;
  valor: string | null;
  href: string | null;
  placeholder: string;
  podeEditar: boolean;
  onSalvar: (valor: string) => void;
}

function ValorDoCanal(props: { valor: string | null; href: string | null; podeEditar: boolean; nome: string; onAbrir: () => void }) {
  const { valor, href, podeEditar, nome, onAbrir } = props;
  if (valor && href) return <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>{urlCurta(valor)}</a>;
  if (!podeEditar) return VAZIO;
  return (
    <button type="button" onClick={onAbrir} aria-label={`Adicionar ${nome}`} className="inline-flex items-center gap-1 rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      Adicionar
    </button>
  );
}

/** Site e redes: o link quando existe, "Adicionar" quando falta; o lápis edita ali mesmo. */
function CanalEditavel(props: CanalEditavelProps) {
  const { campo, icone, nome, valor, href, placeholder, podeEditar, onSalvar } = props;
  const { aberto, ancora, abrir, fechar } = useCampoAberto(campo);
  const lapis = podeEditar && valor && !aberto && (
    <button type="button" onClick={abrir} aria-label={`Editar ${nome}`} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
  return (
    <Linha icone={icone} nome={nome} acao={lapis} ancora={ancora} id={`campo-${campo}`}>
      {aberto
        ? <EdicaoDoCampo rotulo={nome} placeholder={placeholder} valorInicial={valor ?? ''} onSalvar={onSalvar} onSair={fechar} />
        : <ValorDoCanal valor={valor} href={href} podeEditar={podeEditar} nome={nome} onAbrir={abrir} />}
    </Linha>
  );
}

function Digital({ empresa, podeEditar }: { empresa: ProspectCompanyDB; podeEditar: boolean }) {
  const salvar = useCamposDaEmpresa();
  const gravar = (campos: CamposDaPagina) => salvar.mutate({ id: empresa.id, campos });
  return (
    <Grupo titulo="Digital">
      <CanalEditavel campo={CAMPO_DA_EMPRESA.SITE} icone={Globe} nome="Site" valor={empresa.website} href={empresa.website ? comProtocolo(empresa.website) : null} placeholder="https://" podeEditar={podeEditar} onSalvar={(v) => gravar({ website: v })} />
      <CanalEditavel campo={CAMPO_DA_EMPRESA.LINKEDIN} icone={Linkedin} nome="LinkedIn" valor={empresa.linkedin_url} href={empresa.linkedin_url ? comProtocolo(empresa.linkedin_url) : null} placeholder="linkedin.com/company/…" podeEditar={podeEditar} onSalvar={(v) => gravar({ linkedin_url: v })} />
      <CanalEditavel campo={CAMPO_DA_EMPRESA.INSTAGRAM} icone={Instagram} nome="Instagram" valor={empresa.instagram_url} href={urlDoInstagram(empresa.instagram_url)} placeholder="@perfil" podeEditar={podeEditar} onSalvar={(v) => gravar({ instagram_url: v })} />
    </Grupo>
  );
}

function EmailDaReceita({ contato }: { contato: ContatoDaFicha | null }) {
  const email = contato?.email?.toLowerCase();
  return <Linha icone={Mail} nome="E-mail">{email ? <a href={`mailto:${email}`} className={LINK}>{email}</a> : VAZIO}</Linha>;
}

function TelefonesDaReceita({ contato }: { contato: ContatoDaFicha | null }) {
  const telefones = [contato?.telefone_1, contato?.telefone_2].filter((t): t is string => !!t);
  const links = telefones.map((t) => <a key={t} href={`tel:+55${t.replace(/\D/g, '')}`} className={cn(LINK, 'mr-2 font-mono tabular-nums')}>{telefoneDaReceita(t)}</a>);
  return <Linha icone={Phone} nome={telefones.length > 1 ? 'Telefones' : 'Telefone'}>{telefones.length ? links : VAZIO}</Linha>;
}

function Receita(props: { contato: ContatoDaFicha | null; empresa: ProspectCompanyDB | null; podeEditar: boolean }) {
  const { contato, empresa, podeEditar } = props;
  return (
    <Grupo titulo="Receita">
      <EmailDaReceita contato={contato} />
      <TelefonesDaReceita contato={contato} />
      {empresa && <Linha icone={Building2} nome="Filiais"><FiliaisDaEmpresa empresa={empresa} podeEditar={podeEditar} /></Linha>}
    </Grupo>
  );
}

/**
 * Canais da empresa (US-0053): o digital, que o time informa ali mesmo, e o que a empresa
 * declarou à Receita, com as filiais.
 */
export function SecaoCanais(props: { empresa: ProspectCompanyDB | null; contato: ContatoDaFicha | null }) {
  const { empresa, contato } = props;
  const { can } = useAuth();
  const podeEditar = can('prospeccao:editar');
  return (
    <Secao id={SECAO_DA_EMPRESA.CANAIS} titulo="Canais">
      <div className={cn('grid rounded-xl border bg-card', empresa && 'md:grid-cols-2 md:divide-x max-md:divide-y')}>
        {empresa && <Digital empresa={empresa} podeEditar={podeEditar} />}
        <Receita contato={contato} empresa={empresa} podeEditar={podeEditar} />
      </div>
    </Secao>
  );
}
