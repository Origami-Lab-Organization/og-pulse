import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { formatCPF, formatPhone, formatCNPJ, validateCPF, unformatCPF, unformatPhone, unformatCNPJ, validateCNPJ } from '@/lib/masks';
import logo from '@/assets/logo.png';

const getPasswordStrength = (password: string): { label: string; level: number; color: string } => {
  if (!password) return { label: '', level: 0, color: '' };
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password);
  const isLong = password.length >= 8;

  if (isLong && hasNumber && hasSpecial) return { label: 'Forte', level: 3, color: 'bg-green-500' };
  if (password.length >= 6 && (hasNumber || hasSpecial)) return { label: 'Média', level: 2, color: 'bg-yellow-500' };
  return { label: 'Fraca', level: 1, color: 'bg-red-500' };
};

const registerSchema = z.object({
  adminName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().refine(val => validateCPF(val), { message: 'CPF inválido' }),
  phone: z.string().refine(val => unformatPhone(val).length >= 10, { message: 'Telefone inválido' }),
  position: z.string().min(1, 'Selecione um cargo'),
  email: z.string().email('E-mail inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .refine(val => /\d/.test(val), { message: 'Senha deve conter ao menos 1 número' })
    .refine(val => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(val), { message: 'Senha deve conter ao menos 1 caractere especial' }),
  confirmPassword: z.string(),
  companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  cnpj: z.string().refine(val => validateCNPJ(val), { message: 'CNPJ inválido' }),
  segment: z.string().min(1, 'Selecione o segmento'),
  employeeCount: z.string().min(1, 'Selecione o número de funcionários'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const employeeCountMap: Record<string, number> = {
  '1-5': 5,
  '6-20': 20,
  '21-50': 50,
  '51+': 51,
};

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      companyName: '',
      adminName: '',
      cpf: '',
      phone: '',
      position: '',
      email: '',
      password: '',
      confirmPassword: '',
      cnpj: '',
      segment: '',
      employeeCount: '',
    },
  });

  const watchPassword = form.watch('password');
  const passwordStrength = getPasswordStrength(watchPassword);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const { data: responseData, error } = await supabase.functions.invoke('register-tenant', {
        body: {
          companyName: data.companyName,
          adminName: data.adminName,
          cpf: unformatCPF(data.cpf),
          phone: unformatPhone(data.phone),
          position: data.position,
          email: data.email,
          password: data.password,
          cnpj: unformatCNPJ(data.cnpj),
          segment: data.segment,
          employeeCount: employeeCountMap[data.employeeCount] || 5,
        },
      });

      if (error) {
        let errorMessage = 'Erro ao criar conta. Verifique os dados e tente novamente.';
        try {
          if (error.context && typeof error.context === 'object' && 'json' in error.context) {
            const body = await (error.context as Response).json();
            if (body?.error) errorMessage = body.error;
          } else if (error.message) {
            errorMessage = error.message;
          }
        } catch { /* Use default */ }
        throw new Error(errorMessage);
      }

      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        toast({
          title: 'Empresa cadastrada com sucesso!',
          description: 'Faça login com suas credenciais.',
        });
        navigate('/login');
        return;
      }

      toast({
        title: 'Bem-vindo!',
        description: 'Sua empresa foi cadastrada com sucesso.',
      });
      navigate('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Erro ao cadastrar empresa',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Origami Pulse" className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl">Cadastrar Empresa</CardTitle>
          <CardDescription>
            Preencha os dados para criar sua conta empresarial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* SECTION 1 */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Seus Dados</h3>
                <Separator className="mb-4" />
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="adminName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seu Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="João Silva" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="000.000.000-00"
                            {...field}
                            onChange={e => field.onChange(formatCPF(e.target.value))}
                            maxLength={14}
                          />
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
                        <FormLabel>Telefone / WhatsApp</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(11) 99999-9999"
                            {...field}
                            onChange={e => field.onChange(formatPhone(e.target.value))}
                            maxLength={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo na Empresa</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione seu cargo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sócio / Fundador">Sócio / Fundador</SelectItem>
                            <SelectItem value="Diretor">Diretor</SelectItem>
                            <SelectItem value="Gerente">Gerente</SelectItem>
                            <SelectItem value="Coordenador">Coordenador</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              {...field}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowPassword(v => !v)}
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        {watchPassword && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex gap-1 flex-1">
                              {[1, 2, 3].map(i => (
                                <div
                                  key={i}
                                  className={`h-1.5 flex-1 rounded-full ${i <= passwordStrength.level ? passwordStrength.color : 'bg-muted'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              {...field}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowConfirmPassword(v => !v)}
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* SECTION 2 */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Dados da Empresa</h3>
                <Separator className="mb-4" />
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Sua Empresa Ltda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00.000.000/0000-00"
                            {...field}
                            onChange={e => field.onChange(formatCNPJ(e.target.value))}
                            maxLength={18}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="segment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segmento da Empresa</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o segmento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Consultoria de Gestão / RH / TI">Consultoria de Gestão / RH / TI</SelectItem>
                            <SelectItem value="Agência de Marketing / Publicidade">Agência de Marketing / Publicidade</SelectItem>
                            <SelectItem value="Agência Digital / Design">Agência Digital / Design</SelectItem>
                            <SelectItem value="Escritório de Arquitetura / Engenharia">Escritório de Arquitetura / Engenharia</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="employeeCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Funcionários</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a faixa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1-5">1–5 pessoas</SelectItem>
                            <SelectItem value="6-20">6–20 pessoas</SelectItem>
                            <SelectItem value="21-50">21–50 pessoas</SelectItem>
                            <SelectItem value="51+">51+ pessoas</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Cadastrar Empresa
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar para o login
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
