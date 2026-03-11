import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import logo from '@/assets/logo.png';

const Header = () => {
  const { employee, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="border-b border-border bg-card shadow-card">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Propulsr" className="h-10 w-10" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Propulsr</h1>
            <p className="text-xs text-muted-foreground">Gestão de Equipes</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-6">
          <a 
            href="/" 
            className="text-sm font-medium text-foreground transition-colors hover:text-secondary"
          >
            Funcionários
          </a>
          {employee?.is_gerente && (
            <a 
              href="/clients" 
              className="text-sm font-medium text-foreground transition-colors hover:text-secondary"
            >
              Clientes
            </a>
          )}
          <span className="text-sm text-muted-foreground cursor-not-allowed">
            Projetos
          </span>
          <span className="text-sm text-muted-foreground cursor-not-allowed">
            Orçamentos
          </span>
        </nav>

        {employee && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{employee.nome}</span>
              {employee.is_gerente && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
