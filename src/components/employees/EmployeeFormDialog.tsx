import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Employee } from '@/hooks/useEmployees';
import { CreateEmployeeInput } from '@/services/employeeService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { formatPhone, formatCPF, formatCurrency, parseCurrency } from '@/lib/masks';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  telefone: z.string().optional(),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  cpf: z.string().optional(),
  dataAdmissao: z.string().min(1, 'Data de admissão é obrigatória'),
  isGerente: z.boolean(),
  status: z.enum(['ativo', 'inativo']),
  salarioMensal: z.number().positive('Salário deve ser positivo'),
  beneficios: z.number().min(0, 'Benefícios não pode ser negativo'),
  encargos: z.number().min(0, 'Encargos não pode ser negativo'),
});

type FormData = z.infer<typeof formSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSubmit: (data: CreateEmployeeInput) => void;
  isLoading?: boolean;
}

const EmployeeFormDialog = ({
  open,
  onOpenChange,
  employee,
  onSubmit,
  isLoading = false,
}: EmployeeFormDialogProps) => {
  const isEditing = !!employee;

  // Masked display values
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [salarioDisplay, setSalarioDisplay] = useState('');
  const [beneficiosDisplay, setBeneficiosDisplay] = useState('');
  const [encargosDisplay, setEncargosDisplay] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      cargo: '',
      cpf: '',
      dataAdmissao: new Date().toISOString().split('T')[0],
      isGerente: false,
      status: 'ativo',
      salarioMensal: 0,
      beneficios: 0,
      encargos: 0,
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        nome: employee.nome,
        email: employee.email,
        telefone: employee.telefone || '',
        cargo: employee.cargo,
        cpf: employee.cpf || '',
        dataAdmissao: employee.dataAdmissao,
        isGerente: employee.isGerente,
        status: employee.status,
        salarioMensal: employee.salarioMensal,
        beneficios: employee.beneficios,
        encargos: employee.encargos,
      });
      // Set display values
      setPhoneDisplay(employee.telefone ? formatPhone(employee.telefone) : '');
      setCpfDisplay(employee.cpf ? formatCPF(employee.cpf) : '');
      setSalarioDisplay(employee.salarioMensal ? formatCurrency(employee.salarioMensal) : '');
      setBeneficiosDisplay(employee.beneficios ? formatCurrency(employee.beneficios) : '');
      setEncargosDisplay(employee.encargos ? formatCurrency(employee.encargos) : '');
    } else {
      form.reset({
        nome: '',
        email: '',
        telefone: '',
        cargo: '',
        cpf: '',
        dataAdmissao: new Date().toISOString().split('T')[0],
        isGerente: false,
        status: 'ativo',
        salarioMensal: 0,
        beneficios: 0,
        encargos: 0,
      });
      // Reset display values
      setPhoneDisplay('');
      setCpfDisplay('');
      setSalarioDisplay('');
      setBeneficiosDisplay('');
      setEncargosDisplay('');
    }
  }, [employee, form, open]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneDisplay(formatted);
    form.setValue('telefone', formatted.replace(/\D/g, ''));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfDisplay(formatted);
    form.setValue('cpf', formatted.replace(/\D/g, ''));
  };

  const handleCurrencyChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'salarioMensal' | 'beneficios' | 'encargos',
    setDisplay: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const formatted = formatCurrency(e.target.value);
    setDisplay(formatted);
    form.setValue(field, parseCurrency(formatted));
  };

  const handleSubmit = (data: FormData) => {
    onSubmit(data as CreateEmployeeInput);
    form.reset();
    // Reset display values
    setPhoneDisplay('');
    setCpfDisplay('');
    setSalarioDisplay('');
    setBeneficiosDisplay('');
    setEncargosDisplay('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do funcionário abaixo.'
              : 'Preencha as informações para adicionar um novo funcionário. Um email de convite será enviado automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="joao@empresa.com" 
                        disabled={isEditing}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={() => (
                  <FormItem>
                    <FormLabel>Telefone (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(11) 99999-9999" 
                        value={phoneDisplay}
                        onChange={handlePhoneChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpf"
                render={() => (
                  <FormItem>
                    <FormLabel>CPF (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00" 
                        value={cpfDisplay}
                        onChange={handleCpfChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input placeholder="Desenvolvedor Sênior" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataAdmissao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Admissão</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isGerente"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Administrador?</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Informações Financeiras</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="salarioMensal"
                  render={() => (
                    <FormItem>
                      <FormLabel>Salário Mensal</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="R$ 0,00"
                          value={salarioDisplay}
                          onChange={(e) => handleCurrencyChange(e, 'salarioMensal', setSalarioDisplay)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="beneficios"
                  render={() => (
                    <FormItem>
                      <FormLabel>Benefícios</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="R$ 0,00"
                          value={beneficiosDisplay}
                          onChange={(e) => handleCurrencyChange(e, 'beneficios', setBeneficiosDisplay)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="encargos"
                  render={() => (
                    <FormItem>
                      <FormLabel>Encargos</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="R$ 0,00"
                          value={encargosDisplay}
                          onChange={(e) => handleCurrencyChange(e, 'encargos', setEncargosDisplay)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Salvando...' : 'Cadastrando...'}
                  </>
                ) : (
                  isEditing ? 'Salvar Alterações' : 'Adicionar Funcionário'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
