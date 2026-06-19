import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useOnboardingStatus, useCompleteOnboarding } from '@/hooks/useOnboarding';
import { ONBOARDING_SKIPPED_AT_KEY } from './onboarding.constants';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowRight,
  ArrowLeft,
  X,
  Clock,
  Kanban,
  Inbox as InboxIcon,
  FolderKanban,
  Receipt,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

const HOME_ROUTE = '/inbox';
const CARD_WIDTH = 360;

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Slide {
  kind: 'welcome' | 'feature' | 'final';
  target?: string; // data-onboarding do elemento destacado no navbar
  icon?: LucideIcon;
  subtitle?: string;
  title?: string;
  description?: string;
}

const SLIDES: Slide[] = [
  { kind: 'welcome' },
  {
    kind: 'feature',
    target: 'inbox',
    icon: InboxIcon,
    subtitle: 'Suas notificações',
    title: 'Caixa de Entrada',
    description:
      'Aprovações de reembolso, novos documentos, alertas e lembretes aparecem aqui em tempo real.',
  },
  {
    kind: 'feature',
    target: 'kanban',
    icon: Kanban,
    subtitle: 'Seu trabalho organizado',
    title: 'Meu Kanban',
    description:
      'Acompanhe suas tarefas pessoais e as atividades dos projetos em um quadro só — sem depender de ferramenta externa.',
  },
  {
    kind: 'feature',
    target: 'projetos',
    icon: FolderKanban,
    subtitle: 'Onde você atua',
    title: 'Meus Projetos',
    description:
      'Veja os projetos em que você está alocado, suas fases e os próximos marcos — sem precisar navegar pela área do gestor.',
  },
  {
    kind: 'feature',
    target: 'timesheet',
    icon: Clock,
    subtitle: 'Registre suas horas',
    title: 'Timesheet',
    description:
      'Toda semana você confirma as horas dos seus projetos. Os campos já vêm pré-preenchidos pela sua alocação — é só revisar.',
  },
  {
    kind: 'feature',
    target: 'reembolsos',
    icon: Receipt,
    subtitle: 'Suas despesas',
    title: 'Reembolsos',
    description:
      'Solicite reembolsos com a foto do recibo e acompanhe o status, do envio até o pagamento.',
  },
  { kind: 'final' },
];

const SHORTCUTS = [
  { icon: FolderKanban, label: 'Ver meus projetos', route: '/my-projects' },
  { icon: Clock, label: 'Lançar minhas horas', route: '/my-timesheet' },
  { icon: InboxIcon, label: 'Ir para o início', route: HOME_ROUTE },
];

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

export function OnboardingModal({ open, onOpenChange }: OnboardingModalProps) {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { data: status } = useOnboardingStatus();
  const complete = useCompleteOnboarding();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const reachedFinalRef = useRef(false);
  const last = SLIDES.length - 1;
  const slide = SLIDES[index];

  const { data: companyName } = useQuery({
    queryKey: ['tenant-name', employee?.tenant_id],
    enabled: !!employee?.tenant_id,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', employee!.tenant_id)
        .maybeSingle();
      return data?.name ?? '';
    },
  });

  // Reinicia ao (re)abrir.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setDirection('next');
      reachedFinalRef.current = false;
    }
  }, [open]);

  // Localiza e acompanha o elemento destacado no navbar.
  useLayoutEffect(() => {
    if (!open || !slide.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-onboarding="${slide.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, slide.target, index]);

  // Ao chegar na tela final, marca conclusão (idempotente).
  useEffect(() => {
    if (open && index === last && !reachedFinalRef.current) {
      reachedFinalRef.current = true;
      if (status?.completed !== true) complete.mutate();
    }
  }, [open, index, last, status?.completed, complete]);

  const close = () => {
    if (!reachedFinalRef.current && status?.completed === false) {
      try {
        localStorage.setItem(ONBOARDING_SKIPPED_AT_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      complete.mutate();
    }
    onOpenChange(false);
  };

  // ESC fecha.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  if (!open) return null;

  const goNext = () => {
    if (index < last) {
      setDirection('next');
      setIndex((i) => i + 1);
    }
  };
  const goPrev = () => {
    if (index > 0) {
      setDirection('prev');
      setIndex((i) => i - 1);
    }
  };

  const goShortcut = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  const firstName = employee?.nome?.trim().split(/\s+/)[0] ?? '';
  const spotlight = Boolean(slide.target && rect);
  const animClass = `animate-in fade-in-50 duration-300 ${
    direction === 'next' ? 'slide-in-from-right-6' : 'slide-in-from-left-6'
  }`;

  // Posição do card no modo spotlight (abaixo do alvo, preso à viewport).
  const cardStyle: React.CSSProperties | undefined =
    spotlight && rect
      ? {
          position: 'absolute',
          top: rect.bottom + 14,
          left: Math.min(Math.max(rect.left, 12), window.innerWidth - CARD_WIDTH - 12),
          width: CARD_WIDTH,
        }
      : undefined;

  const card = (
    <div
      role="dialog"
      aria-modal="true"
      className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
    >
      <div className="h-1.5 bg-gradient-brand" />
      <button
        type="button"
        onClick={close}
        aria-label="Fechar"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="px-6 pt-7 pb-5">
        <div key={index} className={animClass}>
          {slide.kind === 'welcome' && (
            <div className="text-center">
              <Avatar className="mx-auto mb-4 h-16 w-16">
                <AvatarFallback className="bg-gradient-brand text-white text-lg font-semibold">
                  {getInitials(employee?.nome)}
                </AvatarFallback>
              </Avatar>
              <h2 className="ol-h3 text-foreground">
                Bem-vindo(a) ao Origami <span className="ol-text-accent">Pulse</span>
                {firstName ? `, ${firstName}` : ''}!
              </h2>
              {companyName && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Você está no workspace da <strong className="text-foreground">{companyName}</strong>
                </p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                Em poucos passos você vai conhecer o essencial do seu espaço.
              </p>
            </div>
          )}

          {slide.kind === 'feature' && slide.icon && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <slide.icon className="h-7 w-7 text-primary" />
              </div>
              <p className="ol-label text-muted-foreground">{slide.subtitle}</p>
              <h3 className="ol-h3 text-foreground mt-1">{slide.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{slide.description}</p>
            </div>
          )}

          {slide.kind === 'final' && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h2 className="ol-h3 text-foreground">Tudo certo{firstName ? `, ${firstName}` : ''}!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Você está pronto(a) para usar o Origami Pulse.
              </p>
              <div className="mt-5 grid gap-2.5">
                {SHORTCUTS.map((s) => (
                  <button
                    key={s.route}
                    type="button"
                    onClick={() => goShortcut(s.route)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <s.icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-foreground">{s.label}</span>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        {index === 0 ? (
          <button type="button" onClick={close} className="text-sm text-muted-foreground hover:text-primary">
            Pular
          </button>
        ) : (
          <Button variant="ghost" size="sm" onClick={goPrev}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Anterior
          </Button>
        )}

        {index < last ? (
          <Button variant="gradient" size="sm" onClick={goNext}>
            {index === 0 ? 'Começar' : 'Avançar'}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="gradient" size="sm" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        )}
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {spotlight && rect ? (
        <>
          {/* Spotlight: destaca o alvo e escurece o resto (box-shadow). Desliza entre steps. */}
          <div
            className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-300"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: '0 0 0 9999px hsl(var(--foreground) / 0.55)',
            }}
          />
          {/* Bloqueia interação com a página (a navegação é pelos botões do tour). */}
          <div className="absolute inset-0" />
          <div style={cardStyle} className="animate-in fade-in zoom-in-95 duration-200">
            {card}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/55 p-4 backdrop-blur-[2px] animate-in fade-in">
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200">{card}</div>
        </div>
      )}
    </div>,
    document.body,
  );
}
