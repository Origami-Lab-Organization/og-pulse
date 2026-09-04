/**
 * Como conectar o Pulse ao chat.
 *
 * A instrução anterior pedia o repositório clonado (`bash apps/mcp-drive/install.sh`,
 * `cd apps/mcp-activities && npm install`). Quem usa o produto não tem o repositório, e não
 * deveria precisar de git, npm e TypeScript para conversar com o Pulse. Agora é um comando:
 * o instalador e os dois servidores já empacotados são servidos pelo próprio Pulse, em
 * `/mcp` (ver `scripts/build-mcp-bundles.sh`).
 *
 * O comando mostrado aponta para a origem em que a pessoa está navegando. Assim vale em
 * produção e em preview sem ninguém editar texto, e ninguém copia por engano um endereço de
 * ambiente errado.
 */
import { useMemo, useState } from "react";
import { Check, Copy, ShieldCheck, Terminal } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function useComandoDeInstalacao() {
  return useMemo(() => {
    const origem = typeof window === "undefined" ? "" : window.location.origin;
    return `curl -fsSL ${origem}/mcp/install.sh | bash -s -- ${origem}`;
  }, []);
}

export function McpSetupCard() {
  const comando = useComandoDeInstalacao();
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(comando);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Área de transferência bloqueada pelo navegador: o comando está visível para
      // seleção manual, então não vale interromper a pessoa com um erro.
    }
  };

  return (
    // O primeiro card ocupa a linha inteira porque tem o comando, que não deve quebrar; os
    // dois seguintes dividem a largura em tela grande.
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">
            Conectar o Pulse ao seu chat
          </CardTitle>
          <CardDescription>
            Um comando, uma vez por computador. Não precisa de repositório, de
            git nem de saber programar — só do Node instalado (versão 20 ou
            maior, em nodejs.org).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              Cole no Terminal
            </div>
            <div className="flex items-start gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
                <code>{comando}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                onClick={copiar}
                className="shrink-0"
              >
                {copiado ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>O instalador faz, nesta ordem:</p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>confere o Node;</li>
              <li>baixa os dois servidores deste mesmo site;</li>
              <li>
                pergunta seu e-mail e senha do Pulse — digitados, nunca por
                argumento, porque senha em linha de comando fica no histórico do
                shell;
              </li>
              <li>
                confere as credenciais <strong>antes</strong> de gravar
                configuração, para o erro aparecer ali e não no meio de uma
                conversa;
              </li>
              <li>
                registra no Claude Code e no Claude Desktop, mesclando o arquivo
                para não apagar outros MCPs que você já tenha;
              </li>
              <li>testa os dois servidores e diz o que fazer em seguida.</li>
            </ol>
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              <strong>O acesso pelo chat é o seu acesso.</strong> Os dois
              servidores entram com as suas credenciais e obedecem às mesmas
              regras do banco que a tela obedece — enxergam e alteram exatamente
              o que você enxergaria e alteraria. Nenhum dos dois usa chave de
              serviço, então não existe atalho por fora do seu perfil.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-base">Depois de instalar</CardTitle>
            <CardDescription>
              Feche e abra o Claude Desktop, e experimente pedir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1.5 text-muted-foreground">
              <li>“Quais projetos eu tenho em andamento?”</li>
              <li>
                “Como está a sprint atual do projeto Cobrança Automática?”
              </li>
              <li>
                “Cria um card para ajustar o relatório de horas, com 3 pontos.”
              </li>
            </ul>
            <p className="text-muted-foreground">
              Para chegar nos arquivos do projeto, autorize sua conta Microsoft
              uma vez: peça <em>“inicia o login da Microsoft”</em> e siga a URL
              e o código que aparecerem.
            </p>
            <p className="text-muted-foreground">
              Você não decora nome de ferramenta: pede em português. Cada aba
              desta Central mostra a frase de exemplo do assunto dela.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-base">
              Quando algo não funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">
                “Node.js não encontrado”
              </strong>{" "}
              — instale em nodejs.org e rode o comando de novo.
            </p>
            <p>
              <strong className="text-foreground">
                “e-mail ou senha não conferem”
              </strong>{" "}
              — são os mesmos dados do site. Se você entra pela Microsoft e não
              sabe sua senha, use “Esqueci minha senha” na tela de login.
            </p>
            <p>
              <strong className="text-foreground">O chat não vê o Pulse</strong>{" "}
              — feche e abra o Claude Desktop por completo. A configuração só é
              lida na abertura.
            </p>
            <p>
              <strong className="text-foreground">
                “Não encontrei o projeto”
              </strong>{" "}
              — o chat só enxerga o que você enxerga. Se o projeto não aparece
              para você no Pulse, também não aparece no chat, e o caminho é
              pedir acesso a quem administra.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
