import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateStakeholder, useUpdateStakeholder } from '@/hooks/useProjectStakeholders';
import {
  ProjectStakeholder,
  STAKEHOLDER_ROLES,
  ORGANIZATION_OPTIONS,
  SPONSORSHIP_LEVEL_OPTIONS,
  InfluenceLevel,
  InterestLevel,
  SponsorshipLevel,
} from '@/types/projectStakeholder';
import { formatPhone } from '@/lib/masks';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  role: z.string().min(1, 'Papel é obrigatório'),
  organization: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  influenceLevel: z.enum(['high', 'medium', 'low']).optional(),
  interestLevel: z.enum(['high', 'medium', 'low']).optional(),
  sponsorshipLevel: z.enum(['promoter', 'neutral', 'detractor']).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface StakeholderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  stakeholder: ProjectStakeholder | null;
}

export function StakeholderFormDialog({
  open,
  onOpenChange,
  projectId,
  stakeholder,
}: StakeholderFormDialogProps) {
  const createStakeholder = useCreateStakeholder();
  const updateStakeholder = useUpdateStakeholder();
  const isEditing = !!stakeholder;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      role: '',
      organization: '',
      email: '',
      phone: '',
      influenceLevel: undefined,
      interestLevel: undefined,
      sponsorshipLevel: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (stakeholder) {
      form.reset({
        name: stakeholder.name,
        role: stakeholder.role,
        organization: stakeholder.organization || '',
        email: stakeholder.email || '',
        phone: stakeholder.phone || '',
        influenceLevel: stakeholder.influence_level || undefined,
        interestLevel: stakeholder.interest_level || undefined,
        sponsorshipLevel: stakeholder.sponsorship_level || undefined,
        notes: stakeholder.notes || '',
      });
    } else {
      form.reset({
        name: '',
        role: '',
        organization: '',
        email: '',
        phone: '',
        influenceLevel: undefined,
        interestLevel: undefined,
        sponsorshipLevel: undefined,
        notes: '',
      });
    }
  }, [stakeholder, form]);

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateStakeholder.mutate(
        {
          id: stakeholder.id,
          projectId,
          updates: {
            name: data.name,
            role: data.role,
            organization: data.organization,
            email: data.email,
            phone: data.phone,
            influenceLevel: data.influenceLevel as InfluenceLevel | undefined,
            interestLevel: data.interestLevel as InterestLevel | undefined,
            sponsorshipLevel: data.sponsorshipLevel as SponsorshipLevel | undefined,
            notes: data.notes,
          },
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createStakeholder.mutate(
        {
          projectId,
          name: data.name,
          role: data.role,
          organization: data.organization,
          email: data.email,
          phone: data.phone,
          influenceLevel: data.influenceLevel as InfluenceLevel | undefined,
          interestLevel: data.interestLevel as InterestLevel | undefined,
          sponsorshipLevel: data.sponsorshipLevel as SponsorshipLevel | undefined,
          notes: data.notes,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Stakeholder' : 'Novo Stakeholder'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Papel *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAKEHOLDER_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organização</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ORGANIZATION_OPTIONS.map((org) => (
                          <SelectItem key={org.value} value={org.value}>
                            {org.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sponsorshipLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Patrocínio</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SPONSORSHIP_LEVEL_OPTIONS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(00) 00000-0000" 
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="influenceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Influência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="low">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interestLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Interesse</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">Alto</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="low">Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações sobre o stakeholder..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createStakeholder.isPending || updateStakeholder.isPending}
              >
                {isEditing ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}