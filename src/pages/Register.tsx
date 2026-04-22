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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, ArrowLeft, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';
import { formatCNPJ, validateCNPJ, unformatCNPJ } from '@/lib/masks';
import logo from '@/assets/logo.png';

const getPasswordStrength = (password: string): { label: string; level: number; color: string } => {
  if (!password) return { label: '', level: 0, color: '' };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password);
  const isLong = password.length >= 8;

  if (isLong && hasUpper && hasNumber && hasSpecial) return { label: 'Forte', level: 3, color: 'bg-green-500' };
  if (isLong) return { label: 'Média', level: 2, color: 'bg-yellow-500' };
  return { label: 'Fraca', level: 1, color: 'bg-red-500' };
};

const step1Schema = z.object({
  adminName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .refine(val => /[A-Z]/.test(val), { message: 'Senha deve conter ao menos 1 letra maiúscula' })
    .refine(val => /\d/.test(val), { message: 'Senha deve conter ao menos 1 número' })
    .refine(val => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(val), { message: 'Senha deve conter ao menos 1 símbolo' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

const registerSchema = z.object({
  adminName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8),
  confirmPassword: z.string(),
  companyName: z.string().min(1, 'Nome da empresa é obrigatório'),
  cnpj: z.string().refine(val => validateCNPJ(val), { message: 'CNPJ inválido' }),
  segment: z.string().min(1, 'Segmento é obrigatório'),
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

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { num: 1, label: 'Seus Dados' },
    { num: 2, label: 'Sua Empresa' },
  ];

  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                currentStep >= step.num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep > step.num ? <Check className="h-4 w-4" /> : step.num}
            </div>
            <span className="text-xs text-muted-foreground mt-1">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-2 mb-5 ${
                currentStep > 1 ? 'bg-primary' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      adminName: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      cnpj: '',
      segment: '',
      employeeCount: '',
    },
  });

  const watchPassword = form.watch('password');
  const watchConfirmPassword = form.watch('confirmPassword');
  const passwordStrength = getPasswordStrength(watchPassword);
  const passwordsMismatch = watchConfirmPassword && watchPassword !== watchConfirmPassword;

  const handleStep1Continue = async () => {
    const values = form.getValues();
    const result = step1Schema.safeParse(values);
    
    if (!result.success) {
      // Trigger validation on step 1 fields
      await form.trigger(['adminName', 'email', 'password', 'confirmPassword']);
      return;
    }
    
    setStep(2);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const { data: responseData, error } = await supabase.functions.invoke('register-tenant', {
        body: {
          companyName: data.companyName,
          adminName: data.adminName,
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

      navigate('/boas-vindas', { state: { email: data.email, justRegistered: true } });
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
    <div className="min-h-screen flex">
      {/* Painel esquerdo — navy com gradiente de marca */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(222,18%,10%)] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-brand opacity-10" />
        <div className="relative z-10 text-center">
          <img src={logo} alt="Origami Pulse" className="h-20 w-20 mx-auto mb-8" />
          <h1 className="ol-h1 text-white mb-4">
            Comece a ver a <span className="ol-text-accent">margem real</span> dos seus projetos.
          </h1>
          <p className="text-white/60 text-base max-w-sm mx-auto">
            Configure sua empresa em menos de 7 dias e tome decisões com dados concretos.
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logo} alt="Origami Pulse" className="h-14 w-14" />
          </div>

          <div className="mb-6">
            <p className="ol-label text-muted-foreground mb-2">Novo cadastro</p>
            <h2 className="ol-h2 text-foreground">
              Cadastrar <span className="ol-text-accent">Empresa</span>
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Comece a ver a margem real dos seus projetos em menos de 7 dias.
            </p>
          </div>

          <StepIndicator currentStep={step} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="adminName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="João Silva" {...field} />
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
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="joao@empresa.com" {...field} />
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
                        {passwordsMismatch && (
                          <p className="text-sm font-medium text-destructive">As senhas não coincidem</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button variant="gradient" type="button" className="w-full" onClick={handleStep1Continue}>
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
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
                </>
              )}

              {step === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Empresa LTDA" {...field} />
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

                  <Button variant="gradient" type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando sua conta...
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Cadastrar Empresa
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Voltar
                    </button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao criar sua conta, você concorda com nossos{' '}
                    <Link to="/termos" className="underline hover:text-primary">Termos de Uso</Link>
                    {' '}e{' '}
                    <Link to="/privacidade" className="underline hover:text-primary">Política de Privacidade</Link>.
                  </p>
                </>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Register;
