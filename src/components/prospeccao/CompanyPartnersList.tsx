import { useState } from 'react';
import { Building2, Check, Instagram, Linkedin, Pencil, Phone, Search, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyPartners, usePromotePartner, useUpdatePartner } from '@/hooks/useCompanyReceita';
import { formatCNPJ } from '@/lib/masks';
import { linkedinPeopleSearchUrl } from '@/lib/prospecting/receita';
import type { ProspectCompanyDB } from '@/types/prospect';
import type { ProspectCompanyPartnerDB } from '@/types/receita';

interface CompanyPartnersListProps {
  empresa: ProspectCompanyDB;
  podeEditar: boolean;
}

const SOCIO_EMPRESA: ProspectCompanyPartnerDB['tipo'] = 'empresa';

/**
 * A rede da empresa (29/09/2026): sócios e representantes do QSA da Receita, com o que o
 * time descobre deles — LinkedIn, Instagram e telefone.
 *
 * As redes não são buscadas sozinhas: não há fonte pública, e raspar o LinkedIn violaria
 * os termos dele (ADR-0041). O botão abre a busca de pessoas já filtrada por nome e
 * empresa; quem acha o perfil cola o link. Sócio vira contato só quando alguém escolhe.
 */
export function CompanyPartnersList({ empresa, podeEditar }: CompanyPartnersListProps) {
  const consulta = useCompanyPartners(empresa.id);
  const socios = consulta.data ?? [];
  if (!empresa.receita_consultada_em && socios.length === 0) return null;
  const ativos = socios.filter((s) => s.ativo);
  const antigos = socios.filter((s) => !s.ativo);

  return (
    <div className="mt-3 space-y-2">
      <Separator />
      <h4 className="flex items-center gap-1.5 pt-1 text-xs font-semibold">
        <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        Rede da empresa <span className="font-normal text-muted-foreground">({ativos.length})</span>
      </h4>
      <EstadoDaLista carregando={consulta.isLoading} erro={consulta.isError} vazia={ativos.length === 0} />
      <ul className="space-y-2">
        {ativos.map((socio) => (
          <SocioItem key={socio.id} socio={socio} empresa={empresa} podeEditar={podeEditar} />
        ))}
      </ul>
      {antigos.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Saíram do quadro: {antigos.map((s) => s.nome).join(', ')}.
        </p>
      )}
    </div>
  );
}

function EstadoDaLista(props: { carregando: boolean; erro: boolean; vazia: boolean }) {
  const { carregando, erro, vazia } = props;
  if (carregando) return <Skeleton className="h-16 w-full" />;
  if (erro) return <p className="text-xs text-destructive">Não foi possível carregar os sócios.</p>;
  if (vazia) return <p className="text-xs text-muted-foreground">A Receita não informa sócios para esta empresa.</p>;
  return null;
}

interface SocioItemProps {
  socio: ProspectCompanyPartnerDB;
  empresa: ProspectCompanyDB;
  podeEditar: boolean;
}

function SocioItem(props: SocioItemProps) {
  const { socio, empresa, podeEditar } = props;
  const ehEmpresa = socio.tipo === SOCIO_EMPRESA;
  return (
    <li className="rounded-md border p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium leading-snug">
            {ehEmpresa && <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Sócio empresa" />}
            <span className="break-words">{socio.nome}</span>
          </p>
          <p className="text-xs text-muted-foreground">{descricaoDoSocio(socio)}</p>
          {socio.representante_nome && (
            <p className="text-xs text-muted-foreground">Representante: {socio.representante_nome}</p>
          )}
        </div>
        {jaVirouContato(socio) && (
          <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
            <Check className="h-3 w-3" aria-hidden="true" />
            Contato
          </Badge>
        )}
      </div>
      {!ehEmpresa && <AcoesDoSocio socio={socio} empresa={empresa} podeEditar={podeEditar} />}
    </li>
  );
}

function AcoesDoSocio(props: SocioItemProps) {
  const { socio, empresa, podeEditar } = props;
  const promover = usePromotePartner();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <LinkDeRede href={socio.linkedin_url} icone={Linkedin} rotulo="LinkedIn" />
      <LinkDeRede href={instagramUrl(socio.instagram_url)} icone={Instagram} rotulo="Instagram" />
      {socio.telefone && (
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-normal" asChild>
          <a href={`tel:${socio.telefone.replace(/[^\d+]/g, '')}`}>
            <Phone className="mr-1 h-3 w-3" aria-hidden="true" />
            {socio.telefone}
          </a>
        </Button>
      )}
      {!socio.linkedin_url && (
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-normal" asChild>
          <a href={linkedinPeopleSearchUrl(socio.nome, empresa.nome_fantasia ?? empresa.name)} target="_blank" rel="noopener noreferrer">
            <Search className="mr-1 h-3 w-3" aria-hidden="true" />
            Procurar no LinkedIn
          </a>
        </Button>
      )}
      {podeEditar && <EditarRedes socio={socio} />}
      {podeEditar && !jaVirouContato(socio) && (
        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => promover.mutate(socio)} disabled={promover.isPending}>
          <UserPlus className="mr-1 h-3 w-3" aria-hidden="true" />
          Virar contato
        </Button>
      )}
    </div>
  );
}

function EditarRedes({ socio }: { socio: ProspectCompanyPartnerDB }) {
  const salvar = useUpdatePartner();
  const [aberto, setAberto] = useState(false);
  const [campos, setCampos] = useState({ linkedin_url: '', instagram_url: '', telefone: '' });

  const abrir = (v: boolean) => {
    if (v) {
      setCampos({
        linkedin_url: socio.linkedin_url ?? '',
        instagram_url: socio.instagram_url ?? '',
        telefone: socio.telefone ?? '',
      });
    }
    setAberto(v);
  };
  const definir = (campo: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCampos((atual) => ({ ...atual, [campo]: e.target.value }));

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" aria-label={`Editar redes de ${socio.nome}`}>
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="end">
        <p className="text-xs text-muted-foreground">Cole o que achou. Vale só para este sócio.</p>
        <Campo id={`li-${socio.id}`} label="LinkedIn" valor={campos.linkedin_url} onChange={definir('linkedin_url')} />
        <Campo id={`ig-${socio.id}`} label="Instagram" valor={campos.instagram_url} onChange={definir('instagram_url')} />
        <Campo id={`tel-${socio.id}`} label="Telefone" valor={campos.telefone} onChange={definir('telefone')} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setAberto(false)}>Cancelar</Button>
          <Button
            size="sm"
            disabled={salvar.isPending}
            onClick={() => salvar.mutate({ partner: socio, campos }, { onSuccess: () => setAberto(false) })}
          >
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface CampoProps {
  id: string;
  label: string;
  valor: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Campo(props: CampoProps) {
  const { id, label, valor, onChange } = props;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} value={valor} maxLength={300} onChange={onChange} className="h-8" />
    </div>
  );
}

interface LinkDeRedeProps {
  href: string | null;
  icone: typeof Linkedin;
  rotulo: string;
}

function LinkDeRede(props: LinkDeRedeProps) {
  const { href, icone: Icone, rotulo } = props;
  if (!href) return null;
  return (
    <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-normal" asChild>
      <a href={/^https?:\/\//i.test(href) ? href : `https://${href}`} target="_blank" rel="noopener noreferrer">
        <Icone className="mr-1 h-3 w-3" aria-hidden="true" />
        {rotulo}
      </a>
    </Button>
  );
}

function descricaoDoSocio(socio: ProspectCompanyPartnerDB): string {
  const desde = socio.data_entrada ? `desde ${socio.data_entrada.slice(0, 4)}` : null;
  const cnpj = socio.tipo === SOCIO_EMPRESA && socio.cnpj ? formatCNPJ(socio.cnpj) : null;
  return [socio.qualificacao, desde, cnpj].filter(Boolean).join(' · ');
}

function instagramUrl(valor: string | null): string | null {
  const texto = valor?.trim();
  if (!texto) return null;
  return /instagram\.com/i.test(texto) ? texto : `https://instagram.com/${texto.replace(/^@/, '')}`;
}

/** Virou pessoa (desde 09/10/2026) ou, antes disso, virou card. */
function jaVirouContato(socio: ProspectCompanyPartnerDB): boolean {
  return !!socio.contact_id || !!socio.prospect_id;
}
