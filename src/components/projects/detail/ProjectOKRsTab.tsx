import { useState } from 'react';
import { Plus, Target, Calendar, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectWithRelations } from '@/types/project';
import { useProjectOKRs, useDeleteOKR, useDeleteKeyResult } from '@/hooks/useProjectOKRs';
import { OKR_STATUS_LABELS, CONFIDENCE_LEVEL_LABELS, CONFIDENCE_LEVEL_COLORS, ProjectOKR, ProjectKeyResult, KeyResultConfidenceLevel } from '@/types/projectOkr';
import { OKRFormDialog } from '@/components/projects/okrs/OKRFormDialog';
import { KeyResultFormDialog } from '@/components/projects/okrs/KeyResultFormDialog';
import { OKRHistoryPopover } from '@/components/projects/okrs/OKRHistoryPopover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectOKRsTabProps {
  project: ProjectWithRelations;
  isReadOnly?: boolean;
}

export function ProjectOKRsTab({ project, isReadOnly = false }: ProjectOKRsTabProps) {
  const { data: okrs = [], isLoading } = useProjectOKRs(project.id);
  const deleteOKR = useDeleteOKR();
  const deleteKeyResult = useDeleteKeyResult();

  const [okrDialogOpen, setOkrDialogOpen] = useState(false);
  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [editingOkr, setEditingOkr] = useState<ProjectOKR | null>(null);
  const [editingKr, setEditingKr] = useState<ProjectKeyResult | null>(null);
  const [selectedOkrId, setSelectedOkrId] = useState<string | null>(null);

  const handleAddOkr = () => { setEditingOkr(null); setOkrDialogOpen(true); };
  const handleEditOkr = (okr: ProjectOKR) => { setEditingOkr(okr); setOkrDialogOpen(true); };
  const handleDeleteOkr = (okr: ProjectOKR) => {
    if (confirm(`Deseja excluir o objetivo "${okr.objective}"?`)) {
      deleteOKR.mutate({ id: okr.id, projectId: project.id });
    }
  };
  const handleAddKeyResult = (okrId: string) => { setSelectedOkrId(okrId); setEditingKr(null); setKrDialogOpen(true); };
  const handleEditKeyResult = (kr: ProjectKeyResult, okrId: string) => { setSelectedOkrId(okrId); setEditingKr(kr); setKrDialogOpen(true); };
  const handleDeleteKeyResult = (kr: ProjectKeyResult) => {
    if (confirm(`Deseja excluir o resultado-chave "${kr.description}"?`)) {
      deleteKeyResult.mutate({ id: kr.id, projectId: project.id });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-primary-deep/10 text-primary-deep border-primary-deep/20';
      case 'in_progress': return 'bg-muted text-foreground border-border';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const calculateKeyResultProgress = (kr: ProjectKeyResult) => {
    if (!kr.target_value || kr.target_value === 0) return 0;
    return Math.min(100, (kr.current_value / kr.target_value) * 100);
  };

  const calculateOkrProgress = (okr: ProjectOKR) => {
    const krs = okr.key_results || [];
    if (krs.length === 0) return 0;
    const total = krs.reduce((sum, kr) => sum + calculateKeyResultProgress(kr), 0);
    return Math.round(total / krs.length);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando OKRs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">OKRs do Projeto</h3>
          <p className="text-sm text-muted-foreground">
            Objetivos e Resultados-Chave para medir o sucesso do projeto
          </p>
        </div>
        {!isReadOnly && (
          <Button onClick={handleAddOkr}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Objetivo
          </Button>
        )}
      </div>

      {okrs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum OKR cadastrado ainda.<br />
              Comece adicionando os objetivos do projeto.
            </p>
            {!isReadOnly && (
              <Button variant="outline" className="mt-4" onClick={handleAddOkr}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Objetivo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {okrs.map((okr, index) => (
            <Card key={okr.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-muted-foreground">O{index + 1}</span>
                      <Badge variant="outline" className={getStatusColor(okr.status)}>
                        {OKR_STATUS_LABELS[okr.status]}
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{okr.objective}</CardTitle>
                    {okr.description && (
                      <p className="text-sm text-muted-foreground mt-1">{okr.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {okr.key_results && okr.key_results.length > 0 && (
                      <OKRHistoryPopover okrId={okr.id} keyResults={okr.key_results} />
                    )}
                    {!isReadOnly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditOkr(okr)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteOkr(okr)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  {okr.target_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Meta: {format(new Date(okr.target_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-1">
                    <span>Progresso:</span>
                    <Progress value={calculateOkrProgress(okr)} className="flex-1 max-w-32" />
                    <span className="font-medium">{calculateOkrProgress(okr)}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border-t pt-3 space-y-3">
                  {okr.key_results && okr.key_results.length > 0 ? (
                    okr.key_results.map((kr, krIndex) => (
                      <div key={kr.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group">
                        <span className="text-xs font-medium text-muted-foreground w-8">KR{krIndex + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{kr.description}</p>
                          {kr.target_value && (
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={calculateKeyResultProgress(kr)} className="flex-1 h-2" />
                              <span className="text-xs text-muted-foreground">
                                {kr.current_value}/{kr.target_value} {kr.unit}
                              </span>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className={`${CONFIDENCE_LEVEL_COLORS[kr.confidence_level]} text-xs`}>
                          {CONFIDENCE_LEVEL_LABELS[kr.confidence_level]}
                        </Badge>
                        {!isReadOnly && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditKeyResult(kr, okr.id)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteKeyResult(kr)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum Key Result cadastrado</p>
                  )}
                  {!isReadOnly && (
                    <Button variant="ghost" size="sm" className="w-full border-dashed border" onClick={() => handleAddKeyResult(okr.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Key Result
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OKRFormDialog open={okrDialogOpen} onOpenChange={setOkrDialogOpen} projectId={project.id} okr={editingOkr} />
      <KeyResultFormDialog open={krDialogOpen} onOpenChange={setKrDialogOpen} projectId={project.id} okrId={selectedOkrId || ''} keyResult={editingKr} isPlanning={project.portfolio_stage === 'planning'} />
    </div>
  );
}
