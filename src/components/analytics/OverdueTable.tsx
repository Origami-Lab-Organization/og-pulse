import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import type { OverdueItem } from '@/hooks/useRevenueAnalytics';

interface Props {
  data: OverdueItem[];
  title: string;
  emptyLabel?: string;
}

export function OverdueTable({ data, title, emptyLabel = 'Nenhum item em atraso.' }: Props) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {data.length > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
          {title}
          {data.length > 0 && (
            <Badge variant="outline" className="ml-auto font-normal">{data.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyLabel}</p>
        ) : (
          <div className="overflow-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 pr-3 font-medium">Projeto</th>
                  <th className="pb-2 pr-3 font-medium">Cliente</th>
                  <th className="pb-2 pr-3 font-medium">Gerente</th>
                  <th className="pb-2 pr-3 font-medium text-right">Valor</th>
                  <th className="pb-2 pr-3 font-medium">Vencimento</th>
                  <th className="pb-2 font-medium text-right">Atraso</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/projects/${item.projectId}?tab=financial`)}
                  >
                    <td className="py-2 pr-3 font-medium truncate max-w-[140px]">{item.projectName}</td>
                    <td className="py-2 pr-3 text-muted-foreground truncate max-w-[120px]">{item.clientName}</td>
                    <td className="py-2 pr-3 text-muted-foreground truncate max-w-[120px]">{item.managerName}</td>
                    <td className="py-2 pr-3 text-right font-medium">{formatCurrency(item.value)}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      {format(parseISO(item.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="py-2 text-right">
                      <Badge variant="destructive">{item.daysOverdue}d</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
