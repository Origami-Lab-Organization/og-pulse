import { AppLayout } from '@/components/layout/AppLayout';
import { PersonalKanbanBoard } from '@/components/my-kanban/PersonalKanbanBoard';

export default function MyKanban() {
  return (
    <AppLayout title="Meu Kanban" description="Organize suas tarefas pessoais">
      <PersonalKanbanBoard />
    </AppLayout>
  );
}
