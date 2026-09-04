/**
 * Central de Ajuda, em abas por assunto.
 *
 * Três decisões que valem explicar:
 *
 * 1. **Abas por assunto, e a primeira é o chat.** A lista única obrigava rolar um acordeão
 *    de 20 itens para achar a tela. Com abas, a pessoa escolhe o assunto e vê de 2 a 6
 *    tópicos. "Pelo chat" vem primeiro porque é a instrução que vale uma vez e destrava
 *    todas as outras.
 * 2. **A aba só existe se a pessoa tiver o que ler nela** (ADR-0027): cada tópico é
 *    governado pela mesma capacidade da rota. Ajuda de tela que a pessoa não abre sugere um
 *    acesso que ela não tem e gera pedido de suporte para algo que o banco vai negar.
 * 3. **Busca atravessa as abas.** Quem busca não sabe em qual assunto está a resposta —
 *    então, com texto na busca, o resultado é uma lista única com o assunto ao lado, e as
 *    abas saem da frente.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageSquare, Search, Terminal } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { HELP_GROUPS, type HelpTopic } from "@/content/helpTopics";
import { McpSetupCard } from "@/components/help/McpSetupCard";

const ABA_MCP = "mcp";

const SERVIDOR_LABEL: Record<string, string> = {
  drive: "og-pulse-drive",
  activities: "og-pulse-activities",
};

function McpBloco({ topic }: { topic: HelpTopic }) {
  const { mcp } = topic;

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        Pelo chat
        {mcp.server ? (
          <Badge variant="secondary">{SERVIDOR_LABEL[mcp.server]}</Badge>
        ) : null}
      </div>

      {mcp.example ? (
        <p className="flex items-start gap-2 text-sm">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="italic">“{mcp.example}”</span>
        </p>
      ) : null}

      {mcp.note ? (
        <p className="text-sm text-muted-foreground">{mcp.note}</p>
      ) : null}

      {mcp.tools?.length ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Ferramentas que atendem este assunto — você não precisa citá-las,
            elas são escolhidas pelo pedido:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mcp.tools.map((t) => (
              <code
                key={t}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
              >
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

function ListaDeTopicos({ topics }: { topics: HelpTopic[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Accordion type="multiple" className="w-full">
          {topics.map((topic) => (
            <AccordionItem
              key={topic.id}
              value={topic.id}
              className="px-4 last:border-b-0"
            >
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
  );
}

function combina(topic: HelpTopic, termo: string): boolean {
  if (!termo) return true;
  const alvo = [
    topic.title,
    topic.what,
    ...topic.how,
    topic.mcp.example ?? "",
    topic.mcp.note ?? "",
    ...(topic.mcp.tools ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return alvo.includes(termo.toLowerCase().trim());
}

export default function Ajuda() {
  const { can } = useAuth();
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState(ABA_MCP);

  /** Os grupos que a pessoa pode ler, já sem os tópicos que o perfil dela não alcança. */
  const grupos = useMemo(
    () =>
      HELP_GROUPS.map((g) => ({
        ...g,
        topics: g.topics.filter(
          (t) => !t.requiresCapability || can(t.requiresCapability),
        ),
      })).filter((g) => g.topics.length > 0),
    [can],
  );

  const buscando = busca.trim().length > 0;

  const resultados = useMemo(() => {
    if (!buscando) return [];
    return grupos.flatMap((g) =>
      g.topics
        .filter((t) => combina(t, busca))
        .map((t) => ({ grupo: g.label, topic: t })),
    );
  }, [buscando, busca, grupos]);

  const totalTopicos = grupos.reduce((soma, g) => soma + g.topics.length, 0);

  return (
    <AppLayout
      title="Central de Ajuda"
      description="O que cada tela faz, como você usa e como pedir a mesma coisa pelo chat"
      breadcrumbs={[{ label: "Ajuda" }]}
    >
      {/* Largura toda: a coluna estreita deixava metade da tela vazia e cortava o comando
          de instalação. Os blocos internos usam grade responsiva para a largura virar duas
          colunas em telas grandes, em vez de linha de texto longa demais para ler. */}
      <div className="space-y-4">
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

        {buscando ? (
          resultados.length === 0 ? (
            <Card>
              <CardHeader className="space-y-1.5">
                <CardTitle className="text-base">
                  Nada encontrado para “{busca.trim()}”
                </CardTitle>
                <CardDescription>
                  Tente o nome da tela (Pipeline, Portfólio, Timesheet) ou o que
                  você quer fazer (apontar hora, subir arquivo, mover card).
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {resultados.length}{" "}
                {resultados.length === 1 ? "resultado" : "resultados"} em todos
                os assuntos.
              </p>
              {resultados.map(({ grupo, topic }) => (
                <div key={topic.id} className="space-y-1.5">
                  <Badge variant="outline">{grupo}</Badge>
                  <ListaDeTopicos topics={[topic]} />
                </div>
              ))}
            </div>
          )
        ) : (
          <Tabs value={aba} onValueChange={setAba}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value={ABA_MCP}>Pelo chat</TabsTrigger>
              {grupos.map((g) => (
                <TabsTrigger key={g.id} value={g.id}>
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={ABA_MCP} className="mt-4">
              <McpSetupCard />
            </TabsContent>

            {grupos.map((g) => (
              <TabsContent key={g.id} value={g.id} className="mt-4 space-y-3">
                <ListaDeTopicos topics={g.topics} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        <p className="max-w-3xl text-sm text-muted-foreground">
          Você vê a ajuda das telas que o seu perfil abre: {totalTopicos}{" "}
          {totalTopicos === 1 ? "tópico" : "tópicos"}, em{" "}
          {grupos.length === 1 ? "1 assunto" : `${grupos.length} assuntos`}.
          Precisa de uma tela que não está aqui? Quem administra o tenant
          concede o acesso em Configurações → Perfis de Acesso.
        </p>
      </div>
    </AppLayout>
  );
}
