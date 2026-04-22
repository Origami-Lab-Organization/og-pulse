import { Client } from '@/types/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Pencil, Trash2 } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  canManage: boolean;
}

const ClientCard = ({ client, onEdit, onDelete, canManage }: ClientCardProps) => {
  const hasAddress = client.logradouro || client.cidade || client.estado;

  return (
    <Card className="group hover:border-primary/30 transition-colors duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1">
                {client.companyName}
              </h3>
              {client.tradingName && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {client.tradingName}
                </p>
              )}
            </div>
          </div>
          <Badge 
            variant={client.status === 'active' ? 'default' : 'secondary'}
            className={client.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : ''}
          >
            {client.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {client.cnpj && (
          <div className="text-sm">
            <span className="text-muted-foreground">CNPJ: </span>
            <span className="text-foreground font-mono">{client.cnpj}</span>
          </div>
        )}

        {hasAddress && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-muted-foreground">
              {client.logradouro && (
                <span>
                  {client.logradouro}
                  {client.numero && `, ${client.numero}`}
                </span>
              )}
              {client.bairro && <span> - {client.bairro}</span>}
              {(client.cidade || client.estado) && (
                <div>
                  {client.cidade}
                  {client.cidade && client.estado && ' - '}
                  {client.estado}
                </div>
              )}
            </div>
          </div>
        )}

        {canManage && (
          <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(client)}
              className="flex-1"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(client)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientCard;
