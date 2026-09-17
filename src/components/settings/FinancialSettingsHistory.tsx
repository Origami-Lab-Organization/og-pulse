import { History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatPercent, todayLocalDateString } from '@/lib/formatters';
import type { FinancialSettingsVersion } from '@/types/financialSettings';

interface Props {
  versoes: readonly FinancialSettingsVersion[];
}

/**
 * O histórico das políticas financeiras da empresa (PUL-260).
 *
 * Duas datas por linha, e elas dizem coisas diferentes: **vigência** é desde quando o número
 * vale; **alterado em** é quando alguém decidiu. Mudança feita hoje valendo só em outubro tem
 * as duas distantes, e é justamente esse caso que a tabela precisa deixar legível.
 */
export function FinancialSettingsHistory({ versoes }: Props) {
  if (versoes.length === 0) return null;

  const hoje = todayLocalDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de alterações
        </CardTitle>
        <CardDescription>
          Cada linha é uma política que valeu num período. Nada aqui é apagado: corrigir é
          gravar outra versão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vale a partir de</TableHead>
                <TableHead className="text-right">Desp. adm.</TableHead>
                <TableHead className="text-right">Impostos</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-right">Margem líq.</TableHead>
                <TableHead className="text-right">Meta margem bruta</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Alterado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versoes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatDate(v.effective_from)}
                    {v.effective_from > hoje && (
                      <Badge variant="outline" className="ml-2">
                        Futura
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(v.admin_expenses_percent)}
                  </TableCell>
                  <TableCell className="text-right">{formatPercent(v.taxes_percent)}</TableCell>
                  <TableCell className="text-right">
                    {formatPercent(v.commission_percent)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(v.net_margin_percent ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(v.gross_margin_target_percent ?? 0)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {/* Versão sem autor é a que a empresa nasceu com — dizer "sistema" é mais
                        honesto do que deixar a célula vazia e parecer dado faltando. */}
                    {v.autorNome ?? 'Sistema'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(v.created_at).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
