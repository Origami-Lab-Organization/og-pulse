/**
 * Perfis de acesso — os papéis do tenant e o que cada um pode (ADR-0027).
 *
 * É aqui que "liberar custo para tal perfil" deixa de ser deploy e passa a ser um clique:
 * a mesma linha que o drawer grava é lida por `has_capability` nas policies.
 *
 * A navegação é card → drawer, seguindo `apps/equipe` do projete.app. A primeira versão
 * desta tela era uma matriz papel × capacidade única: boa para auditar tudo de uma vez,
 * ruim para a tarefa real, que é mexer em UM perfil. Com 48 capacidades, a grade também
 * obrigava rolagem nos dois eixos.
 *
 * A tela não é a barreira. Toda alteração é conferida pelo banco — pela policy (só admin
 * do tenant) e pela invariante do último administrador (20260902170000). Onde a interface
 * desabilita, é para evitar erro previsível, não para proteger.
 */
import { useMemo, useState } from 'react';
import { Loader2, Plus, Shield, ShieldAlert, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  useAssignRole,
  useCapabilities,
  useCapabilityGroups,
  useCreateTenantRole,
  useDeleteTenantRole,
  usePeopleWithRole,
  useRoleCapabilities,
  useSaveRoleProfile,
  useTenantRoles,
} from '@/hooks/useAccessProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { PROFILE_ADMIN_CAPABILITY, type TenantRoleWithUsage } from '@/types/accessProfile';
import { AccessProfileDrawer } from './AccessProfileDrawer';

export function AccessProfilesSettings() {
  const { data: capabilities = [], isLoading: loadingCaps } = useCapabilities();
  const { data: roles = [], isLoading: loadingRoles } = useTenantRoles();
  const { data: cells = [], isLoading: loadingCells } = useRoleCapabilities();
  const { data: people = [] } = usePeopleWithRole();
  const { user } = useAuth();

  const groups = useCapabilityGroups(capabilities);
  const assignRole = useAssignRole();
  const saveProfile = useSaveRoleProfile();
  const createRole = useCreateTenantRole();
  const deleteRole = useDeleteTenantRole();

  const [openRoleId, setOpenRoleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<TenantRoleWithUsage | null>(null);

  /** Ausência de linha significa negado — só as habilitadas entram. */
  const enabledByRole = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of cells) {
      if (!c.enabled) continue;
      const set = map.get(c.role_id) ?? new Set<string>();
      set.add(c.capability);
      map.set(c.role_id, set);
    }
    return map;
  }, [cells]);

  const profileAdminRoleCount = useMemo(
    () => roles.filter((r) => enabledByRole.get(r.id)?.has(PROFILE_ADMIN_CAPABILITY)).length,
    [roles, enabledByRole],
  );

  const openRole = roles.find((r) => r.id === openRoleId) ?? null;
  const openRoleEnabled = useMemo(
    () => enabledByRole.get(openRoleId ?? '') ?? new Set<string>(),
    [enabledByRole, openRoleId],
  );

  const isLoading = loadingCaps || loadingRoles || loadingCells;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const submitCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createRole.mutate(name);
    setNewName('');
    setCreateOpen(false);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Perfis de acesso</CardTitle>
            <CardDescription>
              Cada pessoa tem um perfil. Abra um para ver e editar o que ele permite. Para quem
              acumula funções, crie um perfil com as duas atribuições em vez de dar exceções
              individuais.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo perfil
          </Button>
        </CardHeader>

        <CardContent>
          {roles.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum perfil cadastrado neste tenant.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => {
                const active = enabledByRole.get(role.id)?.size ?? 0;
                const grantsAdmin = !!enabledByRole.get(role.id)?.has(PROFILE_ADMIN_CAPABILITY);
                const pct = capabilities.length > 0 ? Math.round((active / capabilities.length) * 100) : 0;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setOpenRoleId(role.id)}
                    aria-label={`Abrir o perfil ${role.name}`}
                    className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{role.name}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {active} de {capabilities.length} capacidades
                          </p>
                        </div>
                      </div>
                      {role.is_default && <Badge variant="secondary">Padrão</Badge>}
                    </div>

                    {/* Proporção de capacidades ativas — leitura rápida de "quão amplo é este perfil". */}
                    <div
                      className="mb-3 h-1 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${pct}% das capacidades ativas`}
                    >
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {role.people_count === 0
                          ? 'ninguém'
                          : `${role.people_count} ${role.people_count === 1 ? 'pessoa' : 'pessoas'}`}
                      </span>
                      {grantsAdmin && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                          gere perfis
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AccessProfileDrawer
        role={openRole}
        groups={groups}
        enabledKeys={openRoleEnabled}
        profileAdminRoleCount={profileAdminRoleCount}
        people={people}
        currentUserId={user?.id ?? null}
        saving={saveProfile.isPending}
        assigning={assignRole.isPending}
        onAssign={(userId, roleId) => assignRole.mutate({ userId, roleId })}
        onClose={() => setOpenRoleId(null)}
        onSave={(input) => {
          if (!openRole) return;
          saveProfile.mutate({ roleId: openRole.id, ...input });
          setOpenRoleId(null);
        }}
        onDelete={() => {
          if (openRole) setRoleToDelete(openRole);
          setOpenRoleId(null);
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo perfil</DialogTitle>
            <DialogDescription>
              O perfil nasce sem nenhuma capacidade. Depois de criar, abra-o para escolher o que
              ele permite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-profile-name">Nome do perfil</Label>
            <Input
              id="new-profile-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
              placeholder="Diretor, Comercial, Financeiro…"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={!newName.trim() || createRole.isPending}>
              {createRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Criar perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o perfil "{roleToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As capacidades configuradas para ele são descartadas. Se houver pessoas com este
              perfil, o banco recusa a remoção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (roleToDelete) deleteRole.mutate(roleToDelete.id);
                setRoleToDelete(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
