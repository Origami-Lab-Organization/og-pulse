import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Users,
  Building2,
  FolderKanban,
  FileText,
  TrendingUp,
  Shield,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import logo from "@/assets/logo.png";

// JSON-LD Schema for SEO
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Origami Pulse",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
  },
  description:
    "Sistema de gestão financeira completo para empresas de serviços. Controle funcionários, projetos e orçamentos em um só lugar.",
  featureList: [
    "Gestão de equipe com cálculo de custo/hora real",
    "Controle de clientes e projetos",
    "Orçamentos comerciais profissionais",
    "Dashboard de margem e rentabilidade",
    "Multi-tenant com segurança isolada",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "O que é o Origami Pulse?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Origami Pulse é um sistema de gestão financeira desenvolvido para empresas de serviços. Ele permite controlar funcionários, clientes, projetos e orçamentos em uma única plataforma, calculando automaticamente custos reais e margens de lucro.",
      },
    },
    {
      "@type": "Question",
      name: "Para quem é indicado o Origami Pulse?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O sistema é ideal para agências, consultorias, software houses, escritórios de design, e qualquer empresa de serviços que precise controlar custos de equipe, criar orçamentos comerciais e acompanhar a rentabilidade de projetos.",
      },
    },
    {
      "@type": "Question",
      name: "Como calcular o custo real de um funcionário?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O Origami Pulse calcula automaticamente o custo real somando salário, benefícios, encargos trabalhistas e ferramentas utilizadas. O sistema divide esse total pelas horas trabalhadas para obter o custo/hora real de cada colaborador.",
      },
    },
    {
      "@type": "Question",
      name: "Posso criar orçamentos comerciais?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim. O módulo de orçamentos permite criar propostas comerciais detalhadas com roles, horas por mês, taxas administrativas, impostos e descontos. Você pode converter orçamentos aprovados diretamente em projetos.",
      },
    },
    {
      "@type": "Question",
      name: "O sistema é seguro para minha empresa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim. O Origami Pulse utiliza arquitetura multi-tenant onde cada empresa tem seu ambiente completamente isolado. Os dados são protegidos com políticas de segurança no nível do banco de dados e autenticação robusta.",
      },
    },
    {
      "@type": "Question",
      name: "Como começo a usar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Basta clicar em 'Cadastrar Empresa Grátis', preencher os dados da sua empresa e do administrador. Em poucos segundos você terá acesso completo ao sistema para começar a cadastrar funcionários, clientes e projetos.",
      },
    },
  ],
};

const features = [
  {
    icon: Users,
    title: "Gestão de Equipe",
    description:
      "Controle completo de funcionários com cálculo automático de custo/hora real incluindo salário, benefícios, encargos e ferramentas.",
  },
  {
    icon: Building2,
    title: "Gestão de Clientes",
    description:
      "Carteira de clientes organizada com histórico de projetos, status e informações centralizadas para melhor relacionamento.",
  },
  {
    icon: FolderKanban,
    title: "Projetos e Alocação",
    description:
      "Gerencie projetos fixos ou contínuos, aloque equipe por projeto e acompanhe a margem real versus contratada.",
  },
  {
    icon: FileText,
    title: "Orçamentos Profissionais",
    description:
      "Crie propostas comerciais detalhadas com roles, horas por mês, taxas, impostos e descontos calculados automaticamente.",
  },
  {
    icon: TrendingUp,
    title: "Controle Financeiro",
    description:
      "Dashboard de margem com visão clara de rentabilidade, controle de parcelas e recebimentos por projeto.",
  },
  {
    icon: Shield,
    title: "Multi-Empresa",
    description:
      "Ambiente isolado por empresa com segurança e privacidade garantidas. Cadastro self-service em poucos minutos.",
  },
];

const benefits = [
  "Saiba o custo real de cada hora trabalhada",
  "Crie orçamentos precisos em minutos",
  "Acompanhe a margem de cada projeto",
  "Tome decisões baseadas em dados reais",
  "Ambiente seguro e isolado para sua empresa",
  "Comece a usar gratuitamente",
];

const faqItems = [
  {
    question: "O que é o Origami Pulse?",
    answer:
      "Origami Pulse é um sistema de gestão financeira desenvolvido para empresas de serviços. Ele permite controlar funcionários, clientes, projetos e orçamentos em uma única plataforma, calculando automaticamente custos reais e margens de lucro.",
  },
  {
    question: "Para quem é indicado o Origami Pulse?",
    answer:
      "O sistema é ideal para agências, consultorias, software houses, escritórios de design, e qualquer empresa de serviços que precise controlar custos de equipe, criar orçamentos comerciais e acompanhar a rentabilidade de projetos.",
  },
  {
    question: "Como calcular o custo real de um funcionário?",
    answer:
      "O Origami Pulse calcula automaticamente o custo real somando salário, benefícios, encargos trabalhistas e ferramentas utilizadas. O sistema divide esse total pelas horas trabalhadas para obter o custo/hora real de cada colaborador.",
  },
  {
    question: "Posso criar orçamentos comerciais?",
    answer:
      "Sim. O módulo de orçamentos permite criar propostas comerciais detalhadas com roles, horas por mês, taxas administrativas, impostos e descontos. Você pode converter orçamentos aprovados diretamente em projetos.",
  },
  {
    question: "O sistema é seguro para minha empresa?",
    answer:
      "Sim. O Origami Pulse utiliza arquitetura multi-tenant onde cada empresa tem seu ambiente completamente isolado. Os dados são protegidos com políticas de segurança no nível do banco de dados e autenticação robusta.",
  },
  {
    question: "Como começo a usar?",
    answer:
      "Basta clicar em 'Cadastrar Empresa Grátis', preencher os dados da sua empresa e do administrador. Em poucos segundos você terá acesso completo ao sistema para começar a cadastrar funcionários, clientes e projetos.",
  },
];

const LandingPage = () => {
  return (
    <>
      {/* JSON-LD Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="Origami Pulse - Sistema de Gestão Financeira"
                className="h-8 w-auto"
              />
              <span className="font-semibold text-lg text-foreground">
                Origami Pulse
              </span>
            </div>
            <nav className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/login">Entrar</Link>
              </Button>
            </nav>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="relative overflow-hidden py-20 md:py-32">
            <div className="absolute inset-0 gradient-subtle" />
            <div className="container relative">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl animate-fade-in">
                  Gestão Financeira Completa para{" "}
                  <span className="text-primary">Empresas de Serviços</span>
                </h1>
                <p className="mt-6 text-lg text-muted-foreground md:text-xl animate-fade-in">
                  Controle funcionários, projetos e orçamentos em um só lugar.
                  Saiba exatamente quanto custa sua operação e maximize sua
                  margem de lucro.
                </p>
                <div className="mt-10 flex items-center justify-center animate-fade-in">
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="w-full sm:w-auto"
                  >
                    <Link to="/login">Acessar minha conta</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Problem Section */}
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold text-foreground">
                  Você sabe quanto custa cada hora da sua equipe?
                </h2>
                <p className="mt-4 text-muted-foreground text-lg">
                  Muitas empresas de serviços precificam projetos sem considerar
                  todos os custos reais: salários, benefícios, encargos,
                  ferramentas. O resultado são margens apertadas ou até
                  prejuízos invisíveis.
                </p>
                <p className="mt-4 text-foreground font-medium">
                  O Origami Pulse resolve isso calculando automaticamente o
                  custo real de cada colaborador e ajudando você a criar
                  orçamentos rentáveis.
                </p>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 md:py-24" id="funcionalidades">
            <div className="container">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground">
                  Funcionalidades Principais
                </h2>
                <p className="mt-4 text-muted-foreground text-lg">
                  Tudo que você precisa para gerir sua empresa de serviços em
                  uma única plataforma.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                  <Card
                    key={index}
                    className="transition-all duration-300 hover:shadow-card-hover"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-primary/10 p-3">
                          <feature.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {feature.title}
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-16 md:py-24 bg-primary text-primary-foreground">
            <div className="container">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold">
                  Por que escolher o Origami Pulse?
                </h2>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 text-left">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-accent" />
                      <span className="text-primary-foreground/90">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section - AEO Optimized */}
          <section className="py-16 md:py-24" id="faq">
            <div className="container">
              <div className="mx-auto max-w-3xl">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-foreground">
                    Perguntas Frequentes
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Tire suas dúvidas sobre o Origami Pulse
                  </p>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left text-foreground">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="py-16 md:py-24 gradient-subtle">
            <div className="container">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold text-foreground">
                  Comece a controlar sua operação hoje
                </h2>
                <p className="mt-4 text-muted-foreground text-lg">
                  Cadastre sua empresa gratuitamente e tenha acesso completo ao
                  sistema. Sem necessidade de cartão de crédito.
                </p>
                <div className="mt-8">
                  <Button size="lg" asChild>
                    <Link to="/register">
                      Cadastrar Empresa Grátis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t py-8">
          <div className="container">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <nav className="flex items-center gap-6">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Login
                </Link>
                <a
                  href="#funcionalidades"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Funcionalidades
                </a>
                <a
                  href="#faq"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  FAQ
                </a>
              </nav>
              <p className="text-xs text-muted-foreground/60">
                Powered by OrigamiLab
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
