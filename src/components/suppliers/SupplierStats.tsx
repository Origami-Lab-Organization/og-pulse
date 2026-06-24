import { Card, CardContent } from '@/components/ui/card';
import { Truck, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Supplier } from '@/types/supplier';

interface SupplierStatsProps {
  suppliers: Supplier[];
}

const SupplierStats = ({ suppliers }: SupplierStatsProps) => {
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
  const inactiveSuppliers = suppliers.filter(s => s.status === 'inactive').length;

  const stats = [
    {
      label: 'Total de Fornecedores',
      value: totalSuppliers,
      icon: Truck,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Fornecedores Ativos',
      value: activeSuppliers,
      icon: CheckCircle,
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Fornecedores Inativos',
      value: inactiveSuppliers,
      icon: XCircle,
      color: 'bg-muted text-muted-foreground',
    },
    {
      label: 'Taxa de Ativação',
      value: totalSuppliers > 0 ? `${Math.round((activeSuppliers / totalSuppliers) * 100)}%` : '0%',
      icon: TrendingUp,
      color: 'bg-info/10 text-info',
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

export default SupplierStats;
