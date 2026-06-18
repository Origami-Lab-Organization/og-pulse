import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Loader2, KeyRound, ShieldCheck, Eye, EyeOff, Check, X, MailWarning } from 'lucide-react';
import logo from '@/assets/logo.png';

// Destino após o primeiro acesso. J2 (Onboarding) ainda não existe como rota —
// enquanto isso, a home autenticada do sistema é /inbox. Trocar por /onboarding
// quando a jornada FUNC-J2 for entregue.
const POST_FIRST_ACCESS_ROUTE = '/inbox';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const passwordCriteria = [
  { id: 'length', label: 'Mínimo de 8 caracteres', test: (v: string) => v.length >= 8 },
  { id: 'uppercase', label: '1 letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'number', label: '1 número', test: (v: string) => /[0-9]/.test(v) },
  { id: 'special', label: '1 caractere especial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

const firstAccessSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'A senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
      .regex(/[^A-Za-z0-9]/, 'A senha deve conter pelo menos um caractere especial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FirstAccessFormData = z.infer<typeof firstAccessSchema>;
type ScreenStatus = 'checking' | 'expired' | 'form';

const PrimeiroAcesso = () => {
  const navigate = useNavigate();
  const { updatePassword, signOut, employee } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<ScreenStatus>('checking');

  const form = useForm<FirstAccessFormData>({
    resolver: zodResolver(firstAccessSchema),
    mode: 'onChange',
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = form.watch('newPassword');
  const checklist = useMemo(
    () => passwordCriteria.map((c) => ({ ...c, met: c.test(newPassword) })),
    [newPassword],
  );

  // Valida o TTL do convite (7 dias). A coluna invited_at pode estar ausente
  // (migration pendente) ou nula (convites legados) — nesses casos o link é
  // tratado como válido, nunca bloqueando o acesso por falta do dado.
  useEffect(() => {
    let active = true;

    const checkInviteExpiration = async () => {
      if (!employee?.id) return;

      const { data, error } = await supabase
        .from('employees')
        .select('invited_at')
        .eq('id', employee.id)
        .maybeSingle();

      if (!active) return;

      // Coluna ausente (migration pendente) ou nula (convite legado) → link válido.
      const invitedAt = !error && data ? data.invited_at : null;

      if (invitedAt && Date.now() - new Date(invitedAt).getTime() > SEVEN_DAYS_MS) {
        setStatus('expired');
        return;
      }

      setStatus('form');
    };

    checkInviteExpiration();
    return () => {
      active = false;
    };
  }, [employee?.id]);

  const handleBackToLogin = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const onSubmit = async (data: FirstAccessFormData) => {
    setIsLoading(true);

    const { error } = await updatePassword(data.newPassword);

    if (error) {
      toast({
        title: 'Não foi possível criar sua senha',
        description: 'Tente novamente em instantes. Se o problema persistir, fale com o seu gestor.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Tudo certo!',
      description: 'Sua senha foi criada. Bem-vindo ao Origami Pulse.',
    });

    navigate(POST_FIRST_ACCESS_ROUTE, { replace: true });
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="Origami Pulse" className="h-16 w-16" />
            </div>
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-amber-100 p-3">
                <MailWarning className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Este link expirou</CardTitle>
            <CardDescription>
              Entre em contato com o seu gestor para receber um novo convite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={handleBackToLogin}>
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Origami Pulse" className="h-16 w-16" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            Bem-vindo(a){employee?.nome ? `, ${employee.nome}` : ''}!
          </CardTitle>
          <CardDescription>
            Por segurança, você precisa criar uma senha pessoal antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ul className="space-y-1.5" aria-label="Critérios de senha">
                {checklist.map((criterion) => (
                  <li
                    key={criterion.id}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      criterion.met ? 'text-emerald-600' : 'text-muted-foreground'
                    }`}
                  >
                    {criterion.met ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {criterion.label}
                  </li>
                ))}
              </ul>

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nova senha</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading || !form.formState.isValid}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Criar minha senha e entrar
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrimeiroAcesso;
