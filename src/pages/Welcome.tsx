import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.png';

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; justRegistered?: boolean } | null;

  useEffect(() => {
    if (!state?.justRegistered) {
      navigate('/login', { replace: true });
    }
  }, [state, navigate]);

  if (!state?.justRegistered) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <img src={logo} alt="Propulsr" className="h-16 w-16 mx-auto" />

          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-[scale-in_0.4s_ease-out]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Conta criada com sucesso! 🎉</h1>
            <p className="text-sm text-muted-foreground">
              Enviamos um e-mail de boas-vindas para{' '}
              <span className="font-medium text-foreground">{state.email}</span>.
              Verifique sua caixa de entrada — seu primeiro insight de rentabilidade está a 30 minutos de distância.
            </p>
          </div>

          <Button className="w-full" onClick={() => navigate('/dashboard')}>
            Acessar o Propulsr
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Welcome;
