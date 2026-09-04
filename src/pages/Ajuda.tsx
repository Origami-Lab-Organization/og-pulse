/**
 * Central de Ajuda.
 *
 * Duas decisões que valem explicar:
 *
 * 1. **O tópico segue a capacidade da rota** (ADR-0027). Ajuda de tela que a pessoa não abre
 *    não é neutra: ela sugere um acesso que a pessoa não tem e gera pedido de suporte para
 *    algo que o banco vai negar. Então a página mostra o Pulse que a pessoa realmente tem.
 * 2. **Todo tópico fala de MCP**, inclusive quando não existe ferramenta — nesse caso diz por
 *    que não existe. "Não há" documentado vale mais que silêncio, porque silêncio faz a
 *    pessoa procurar.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MessageSquare, Search, Terminal } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { HELP_GROUPS, type HelpTopic } from '@/content/helpTopics';
import { McpSetupCard } from '@/components/help/McpSetupCard';

const SERVIDOR_LABEL: Record<string, string> = {
  drive: 'og-pulse-drive',
  activities: 'og-pulse-activities',
};

function McpBloco({ topic }: { topic: HelpTopic }) {
  const { mcp } = topic;

  if (!mcp.server) {
    return (
      <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          Pelo chat (MCP)
        </div>
        <p className="text-sm text-muted-foreground">{mcp.note}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        Pelo chat (MCP)
        <Badge variant="secondary">{SERVIDOR_LABEL[mcp.server]}</Badge>
      </div>

      {mcp.example ? (
        <p className="flex items-start gap-2 text-sm">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="italic">“{mcp.example}”</span>
        </p>
      ) : null}

      {mcp.note ? <p className="text-sm text-muted-foreground">{mcp.note}</p> : null}

      {mcp.tools?.length ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Ferramentas que atendem este assunto — você não precisa citá-las, elas são escolhidas
            pelo pedido:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mcp.tools.map((t) => (
              <code key={t} className="rounded bg-background px-1.5 py-0.5 text-xs border border-border">
                {t}
              </code>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TopicoConteudo({ topic }: { topic: HelpTopic }) {
  return (
    <div className="space-y-4 pb-2">
      <p className="text-sm">{topic.what}</p>

      <div className="space-y-2">
        <p className="text-sm font-medium">Como você usa</p>
        <ol className="ml-4 list-decimal space-y-1.5 text-sm text-muted-foreground">
          {topic.how.map((passo) => (
            <li key={passo}>{passo}</li>
          ))}
        </ol>
      </div>

      <McpBloco topic={topic} />

      {topic.route ? (
        <Link
          to={topic.route}
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Abrir a tela
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function combina(topic: HelpTopic, termo: string): boolean {
  if (!termo) return true;
  const alvo = [
    topic.title,
    topic.what,
    ...topic.how,
    topic.mcp.example ?? '',
    topic.mcp.note ?? '',
    ...(topic.mcp.tools ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return alvo.includes(termo.toLowerCase().trim());
}

export default function Ajuda() {
  const { can } = useAuth();
  const [busca, setBusca] = useState('');

  const grupos = useMemo(
    () =>
      HELP_GROUPS.map((g) => ({
        ...g,
        topics: g.topics.filter(
          (t) => (!t.requiresCapability || can(t.requiresCapability)) && combina(t, busca),
        ),
      })).filter((g) => g.topics.length > 0),
    [can, busca],
  );

  const total = grupos.reduce((soma, g) => soma + g.topics.length, 0);

  return (
    <AppLayout
      title="Central de Ajuda"
      description="O que cada tela faz, como você usa e como pedir a mesma coisa pelo chat"
      breadcrumbs={[{ label: 'Ajuda' }]}
    >
      <div className="max-w-3xl space-y-6">
        <McpSetupCard />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por tela, ação ou ferramenta..."
            className="pl-9"
            aria-label="Buscar na ajuda"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Você vê a ajuda das telas que o seu perfil abre. {total}{' '}
          {total === 1 ? 'tópico disponível' : 'tópicos disponíveis'} para você. Precisa de uma tela
          que não está aqui? Quem administra o tenant concede o acesso em Configurações → Perfis de
          Acesso.
        </p>

        {total === 0 ? (
          <Card>
            <CardHeader className="space-y-1.5">
              <CardTitle className="text-base">Nada encontrado para “{busca}”</CardTitle>
              <CardDescription>
                Tente o nome da tela (Pipeline, Portfólio, Timesheet) ou o que você quer fazer
                (apontar hora, subir arquivo, mover card).
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.id} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{grupo.label}</h2>
              <Card>
                <CardContent className="p-0">
                  <Accordion type="multiple" className="w-full">
                    {grupo.topics.map((topic) => (
                      <AccordionItem key={topic.id} value={topic.id} className="px-4 last:border-b-0">
                        <AccordionTrigger className="text-left text-sm hover:no-underline">
                          {topic.title}
                        </AccordionTrigger>
                        <AccordionContent>
                          <TopicoConteudo topic={topic} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </section>
          ))
        )}
      </div>
    </AppLayout>
  );
}
