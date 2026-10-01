import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCostCenters } from '@/hooks/useCostCenters';
import {
  useContaAzulConnection,
  useContaAzulCostCenters,
  useLinkContaAzulCostCenter,
} from '@/hooks/useContaAzulConnection';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import type { CostCenter } from '@/types/costCenter';
import type { ContaAzulCostCenter } from '@/types/contaAzul';

/**
 * Ligação centro do Conta Azul → centro do Pulse (ADR-0044, item 6). É por ela que a
 * conciliação de contas a pagar compara custo por centro. Os nomes não precisam ser iguais, e
 * vários centros de lá podem apontar para o mesmo daqui.
 */

const NO_LINK = '__sem_ligacao__';

function LinkSelect(props: { center: ContaAzulCostCenter; options: CostCenter[] }) {
  const { center, options } = props;
  const link = useLinkContaAzulCostCenter();
  const visible = options.filter((c) => c.is_active || c.id === center.cost_center_id);
  return (
    <Select
      value={center.cost_center_id ?? NO_LINK}
      onValueChange={(value) => link.mutate({ id: center.id, costCenterId: value === NO_LINK ? null : value })}
      disabled={link.isPending}
    >
      <SelectTrigger className="sm:w-64" aria-label={`Centro do Pulse para ${center.name}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_LINK}>Sem ligação</SelectItem>
        {visible.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
            {!c.is_active && ' (inativo)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CenterRow(props: { center: ContaAzulCostCenter; options: CostCenter[] }) {
  const { center, options } = props;
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{center.name}</span>
          {!center.is_active && <Badge variant="neutral">Inativo no Conta Azul</Badge>}
        </div>
        {center.code && <p className="text-sm text-muted-foreground">Código {center.code}</p>}
      </div>
      <LinkSelect center={center} options={options} />
    </li>
  );
}

function CentersList() {
  const { data: centers = [], isLoading, isError, error, refetch } = useContaAzulCostCenters(true);
  const { data: pulseCenters = [] } = useCostCenters();
  const unlinked = useMemo(() => centers.filter((c) => c.is_active && !c.cost_center_id).length, [centers]);

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
        <p>{mensagemParaUsuario(error, 'Não foi possível ler os centros de custo do Conta Azul.')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (centers.length === 0) {
    return <p className="text-sm text-muted-foreground">Os centros de custo do Conta Azul aparecem aqui depois da primeira sincronização.</p>;
  }
  return (
    <div className="space-y-3">
      {unlinked > 0 && (
        <p className="text-sm text-muted-foreground">
          {unlinked === 1 ? '1 centro ativo ainda sem ligação.' : `${unlinked} centros ativos ainda sem ligação.`}
        </p>
      )}
      <ul className="space-y-2" aria-label="Centros de custo do Conta Azul">
        {centers.map((center) => (
          <CenterRow key={center.id} center={center} options={pulseCenters} />
        ))}
      </ul>
    </div>
  );
}

export function ContaAzulCostCentersCard() {
  const { data: connection } = useContaAzulConnection();
  if (!connection) return null;
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Centros de custo do Conta Azul</CardTitle>
        <CardDescription>
          Ligue cada centro de lá a um centro do Pulse. É assim que a conciliação compara o custo pago com o custo do
          Pulse, centro por centro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CentersList />
      </CardContent>
    </Card>
  );
}
