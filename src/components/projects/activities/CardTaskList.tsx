// ACT-07 — Sub-tarefas do card
import { ListTodo } from 'lucide-react';

interface CardTaskListProps {
  cardId: string;
  disabled?: boolean;
}

export function CardTaskList({ cardId: _cardId, disabled: _disabled }: CardTaskListProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
      <ListTodo className="h-5 w-5 opacity-40" />
      <span className="text-xs">Sub-tarefas — em breve</span>
    </div>
  );
}
