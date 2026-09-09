import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { SITE } from '@/landing/content';
import logo from '@/assets/logo.png';

/**
 * Período de teste encerrado (PUL-228, camada de tela). Quem chega aqui tem sessão, mas o
 * tenant está com `plan = trial` e prazo vencido. Nada foi apagado: quando a Origami
 * reativa o plano, a pessoa entra de novo e encontra tudo como estava.
 */
const TesteEncerrado = () => {
  const navigate = useNavigate();
  const { employee, signOut } = useAuth();
  const subject = encodeURIComponent('Origami Pulse: quero continuar usando');
  const body = encodeURIComponent(
    `Olá! Meu período de teste no Pulse terminou e quero continuar usando.\n\nEmpresa: \nResponsável: ${employee?.nome ?? ''}\nE-mail: ${employee?.email ?? ''}`,
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 pb-8 pt-8 text-center">
          <img src={logo} alt="Origami Pulse" className="mx-auto h-14 w-14" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-subtle text-warning" aria-hidden="true">
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Seu período de teste terminou</h1>
            <p className="text-sm text-muted-foreground">
              Os 14 dias de teste da sua empresa acabaram. Seus dados continuam guardados e nada foi apagado. Para seguir
              usando o Pulse, fale com a Origami Lab: liberamos o acesso e tudo volta como estava.
            </p>
          </div>
          <div className="space-y-3">
            <Button className="w-full" asChild>
              <a href={`mailto:${SITE.contactEmail}?subject=${subject}&body=${body}`}>
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                Escrever para {SITE.contactEmail}
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TesteEncerrado;
