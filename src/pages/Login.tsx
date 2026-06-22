import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Pré-preenche o e-mail quando o acesso vem do link de convite (?email=...).
  const invitedEmail = searchParams.get('email') ?? '';
  const from = location.state?.from?.pathname || '/';

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: invitedEmail,
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    // ANTES de validar a senha: se a conta precisa de primeiro acesso, dispara o
    // magic link automaticamente (independente do que foi digitado na senha) e leva
    // para a confirmação de envio. O link de acesso vai por e-mail (não é exposto ao
    // navegador) — é o caminho seguro para "entrar via magic link".
    // RPC fora dos tipos gerados — segue o padrão de cast já usado no projeto.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: status } = await (supabase.rpc as any)('first_access_status', {
        p_email: data.email,
      });

      if (status === 'pending') {
        await supabase.functions.invoke('request-first-access', {
          body: { email: data.email, loginUrl: `${window.location.origin}/login` },
        });
        toast({
          title: 'Primeiro acesso necessário',
          description:
            'Você ainda não definiu sua senha. Enviamos um link de primeiro acesso para o seu e-mail — acesse por ele para criar sua senha.',
        });
        navigate(
          `/reenviar-primeiro-acesso?email=${encodeURIComponent(data.email)}&sent=1`,
          { replace: true },
        );
        return;
      }
    } catch {
      // Se a verificação falhar (ex.: RPC indisponível), segue o login normal.
    }

    const { error } = await signIn(data.email, data.password);

    if (error) {
      toast({
        title: 'Erro ao fazer login',
        description:
          'Email ou senha incorretos. Se você recebeu um convite, verifique o e-mail de primeiro acesso.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Login realizado com sucesso',
      description: 'Bem-vindo de volta!',
    });

    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — navy com gradiente de marca */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(222,18%,10%)] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-brand opacity-10" />
        <div className="relative z-10 text-center">
          <img src={logo} alt="Origami Pulse" className="h-20 w-20 mx-auto mb-8" />
          <h1 className="ol-h1 text-white mb-4">
            Gestão que gera{' '}
            <span className="ol-text-accent">resultado real.</span>
          </h1>
          <p className="text-white/60 text-base max-w-sm mx-auto">
            Controle projetos, equipe e rentabilidade em um só lugar.
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logo} alt="Origami Pulse" className="h-14 w-14" />
          </div>

          <div className="mb-8">
            <p className="ol-label text-muted-foreground mb-2">Plataforma</p>
            <h2 className="ol-h2 text-foreground">
              Origami <span className="ol-text-accent">Pulse</span>
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Gerencie a rentabilidade dos seus projetos com clareza.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Link
                  to="/esqueci-minha-senha"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <Button variant="gradient" type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>

            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
