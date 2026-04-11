import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Bug, Wrench, CheckSquare } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActivityCardType, ActivityColumnName, CARD_TYPE_OPTIONS, CreateActivityInput } from '@/types/projectActivity';
import { ProjectWithRelations } from '@/types/project';
import { cn } from '@/lib/utils';

const CARD_TYPE_ICON: Record<ActivityCardType, React.ElementType> = {
  story:     BookOpen,
  bug:       Bug,
  tech_debt: Wrench,
  task:      CheckSquare,
};

const CARD_TYPE_COLOR: Record<ActivityCardType, string> = {
  story:     'text-blue-600 dark:text-blue-400',
  bug:       'text-red-600 dark:text-red-400',
  tech_debt: 'text-amber-600 dark:text-amber-400',
  task:      'text-muted-foreground',
};

const schema = z.object({
  title:               z.string().min(1, 'Título é obrigatório'),
  cardType:            z.enum(['story', 'bug', 'tech_debt', 'task']).default('story'),
  assigneeId:          z.string().optional(),
  points:              z.coerce.number().int().min(0).optional().or(z.literal('')),
  userStory:           z.string().optional(),
  acceptanceCriteria:  z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ActivityCardFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithRelations;
  columnName: ActivityColumnName;
  onSubmit: (input: CreateActivityInput) => void;
  isSubmitting: boolean;
}

export function ActivityCardFormDrawer({
  open,
  onOpenChange,
  project,
  columnName,
  onSubmit,
  isSubmitting,
}: ActivityCardFormDrawerProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:              '',
      cardType:           'story',
      assigneeId:         '',
      points:             '',
      userStory:          '',
      acceptanceCriteria: '',
      isBlocked:          false,
      blockedReason:      '',
    },
  });

  const members = project.members ?? [];

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      projectId:          project.id,
      title:              values.title,
      cardType:           values.cardType,
      assigneeId:         values.assigneeId || undefined,
      points:             values.points !== '' && values.points != null ? Number(values.points) : undefined,
      userStory:          values.userStory || undefined,
      acceptanceCriteria: values.acceptanceCriteria || undefined,
      columnName,
    });
    form.reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset();
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0">
          <SheetTitle>Novo Card</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 pb-4 space-y-5">

                {/* Título */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Descreva a atividade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tipo */}
                <FormField
                  control={form.control}
                  name="cardType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CARD_TYPE_OPTIONS.map((opt) => {
                            const Icon = CARD_TYPE_ICON[opt.value];
                            return (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className="flex items-center gap-2">
                                  <Icon className={cn('h-4 w-4 shrink-0', CARD_TYPE_COLOR[opt.value])} />
                                  {opt.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Responsável */}
                {members.length > 0 && (
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sem responsável" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {members.map((m) => (
                              <SelectItem key={m.employee_id} value={m.employee_id}>
                                {m.employee?.nome ?? m.employee_id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Pontos */}
                <FormField
                  control={form.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pontos (Fibonacci)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Story points (opcional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* User Story */}
                <FormField
                  control={form.control}
                  name="userStory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Story</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Como [ator], quero [ação] para [benefício]..."
                          rows={3}
                          className="text-sm resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Critérios de Aceitação */}
                <FormField
                  control={form.control}
                  name="acceptanceCriteria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Critérios de Aceitação</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dado que... quando... então..."
                          rows={3}
                          className="text-sm resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </ScrollArea>

            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
