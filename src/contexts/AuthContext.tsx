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

  const fetchEmployeeData = async (userId: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, nome, email, cargo, tenant_id, is_gerente, must_change_password')
      .eq('auth_id', userId)
      .single();

    if (error) {
      console.error('Error fetching employee data:', error);
      return null;
    }

    return data as EmployeeData;
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
            const employeeData = await fetchEmployeeData(session.user.id);
            setEmployee(employeeData);
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
        const employeeData = await fetchEmployeeData(session.user.id);
        setEmployee(employeeData);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
      // Update must_change_password to false and clear temp_password
      await supabase
        .from('employees')
        .update({ 
          must_change_password: false,
          temp_password: null 
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
