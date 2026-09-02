/**
 * Perfis de acesso — papéis do tenant e a matriz papel × capacidade (ADR-0027).
 *
 * É aqui que "liberar custo para tal perfil" deixa de ser deploy e passa a ser um clique:
 * a mesma linha que este toggle grava é lida por `has_capability` nas policies.
 *
 * A tela não é a barreira. Toda alteração é conferida de novo pelo banco — pela policy
 * (só admin do tenant, e ninguém altera o próprio vínculo) e pela invariante do último
 * administrador (20260902170000). Onde a interface desabilita algo, é para evitar erro
 * previsível, não para proteger.
 */
import { Fragment, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, ShieldAlert, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useCapabilities,
  useCapabilityGroups,
  useCreateTenantRole,
  useDeleteTenantRole,
  useRenameTenantRole,
  useRoleCapabilities,
  useSetRoleCapability,
  useTenantRoles,
} from '@/hooks/useAccessProfiles';
import { DOMAIN_LABELS, PROFILE_ADMIN_CAPABILITY, type TenantRoleWithUsage } from '@/types/accessProfile';

export function AccessProfilesSettings() {
  const { data: capabilities = [], isLoading: loadingCaps } = useCapabilities();
  const { data: roles = [], isLoading: loadingRoles } = useTenantRoles();
  const { data: cells = [], isLoading: loadingCells } = useRoleCapabilities();

  const groups = useCapabilityGroups(capabilities);
  const setCapability = useSetRoleCapability();
  const createRole = useCreateTenantRole();
  const renameRole = useRenameTenantRole();
  const deleteRole = useDeleteTenantRole();

  const [nameDialog, setNameDialog] = useState<{ mode: 'create' | 'rename'; role?: TenantRoleWithUsage } | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<TenantRoleWithUsage | null>(null);

  /** Ausência de linha significa negado — só as habilitadas entram no conjunto. */
  const enabled = useMemo(() => {
    const set = new Set<string>();
    for (const c of cells) {
      if (c.enabled) set.add(`${c.role_id}::${c.capability}`);
    }
    return set;
  }, [cells]);

  /**
   * Quantos papéis ainda concederiam a capacidade administrativa. Com apenas um, desligar
   * ali é o que a invariante do banco recusa — a interface antecipa em vez de deixar o
   * usuário bater no erro.
   */
  const profileAdminRoleCount = useMemo(
    () => roles.filter((r) => enabled.has(`${r.id}::${PROFILE_ADMIN_CAPABILITY}`)).length,
    [roles, enabled],
  );

  const isLoading = loadingCaps || loadingRoles || loadingCells;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const openCreate = () => {
    setNameDraft('');
    setNameDialog({ mode: 'create' });
  };
  const openRename = (role: TenantRoleWithUsage) => {
    setNameDraft(role.name);
    setNameDialog({ mode: 'rename', role });
  };

  const submitName = () => {
    const name = nameDraft.trim();
    if (!name) return;
    if (nameDialog?.mode === 'create') createRole.mutate(name);
    else if (nameDialog?.role) renameRole.mutate({ roleId: nameDialog.role.id, name });
    setNameDialog(null);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Papéis do tenant */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Papéis de acesso</CardTitle>
              <CardDescription>
                Cada pessoa tem um papel. Para quem acumula funções, crie um papel com as duas
                atribuições em vez de dar exceções individuais.
              </CardDescription>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo papel
            </Button>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum papel cadastrado neste tenant.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {roles.map((role) => {
                  const grantsAdmin = enabled.has(`${role.id}::${PROFILE_ADMIN_CAPABILITY}`);
                  const isLastAdminRole = grantsAdmin && profileAdminRoleCount <= 1;
                  const hasPeople = role.people_count > 0;

                  return (
                    <li key={role.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{role.name}</span>
                          {role.is_default && <Badge variant="secondary">Padrão de novos cadastros</Badge>}
                          {grantsAdmin && (
                            <Badge variant="outline" className="gap-1">
                              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                              Gere perfis
                            </Badge>
                          )}
                        </div>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          {role.people_count === 0
                            ? 'Ninguém com este papel'
                            : `${role.people_count} ${role.people_count === 1 ? 'pessoa' : 'pessoas'}`}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openRename(role)}
                          aria-label={`Renomear o papel ${role.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteRoleButton
                          role={role}
                          disabledReason={
                            hasPeople
                              ? 'Há pessoas com este papel. Mova-as para outro antes de remover.'
                              : isLastAdminRole
                                ? 'É o único papel que concede a gestão de perfis. Remover deixaria o tenant sem administração.'
                                : null
                          }
                          onConfirm={() => setRoleToDelete(role)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Matriz papel × capacidade */}
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle>O que cada papel pode</CardTitle>
            <CardDescription>
              Ligar aqui libera de fato: a mesma configuração é aplicada pelo banco, não só pela
              interface. Capacidades marcadas como sensíveis expõem dado financeiro, de folha ou
              pessoal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Crie um papel para configurar capacidades.
              </p>
            ) : (
              // A grade cresce nos dois eixos: a rolagem fica contida aqui, e o corpo da
              // página nunca rola na horizontal.
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="sticky left-0 z-10 bg-card py-2 pr-4 text-left font-medium">
                        Capacidade
                      </th>
                      {roles.map((role) => (
                        <th key={role.id} scope="col" className="px-3 py-2 text-center font-medium">
                          {role.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <Fragment key={group.domain}>
                        <tr className="bg-muted/50">
                          <th
                            scope="colgroup"
                            colSpan={roles.length + 1}
                            className="sticky left-0 py-1.5 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {DOMAIN_LABELS[group.domain] ?? group.domain}
                          </th>
                        </tr>
                        {group.capabilities.map((cap) => (
                          <tr key={cap.key} className="border-b border-border last:border-0">
                            <th scope="row" className="sticky left-0 z-10 bg-card py-2 pr-4 text-left font-normal">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-foreground">{cap.label}</span>
                                {cap.is_sensitive && (
                                  <Badge variant="outline" className="text-xs">
                                    sensível
                                  </Badge>
                                )}
                              </span>
                              <code className="text-xs text-muted-foreground">{cap.key}</code>
                            </th>
                            {roles.map((role) => {
                              const on = enabled.has(`${role.id}::${cap.key}`);
                              const isLastAdminGrant =
                                cap.key === PROFILE_ADMIN_CAPABILITY && on && profileAdminRoleCount <= 1;

                              return (
                                <td key={role.id} className="px-3 py-2 text-center">
                                  <CapabilityToggle
                                    checked={on}
                                    disabled={isLastAdminGrant || setCapability.isPending}
                                    disabledReason={
                                      isLastAdminGrant
                                        ? 'É a última fonte da gestão de perfis. Conceda a outro papel antes de desligar aqui.'
                                        : null
                                    }
                                    label={`${cap.label} para ${role.name}`}
                                    onCheckedChange={(next) =>
                                      setCapability.mutate({ roleId: role.id, capability: cap.key, enabled: next })
                                    }
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Criar / renomear papel */}
      <Dialog open={!!nameDialog} onOpenChange={(open) => !open && setNameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{nameDialog?.mode === 'create' ? 'Novo papel' : 'Renomear papel'}</DialogTitle>
            <DialogDescription>
              {nameDialog?.mode === 'create'
                ? 'O papel nasce sem nenhuma capacidade. Ligue as que ele deve ter na grade.'
                : 'O nome aparece na atribuição de perfil e na grade de capacidades.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="role-name">Nome do papel</Label>
            <Input
              id="role-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitName()}
              placeholder="Diretor, Comercial, Financeiro…"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={submitName} disabled={!nameDraft.trim() || createRole.isPending || renameRole.isPending}>
              {(createRole.isPending || renameRole.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {nameDialog?.mode === 'create' ? 'Criar papel' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remover papel */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o papel "{roleToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As capacidades configuradas para ele são descartadas. Se houver pessoas com este
              papel, o banco recusa a remoção.
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

/** Toggle com motivo visível quando desabilitado — desabilitado sem explicação vira bug reportado. */
function CapabilityToggle({
  checked,
  disabled,
  disabledReason,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  disabled: boolean;
  disabledReason: string | null;
  label: string;
  onCheckedChange: (next: boolean) => void;
}) {
  const control = (
    <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={label} />
  );

  if (!disabledReason) return control;

  return (
    <Tooltip>
      {/* span porque Switch desabilitado não emite eventos de ponteiro. */}
      <TooltipTrigger asChild>
        <span className="inline-flex">{control}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{disabledReason}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function DeleteRoleButton({
  role,
  disabledReason,
  onConfirm,
}: {
  role: TenantRoleWithUsage;
  disabledReason: string | null;
  onConfirm: () => void;
}) {
  const button = (
    <Button
      variant="ghost"
      size="icon"
      disabled={!!disabledReason}
      onClick={onConfirm}
      aria-label={`Remover o papel ${role.name}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  if (!disabledReason) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{disabledReason}</p>
      </TooltipContent>
    </Tooltip>
  );
}
