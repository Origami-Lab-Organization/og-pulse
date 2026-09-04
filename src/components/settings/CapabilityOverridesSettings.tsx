/**
 * Exceções de acesso por pessoa (PUL-210, ADR-0027).
 *
 * `has_capability` resolve override antes de papel, então esta tela muda acesso de verdade
 * — no banco, não só na exibição. Ela existe sobretudo para tornar a exceção VISÍVEL: o
 * ADR-0027 é explícito de que exceção invisível é o defeito de `is_gerente` com outro nome.
 *
 * O agrupamento é por capacidade, não por pessoa, para responder à pergunta que o ADR manda
 * vigiar: a mesma exceção repetida em várias pessoas significa que falta um perfil.
 */
import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Plus, RefreshCw, ShieldAlert, ShieldOff, UserCog } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCapabilities,
  useCapabilityGroups,
  useCapabilityOverrides,
  useDeleteOverride,
  useOverrideGroups,
  usePeopleWithRole,
  useRoleCapabilities,
  useSaveOverride,
  useTenantRoles,
} from '@/hooks/useAccessProfiles';
import {
  DOMAIN_LABELS,
  OVERRIDE_CROWD_THRESHOLD,
  type OverrideWithPerson,
} from '@/types/accessProfile';
import { CapabilityOverrideDialog } from './CapabilityOverrideDialog';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CapabilityOverridesSettings() {
  const { user } = useAuth();
  const capabilitiesQuery = useCapabilities();
  const rolesQuery = useTenantRoles();
  const cellsQuery = useRoleCapabilities();
  const peopleQuery = usePeopleWithRole();
  const overridesQuery = useCapabilityOverrides();

  const capabilities = capabilitiesQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const people = peopleQuery.data ?? [];
  const overrides = overridesQuery.data ?? [];

  const capabilityGroups = useCapabilityGroups(capabilities);
  const groups = useOverrideGroups(overrides, capabilities);

  const roleGrants = useMemo(
    () =>
      new Set(
        (cellsQuery.data ?? [])
          .filter((c) => c.enabled)
          .map((c) => `${c.role_id}::${c.capability}`),
      ),
    [cellsQuery.data],
  );

  const actorNames = useMemo(
    () => new Map((peopleQuery.data ?? []).map((p) => [p.userId, p.nome])),
    [peopleQuery.data],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<OverrideWithPerson | null>(null);

  const saveOverride = useSaveOverride();
  const deleteOverride = useDeleteOverride();

  const isLoading =
    capabilitiesQuery.isLoading ||
    rolesQuery.isLoading ||
    cellsQuery.isLoading ||
    peopleQuery.isLoading ||
    overridesQuery.isLoading;
  const isError =
    capabilitiesQuery.isError ||
    rolesQuery.isError ||
    cellsQuery.isError ||
    peopleQuery.isError ||
    overridesQuery.isError;

  const crowded = groups.filter((g) => g.overrides.length >= OVERRIDE_CROWD_THRESHOLD);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle>Exceções de acesso</CardTitle>
          <CardDescription>Não foi possível carregar as exceções deste tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              capabilitiesQuery.refetch();
              rolesQuery.refetch();
              cellsQuery.refetch();
              peopleQuery.refetch();
              overridesQuery.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar de novo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Exceções de acesso</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Capacidade concedida ou revogada para uma pessoa específica, por cima do perfil dela. Vale
            no banco, não só na tela. Se a mesma exceção aparecer em várias pessoas, o que falta é um
            perfil.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nova exceção
        </Button>
      </div>

      {crowded.length > 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Provavelmente falta um perfil</AlertTitle>
          <AlertDescription>
            {crowded.map((g) => `${g.label} (${g.overrides.length} pessoas)`).join(', ')} — exceção
            repetida em muita gente é um perfil que ainda não existe. Considere criar o perfil e mover
            essas pessoas.
          </AlertDescription>
        </Alert>
      ) : null}

      {groups.length === 0 ? (
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              Nenhuma exceção neste tenant
            </CardTitle>
            <CardDescription>
              Todo mundo segue o perfil que tem — que é o estado saudável. Crie exceção só quando uma
              pessoa precisa de algo que o perfil dela não dá, e criar um perfil novo para ela seria
              perfil de uma pessoa só.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.capability}>
            <CardHeader className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{group.label}</CardTitle>
                {group.is_sensitive ? (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Dado sensível
                  </Badge>
                ) : null}
                <Badge variant="secondary">
                  {group.overrides.length} {group.overrides.length === 1 ? 'pessoa' : 'pessoas'}
                </Badge>
              </div>
              <CardDescription>
                {DOMAIN_LABELS[group.domain] ?? group.domain} · {group.capability}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.overrides.map((o) => (
                <div
                  key={`${o.user_id}-${o.capability}`}
                  className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{o.nome}</span>
                      <Badge variant={o.enabled ? 'default' : 'outline'} className="gap-1">
                        {o.enabled ? (
                          <ShieldAlert className="h-3 w-3" />
                        ) : (
                          <ShieldOff className="h-3 w-3" />
                        )}
                        {o.enabled ? 'Concede' : 'Revoga'}
                      </Badge>
                      {o.enabled && o.grantedByRole ? (
                        <Badge variant="secondary">Redundante: o perfil já concede</Badge>
                      ) : null}
                      {!o.enabled && !o.grantedByRole ? (
                        <Badge variant="secondary">Redundante: o perfil não concede</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {o.cargo ? `${o.cargo} · ` : ''}Perfil: {o.roleName ?? 'sem perfil'}
                    </p>
                    <p className="text-sm">
                      {o.reason?.trim() ? (
                        o.reason
                      ) : (
                        <span className="text-muted-foreground">
                          Sem motivo registrado — foi criada fora desta tela.
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatWhen(o.updated_at)}
                      {o.updated_by ? ` · por ${actorNames.get(o.updated_by) ?? 'conta desconhecida'}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setPendingRemoval(o)}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <CapabilityOverrideDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        people={people}
        roles={roles}
        capabilityGroups={capabilityGroups}
        roleGrants={roleGrants}
        currentUserId={user?.id ?? null}
        saving={saveOverride.isPending}
        onSave={(input) =>
          saveOverride.mutate(input, {
            onSuccess: () => setDialogOpen(false),
          })
        }
      />

      <AlertDialog open={!!pendingRemoval} onOpenChange={(open) => !open && setPendingRemoval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover a exceção?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval
                ? `${pendingRemoval.nome} volta a seguir o perfil ${pendingRemoval.roleName ?? 'que tiver'}. Remover não é o mesmo que revogar: a decisão volta a ser do perfil.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOverride.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingRemoval) return;
                deleteOverride.mutate(
                  { userId: pendingRemoval.user_id, capability: pendingRemoval.capability },
                  { onSuccess: () => setPendingRemoval(null) },
                );
              }}
              disabled={deleteOverride.isPending}
            >
              {deleteOverride.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
