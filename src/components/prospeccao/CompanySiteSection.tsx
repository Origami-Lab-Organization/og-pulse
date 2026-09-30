import { Facebook, Globe, Instagram, Linkedin, Loader2, Mail, MessageCircle, Phone, ScanSearch, Youtube } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useScanCompanySite } from '@/hooks/useCompanyReceita';
import type { ProspectCompanyDB } from '@/types/prospect';
import type { SiteScan } from '@/types/receita';

interface CompanySiteSectionProps {
  empresa: ProspectCompanyDB;
  podeEditar: boolean;
}

/**
 * O que o site oficial da empresa publica sobre si (29/09/2026): redes, WhatsApp, telefones,
 * e-mails genéricos e as pistas do sistema que ela usa — o gancho da frente de software sob
 * medida e integração ("usa TOTVS", "fala em MES").
 */
export function CompanySiteSection({ empresa, podeEditar }: CompanySiteSectionProps) {
  const ler = useScanCompanySite();
  const scan = empresa.site_scan;
  const podeLer = podeEditar && (!!empresa.website || !!empresa.receita?.email);

  return (
    <div className="mt-3 space-y-2">
      <Separator />
      <div className="flex items-center justify-between gap-2 pt-1">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Site da empresa
        </h4>
        {podeLer && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => ler.mutate(empresa)} disabled={ler.isPending}>
            {ler.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <ScanSearch className="mr-1 h-3 w-3" aria-hidden="true" />
            )}
            {scan ? 'Ler de novo' : 'Ler site'}
          </Button>
        )}
      </div>
      {scan ? <Achados scan={scan} lidoEm={empresa.site_scan_em} /> : <SemLeitura podeLer={podeLer} />}
    </div>
  );
}

function SemLeitura({ podeLer }: { podeLer: boolean }) {
  return (
    <p className="text-xs text-muted-foreground">
      {podeLer
        ? 'Leia o site para trazer redes, WhatsApp, telefones e o sistema que a empresa usa.'
        : 'Cadastre o site da empresa (ou consulte a Receita) para ler o que ela publica.'}
    </p>
  );
}

function Achados({ scan, lidoEm }: { scan: SiteScan; lidoEm?: string | null }) {
  const pistas = [...scan.sistemas.map((s) => `Usa ${s}`), ...scan.sinais];
  return (
    <div className="space-y-2">
      {pistas.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Pistas do site">
          {pistas.map((pista) => (
            <Badge key={pista} variant="secondary" className="font-normal">{pista}</Badge>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <LinkDoSite href={scan.redes.linkedin} icone={Linkedin} rotulo="LinkedIn" />
        <LinkDoSite href={scan.redes.instagram} icone={Instagram} rotulo="Instagram" />
        <LinkDoSite href={scan.redes.facebook} icone={Facebook} rotulo="Facebook" />
        <LinkDoSite href={scan.redes.youtube} icone={Youtube} rotulo="YouTube" />
        {scan.whatsapp.map((numero) => (
          <LinkDoSite key={numero} href={`https://wa.me/${numero}`} icone={MessageCircle} rotulo={`WhatsApp ${numero.slice(-4)}`} />
        ))}
      </div>
      <Lista icone={Phone} itens={scan.telefones} href={(t) => `tel:${t.replace(/\D/g, '')}`} />
      <Lista icone={Mail} itens={scan.emails} href={(e) => `mailto:${e}`} />
      {lidoEm && (
        <p className="text-[11px] text-muted-foreground">
          Lido em {lidoEm.slice(8, 10)}/{lidoEm.slice(5, 7)}/{lidoEm.slice(0, 4)} · {scan.paginas.length}{' '}
          {scan.paginas.length === 1 ? 'página' : 'páginas'} de {new URL(scan.url).hostname}
        </p>
      )}
    </div>
  );
}

interface ListaProps {
  icone: typeof Phone;
  itens: string[];
  href: (item: string) => string;
}

function Lista(props: ListaProps) {
  const { icone: Icone, itens, href } = props;
  if (itens.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <Icone className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      {itens.map((item) => (
        <a key={item} href={href(item)} className="underline-offset-2 hover:underline">{item}</a>
      ))}
    </p>
  );
}

interface LinkDoSiteProps {
  href: string | null;
  icone: typeof Globe;
  rotulo: string;
}

function LinkDoSite(props: LinkDoSiteProps) {
  const { href, icone: Icone, rotulo } = props;
  if (!href) return null;
  return (
    <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-normal" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Icone className="mr-1 h-3 w-3" aria-hidden="true" />
        {rotulo}
      </a>
    </Button>
  );
}
