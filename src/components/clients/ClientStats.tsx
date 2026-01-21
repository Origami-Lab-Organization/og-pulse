import { Card, CardContent } from '@/components/ui/card';
import { Building2, CheckCircle, XCircle } from 'lucide-react';
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
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Clientes Ativos',
      value: activeClients,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Clientes Inativos',
      value: inactiveClients,
      icon: XCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ClientStats;
