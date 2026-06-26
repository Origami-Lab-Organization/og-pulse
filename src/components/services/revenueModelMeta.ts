import type { ElementType } from 'react';
import {
  DollarSign,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Building2,
  Star,
  Calendar,
  Zap,
} from 'lucide-react';
import type { RevenueModelType } from '@/types/serviceRevenueModel';

export const MODEL_META: Record<RevenueModelType, { icon: ElementType; description: string }> = {
  fixed: { icon: DollarSign, description: 'Valor fechado por projeto, independente do tempo gasto' },
  recurring: { icon: RefreshCw, description: 'Mensalidade ou assinatura cobrada no período definido' },
  success_fee: { icon: TrendingUp, description: 'Percentual pago apenas sobre o resultado gerado' },
  indication: { icon: UserPlus, description: 'Comissão por cliente ou parceiro indicado que fechar' },
  equity: { icon: Building2, description: 'Participação societária como forma de remuneração' },
  fixed_success_fee: { icon: Star, description: 'Valor base garantido mais bônus sobre o resultado' },
  fixed_recurring: { icon: Calendar, description: 'Entrada única mais mensalidade de suporte ou uso' },
  recurring_success_fee: { icon: Zap, description: 'Mensalidade base com bônus variável por desempenho' },
};
