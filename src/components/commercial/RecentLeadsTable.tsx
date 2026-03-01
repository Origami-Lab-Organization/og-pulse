import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { LeadWithBudget, CRM_LEAD_COLUMNS } from '@/types/lead';

interface Props {
  leads: LeadWithBudget[];
}

export function RecentLeadsTable({ leads }: Props) {
  const navigate = useNavigate();

  const getStageBadge = (stage: string) => {
    const col = CRM_LEAD_COLUMNS.find(c => c.id === stage);
    return col ? (
      <Badge variant="outline" className={col.color}>{col.label}</Badge>
    ) : (
      <Badge variant="outline">{stage}</Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leads Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead encontrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(lead => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate('/crm')}
                >
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.company_name || '-'}</TableCell>
                  <TableCell>{getStageBadge(lead.crm_stage)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(lead.estimated_value)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
