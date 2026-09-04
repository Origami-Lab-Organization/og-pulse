/**
 * Acesso às tabelas de perfil (ADR-0027).
 *
 * As tabelas são novas e ainda não constam em `src/integrations/supabase/types.ts`, que é
 * gerado. O cast segue o padrão que o projeto já usa para `user_roles` em
 * `src/pages/BudgetForm.tsx` e `src/services/vacationService.ts`. Quando os tipos forem
 * regerados, os casts saem.
 *
 * Toda escrita aqui é barrada duas vezes: pela policy (só admin do tenant, e ninguém
 * altera o próprio vínculo) e pela invariante do último administrador
 * (20260902170000_capability_last_admin_guard). A interface não é a barreira.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  CapabilityDB,
  OverrideWithPerson,
  PersonWithRole,
  RoleCapabilityDB,
  TenantRoleDB,
  TenantRoleWithUsage,
  UserCapabilityOverrideDB,
} from '@/types/accessProfile';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const accessProfileService = {
  /** Vocabulário completo, ordenado por domínio para a grade. */
  async getCapabilities(): Promise<CapabilityDB[]> {
    const { data, error } = await db
      .from('capabilities')
      .select('key, domain, label, description, is_sensitive')
      .order('domain')
      .order('key');
    if (error) throw error;
    return (data ?? []) as CapabilityDB[];
  },

  /** Papéis do tenant, com quantas pessoas cada um tem. */
  async getRoles(tenantId: string): Promise<TenantRoleWithUsage[]> {
    const { data, error } = await db
      .from('tenant_roles')
      .select('*, user_tenant_roles(user_id)')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) throw error;

    return ((data ?? []) as (TenantRoleDB & { user_tenant_roles?: unknown[] })[]).map((r) => ({
      ...r,
      people_count: r.user_tenant_roles?.length ?? 0,
    }));
  },

  /** Células habilitadas da matriz. Ausência de linha significa negado. */
  async getRoleCapabilities(tenantId: string): Promise<RoleCapabilityDB[]> {
    const { data, error } = await db
      .from('role_capabilities')
      .select('role_id, capability, enabled, updated_at, updated_by, tenant_roles!inner(tenant_id)')
      .eq('tenant_roles.tenant_id', tenantId);
    if (error) throw error;
    return (data ?? []) as RoleCapabilityDB[];
  },

  /**
   * Liga ou desliga uma capacidade para um papel.
   *
   * `upsert` porque a ausência de linha já significa negado: desligar pode ser tanto
   * gravar `enabled = false` quanto não ter linha, e manter a linha preserva a trilha
   * (quem desligou e quando).
   */
  async setRoleCapability(
    roleId: string,
    capability: string,
    enabled: boolean,
    actorId: string | null,
  ): Promise<void> {
    const { error } = await db
      .from('role_capabilities')
      .upsert(
        {
          role_id: roleId,
          capability,
          enabled,
          updated_at: new Date().toISOString(),
          updated_by: actorId,
        },
        { onConflict: 'role_id,capability' },
      );
    if (error) throw error;
  },

  /**
   * Grava a matriz de um papel inteiro numa chamada.
   *
   * A tela edita em rascunho e salva de uma vez — não a cada toggle. Além de ser o que a
   * pessoa espera de um formulário, isso evita um estado intermediário perigoso: salvando
   * por toggle, desligar `pessoa:editar-papel` para depois ligar em outro papel passaria
   * por um instante sem nenhum administrador, e a invariante do banco recusaria a
   * primeira metade da operação.
   */
  async setRoleCapabilities(
    roleId: string,
    entries: { capability: string; enabled: boolean }[],
    actorId: string | null,
  ): Promise<void> {
    if (entries.length === 0) return;

    const now = new Date().toISOString();
    const { error } = await db.from('role_capabilities').upsert(
      entries.map((e) => ({
        role_id: roleId,
        capability: e.capability,
        enabled: e.enabled,
        updated_at: now,
        updated_by: actorId,
      })),
      { onConflict: 'role_id,capability' },
    );
    if (error) throw error;
  },

  /**
   * Pessoas do tenant e o perfil de cada uma.
   *
   * Sai de `employees` porque é lá que estão nome e cargo; o vínculo mora em
   * `user_tenant_roles`, chaveado por `auth_id`. Quem não tem conta (`auth_id` nulo) não
   * pode ter perfil — não consegue entrar — então fica fora da lista.
   */
  async getPeopleWithRole(tenantId: string): Promise<PersonWithRole[]> {
    const { data, error } = await db
      .from('employees')
      .select('id, nome, cargo, auth_id, status')
      .eq('tenant_id', tenantId)
      .not('auth_id', 'is', null)
      .order('nome');
    if (error) throw error;

    const { data: links, error: linkError } = await db
      .from('user_tenant_roles')
      .select('user_id, role_id')
      .eq('tenant_id', tenantId);
    if (linkError) throw linkError;

    const roleByUser = new Map<string, string>(
      ((links ?? []) as { user_id: string; role_id: string }[]).map((l) => [l.user_id, l.role_id]),
    );

    return ((data ?? []) as { id: string; nome: string; cargo: string; auth_id: string; status: string }[]).map(
      (e) => ({
        employeeId: e.id,
        userId: e.auth_id,
        nome: e.nome,
        cargo: e.cargo,
        status: e.status,
        roleId: roleByUser.get(e.auth_id) ?? null,
      }),
    );
  },

  /**
   * Move uma pessoa para um perfil.
   *
   * A PK (user_id, tenant_id) garante um perfil por pessoa, então o upsert substitui o
   * vínculo anterior — não há como acumular. O banco recusa se o alvo for a própria pessoa
   * (policy) ou se a mudança deixar o tenant sem quem gere perfis (invariante).
   */
  async assignRole(userId: string, tenantId: string, roleId: string, actorId: string | null): Promise<void> {
    const { error } = await db.from('user_tenant_roles').upsert(
      {
        user_id: userId,
        tenant_id: tenantId,
        role_id: roleId,
        updated_at: new Date().toISOString(),
        updated_by: actorId,
      },
      { onConflict: 'user_id,tenant_id' },
    );
    if (error) throw error;
  },

  async createRole(tenantId: string, name: string): Promise<TenantRoleDB> {
    const { data, error } = await db
      .from('tenant_roles')
      .insert({ tenant_id: tenantId, name: name.trim() })
      .select()
      .single();
    if (error) throw error;
    return data as TenantRoleDB;
  },

  async renameRole(roleId: string, name: string): Promise<void> {
    const { error } = await db
      .from('tenant_roles')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', roleId);
    if (error) throw error;
  },

  /**
   * Remove um papel. O banco recusa se houver pessoa atribuída (ON DELETE RESTRICT em
   * `user_tenant_roles.role_id`) ou se for o último com capacidade administrativa.
   */
  /**
   * Nome do perfil de uma pessoa. `null` quando ela não tem vínculo, ou quando quem
   * consulta não pode ler o vínculo — a tela distingue os dois casos pelo estado da query,
   * e nunca inventa um nome.
   */
  async getProfileNameForUser(userId: string, tenantId: string): Promise<string | null> {
    const { data, error } = await db
      .from('user_tenant_roles')
      .select('tenant_roles!inner(name)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw error;
    return (data as { tenant_roles?: { name?: string } } | null)?.tenant_roles?.name ?? null;
  },

  async deleteRole(roleId: string): Promise<void> {
    const { error } = await db.from('tenant_roles').delete().eq('id', roleId);
    if (error) throw error;
  },

  /**
   * Exceções do tenant, com nome da pessoa e papel dela.
   *
   * A tabela guarda `user_id` (conta), e nome mora em `employees` — não há relação
   * declarada entre as duas, então o cruzamento é feito aqui, e não por join do PostgREST.
   * Exceção de conta sem funcionário correspondente ainda aparece, sem nome, porque
   * esconder da listagem uma exceção que o banco aplica é o defeito que esta tela combate.
   */
  async getOverrides(tenantId: string): Promise<OverrideWithPerson[]> {
    const [overrides, people, roles, cells] = await Promise.all([
      db
        .from('user_capability_overrides')
        .select('user_id, tenant_id, capability, enabled, reason, updated_at, updated_by')
        .eq('tenant_id', tenantId),
      db.from('employees').select('nome, cargo, auth_id').eq('tenant_id', tenantId).not('auth_id', 'is', null),
      db.from('user_tenant_roles').select('user_id, role_id, tenant_roles!inner(id, name)').eq('tenant_id', tenantId),
      db
        .from('role_capabilities')
        .select('role_id, capability, enabled, tenant_roles!inner(tenant_id)')
        .eq('tenant_roles.tenant_id', tenantId),
    ]);
    for (const r of [overrides, people, roles, cells]) if (r.error) throw r.error;

    const byUser = new Map(
      ((people.data ?? []) as { nome: string; cargo: string; auth_id: string }[]).map((e) => [e.auth_id, e]),
    );
    const roleOfUser = new Map(
      ((roles.data ?? []) as { user_id: string; role_id: string; tenant_roles: { name: string } }[]).map((l) => [
        l.user_id,
        { id: l.role_id, name: l.tenant_roles?.name ?? null },
      ]),
    );
    const roleGrants = new Set(
      ((cells.data ?? []) as { role_id: string; capability: string; enabled: boolean }[])
        .filter((c) => c.enabled)
        .map((c) => `${c.role_id}::${c.capability}`),
    );

    return ((overrides.data ?? []) as UserCapabilityOverrideDB[]).map((o) => {
      const person = byUser.get(o.user_id);
      const role = roleOfUser.get(o.user_id);
      return {
        ...o,
        nome: person?.nome ?? 'Conta sem funcionário ativo',
        cargo: person?.cargo ?? '',
        roleName: role?.name ?? null,
        grantedByRole: role ? roleGrants.has(`${role.id}::${o.capability}`) : false,
      };
    });
  },

  /**
   * Cria ou substitui uma exceção. `reason` é exigido pela interface, não pelo banco: o
   * campo é anulável no esquema, e exceção sem motivo registrado é a dívida que esta tela
   * existe para evitar.
   *
   * O banco recusa exceção para si mesmo (`user_id <> auth.uid()` na policy) e recusa
   * revogar a última fonte da capacidade de gerir perfis (invariante 20260902170000).
   */
  async setOverride(input: {
    userId: string;
    tenantId: string;
    capability: string;
    enabled: boolean;
    reason: string;
    actorId: string | null;
  }): Promise<void> {
    const { error } = await db.from('user_capability_overrides').upsert(
      {
        user_id: input.userId,
        tenant_id: input.tenantId,
        capability: input.capability,
        enabled: input.enabled,
        reason: input.reason.trim(),
        updated_at: new Date().toISOString(),
        updated_by: input.actorId,
      },
      { onConflict: 'user_id,tenant_id,capability' },
    );
    if (error) throw error;
  },

  /**
   * Remove a exceção: a pessoa volta a seguir o perfil. Não é o mesmo que criar exceção
   * revogando — remover devolve a decisão ao papel, revogar sobrepõe-se a ele.
   */
  async deleteOverride(userId: string, tenantId: string, capability: string): Promise<void> {
    const { error } = await db
      .from('user_capability_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('capability', capability);
    if (error) throw error;
  },
};
