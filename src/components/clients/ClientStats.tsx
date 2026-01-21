import { Card, CardContent } from '@/components/ui/card';
import { Building2, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Client } from '@/types/client';

interface ClientStatsProps {
  clients: Client[];
}

const ClientStats = ({ clients }: ClientStatsProps) => {
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  const inactiveClients = clients.filter(c => c.status === 'inactive').length;

  const stats = [
    {
      label: 'Total de Clientes',
      value: totalClients,
      icon: Building2,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Clientes Ativos',
      value: activeClients,
      icon: CheckCircle,
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Clientes Inativos',
      value: inactiveClients,
      icon: XCircle,
      color: 'bg-muted text-muted-foreground',
    },
    {
      label: 'Taxa de Ativação',
      value: totalClients > 0 ? `${Math.round((activeClients / totalClients) * 100)}%` : '0%',
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

export default ClientStats;
