/**
 * Edição de um perfil de acesso — nome e o que ele pode (ADR-0027).
 *
 * Segue o padrão de `apps/equipe/PapelDrawer` do projete.app: entra-se no perfil e edita
 * ali, em vez de operar uma matriz de todos os papéis ao mesmo tempo. Editar é uma tarefa
 * sobre UM papel; a matriz servia para auditar, não para trabalhar.
 *
 * A edição é rascunho com salvar explícito. Além de ser o que um formulário promete, isso
 * evita um estado intermediário que o banco recusaria: salvando a cada toggle, mover a
 * gestão de perfis de um papel para outro passaria por um instante sem nenhum
 * administrador no tenant.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DOMAIN_LABELS,
  PROFILE_ADMIN_CAPABILITY,
  type CapabilityGroup,
  type TenantRoleWithUsage,
} from '@/types/accessProfile';

interface AccessProfileDrawerProps {
  role: TenantRoleWithUsage | null;
  groups: CapabilityGroup[];
  /** Capacidades habilitadas do papel aberto. */
  enabledKeys: Set<string>;
  /** Quantos papéis do tenant concedem a gestão de perfis, incluindo este. */
  profileAdminRoleCount: number;
  saving: boolean;
  onClose: () => void;
  onSave: (input: { name: string; nameChanged: boolean; entries: { capability: string; enabled: boolean }[] }) => void;
  onDelete: () => void;
}

export function AccessProfileDrawer({
  role,
  groups,
  enabledKeys,
  profileAdminRoleCount,
  saving,
  onClose,
  onSave,
  onDelete,
}: AccessProfileDrawerProps) {
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<Record<string, boolean>>({});

  // Rascunho reinicia a cada papel aberto: o estado do formulário é do papel, não da tela.
  useEffect(() => {
    if (!role) return;
    setName(role.name);
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      for (const cap of group.capabilities) next[cap.key] = enabledKeys.has(cap.key);
    }
    setDraft(next);
  }, [role, groups, enabledKeys]);

  const totalCapabilities = useMemo(
    () => groups.reduce((sum, g) => sum + g.capabilities.length, 0),
    [groups],
  );
  const activeCount = useMemo(() => Object.values(draft).filter(Boolean).length, [draft]);

  /**
   * Este papel é a única fonte da gestão de perfis? Nesse caso desligar a capacidade aqui
   * é o que a invariante do banco recusa (20260902170000) — a interface antecipa, em vez
   * de deixar a pessoa salvar e receber erro.
   */
  const isOnlyProfileAdminRole =
    !!role && enabledKeys.has(PROFILE_ADMIN_CAPABILITY) && profileAdminRoleCount <= 1;

  const nameTrimmed = name.trim();
  const nameChanged = !!role && nameTrimmed !== role.name;
  const draftChanged = useMemo(
    () => Object.entries(draft).some(([key, on]) => on !== enabledKeys.has(key)),
    [draft, enabledKeys],
  );
  const dirty = nameChanged || draftChanged;

  const handleSave = () => {
    if (!role || !nameTrimmed) return;
    onSave({
      name: nameTrimmed,
      nameChanged,
      entries: Object.entries(draft).map(([capability, enabled]) => ({ capability, enabled })),
    });
  };

  const deleteBlockedReason = !role
    ? null
    : role.people_count > 0
      ? 'Há pessoas com este papel. Mova-as para outro antes de remover.'
      : isOnlyProfileAdminRole
        ? 'É o único papel que concede a gestão de perfis. Remover deixaria o tenant sem administração.'
        : null;

  return (
    <Sheet open={!!role} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1.5 p-6 pb-4">
          <SheetTitle>{role?.name}</SheetTitle>
          <SheetDescription>
            {activeCount} de {totalCapabilities} capacidades ativas ·{' '}
            {role?.people_count === 1 ? '1 pessoa' : `${role?.people_count ?? 0} pessoas`} com este perfil
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome do perfil</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Diretor, Comercial, Financeiro…"
            />
          </div>

          {isOnlyProfileAdminRole && (
            <p className="flex gap-2 rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Este é o único perfil que permite gerir perfis de acesso. Para desligar essa
                capacidade aqui, conceda-a antes a outro perfil — senão o tenant fica sem
                administração.
              </span>
            </p>
          )}

          {groups.map((group) => {
            const activeInGroup = group.capabilities.filter((c) => draft[c.key]).length;

            return (
              <div key={group.domain} className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {DOMAIN_LABELS[group.domain] ?? group.domain}
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {activeInGroup}/{group.capabilities.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {group.capabilities.map((cap) => {
                    const lockedOn =
                      cap.key === PROFILE_ADMIN_CAPABILITY && isOnlyProfileAdminRole && draft[cap.key];

                    const control = (
                      <Switch
                        checked={!!draft[cap.key]}
                        disabled={lockedOn}
                        onCheckedChange={(next) => setDraft((d) => ({ ...d, [cap.key]: next }))}
                        aria-label={cap.label}
                      />
                    );

                    return (
                      <div key={cap.key} className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm text-foreground">{cap.label}</p>
                          {cap.is_sensitive && (
                            <Badge variant="outline" className="text-xs font-normal">
                              dado sensível
                            </Badge>
                          )}
                        </div>

                        {lockedOn ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {/* span porque Switch desabilitado não emite eventos de ponteiro. */}
                              <span className="inline-flex shrink-0">{control}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Conceda a gestão de perfis a outro perfil antes de desligar aqui.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="shrink-0">{control}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <SheetFooter className="flex-row items-center justify-between gap-2 p-6">
          {deleteBlockedReason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button variant="ghost" size="sm" disabled className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{deleteBlockedReason}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty || !nameTrimmed || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Salvar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
