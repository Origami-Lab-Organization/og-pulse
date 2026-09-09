import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, MailCheck, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SITE } from '@/landing/content';
import type { WelcomeState } from '@/types/tenantPlan';
import logo from '@/assets/logo.png';

const RESEND_COOLDOWN_MS = 60_000;
const CONFIRMATION_REDIRECT = `${SITE.origin}/boas-vindas`;

interface ConfirmedProps {
  onEnter: () => void;
}

interface ConfirmEmailProps {
  email: string;
  emailSent: boolean;
}

function Shell(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 pb-8 pt-8 text-center">
          <img src={logo} alt="Origami Pulse" className="mx-auto h-14 w-14" />
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

function Confirmed(props: ConfirmedProps) {
  const { onEnter } = props;
  return (
    <Shell>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-subtle text-success" aria-hidden="true">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Sua empresa está pronta</h1>
        <p className="text-sm text-muted-foreground">
          E-mail confirmado. Você tem 14 dias de teste com tudo liberado, sem cartão. Cadastre pessoas, clientes e projetos, e
          a margem real aparece com a primeira semana de horas.
        </p>
      </div>
      <Button className="w-full" onClick={onEnter}>
        Entrar no Origami Pulse
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
    </Shell>
  );
}

function ConfirmEmail(props: ConfirmEmailProps) {
  const { email, emailSent } = props;
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(emailSent ? Date.now() + RESEND_COOLDOWN_MS : 0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (cooldownUntil <= now) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil, now]);

  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const resend = async () => {
    setSending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: CONFIRMATION_REDIRECT } });
    setSending(false);
    if (error) {
      toast({
        title: 'Não foi possível reenviar agora',
        description: `Tente de novo em instantes ou escreva para ${SITE.contactEmail}.`,
        variant: 'destructive',
      });
      return;
    }
    setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
    toast({ title: 'E-mail reenviado', description: `Confira a caixa de entrada de ${email}.` });
  };

  return (
    <Shell>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-subtle text-primary" aria-hidden="true">
        <MailCheck className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Confirme seu e-mail</h1>
        <p className="text-sm text-muted-foreground">
          {emailSent ? 'Enviamos um link de confirmação para ' : 'Falta confirmar o e-mail '}
          <span className="font-medium text-foreground">{email}</span>. Abra o link para ativar sua empresa e começar os 14
          dias de teste. Vale conferir a caixa de spam.
        </p>
      </div>
      <div className="space-y-3">
        <Button className="w-full" variant="outline" onClick={resend} disabled={sending || secondsLeft > 0}>
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-2 h-4 w-4" aria-hidden="true" />}
          {secondsLeft > 0 ? `Reenviar em ${secondsLeft}s` : 'Reenviar e-mail de confirmação'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Já confirmou?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </Shell>
  );
}

const Screen = {
  LOADING: 'loading',
  CONFIRMED_SESSION: 'confirmed-session',
  CONFIRMED_AUTO: 'confirmed-auto',
  CONFIRM_EMAIL: 'confirm-email',
  NONE: 'none',
} as const;
type Screen = (typeof Screen)[keyof typeof Screen];

interface ScreenInput {
  loading: boolean;
  state: WelcomeState | null;
  user: User | null;
}

/**
 * Pós-cadastro (PUL-227). Qual tela mostrar, em ordem:
 *  - ainda carregando a sessão e não veio do cadastro: spinner;
 *  - voltou pelo link de confirmação (sessão com e-mail confirmado): celebra e entra;
 *  - o Auth confirmou direto (confirmação de e-mail desligada no projeto): celebra e manda ao login;
 *  - acabou de cadastrar: pede a confirmação, com reenvio.
 */
function resolveScreen(input: ScreenInput): Screen {
  const justRegistered = Boolean(input.state?.justRegistered);
  if (input.loading && !justRegistered) return Screen.LOADING;
  if (input.user?.email_confirmed_at) return Screen.CONFIRMED_SESSION;
  if (input.state?.autoConfirmed) return Screen.CONFIRMED_AUTO;
  if (input.state?.email || input.user?.email) return Screen.CONFIRM_EMAIL;
  return Screen.NONE;
}

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const state = (location.state as WelcomeState | null) ?? null;
  const screen = resolveScreen({ loading, state, user });
  const email = state?.email ?? user?.email ?? '';

  useEffect(() => {
    if (screen === Screen.NONE) navigate('/login', { replace: true });
  }, [screen, navigate]);

  const render: Record<Screen, () => JSX.Element | null> = {
    [Screen.LOADING]: () => (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando" />
      </div>
    ),
    [Screen.CONFIRMED_SESSION]: () => <Confirmed onEnter={() => navigate('/', { replace: true })} />,
    [Screen.CONFIRMED_AUTO]: () => <Confirmed onEnter={() => navigate('/login', { replace: true })} />,
    [Screen.CONFIRM_EMAIL]: () => <ConfirmEmail email={email} emailSent={state?.confirmationEmailSent !== false} />,
    [Screen.NONE]: () => null,
  };

  return render[screen]();
};

export default Welcome;
