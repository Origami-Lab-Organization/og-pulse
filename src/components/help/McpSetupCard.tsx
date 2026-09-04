/**
 * Como conectar o MCP. Aparece para todo mundo, acima dos tópicos, porque é a instrução que
 * vale uma vez e destrava todas as outras.
 *
 * O conteúdo é o que os dois servidores realmente pedem, conferido em
 * `apps/mcp-drive/README.md` e `apps/mcp-activities/README.md`. Sem promessa de ferramenta
 * que não existe e sem passo que o instalador não faz.
 */
import { Cloud, KanbanSquare, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function Comando({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
      <code>{children}</code>
    </pre>
  );
}

export function McpSetupCard() {
  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-base">Usar o Pulse pelo chat — conectar o MCP</CardTitle>
        <CardDescription>
          O MCP deixa você pedir no chat o que faria na tela: listar projetos, mexer no kanban,
          subir arquivo na pasta do projeto. São dois servidores, e cada um se instala uma vez por
          computador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            <strong>O acesso pelo chat é o seu acesso.</strong> Os dois servidores entram com as
            suas credenciais e operam sob as mesmas regras do banco que a tela obedece — enxergam e
            alteram exatamente o que você enxergaria e alteraria. Nenhum dos dois usa chave de
            serviço, então não existe atalho por fora do seu perfil.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Projetos e arquivos</span>
            <Badge variant="secondary">og-pulse-drive</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Um comando, a partir da raiz do repositório. O script confere o Node, compila, pergunta
            seu e-mail e senha do Pulse — digitados, nunca por argumento — e registra o servidor no
            Claude Code e no Claude Desktop sem apagar outros MCPs já configurados.
          </p>
          <Comando>bash apps/mcp-drive/install.sh</Comando>
          <p className="text-sm text-muted-foreground">
            Para chegar nos arquivos você também autoriza sua conta Microsoft neste computador, uma
            vez: peça no chat <em>“qual conta Microsoft está autorizada aqui?”</em> e, se não
            houver, <em>“inicia o login da Microsoft”</em>. O servidor devolve uma URL e um código.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <KanbanSquare className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Atividades do projeto</span>
            <Badge variant="secondary">og-pulse-activities</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Instalação manual: instale as dependências, copie o arquivo de ambiente e preencha as
            quatro variáveis. A senha é lida do ambiente uma vez e nunca passa pelo contexto do
            modelo.
          </p>
          <Comando>{`cd apps/mcp-activities
npm install
cp .env.example .env`}</Comando>
          <Comando>{`SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
PULSE_EMAIL=voce@origamilab.com.br
PULSE_PASSWORD=...`}</Comando>
          <p className="text-sm text-muted-foreground">
            Depois registre o servidor no seu cliente de MCP, apontando para{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">npm start</code> nessa pasta. O
            README da pasta traz o JSON pronto do Claude Desktop.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Depois de conectar, você não decora nome de ferramenta: pede em português. Cada tópico
          abaixo mostra uma frase de exemplo para o assunto dele.
        </p>
      </CardContent>
    </Card>
  );
}
