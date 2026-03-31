import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeData {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  tenant_id: string;
  is_gerente: boolean;
  must_change_password: boolean;
  isAdmin: boolean;
  jornada_diaria: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: EmployeeData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
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

  const fetchEmployeeData = async (userId: string, opts?: { signOutIfInactive?: boolean }) => {
    // Check employee status via security definer function first
    const { data: status } = await supabase.rpc('get_employee_status', { p_auth_id: userId });

    if (!status) {
      console.error('Employee not found for auth_id:', userId);
      return null;
    }

    // Block inactive users on session restore (not just login)
    if (opts?.signOutIfInactive && (status === 'bloqueado' || status === 'arquivado')) {
      await supabase.auth.signOut();
      return null;
    }

    // Fetch employee data
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('id, nome, email, cargo, tenant_id, is_gerente, must_change_password, jornada_diaria')
      .eq('auth_id', userId)
      .single();

    if (empError) {
      console.error('Error fetching employee data:', empError);
      return null;
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', empData.tenant_id)
      .eq('role', 'admin')
      .maybeSingle();

    return {
      ...empData,
      isAdmin: !!roleData,
    } as EmployeeData;
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(async () => {
            const employeeData = await fetchEmployeeData(session.user.id, { signOutIfInactive: true });
            setEmployee(employeeData);
            if (!employeeData) {
              setUser(null);
              setSession(null);
            }
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
        setEmployee(employeeData);
        if (!employeeData) {
          setUser(null);
          setSession(null);
        }
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setEmployee(null);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (!error && employee) {
      // Update must_change_password to false, clear temp_password, and set status to 'ativo'
      await supabase
        .from('employees')
        .update({ 
          must_change_password: false,
          temp_password: null,
          status: 'ativo'
        })
        .eq('id', employee.id);

      // Refresh employee data
      const updatedEmployee = await fetchEmployeeData(user!.id);
      setEmployee(updatedEmployee);
    }

    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      employee,
      loading,
      signIn,
      signOut,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
