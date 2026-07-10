import { useState } from 'react';
import { Plus, Users, Mail, Phone, MoreHorizontal, Pencil, Trash2, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectWithRelations } from '@/types/project';
import {
  useProjectStakeholders,
  useDeleteStakeholder,
} from '@/hooks/useProjectStakeholders';
import {
  ProjectStakeholder,
  STAKEHOLDER_ROLES,
  INFLUENCE_LEVEL_LABELS,
  INTEREST_LEVEL_LABELS,
  ORGANIZATION_OPTIONS,
  SPONSORSHIP_LEVEL_LABELS,
  STAKEHOLDER_ACTION_LABELS,
  SponsorshipLevel,
  StakeholderAction,
} from '@/types/projectStakeholder';
import { cn } from '@/lib/utils';
import { StakeholderFormDialog } from '@/components/projects/stakeholders/StakeholderFormDialog';
import { ImportStakeholdersDialog } from '@/components/projects/stakeholders/ImportStakeholdersDialog';

interface ProjectStakeholdersTabProps {
  project: ProjectWithRelations;
  isReadOnly?: boolean;
}

export function ProjectStakeholdersTab({ project, isReadOnly = false }: ProjectStakeholdersTabProps) {
  const { data: stakeholders = [], isLoading } = useProjectStakeholders(project.id);
  const deleteStakeholder = useDeleteStakeholder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<ProjectStakeholder | null>(null);

  const handleAdd = () => {
    setEditingStakeholder(null);
    setDialogOpen(true);
  };

  const handleEdit = (stakeholder: ProjectStakeholder) => {
    setEditingStakeholder(stakeholder);
    setDialogOpen(true);
  };

  const handleDelete = (stakeholder: ProjectStakeholder) => {
    if (confirm(`Deseja remover o stakeholder "${stakeholder.name}"?`)) {
      deleteStakeholder.mutate({ id: stakeholder.id, projectId: project.id });
    }
  };

  const getRoleLabel = (role: string) => {
    const found = STAKEHOLDER_ROLES.find((r) => r.value === role);
    return found?.label || role;
  };

  const getOrgLabel = (org: string | null) => {
    if (!org) return null;
    const found = ORGANIZATION_OPTIONS.find((o) => o.value === org);
    return found?.label || org;
  };

  const getInfluenceColor = (level: string | null) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSponsorshipColor = (level: string | null) => {
    switch (level) {
      case 'promoter':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'neutral':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'detractor':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando stakeholders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stakeholders</h3>
          <p className="text-sm text-muted-foreground">
            Partes interessadas e contatos importantes do projeto
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Importar do Cliente
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Stakeholder
            </Button>
          </div>
        )}
      </div>

      {stakeholders.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex divide-x overflow-x-auto">
              <StakeholderMetric label="Total" value={stakeholders.length} />
              <StakeholderMetric
                label="Promotores"
                value={stakeholders.filter((s) => s.sponsorship_level === 'promoter').length}
                dotStatus="ok"
                subtitle={pctLabel(stakeholders.filter((s) => s.sponsorship_level === 'promoter').length, stakeholders.length)}
              />
              <StakeholderMetric
                label="Neutros"
                value={stakeholders.filter((s) => s.sponsorship_level === 'neutral').length}
                dotStatus="neutral"
                subtitle={pctLabel(stakeholders.filter((s) => s.sponsorship_level === 'neutral').length, stakeholders.length)}
              />
              <StakeholderMetric
                label="Detratores"
                value={stakeholders.filter((s) => s.sponsorship_level === 'detractor').length}
                dotStatus="alert"
                subtitle={pctLabel(stakeholders.filter((s) => s.sponsorship_level === 'detractor').length, stakeholders.length)}
              />
            </div>
          </CardContent>
        </Card>
      )}


      {stakeholders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum stakeholder cadastrado ainda.
              <br />
              Identifique as partes interessadas do projeto.
            </p>
            {!isReadOnly && (
              <Button variant="outline" className="mt-4" onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Stakeholder
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {stakeholders.map((stakeholder) => (
            <Card 
              key={stakeholder.id} 
              className={`relative group ${!isReadOnly ? 'cursor-pointer hover:border-primary/50' : ''} transition-colors`}
              onClick={() => !isReadOnly && handleEdit(stakeholder)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-medium">
                        {stakeholder.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{stakeholder.name}</p>
                      {stakeholder.job_title && (
                        <p className="text-sm text-muted-foreground">{stakeholder.job_title}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{getRoleLabel(stakeholder.role)}</p>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(stakeholder); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDelete(stakeholder); }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {stakeholder.organization && (
                    <Badge variant="outline">
                      {getOrgLabel(stakeholder.organization)}
                    </Badge>
                  )}
                  {stakeholder.sponsorship_level && (
                    <Badge variant="outline" className={getSponsorshipColor(stakeholder.sponsorship_level)}>
                      {SPONSORSHIP_LEVEL_LABELS[stakeholder.sponsorship_level as SponsorshipLevel]}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-4">
                    {stakeholder.influence_level && (
                      <span>
                        Influência:{' '}
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getInfluenceColor(stakeholder.influence_level))}
                        >
                          {INFLUENCE_LEVEL_LABELS[stakeholder.influence_level]}
                        </Badge>
                      </span>
                    )}
                    {stakeholder.interest_level && (
                      <span>
                        Interesse:{' '}
                        <Badge variant="outline" className="text-xs">
                          {INTEREST_LEVEL_LABELS[stakeholder.interest_level]}
                        </Badge>
                      </span>
                    )}
                  </div>
                  <p>
                    Ação:{' '}
                    {stakeholder.action
                      ? STAKEHOLDER_ACTION_LABELS[stakeholder.action as StakeholderAction]
                      : 'Selecionar'}
                  </p>
                </div>

                {(stakeholder.email || stakeholder.phone) && (
                  <div className="pt-2 border-t space-y-1 text-sm text-muted-foreground">
                    {stakeholder.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{stakeholder.email}</span>
                      </div>
                    )}
                    {stakeholder.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{stakeholder.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StakeholderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={project.id}
        stakeholder={editingStakeholder}
      />

      <ImportStakeholdersDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        projectId={project.id}
        clientId={project.client_id}
        currentStakeholders={stakeholders}
      />
    </div>
  );
}

function pctLabel(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${((n / total) * 100).toFixed(0)}% do total`;
}

function StakeholderMetric({
  label,
  value,
  subtitle,
  dotStatus,
}: {
  label: string;
  value: number;
  subtitle?: string;
  dotStatus?: 'ok' | 'alert' | 'neutral';
}) {
  const dotClass =
    dotStatus === 'alert'
      ? 'bg-destructive'
      : dotStatus === 'ok'
        ? 'bg-primary-deep'
        : dotStatus === 'neutral'
          ? 'bg-muted-foreground'
          : null;
  return (
    <div className="relative flex-1 min-w-0 px-5 py-4">
      {dotClass && <span className={cn('absolute top-3 right-3 w-2 h-2 rounded-full', dotClass)} />}
      <p className="ol-label text-muted-foreground truncate">{label}</p>
      <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums truncate mt-1">
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
    </div>
  );
}

