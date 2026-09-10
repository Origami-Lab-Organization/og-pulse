import { AlertTriangle, Building2, Ghost, Mail, Phone, RefreshCw, TrendingDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformUsage } from '@/hooks/usePlatformUsage';
import { ACTIVATION_STEPS } from '@/lib/platformUsage';
import { EngagementLevel, TrialState, type PlatformUsageSummary, type TenantUsage } from '@/types/platformUsage';

/**
 * Painel de uso dos clientes, em `/uso` (PUL-258, ADR-0033).
 *
 * Para quem é: a Origami operando o produto. Responde três perguntas, nessa ordem de
 * urgência — de quem o teste vence esta semana, quem entrou e não usa, e onde o funil de
 * ativação está furando.
 *
 * O que esta tela NÃO mostra, e é decisão e não esquecimento: nome de projeto, nome de
 * cliente final, valor, margem, custo, salário, e a lista de funcionários do cliente. Só
 * contagem, data e o contato comercial de quem se cadastrou. A função do banco também não
 * devolve nada além disso, então a tela não tem como escorregar.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Abaixo disto, o marco vira alarme e não estatística. */
const CRITICAL_PERCENT = 30;

const ENGAGEMENT_STYLE: Record<EngagementLevel, { label: string; className: string }> = {
  [EngagementLevel.ACTIVE]: { label: 'Ativo', className: 'bg-success-subtle text-success-emphasis' },
  [EngagementLevel.COOLING]: { label: 'Esfriando', className: 'bg-warning-subtle text-warning-emphasis' },
  [EngagementLevel.IDLE]: { label: 'Parado', className: 'bg-destructive/10 text-destructive' },
};

const fmtDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtPct = (n: number) => `${Math.round(n)}%`;

/** "há 3 dias", "hoje", "nunca". Data absoluta não responde "está vivo?". */
function relative(iso: string | null, now: Date): string {
  if (!iso) return 'nunca';
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

function Badge(props: { children: string; className?: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${props.className ?? 'bg-muted text-muted-foreground'}`}>
      {props.children}
    </span>
  );
}

function TrialBadge(props: { tenant: TenantUsage }) {
  const { trial, trialDaysLeft } = props.tenant;
  if (trial === TrialState.NONE) return <Badge className="bg-success-subtle text-success-emphasis">Cliente</Badge>;
  if (trial === TrialState.EXPIRED) return <Badge className="bg-destructive/10 text-destructive">Teste vencido</Badge>;
  if (trial === TrialState.ENDING) {
    const texto = trialDaysLeft === 0 ? 'Teste vence hoje' : `Teste vence em ${trialDaysLeft} d`;
    return <Badge className="bg-warning-subtle text-warning-emphasis">{texto}</Badge>;
  }
  return <Badge>{`Teste, ${trialDaysLeft} d`}</Badge>;
}

function Metric(props: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{props.label}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-foreground">{props.value}</p>
    </div>
  );
}

/** O funil: uma barra por marco, vermelha quando o número já é problema. */
function ActivationFunnel(props: { summary: PlatformUsageSummary }) {
  const { activation, funnelBase, outsideFunnel, trialsEndingSoon, zombies } = props.summary;
  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Ativação</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {funnelBase} {funnelBase === 1 ? 'empresa entrou' : 'empresas entraram'} pelo autocadastro
            {outsideFunnel > 0 && ` · ${outsideFunnel} anteriores a ele ficaram fora da conta`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {trialsEndingSoon > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-warning-subtle px-2.5 py-1 text-[11px] font-medium text-warning-emphasis">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {trialsEndingSoon} {trialsEndingSoon === 1 ? 'teste vence' : 'testes vencem'} em 7 dias
            </span>
          )}
          {zombies > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
              <Ghost className="h-3.5 w-3.5" aria-hidden="true" />
              {zombies} entrou e não criou nada
            </span>
          )}
        </div>
      </div>

      {funnelBase === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhuma empresa entrou pelo autocadastro ainda. Os marcos aparecem quando a primeira chegar.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {activation.map(({ step, count, percent }) => {
            const critical = percent < CRITICAL_PERCENT;
            return (
              <li key={step.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
                <div className="w-44 shrink-0">
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-[11px] text-muted-foreground">{step.detail}</p>
                </div>
                <div
                  className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={Math.round(percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={step.label}
                >
                  <div
                    className={`h-full rounded-full ${critical ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span
                  className={`w-24 shrink-0 text-right font-mono text-xs tabular-nums ${critical ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {count} · {fmtPct(percent)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Entrou e nunca criou nada: o cliente que um contador de login mostraria saudável. */
function isZombie(row: TenantUsage['row']): boolean {
  return !!row.last_sign_in_at && !row.last_created_at;
}

function TenantHeader(props: { tenant: TenantUsage }) {
  const { tenant } = props;
  const r = tenant.row;
  const engagement = ENGAGEMENT_STYLE[tenant.engagement];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-base font-semibold text-foreground">{r.tenant_name}</h3>
      <Badge className={engagement.className}>{engagement.label}</Badge>
      <TrialBadge tenant={tenant} />
      {r.segment && <Badge>{r.segment}</Badge>}
      {isZombie(r) && <Badge className="bg-destructive/10 text-destructive">Entrou e não criou nada</Badge>}
      <span className="ml-auto text-xs text-muted-foreground">
        desde {fmtDate.format(new Date(r.created_at))}
      </span>
    </div>
  );
}

/** Contato comercial da conta. Só o admin que se cadastrou, nunca o time dele. */
function OwnerContact(props: { row: TenantUsage['row'] }) {
  const r = props.row;
  if (!r.owner_email && !r.owner_phone) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {r.owner_name && <span className="font-medium text-foreground">{r.owner_name}</span>}
      {r.owner_email && (
        <a href={`mailto:${r.owner_email}`} className="flex items-center gap-1.5 hover:text-primary">
          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
          {r.owner_email}
        </a>
      )}
      {r.owner_phone && (
        <a href={`tel:${r.owner_phone}`} className="flex items-center gap-1.5 hover:text-primary">
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          {r.owner_phone}
        </a>
      )}
    </div>
  );
}

function TenantCard(props: { tenant: TenantUsage; now: Date }) {
  const { tenant, now } = props;
  const r = tenant.row;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <TenantHeader tenant={tenant} />
      <OwnerContact row={r} />

      <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4 lg:grid-cols-6">
        <Metric label="Último acesso" value={relative(r.last_sign_in_at, now)} />
        <Metric label="Última criação" value={relative(r.last_created_at, now)} />
        <Metric label="Pessoas" value={`${r.signed_in_count}/${r.people_count}`} />
        <Metric label="Clientes" value={String(r.client_count)} />
        <Metric label="Serviços" value={String(r.service_count)} />
        <Metric label="Projetos" value={String(r.project_count)} />
        <Metric label="Horas lançadas" value={String(r.logged_hours_count)} />
        <Metric label="Oportunidades" value={String(r.opportunity_count)} />
        <Metric label="Centros de custo" value={String(r.cost_center_count)} />
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
        {ACTIVATION_STEPS.map((step) => {
          const done = tenant.reached.has(step.id);
          return (
            <li
              key={step.id}
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                done ? 'bg-success-subtle text-success-emphasis' : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.label}
              <span className="sr-only">{done ? ' concluído' : ' pendente'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-56 w-full" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  );
}

export default function PlatformUsage() {
  const { summary, isLoading, error, refetch } = usePlatformUsage();
  const now = new Date();

  return (
    <AppLayout
      title="Uso dos clientes"
      description="Quem ativou, quem travou e de quem o teste vence esta semana"
      breadcrumbs={[{ label: 'Uso dos clientes' }]}
      actions={
        <Button size="sm" variant="outline" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Atualizar
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <section className="rounded-lg border bg-card p-6 shadow-card">
          <p className="text-sm font-medium text-destructive">Não foi possível ler o uso dos clientes.</p>
          <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
        </section>
      ) : !summary || summary.tenants.length === 0 ? (
        <section className="rounded-lg border bg-card p-10 text-center shadow-card">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-foreground">Nenhuma empresa cliente ainda.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada empresa que se cadastrar aparece aqui, com o que já ativou.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          <ActivationFunnel summary={summary} />
          {summary.tenants.map((tenant) => (
            <TenantCard key={tenant.row.tenant_id} tenant={tenant} now={now} />
          ))}
          <p className="flex items-start gap-2 px-1 text-[11px] text-muted-foreground">
            <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Ativo é acesso nos últimos 2 dias, Esfriando de 2 a 7, Parado acima disso ou nunca. Última criação é o
            último projeto, cliente ou hora lançada, e é o número que separa quem usa de quem só abre a tela.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
