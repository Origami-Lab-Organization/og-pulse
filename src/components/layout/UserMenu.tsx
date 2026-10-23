import { Footprints, Gauge, LogOut, KeyRound, Moon, Sun, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingModal } from '@/components/onboarding/OnboardingProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

/** Foto do cadastro, pelo diretório (identidade, sem dado sensível — PUL-162), não pelo login. */
function useOwnPhotoUrl(employeeId: string | undefined): string | undefined {
  const { byId } = useEmployeeDirectoryMap(Boolean(employeeId));
  if (!employeeId) return undefined;
  return byId.get(employeeId)?.foto_url || undefined;
}

export function UserMenu() {
  const { employee, signOut, can } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { openOnboarding } = useOnboardingModal();
  const photoUrl = useOwnPhotoUrl(employee?.id);

  if (!employee) return null;

  const initials = employee.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Mesmo tamanho dos botões vizinhos na barra do topo (sino, notas). */}
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu da conta">
          <Avatar className="h-8 w-8">
            {/* Foto do cadastro; sem foto (ou se falhar ao carregar), ficam as iniciais. */}
            <AvatarImage src={photoUrl} alt="" className="object-cover" />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{employee.nome}</p>
              {employee.is_gerente && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {employee.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={(e) => {
            e.preventDefault();
            toggleTheme();
          }}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {isDark ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span>Modo Escuro</span>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/change-password')}>
          <KeyRound className="mr-2 h-4 w-4" />
          <span>Alterar Senha</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openOnboarding()}>
          <Sparkles className="mr-2 h-4 w-4" />
          <span>Refazer onboarding</span>
        </DropdownMenuItem>
        {/* Navega em vez de reativar direto: a trilha vive na Ajuda, e reativar do menu sem
            mostrar o que falta deixaria a pessoa sem saber o que voltou (PUL-250). */}
        {can('configuracao:editar') && (
          <DropdownMenuItem onClick={() => navigate('/ajuda')}>
            <Footprints className="mr-2 h-4 w-4" />
            <span>Primeiros passos</span>
          </DropdownMenuItem>
        )}
        {employee.isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin/perfis')}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
          </>
        )}
        {/* Só quem opera o produto: a capacidade existe apenas no tenant da Origami. */}
        {can('plataforma:ler-uso') && (
          <DropdownMenuItem onClick={() => navigate('/uso')}>
            <Gauge className="mr-2 h-4 w-4" />
            <span>Uso dos clientes</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
