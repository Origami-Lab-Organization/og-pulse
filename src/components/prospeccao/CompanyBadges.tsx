import { Ban, Send } from 'lucide-react';
import { iniciaisDe } from '@/lib/prospecting/iniciais';
import {
  COMPANY_ACTION_LABEL,
  COMPANY_STATUS_META,
  type CompanyProspectStatus,
} from '@/lib/prospecting/companyStatus';
import { cn } from '@/lib/utils';

/** Tier 1 é a conta mais prioritária e leva o maior contraste; do 3 em diante, o menor. */
const ESTILO_DO_TIER: Record<number, string> = {
  1: 'border-foreground bg-foreground text-background',
  2: 'border-border bg-muted text-foreground',
};
const ESTILO_TIER_BAIXO = 'border-border bg-card text-muted-foreground';

export function TierBadge({ tier, longo = false }: { tier: number; longo?: boolean }) {
  return (
    <span
      title={`Tier ${tier}`}
      className={cn(
        'inline-flex items-center rounded-md border font-semibold tracking-wide',
        longo ? 'h-[26px] px-2.5 text-xs' : 'h-[22px] px-[7px] text-[11.5px]',
        ESTILO_DO_TIER[tier] ?? ESTILO_TIER_BAIXO,
      )}
    >
      {longo ? `Tier ${tier}` : `T${tier}`}
    </span>
  );
}

export function AnelBadge({ anel }: { anel: number }) {
  return (
    <span
      title={`Anel ${anel}`}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-input text-xs font-semibold text-foreground/80"
    >
      {anel}
    </span>
  );
}

/** O sinal que a tela existe para dar. "Não abordar" tem menos ênfase de propósito. */
export function AbordagemBadge({ status, comFundo = false }: { status: CompanyProspectStatus; comFundo?: boolean }) {
  const acao = COMPANY_STATUS_META[status].action;
  if (acao === 'abordar') {
    return (
      <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-success-subtle px-2.5 text-[12.5px] font-semibold text-success-emphasis">
        <Send className="h-3.5 w-3.5" aria-hidden="true" />
        {COMPANY_ACTION_LABEL.abordar}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex h-[26px] items-center gap-1.5 rounded-full text-[12.5px] font-medium text-muted-foreground',
        comFundo ? 'bg-muted px-2.5' : 'px-0.5',
      )}
    >
      <Ban className="h-3.5 w-3.5" aria-hidden="true" />
      {COMPANY_ACTION_LABEL.nao_abordar}
    </span>
  );
}

export function SituacaoDot({ status }: { status: CompanyProspectStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn('h-[7px] w-[7px] shrink-0 rounded-full', COMPANY_STATUS_META[status].dot)}
    />
  );
}

/**
 * Cor do avatar estável por pessoa: a mesma pessoa tem sempre a mesma cor, em qualquer
 * linha, sem cadastro de cor.
 */
const PALETA_DE_AVATAR = [
  'bg-success-subtle text-success-emphasis',
  'bg-info-subtle text-info-emphasis',
  'bg-warning-subtle text-warning-emphasis',
];

export function ResponsavelAvatar({ id, nome }: { id: string; nome: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold',
        PALETA_DE_AVATAR[indiceEstavel(id, PALETA_DE_AVATAR.length)],
      )}
    >
      {iniciaisDe(nome)}
    </span>
  );
}

function indiceEstavel(texto: string, tamanho: number): number {
  let hash = 0;
  for (const letra of texto) hash = (hash * 31 + letra.charCodeAt(0)) >>> 0;
  return hash % tamanho;
}
