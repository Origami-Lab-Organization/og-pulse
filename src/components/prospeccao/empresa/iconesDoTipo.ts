import { Globe2, Link2, Shield } from 'lucide-react';
import type { TipoDeConta } from '@/types/prospect';

/** Ícone de cada tipo de conta, no selo do cabeçalho e no widget (US-0053). */
export const ICONE_DO_TIPO: Record<TipoDeConta, typeof Shield> = { ancora: Shield, ponte: Link2, satelite: Globe2 };
