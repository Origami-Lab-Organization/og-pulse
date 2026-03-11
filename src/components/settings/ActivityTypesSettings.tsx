import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Users, Globe, Power, PowerOff } from 'lucide-react';
import {
  useActivityTypes,
  useCreateActivityType,
  useUpdateActivityType,
  useDeleteActivityType,
  useToggleActivityTypeStatus,
  ActivityType,
  CreateActivityTypeInput,
} from '@/hooks/useActivityTypes';
import { ActivityTypeFormDialog } from './ActivityTypeFormDialog';
import { DeleteActivityTypeDialog } from './DeleteActivityTypeDialog';
import { supabase } from '@/integrations/supabase/client';

export function ActivityTypesSettings() {
  const { data: activityTypes = [], isLoading } = useActivityTypes();
  const createMutation = useCreateActivityType();
  const updateMutation = useUpdateActivityType();
  const deleteMutation = useDeleteActivityType();
  const toggleStatusMutation = useToggleActivityTypeStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ActivityType | null>(null);
  const [existingEmployeeIds, setExistingEmployeeIds] = useState<string[]>([]);

  const handleCreate = () => {
    setSelected(null);
    setExistingEmployeeIds([]);
    setFormOpen(true);
  };

  const handleEdit = async (at: ActivityType) => {
    setSelected(at);
    if (!at.applies_to_all) {
      const { data } = await supabase
        .from('activity_type_employees')
        .select('employee_id')
        .eq('activity_type_id', at.id);
      setExistingEmployeeIds(data?.map(r => r.employee_id) ?? []);
    } else {
      setExistingEmployeeIds([]);
    }
    setFormOpen(true);
  };

  const handleDelete = (at: ActivityType) => {
    setSelected(at);
    setDeleteOpen(true);
  };

  const handleFormSubmit = (data: CreateActivityTypeInput) => {
    if (selected) {
      updateMutation.mutate({ ...data, id: selected.id }, { onSuccess: () => setFormOpen(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleConfirmDelete = () => {
    if (selected) {
      deleteMutation.mutate(selected.id, { onSuccess: () => { setDeleteOpen(false); setSelected(null); } });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Atividades Internas</CardTitle>
            <CardDescription>
              Categorias para lançamento de horas fora de projetos (Administrativo, Marketing, etc.)
            </CardDescription>
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova atividade
          </Button>
        </CardHeader>

        <CardContent>
          {activityTypes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Nenhuma atividade interna criada ainda.</p>
              <p className="text-xs mt-1">Clique em "Nova atividade" para começar.</p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {activityTypes.map(at => (
                <div key={at.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!at.is_active ? 'line-through text-muted-foreground' : ''}`}>
                      {at.name}
                    </p>
                    {at.description && (
                      <p className="text-xs text-muted-foreground truncate">{at.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {at.applies_to_all ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Globe className="h-3 w-3" />
                        Todos
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Users className="h-3 w-3" />
                        {at.employee_count} func.
                      </Badge>
                    )}

                    <Badge
                      variant={at.is_active ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {at.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={at.is_active ? 'Desativar' : 'Ativar'}
                      onClick={() => toggleStatusMutation.mutate({ id: at.id, is_active: !at.is_active })}
                    >
                      {at.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(at)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(at)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ActivityTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        activityType={selected}
        existingEmployeeIds={existingEmployeeIds}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteActivityTypeDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        activityType={selected}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
