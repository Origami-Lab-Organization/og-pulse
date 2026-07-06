import { describe, expect, it } from 'vitest';
import { mapRequesterRole, resolveApprovers, resolveRequestStatus } from '@/lib/vacationApproval';

describe('mapRequesterRole', () => {
  it('admin tem precedência mesmo com is_gerente true', () => {
    expect(mapRequesterRole(true, true)).toBe('admin');
  });

  it('gerente puro (is_gerente sem admin) → manager', () => {
    expect(mapRequesterRole(false, true)).toBe('manager');
  });

  it('funcionário comum → user', () => {
    expect(mapRequesterRole(false, false)).toBe('user');
  });
});

describe('resolveApprovers', () => {
  const adminIds = ['admin-1', 'admin-2'];

  it('admin que solicita é auto-aprovado, sem aprovadores', () => {
    const r = resolveApprovers({
      requesterId: 'admin-1',
      requesterRole: 'admin',
      projectManagerIds: [],
      adminIds,
    });
    expect(r.autoApprove).toBe(true);
    expect(r.approverIds).toEqual([]);
  });

  it('gerente que solicita é aprovado pelos admins (excluindo a si mesmo)', () => {
    const r = resolveApprovers({
      requesterId: 'admin-1',
      requesterRole: 'manager',
      projectManagerIds: ['mgr-x'],
      adminIds,
    });
    expect(r.autoApprove).toBe(false);
    expect(r.approverIds).toEqual(['admin-2']);
  });

  it('funcionário com vários projetos exige todos os gerentes distintos', () => {
    const r = resolveApprovers({
      requesterId: 'emp-1',
      requesterRole: 'user',
      projectManagerIds: ['mgr-a', 'mgr-b'],
      adminIds,
    });
    expect(r.approverIds).toEqual(['mgr-a', 'mgr-b']);
  });

  it('deduplica gerente que se repete em vários projetos', () => {
    const r = resolveApprovers({
      requesterId: 'emp-1',
      requesterRole: 'user',
      projectManagerIds: ['mgr-a', 'mgr-a', 'mgr-b'],
      adminIds,
    });
    expect(r.approverIds).toEqual(['mgr-a', 'mgr-b']);
  });

  it('exclui o próprio funcionário da lista de gerentes', () => {
    const r = resolveApprovers({
      requesterId: 'mgr-a',
      requesterRole: 'user',
      projectManagerIds: ['mgr-a', 'mgr-b'],
      adminIds,
    });
    expect(r.approverIds).toEqual(['mgr-b']);
  });

  it('funcionário sem projeto ativo cai para os admins', () => {
    const r = resolveApprovers({
      requesterId: 'emp-1',
      requesterRole: 'user',
      projectManagerIds: [],
      adminIds,
    });
    expect(r.approverIds).toEqual(adminIds);
  });

  it('funcionário cujos únicos gerentes são ele mesmo cai para os admins', () => {
    const r = resolveApprovers({
      requesterId: 'emp-1',
      requesterRole: 'user',
      projectManagerIds: ['emp-1'],
      adminIds,
    });
    expect(r.approverIds).toEqual(adminIds);
  });
});

describe('resolveRequestStatus', () => {
  it('todos aprovaram → approved', () => {
    expect(resolveRequestStatus(['approved', 'approved'])).toBe('approved');
  });

  it('qualquer rejeição → rejected (mesmo com aprovações e pendentes)', () => {
    expect(resolveRequestStatus(['approved', 'rejected', 'pending'])).toBe('rejected');
  });

  it('algum pendente → pending', () => {
    expect(resolveRequestStatus(['approved', 'pending'])).toBe('pending');
  });

  it('lista vazia → pending', () => {
    expect(resolveRequestStatus([])).toBe('pending');
  });
});
