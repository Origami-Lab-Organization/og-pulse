import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { PersonalKanbanCardWithTags } from '@/types/personalKanban';
import { useUpdatePersonalCard, useDeletePersonalCard } from '@/hooks/usePersonalKanban';
import { PersonalTagInput } from './PersonalTagInput';

const schema = z.object({
  title: z.string().min(1, 'Campo obrigatório'),
  description: z.string().optional(),
  due_date: z.date().optional().nullable(),
});
type FormValues = z.infer<typeof schema>;

interface PersonalCardDetailDialogProps {
  card: PersonalKanbanCardWithTags | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonalCardDetailDialog({ card, open, onOpenChange }: PersonalCardDetailDialogProps) {
  const updateCard = useUpdatePersonalCard();
  const deleteCard = useDeletePersonalCard();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', due_date: null },
  });

  useEffect(() => {
    if (card) {
      form.reset({
        title: card.title,
        description: card.description ?? '',
        due_date: card.due_date ? parseISO(card.due_date) : null,
      });
    }
  }, [card, form]);

  const onSubmit = (values: FormValues) => {
    if (!card) return;
    updateCard.mutate(
      {
        id: card.id,
        updates: {
          title: values.title,
          description: values.description || null,
          due_date: values.due_date ? values.due_date.toISOString().split('T')[0] : null,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const handleDelete = () => {
    if (!card) return;
    deleteCard.mutate(card.id, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar card</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título do card" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione uma descrição..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      placeholder="Sem prazo definido"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Tags — live (saved immediately outside the form submit) */}
            {card && (
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Tags</span>
                <PersonalTagInput cardId={card.id} cardTags={card.card_tags ?? []} />
              </div>
            )}

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteCard.isPending}
                className="sm:mr-auto"
              >
                Excluir card
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={updateCard.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
