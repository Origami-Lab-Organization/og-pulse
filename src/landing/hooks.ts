/**
 * Efeitos da landing, todos só no cliente (rodam em `useEffect`; a
 * pré-renderização em Node nunca os executa). Cada um vira no-op quando a
 * pessoa prefere movimento reduzido.
 */

import { useEffect, useRef, useState } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** `true` quando a pessoa não pediu movimento reduzido. Começa `false` para o SSR e o primeiro paint. */
export function useMotionEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION);
    const update = () => setEnabled(!media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return enabled;
}

/** Marca `.lp-reveal` com `is-visible` quando entra na tela, uma vez só. */
export function useRevealOnScroll<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!enabled || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    root.querySelectorAll<HTMLElement>('.lp-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [enabled]);
  return ref;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Mouse e scroll viram variáveis CSS (`--lp-mx`, `--lp-my`, `--lp-sy`) no elemento. */
export function useParallax<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    let frame = 0;
    const setVars = (mx: number, my: number) => {
      el.style.setProperty('--lp-mx', mx.toFixed(3));
      el.style.setProperty('--lp-my', my.toFixed(3));
    };
    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const mx = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5) * 2;
      const my = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5) * 2;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setVars(mx, my));
    };
    const onLeave = () => setVars(0, 0);
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => el.style.setProperty('--lp-sy', String(clamp(window.scrollY, 0, 900))));
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, [enabled]);
  return ref;
}

/** Inclinação 3D e brilho que segue o cursor em todo `[data-tilt]` dentro da raiz. */
export function useTilt<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!enabled || !root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]'));
    const onMove = (event: MouseEvent) => {
      const card = event.currentTarget as HTMLElement;
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--ry', `${((px - 0.5) * 8).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${((0.5 - py) * 8).toFixed(2)}deg`);
      card.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    };
    const onLeave = (event: MouseEvent) => {
      const card = event.currentTarget as HTMLElement;
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    };
    cards.forEach((card) => {
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });
    return () =>
      cards.forEach((card) => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
  }, [enabled]);
  return ref;
}

/** Progresso de leitura (0..1) e se a página já rolou além do topo. */
export function useScrollProgress(): { progress: number; scrolled: boolean } {
  const [state, setState] = useState({ progress: 0, scrolled: false });
  useEffect(() => {
    let frame = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      setState({ progress, scrolled: window.scrollY > 12 });
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return state;
}
