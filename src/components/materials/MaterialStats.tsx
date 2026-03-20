import { Card, CardContent } from '@/components/ui/card';
import { Package, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Material } from '@/types/material';
import { formatCurrency } from '@/lib/formatters';

interface MaterialStatsProps {
  materials: Material[];
}

const MaterialStats = ({ materials }: MaterialStatsProps) => {
  const totalMaterials = materials.length;
  const activeMaterials = materials.filter(m => m.status === 'active').length;
  const inactiveMaterials = totalMaterials - activeMaterials;
  const avgCost = totalMaterials > 0
    ? materials.reduce((sum, m) => sum + m.unitCost, 0) / totalMaterials
    : 0;

  const stats = [
    {
      label: 'Total de Materiais',
      value: totalMaterials,
      icon: Package,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Materiais Ativos',
      value: activeMaterials,
      icon: CheckCircle,
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Materiais Inativos',
      value: inactiveMaterials,
      icon: XCircle,
      color: 'bg-muted text-muted-foreground',
    },
    {
      label: 'Custo Médio',
      value: formatCurrency(avgCost),
      icon: TrendingUp,
      color: 'bg-secondary/10 text-secondary',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="animate-scale-in">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg p-3 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold text-foreground">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MaterialStats;
