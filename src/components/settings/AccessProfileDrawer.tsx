/**
 * Edição de um perfil de acesso — o que ele permite e quem o tem (ADR-0027).
 *
 * Segue o padrão de `apps/equipe` do projete.app: entra-se no perfil e edita ali, em vez
 * de operar uma matriz de todos os papéis ao mesmo tempo. Editar é uma tarefa sobre UM
 * perfil; a matriz servia para auditar, não para trabalhar.
 *
 * As capacidades são editadas em rascunho com salvar explícito. Além de ser o que um
 * formulário promete, isso evita um estado intermediário que o banco recusaria: salvando a
 * cada toggle, mover a gestão de perfis de um papel para outro passaria por um instante
 * sem nenhum administrador no tenant.
 *
 * O vínculo com pessoas, ao contrário, aplica na hora — é uma ação sobre um registro, não
 * a edição de um formulário.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ShieldAlert, Trash2, UserPlus, Users } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DOMAIN_LABELS,
  PROFILE_ADMIN_CAPABILITY,
  type CapabilityGroup,
  type PersonWithRole,
  type TenantRoleWithUsage,
} from '@/types/accessProfile';

interface AccessProfileDrawerProps {
  role: TenantRoleWithUsage | null;
  groups: CapabilityGroup[];
  /** Capacidades habilitadas do perfil aberto. */
  enabledKeys: Set<string>;
  /** Quantos perfis do tenant concedem a gestão de perfis, incluindo este. */
  profileAdminRoleCount: number;
  /** Todas as pessoas do tenant que têm conta, e o perfil de cada uma. */
  people: PersonWithRole[];
  /** `auth.uid()` de quem está mexendo — não pode alterar o próprio vínculo. */
  currentUserId: string | null;
  saving: boolean;
  assigning: boolean;
  onAssign: (userId: string, roleId: string) => void;
  onClose: () => void;
  onSave: (input: {
    name: string;
    nameChanged: boolean;
    entries: { capability: string; enabled: boolean }[];
  }) => void;
  onDelete: () => void;
}

export function AccessProfileDrawer({
  role,
  groups,
  enabledKeys,
  profileAdminRoleCount,
  people,
  currentUserId,
  saving,
  assigning,
  onAssign,
  onClose,
  onSave,
  onDelete,
}: AccessProfileDrawerProps) {
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [peopleQuery, setPeopleQuery] = useState('');

  // Rascunho reinicia a cada perfil aberto: o estado do formulário é do perfil, não da tela.
  useEffect(() => {
    if (!role) return;
    setName(role.name);
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      for (const cap of group.capabilities) next[cap.key] = enabledKeys.has(cap.key);
    }
    setDraft(next);
    setPeopleQuery('');
  }, [role, groups, enabledKeys]);

  const totalCapabilities = useMemo(
    () => groups.reduce((sum, g) => sum + g.capabilities.length, 0),
    [groups],
  );
  const activeCount = useMemo(() => Object.values(draft).filter(Boolean).length, [draft]);

  const membersOfRole = useMemo(
    () => (role ? people.filter((p) => p.roleId === role.id) : []),
    [people, role],
  );
  const candidates = useMemo(() => {
    if (!role) return [];
    const q = peopleQuery.trim().toLowerCase();
    return people
      .filter((p) => p.roleId !== role.id)
      .filter((p) => !q || p.nome.toLowerCase().includes(q) || p.cargo.toLowerCase().includes(q));
  }, [people, role, peopleQuery]);

  /**
   * Este perfil é a única fonte da gestão de perfis? Nesse caso desligar a capacidade aqui
   * é o que a invariante do banco recusa (20260902170000) — a interface antecipa, em vez de
   * deixar a pessoa salvar e receber erro.
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
      ? 'Há pessoas com este perfil. Mova-as para outro antes de remover.'
      : isOnlyProfileAdminRole
        ? 'É o único perfil que concede a gestão de perfis. Remover deixaria o tenant sem administração.'
        : null;

  return (
    <Sheet open={!!role} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1.5 p-6 pb-4">
          <SheetTitle>{role?.name}</SheetTitle>
          <SheetDescription>
            {activeCount} de {totalCapabilities} capacidades ativas
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <Tabs defaultValue="capacidades" className="flex min-h-0 flex-1 flex-col">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="capacidades">O que pode</TabsTrigger>
              <TabsTrigger value="pessoas" className="gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Pessoas
                <span className="tabular-nums text-muted-foreground">({membersOfRole.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="capacidades" className="mt-0 min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
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

                  <div className="space-y-4">
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
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm text-foreground">{cap.label}</p>
                              {cap.is_sensitive && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  dado sensível
                                </Badge>
                              )}
                            </div>
                            {cap.description && (
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {cap.description}
                              </p>
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
          </TabsContent>

          <TabsContent value="pessoas" className="mt-0 min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Com este perfil
              </h3>

              {membersOfRole.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Ninguém tem este perfil ainda. Use a busca abaixo para mover alguém para cá.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {membersOfRole.map((person) => (
                    <li key={person.userId} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                          {person.nome}
                          {person.userId === currentUserId && (
                            <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{person.cargo}</p>
                      </div>
                      {person.status !== 'ativo' && (
                        <Badge variant="outline" className="shrink-0 text-xs font-normal">
                          {person.status}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs leading-relaxed text-muted-foreground">
                Cada pessoa tem exatamente um perfil, então não existe remover daqui: para tirar
                alguém deste perfil, mova-a para outro. Ninguém altera o próprio vínculo, nem sendo
                admin.
              </p>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mover alguém para este perfil
              </h3>

              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={peopleQuery}
                  onChange={(e) => setPeopleQuery(e.target.value)}
                  placeholder="Buscar por nome ou cargo"
                  className="pl-9"
                  aria-label="Buscar pessoa para mover para este perfil"
                />
              </div>

              {candidates.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {peopleQuery.trim()
                    ? 'Ninguém encontrado com esse termo.'
                    : 'Todas as pessoas com conta já estão neste perfil.'}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {candidates.slice(0, 40).map((person) => {
                    const isSelf = person.userId === currentUserId;

                    return (
                      <li key={person.userId} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">
                            {person.nome}
                            {isSelf && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{person.cargo}</p>
                        </div>

                        {isSelf ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex shrink-0">
                                <Button variant="outline" size="sm" disabled>
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Mover
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Ninguém altera o próprio perfil. Pedir a outro admin é o caminho.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            disabled={assigning}
                            onClick={() => role && onAssign(person.userId, role.id)}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Mover
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {candidates.length > 40 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando 40 de {candidates.length}. Refine a busca para encontrar quem procura.
                </p>
              )}
            </section>
          </TabsContent>
        </Tabs>

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
              Fechar
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
