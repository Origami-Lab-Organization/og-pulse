import { useMemo, useState } from 'react';
import { Image, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MailMessageDetail } from '@/types/microsoftGraph';

/**
 * Corpo do e-mail renderizado em iframe restrito.
 *
 * O HTML vem de qualquer remetente, inclusive de fora da empresa, então não pode
 * tocar a nossa página. O isolamento é do navegador, não de filtro nosso:
 *
 *   * `sandbox` SEM `allow-scripts` — script no corpo simplesmente não executa;
 *   * `sandbox` SEM `allow-same-origin` — o documento fica em origem opaca, sem
 *     acesso ao nosso DOM, cookies ou localStorage. Combinar estes dois valores
 *     permitiria ao próprio frame remover o sandbox, então NUNCA os junte;
 *   * CSP `default-src 'none'` dentro do documento — nada de script, frame,
 *     objeto ou fetch, mesmo que o sandbox fosse afrouxado por engano.
 *
 * Imagens aparecem por padrão, com um controle para bloquear. Vale saber que
 * imagem remota funciona como rastreador — avisa o remetente quando e de onde o
 * e-mail foi aberto —, daí existir o botão; mas esconder por padrão surpreendia
 * mais do que protegia.
 */

const IMAGES_BLOCKED_CSP = "img-src data: cid:";
const IMAGES_ALLOWED_CSP = "img-src data: cid: https: http:";

/**
 * Estilo deliberadamente mínimo.
 *
 * O e-mail traz a própria tipografia e é montado com tabelas de largura fixa —
 * impor fonte, cor de link ou `max-width` em tabela desmonta o desenho do
 * remetente e faz o resultado ficar diferente do Outlook. Só o fundo branco fica
 * fixo, porque o corpo assume papel claro.
 *
 * Imagem continua limitada à largura para não gerar rolagem horizontal, que é o
 * mesmo que os clientes fazem.
 */
const DOCUMENT_STYLE = `
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { padding: 8px; }
  img { max-width: 100%; height: auto; }
`;

/** Pixel transparente no lugar de `cid:` sem anexo — melhor vazio que ícone quebrado. */
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function buildDocument(html: string, allowImages: boolean): string {
  const csp = `default-src 'none'; ${
    allowImages ? IMAGES_ALLOWED_CSP : IMAGES_BLOCKED_CSP
  }; style-src 'unsafe-inline'; font-src data:;`;

  const displayHtml = html.replace(/cid:[^"'\s>]+/gi, TRANSPARENT_PIXEL);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <base target="_blank" />
    <style>${DOCUMENT_STYLE}</style>
  </head>
  <body>${displayHtml}</body>
</html>`;
}

/**
 * Censo (dev) dos `src` de imagem no HTML final: diz se a substituição de
 * `cid:` aconteceu e que tipo de imagem restou. Existe porque o DevTools está
 * bloqueado por política da organização.
 */
function describeImageSources(html: string): string {
  const counts = { 'data:': 0, remota: 0, 'cid: (não resolvida)': 0, outra: 0 };
  const pattern = /<img[^>]+src\s*=\s*["']?([^"'\s>]+)/gi;
  let found: RegExpExecArray | null;
  while ((found = pattern.exec(html)) !== null) {
    const src = found[1].toLowerCase();
    if (src.startsWith('data:')) counts['data:'] += 1;
    else if (src.startsWith('http')) counts.remota += 1;
    else if (src.startsWith('cid:')) counts['cid: (não resolvida)'] += 1;
    else counts.outra += 1;
  }

  const parts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${count} ${kind}`);
  return parts.length ? parts.join(' · ') : 'nenhuma tag <img> no corpo';
}

export function MessageBody({ message }: { message: MailMessageDetail }) {
  const [allowImages, setAllowImages] = useState(true);

  const document = useMemo(
    () => (message.bodyIsHtml ? buildDocument(message.body, allowImages) : ''),
    [message.bodyIsHtml, message.body, allowImages],
  );

  if (!message.body) {
    return (
      <p className="text-sm text-muted-foreground">Este e-mail não tem conteúdo.</p>
    );
  }

  if (!message.bodyIsHtml) {
    return (
      <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
        {message.body}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {import.meta.env.DEV && (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          Diagnóstico (dev) — imagens no corpo: {describeImageSources(message.body)}
          {message.unresolvedImageRefs.length > 0 && (
            <>
              {' '}· referências sem anexo: {message.unresolvedImageRefs.join(' · ')}
              {' '}· chaves dos anexos:{' '}
              {message.inlineAttachmentKeys.length
                ? message.inlineAttachmentKeys.join(' · ')
                : '(lista de anexos veio vazia)'}
            </>
          )}
        </p>
      )}

      <iframe
        // Sem allow-scripts e sem allow-same-origin — ver comentário do módulo.
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        srcDoc={document}
        title="Conteúdo do e-mail"
        className="h-[60vh] min-h-96 w-full rounded-md border border-border bg-white"
      />

      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setAllowImages((current) => !current)}
      >
        {allowImages ? (
          <>
            <ImageOff className="mr-2 h-4 w-4" aria-hidden="true" />
            Bloquear imagens
          </>
        ) : (
          <>
            <Image className="mr-2 h-4 w-4" aria-hidden="true" />
            Exibir imagens
          </>
        )}
      </Button>
    </div>
  );
}
