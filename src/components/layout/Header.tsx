import logo from '@/assets/logo.png';

const Header = () => {
  return (
    <header className="border-b border-border bg-card shadow-card">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Origami Pulse" className="h-10 w-10" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Origami Pulse</h1>
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
          <span className="text-sm text-muted-foreground cursor-not-allowed">
            Projetos
          </span>
          <span className="text-sm text-muted-foreground cursor-not-allowed">
            Orçamentos
          </span>
        </nav>
      </div>
    </header>
  );
};

export default Header;
