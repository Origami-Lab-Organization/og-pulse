import { useAuth } from '@/contexts/AuthContext';
import Dashboard from './Dashboard';
import DashboardComercial from './DashboardComercial';

export default function DashboardRouter() {
  const { employee } = useAuth();
  if (employee?.is_gerente || employee?.isAdmin) return <DashboardComercial />;
  return <Dashboard />;
}
