import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearPrivatePwaCaches } from '@/lib/pwa';
import { acquireMicrosoftIdToken } from '@/integrations/microsoft/msalClient';

interface EmployeeData {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  tenant_id: string;
  is_gerente: boolean;
  must_change_password: boolean;
  isAdmin: boolean;
  isRH: boolean;
  jornada_diaria: number;
}

const PWA_EMPLOYEE_SNAPSHOT = 'pulse-pwa-employee-snapshot';
const SNAPSHOT_TTL = 24 * 60 * 60 * 1000;

function readEmployeeSnapshot(userId: string): EmployeeData | null {
  try {
    const snapshot = JSON.parse(localStorage.getItem(PWA_EMPLOYEE_SNAPSHOT) || 'null') as { userId: string; savedAt: number; employee: EmployeeData } | null;
    if (!snapshot || snapshot.userId !== userId || Date.now() - snapshot.savedAt >= SNAPSHOT_TTL) return null;
    return snapshot.employee;
  } catch {
    return null;
  }
}

function saveEmployeeSnapshot(userId: string, employee: EmployeeData) {
  localStorage.setItem(PWA_EMPLOYEE_SNAPSHOT, JSON.stringify({ userId, savedAt: Date.now(), employee }));
}

/**
 * `functions.invoke` embrulha respostas não-2xx num erro genérico e deixa o
 * corpo em `context`. A mensagem da função é acionável para o usuário ("não
 * encontramos funcionário ativo"), então vale desembrulhar.
 */
async function readFunctionError(error: unknown): Promise<string> {
  const response = (error as { context?: Response })?.context;
  try {
    const body = await response?.json();
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // Corpo ilegível — cai na mensagem genérica.
  }
  return 'Não foi possível entrar com a Microsoft.';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: EmployeeData | null;
  loading: boolean;
  /** Autenticou no Supabase, mas não há funcionário ativo correspondente. */
  accessDenied: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMicrosoft: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchEmployeeData = async (userId: string, opts?: { signOutIfInactive?: boolean }) => {
    if (!navigator.onLine) return readEmployeeSnapshot(userId);
    // Check if user is in blocked_users table (set by trigger on status change)
    const { data: blocked } = await supabase
      .from('blocked_users')
      .select('auth_id')
      .eq('auth_id', userId)
      .maybeSingle();

    if (blocked) {
      if (opts?.signOutIfInactive) {
        await supabase.auth.signOut();
      }
      return null;
    }

    // Also check employee status via security definer function
    const { data: status } = await supabase.rpc('get_employee_status', { p_auth_id: userId });

    if (!status) {
      console.error('Employee not found for auth_id:', userId);
      return null;
    }

    if (opts?.signOutIfInactive && (status === 'bloqueado' || status === 'arquivado')) {
      await supabase.auth.signOut();
      return null;
    }

    // Fetch employee data
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('id, nome, email, cargo, tenant_id, must_change_password, jornada_diaria')
      .eq('auth_id', userId)
      .single();

    if (empError) {
      console.error('Error fetching employee data:', empError);
      return null;
    }

    // Check user roles (admin and/or manager) from user_roles table
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', empData.tenant_id);

    const roleSet = new Set((roles || []).map(r => r.role));
    const isAdmin = roleSet.has('admin');
    const isManager = roleSet.has('manager') || isAdmin;
    const isRH = roleSet.has('rh') || isAdmin;

    const employeeData = {
      ...empData,
      is_gerente: isManager, // backward compat — will be removed once all refs migrated
      isAdmin,
      isRH,
    } as EmployeeData;
    saveEmployeeSnapshot(userId, employeeData);
    return employeeData;
  };

  // Sessão sem funcionário ativo derruba a sessão e sinaliza o motivo para a
  // tela de login em vez de falhar em silêncio.
  const applyEmployeeResult = (employeeData: EmployeeData | null) => {
    setEmployee(employeeData);
    // Offline sem snapshot também cai aqui e não é negação de acesso.
    setAccessDenied(!employeeData && navigator.onLine);
    if (!employeeData) {
      setUser(null);
      setSession(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // USER_UPDATED fires when updateUser() is called (e.g. password change).
        // updatePassword() already handles the employee state refresh after updating
        // must_change_password in the DB, so re-fetching here would create a race
        // condition that overwrites the correct state with a stale value.
        if (event === 'USER_UPDATED') {
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(async () => {
            const employeeData = await fetchEmployeeData(session.user.id, { signOutIfInactive: true });
            applyEmployeeResult(employeeData);
            setLoading(false);
          }, 0);
        } else {
          setEmployee(null);
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const employeeData = await fetchEmployeeData(session.user.id, { signOutIfInactive: true });
        applyEmployeeResult(employeeData);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update status to 'ativo' when user logs in (if still pending)
  const activateEmployeeOnLogin = async (userId: string) => {
    const { data: empData } = await supabase
      .from('employees')
      .select('id, status')
      .eq('auth_id', userId)
      .single();

    if (empData && empData.status === 'aguardando_confirmacao') {
      await supabase
        .from('employees')
        .update({ status: 'ativo' })
        .eq('id', empData.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Check if employee is blocked
      const { data: empData } = await supabase
        .from('employees')
        .select('id, status')
        .eq('auth_id', data.user.id)
        .single();

      if (empData?.status === 'bloqueado') {
        await supabase.auth.signOut();
        return { error: new Error('Sua conta foi bloqueada. Entre em contato com o administrador.') };
      }

      if (empData?.status === 'arquivado') {
        await supabase.auth.signOut();
        return { error: new Error('Sua conta foi arquivada. Entre em contato com o administrador.') };
      }

      // Activate employee on successful login (if awaiting confirmation)
      await activateEmployeeOnLogin(data.user.id);
    }

    return { error: error as Error | null };
  };

  /**
   * Login pela identidade Microsoft. Convive com e-mail/senha de propósito: se
   * a Edge Function falhar, ninguém fica trancado fora do sistema.
   *
   * A validação da identidade acontece na função `microsoft-sso` — o front
   * apenas transporta a prova e troca o retorno por sessão.
   */
  const signInWithMicrosoft = async () => {
    try {
      const idToken = await acquireMicrosoftIdToken();

      const { data, error } = await supabase.functions.invoke('microsoft-sso', {
        body: { idToken },
      });

      if (error) {
        return { error: new Error(await readFunctionError(error)) };
      }

      const tokenHash = (data as { tokenHash?: string } | null)?.tokenHash;
      if (!tokenHash) {
        return { error: new Error('Resposta inesperada ao entrar com a Microsoft.') };
      }

      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });

      if (sessionError) {
        console.error('Falha ao abrir sessão via Microsoft:', sessionError.message);
        return { error: new Error('Não foi possível abrir sua sessão. Tente novamente.') };
      }

      return { error: null };
    } catch (error) {
      console.error('Falha no login com Microsoft:', error);
      return {
        error: new Error(
          'Não foi possível entrar com a Microsoft. Verifique se a janela de login foi concluída.',
        ),
      };
    }
  };

  const signOut = async () => {
    await clearPrivatePwaCaches();
    setAccessDenied(false);
    localStorage.removeItem(PWA_EMPLOYEE_SNAPSHOT);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setEmployee(null);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error as Error | null };
    }

    // Clear must_change_password and activate the employee via a SECURITY
    // DEFINER RPC. A direct UPDATE from the client fails because the
    // prevent_employee_self_escalation trigger blocks status changes by
    // the user themselves — which silently kept must_change_password=true
    // and trapped the user on /change-password.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase.rpc as any)('complete_password_change');
    if (rpcError) {
      console.error('Error finalizing password change:', rpcError);
      return { error: rpcError as Error | null };
    }

    // Optimistically update local state so ProtectedRoute does not
    // redirect back to /change-password before the next fetch resolves.
    if (employee) {
      setEmployee({ ...employee, must_change_password: false });
    }

    // Refresh from the DB to keep state authoritative.
    if (user) {
      const updatedEmployee = await fetchEmployeeData(user.id);
      if (updatedEmployee) {
        setEmployee(updatedEmployee);
      }
    }

    return { error: null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      employee,
      loading,
      accessDenied,
      signIn,
      signInWithMicrosoft,
      signOut,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
