import { useMemo, useState } from 'react';
import { Link2, Loader2, Lock, UserMinus, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDriveItemPermissions,
  useInviteToDriveItem,
  useRemoveDrivePermission,
} from '@/hooks/useDriveBrowser';
import { useProjectAllocations } from '@/hooks/useProjectRoles';
import type { DriveEntry } from '@/types/microsoftGraph';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

interface DriveShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driveId: string;
  entry: DriveEntry | null;
  projectId: string;
}

/**
 * Compartilhamento a partir de quem está alocado no projeto. É o ponto em que os
 * dois sistemas se somam: o OneDrive sabe quem tem acesso, o Pulse sabe quem
 * deveria ter — e a lista de sugestão sai da alocação, não de digitar e-mail.
 */
export function DriveShareDialog({
  open,
  onOpenChange,
  driveId,
  entry,
  projectId,
}: DriveShareDialogProps) {
  const { data: permissions = [], isLoading } = useDriveItemPermissions(driveId, open ? (entry?.id ?? null) : null);
  const { data: allocations = [] } = useProjectAllocations(projectId, false);
  const invite = useInviteToDriveItem(driveId, entry?.id ?? null);
  const removePermission = useRemoveDrivePermission(driveId, entry?.id ?? null);

  const [selected, setSelected] = useState<string[]>([]);
  const [role, setRole] = useState<'read' | 'write'>('read');

  const grantedEmails = useMemo(
    () => new Set(permissions.map((p) => p.email?.toLowerCase()).filter(Boolean)),
    [permissions],
  );

  /** Sem e-mail não dá para cruzar com a equipe — a sugestão pode repetir alguém. */
  const hasUnidentified = permissions.some((p) => !p.email && !p.isLink);

  /** Alocado no projeto, com e-mail, e ainda sem acesso a este item. */
  const candidates = useMemo(
    () =>
      allocations
        .filter((a) => a.totalHours > 0 && a.employee.email)
        .filter((a) => !grantedEmails.has(a.employee.email!.toLowerCase())),
    [allocations, grantedEmails],
  );

  const toggle = (email: string) =>
    setSelected((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));

  const handleInvite = () => {
    if (selected.length === 0) return;
    invite.mutate({ emails: selected, role }, { onSuccess: () => setSelected([]) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate">Acesso a “{entry?.name}”</DialogTitle>
          <DialogDescription>
            O acesso é do OneDrive, não do Pulse — vale para quem abrir a pasta por lá também.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quem tem acesso hoje
          </p>
          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : permissions.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">Ninguém além do proprietário.</p>
          ) : (
            <>
            {hasUnidentified && (
              <p className="rounded-md bg-warning/10 px-2 py-1.5 text-[11px] text-warning">
                O OneDrive não informou o e-mail de alguém desta lista. A sugestão abaixo pode repetir
                quem já tem acesso — confira antes de conceder.
              </p>
            )}
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {permissions.map((permission) => (
                <li key={permission.id} className="flex items-center gap-2 rounded-md border p-2">
                  {permission.isLink ? (
                    <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                        {initials(permission.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{permission.displayName}</p>
                    {permission.email && (
                      <p className="truncate text-xs text-muted-foreground">{permission.email}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {permission.roleLabel}
                  </Badge>
                  {permission.isRevocable ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removePermission.mutate(permission.id)}
                      aria-label={`Remover acesso de ${permission.displayName}`}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span
                      className="shrink-0 text-muted-foreground"
                      title={
                        permission.isInherited
                          ? 'Herdado da pasta acima — remova na pasta de origem'
                          : permission.isLink
                            ? 'Acesso via link — para revogar, apague o link no OneDrive'
                            : 'Proprietário do item'
                      }
                    >
                      <Lock className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  )}
                </li>
              ))}
            </ul>
            </>
          )}
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dar acesso à equipe do projeto
          </p>

          {candidates.length === 0 ? (
            <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden />
              Todo mundo alocado já tem acesso.
            </p>
          ) : (
            <>
              <ul className="max-h-36 space-y-1 overflow-y-auto">
                {candidates.map((allocation) => (
                  <li key={allocation.employeeId}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-muted/50">
                      <Checkbox
                        checked={selected.includes(allocation.employee.email!)}
                        onCheckedChange={() => toggle(allocation.employee.email!)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{allocation.employee.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">{allocation.roleName}</p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2">
                <Label htmlFor="drive-share-role" className="text-xs text-muted-foreground">
                  Permissão
                </Label>
                <Select value={role} onValueChange={(value) => setRole(value as 'read' | 'write')}>
                  <SelectTrigger id="drive-share-role" className="h-8 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Pode ver</SelectItem>
                    <SelectItem value="write">Pode editar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={handleInvite}
            disabled={selected.length === 0 || invite.isPending}
            className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
          >
            {invite.isPending ? 'Concedendo...' : `Dar acesso (${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
