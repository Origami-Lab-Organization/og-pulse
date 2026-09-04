/**
 * Perfis de acesso: papéis do tenant e a matriz papel × capacidade (ADR-0027).
 *
 * A tela que consome estes hooks configura DADO, não código: ligar uma capacidade para um
 * papel passa a valer no banco, porque a mesma linha é lida por `has_capability` nas
 * policies. Ver `.harness/capability-matrix.md` para o que cada capacidade significa.
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { accessProfileService } from '@/services/accessProfileService';
import {
  DOMAIN_LABELS,
  type CapabilityGroup,
  type CapabilityDB,
  type OverrideGroup,
  type OverrideWithPerson,
} from '@/types/accessProfile';

/**
 * O banco recusa por dois caminhos com mensagens de naturezas diferentes: a invariante do
 * último administrador devolve um texto já acionável, e vale mostrar como está; a RLS
 * devolve jargão ("new row violates row-level security policy"), que não diz nada a quem
 * está na tela.
 */
function humanizeError(error: unknown): string {
  const message = (error as { message?: string })?.message ?? '';

  if (message.includes('sem ninguem capaz de gerir perfis') || message.includes('sem ninguém capaz de gerir perfis')) {
    return 'Esta é a última fonte da capacidade de gerir perfis no tenant. Conceda-a a outro papel ou pessoa antes de removê-la daqui.';
  }
  if (message.includes('violates foreign key') && message.includes('user_tenant_roles')) {
    return 'Há pessoas com este papel. Mova-as para outro papel antes de removê-lo.';
  }
  if (message.includes('row-level security')) {
    return 'Você não tem permissão para esta alteração. Só admin do tenant altera perfis — e ninguém altera o próprio, nem sendo admin.';
  }
  if (message.includes('duplicate key') || message.includes('tenant_roles_tenant_id_name_key')) {
    return 'Já existe um papel com esse nome neste tenant.';
  }
  if (message.includes('user_capability_overrides') && message.includes('foreign key')) {
    return 'Esta capacidade não existe no vocabulário. Capacidade nova exige migration (ADR-0027).';
  }
  return message || 'Não foi possível concluir a alteração.';
}

export function useCapabilities() {
  return useQuery({
    queryKey: ['capabilities'],
    queryFn: () => accessProfileService.getCapabilities(),
    // Vocabulário é imutável em runtime (só migration muda): não precisa refetch.
    staleTime: Infinity,
  });
}

export function useTenantRoles() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['tenant-roles', tenantId],
    queryFn: () => accessProfileService.getRoles(tenantId!),
    enabled: !!tenantId,
  });
}

export function useRoleCapabilities() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['role-capabilities', tenantId],
    queryFn: () => accessProfileService.getRoleCapabilities(tenantId!),
    enabled: !!tenantId,
  });
}

/** Capacidades agrupadas por domínio — 48 linhas soltas não são legíveis. */
export function useCapabilityGroups(capabilities: CapabilityDB[]): CapabilityGroup[] {
  return useMemo(() => {
    const byDomain = new Map<string, CapabilityDB[]>();
    for (const c of capabilities) {
      const list = byDomain.get(c.domain) ?? [];
      list.push(c);
      byDomain.set(c.domain, list);
    }
    return [...byDomain.entries()]
      .map(([domain, caps]) => ({ domain, capabilities: caps }))
      .sort((a, b) =>
        (DOMAIN_LABELS[a.domain] ?? a.domain).localeCompare(DOMAIN_LABELS[b.domain] ?? b.domain, 'pt-BR'),
      );
  }, [capabilities]);
}

export function useSetRoleCapability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ roleId, capability, enabled }: { roleId: string; capability: string; enabled: boolean }) =>
      accessProfileService.setRoleCapability(roleId, capability, enabled, user?.id ?? null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-capabilities'] });
    },
    onError: (error) => {
      // Reverte o otimismo da tela: o estado real é o do banco.
      queryClient.invalidateQueries({ queryKey: ['role-capabilities'] });
      toast({
        title: 'Alteração não aplicada',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });
}

/**
 * Salva nome e capacidades de um papel numa operação, como o formulário sugere.
 *
 * A ordem importa: o nome primeiro, as capacidades depois. Se a gravação das capacidades
 * for recusada pela invariante do último administrador, o rename já aplicado é inofensivo
 * — o inverso deixaria o papel com as capacidades novas e o nome antigo.
 */
export function useSaveRoleProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      roleId,
      name,
      nameChanged,
      entries,
    }: {
      roleId: string;
      name: string;
      nameChanged: boolean;
      entries: { capability: string; enabled: boolean }[];
    }) => {
      if (nameChanged) await accessProfileService.renameRole(roleId, name);
      await accessProfileService.setRoleCapabilities(roleId, entries, user?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-capabilities'] });
      toast({ title: 'Perfil salvo' });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-capabilities'] });
      toast({ title: 'Não foi possível salvar', description: humanizeError(error), variant: 'destructive' });
    },
  });
}

export function usePeopleWithRole() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['people-with-role', tenantId],
    queryFn: () => accessProfileService.getPeopleWithRole(tenantId!),
    enabled: !!tenantId,
  });
}

/**
 * Move uma pessoa para um perfil.
 *
 * Não existe "remover do perfil": a PK garante um perfil por pessoa, e ficar sem nenhum
 * deixaria a pessoa sem acesso a nada quando a virada de PUL-201 acontecer. Tirar de um
 * perfil é sempre mover para outro — normalmente o padrão do tenant.
 */
export function useAssignRole() {
  const queryClient = useQueryClient();
  const { employee, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      accessProfileService.assignRole(userId, employee!.tenant_id, roleId, user?.id ?? null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people-with-role'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] });
      toast({ title: 'Perfil da pessoa atualizado' });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['people-with-role'] });
      toast({ title: 'Não foi possível mover', description: humanizeError(error), variant: 'destructive' });
    },
  });
}

export function useCreateTenantRole() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (name: string) => accessProfileService.createRole(employee!.tenant_id, name),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] });
      toast({
        title: 'Papel criado',
        description: `"${role.name}" começa sem nenhuma capacidade. Ligue as que ele deve ter na grade abaixo.`,
      });
    },
    onError: (error) => {
      toast({ title: 'Não foi possível criar o papel', description: humanizeError(error), variant: 'destructive' });
    },
  });
}

export function useRenameTenantRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ roleId, name }: { roleId: string; name: string }) =>
      accessProfileService.renameRole(roleId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] });
      toast({ title: 'Papel renomeado' });
    },
    onError: (error) => {
      toast({ title: 'Não foi possível renomear', description: humanizeError(error), variant: 'destructive' });
    },
  });
}

export function useDeleteTenantRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (roleId: string) => accessProfileService.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-capabilities'] });
      toast({ title: 'Papel removido' });
    },
    onError: (error) => {
      toast({ title: 'Não foi possível remover o papel', description: humanizeError(error), variant: 'destructive' });
    },
  });
}

/** Exceções por pessoa do tenant (PUL-210). */
export function useCapabilityOverrides() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['capability-overrides', tenantId],
    queryFn: () => accessProfileService.getOverrides(tenantId!),
    enabled: !!tenantId,
  });
}

/**
 * Exceções agrupadas por capacidade, e não por pessoa.
 *
 * O agrupamento é a resposta à pergunta que o ADR-0027 manda vigiar: se a mesma capacidade
 * aparece como exceção para várias pessoas, o que falta é um perfil, não mais exceções.
 */
export function useOverrideGroups(
  overrides: OverrideWithPerson[],
  capabilities: CapabilityDB[],
): OverrideGroup[] {
  return useMemo(() => {
    const meta = new Map(capabilities.map((c) => [c.key, c]));
    const byCapability = new Map<string, OverrideWithPerson[]>();
    for (const o of overrides) {
      const list = byCapability.get(o.capability) ?? [];
      list.push(o);
      byCapability.set(o.capability, list);
    }
    return [...byCapability.entries()]
      .map(([capability, list]) => ({
        capability,
        label: meta.get(capability)?.label ?? capability,
        domain: meta.get(capability)?.domain ?? '',
        is_sensitive: meta.get(capability)?.is_sensitive ?? false,
        overrides: [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      }))
      .sort((a, b) => b.overrides.length - a.overrides.length || a.label.localeCompare(b.label, 'pt-BR'));
  }, [overrides, capabilities]);
}

export function useSaveOverride() {
  const queryClient = useQueryClient();
  const { employee, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: { userId: string; capability: string; enabled: boolean; reason: string }) =>
      accessProfileService.setOverride({
        ...input,
        tenantId: employee!.tenant_id,
        actorId: user?.id ?? null,
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['capability-overrides'] });
      toast({
        title: input.enabled ? 'Exceção concedida' : 'Exceção registrada',
        description: input.enabled
          ? 'A pessoa passa a ter a capacidade, mesmo que o perfil dela não conceda.'
          : 'A pessoa perde a capacidade, mesmo que o perfil dela conceda.',
      });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['capability-overrides'] });
      toast({
        title: 'Exceção não registrada',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteOverride() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, capability }: { userId: string; capability: string }) =>
      accessProfileService.deleteOverride(userId, employee!.tenant_id, capability),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capability-overrides'] });
      toast({ title: 'Exceção removida', description: 'A pessoa volta a seguir o perfil dela.' });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['capability-overrides'] });
      toast({ title: 'Não foi possível remover', description: humanizeError(error), variant: 'destructive' });
    },
  });
}
