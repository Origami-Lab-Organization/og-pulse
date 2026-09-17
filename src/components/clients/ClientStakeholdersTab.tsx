import { useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StakeholderFormDialog } from '@/components/projects/stakeholders/StakeholderFormDialog';
import { useDeleteStakeholder } from '@/hooks/useProjectStakeholders';
import { useClientStakeholderDirectory, type ClientStakeholder } from '@/hooks/useClientStakeholders';
import {
  STAKEHOLDER_ROLES,
  SPONSORSHIP_LEVEL_LABELS,
  INFLUENCE_LEVEL_LABELS,
} from '@/types/projectStakeholder';
import { formatPhone } from '@/lib/masks';

interface Props {
  clientId: string;
  canManage: boolean;
}

const papelLabel = (valor: string) =>
  STAKEHOLDER_ROLES.find((r) => r.value === valor)?.label ?? valor;

/**
 * Os stakeholders da conta do cliente.
 *
 * Duas origens numa lista só: quem foi cadastrado aqui (a conta) e quem apareceu em algum
 * projeto do cliente. A coluna "Projetos" é o que separa as duas — vazia quer dizer que a
 * pessoa é da conta e ainda não entrou em projeto nenhum.
 *
 * Editar e excluir valem só para a ficha da conta. Stakeholder que vive num projeto tem
 * influência e ação próprias daquele projeto, e quem manda nelas é o GP, na aba do projeto:
 * mexer daqui apagaria a leitura que ele fez.
 */
export function ClientStakeholdersTab({ clientId, canManage }: Props) {
  const { data: stakeholders = [], isLoading } = useClientStakeholderDirectory(clientId);
  const remover = useDeleteStakeholder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ClientStakeholder | null>(null);

  const abrirNovo = () => {
    setEmEdicao(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (s: ClientStakeholder) => {
    setEmEdicao(s);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            Stakeholders
          </CardTitle>
          <CardDescription className="mt-1">
            As pessoas da organização do cliente. As cadastradas aqui ficam disponíveis para
            todos os projetos dessa conta.
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={abrirNovo} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Novo stakeholder
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 rounded-md" />
        ) : stakeholders.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum stakeholder neste cliente ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Influência</TableHead>
                  <TableHead>Patrocínio</TableHead>
                  <TableHead>Projetos</TableHead>
                  {canManage && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stakeholders.map((s) => (
                  <LinhaStakeholder
                    key={s.id}
                    stakeholder={s}
                    canManage={canManage}
                    onEditar={abrirEdicao}
                    onRemover={(alvo) => remover.mutate({ id: alvo.id })}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <StakeholderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        stakeholder={emEdicao}
      />
    </Card>
  );
}

interface LinhaProps {
  stakeholder: ClientStakeholder;
  canManage: boolean;
  onEditar: (s: ClientStakeholder) => void;
  onRemover: (s: ClientStakeholder) => void;
}

function LinhaStakeholder({ stakeholder: s, canManage, onEditar, onRemover }: LinhaProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{s.name}</TableCell>
      <TableCell className="text-muted-foreground">{s.job_title || '—'}</TableCell>
      <TableCell>
        <Badge variant="secondary">{papelLabel(s.role)}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex flex-col">
          <span>{s.email || '—'}</span>
          {s.phone && <span className="text-xs">{formatPhone(s.phone)}</span>}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {s.influence_level ? INFLUENCE_LEVEL_LABELS[s.influence_level] : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {s.sponsorship_level ? SPONSORSHIP_LEVEL_LABELS[s.sponsorship_level] : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <ProjetosDaPessoa nomes={s.projetos} />
      </TableCell>
      {canManage && (
        <TableCell>
          <AcoesDaLinha stakeholder={s} onEditar={onEditar} onRemover={onRemover} />
        </TableCell>
      )}
    </TableRow>
  );
}

function ProjetosDaPessoa({ nomes }: { nomes: string[] }) {
  if (nomes.length === 0) return <span className="text-xs">Só na conta</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {nomes.map((nome) => (
        <Badge key={nome} variant="outline" className="font-normal">
          {nome}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Editar e excluir valem só para a ficha da CONTA. Stakeholder que vive num projeto tem
 * influência e ação daquele projeto, decididas pelo GP na aba dele — mexer daqui apagaria a
 * leitura que ele fez.
 */
function AcoesDaLinha({
  stakeholder: s,
  onEditar,
  onRemover,
}: Omit<LinhaProps, 'canManage'>) {
  if (s.project_id !== null) {
    return <span className="text-xs text-muted-foreground">No projeto</span>;
  }
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" aria-label={`Editar ${s.name}`} onClick={() => onEditar(s)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remover ${s.name}`}
        className="text-destructive hover:text-destructive"
        onClick={() => onRemover(s)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
