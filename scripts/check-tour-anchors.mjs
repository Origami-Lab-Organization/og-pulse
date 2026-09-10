#!/usr/bin/env node
/**
 * Prova que todo alvo do guia de primeiros passos tem âncora no código (PUL-250).
 *
 * POR QUE ESTE ARQUIVO EXISTE. O `OnboardingModal` declara quatro alvos — `inbox`, `kanban`,
 * `projetos`, `timesheet` — e nenhum deles existe em tela nenhuma: o atributo nunca foi
 * adicionado. Metade daquele componente é código morto em produção, e ninguém notou porque
 * alvo ausente só faz o passo sumir silenciosamente. No projete.app aconteceu o mesmo por
 * outro caminho: o painel foi reescrito, a âncora `stats` deixou de existir, e o passo dela
 * nunca mais apareceu.
 *
 * É a falha clássica de tour acoplado a seletor: quebra sem quebrar teste. Então o gate é
 * de build, não de teste — assim vale mesmo com a suíte desligada.
 *
 * Como funciona: lê os seletores de `src/lib/ownerGuide.ts` e confere se cada um tem como
 * ser produzido pelo `data-tour` da navegação, que é gerado por template a partir da `url`
 * dos itens de `sidebar-nav.ts`.
 */

import { readFileSync } from 'node:fs';

const GUIDE = 'src/lib/ownerGuide.ts';
const NAV = 'src/components/layout/sidebar-nav.ts';
const SIDEBAR = 'src/components/layout/AppSidebar.tsx';

const read = (path) => readFileSync(path, 'utf8');

/** Os seletores que o guia pretende acender, na forma `[data-tour="nav-/x"]`. */
function guideSelectors(source) {
  return [...source.matchAll(/\[data-tour="([^"]+)"\]/g)].map((m) => m[1]);
}

/** As urls declaradas na navegação, de itens de topo e de filhas. */
function navUrls(source) {
  return new Set([...source.matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1]));
}

/**
 * Confere que o AppSidebar realmente gera os dois formatos por template. Sem isto o gate
 * passaria a aprovar seletores que ninguém mais produz, caso alguém troque o template.
 */
function assertTemplates(source) {
  const missing = ['data-tour={`nav-${item.url}`}', 'data-tour={`nav-group-${item.url}`}', 'data-tour={`nav-${child.url}`}']
    .filter((needle) => !source.includes(needle));
  return missing;
}

function main() {
  const selectors = guideSelectors(read(GUIDE));
  const urls = navUrls(read(NAV));
  const templates = assertTemplates(read(SIDEBAR));
  const problems = [];

  if (selectors.length === 0) {
    problems.push(`${GUIDE}: nenhum seletor [data-tour="..."] encontrado — o guia perdeu os alvos.`);
  }

  for (const needle of templates) {
    problems.push(`${SIDEBAR}: nao gera mais \`${needle}\` — os seletores do guia ficaram orfaos.`);
  }

  for (const selector of selectors) {
    const url = selector.replace(/^nav-group-/, '').replace(/^nav-/, '');
    if (!urls.has(url)) {
      problems.push(
        `${GUIDE}: o alvo "${selector}" aponta para a rota "${url}", que nao existe em ${NAV}. ` +
          `O passo ficaria sem holofote e cairia no texto alternativo para sempre.`,
      );
    }
  }

  if (problems.length > 0) {
    console.error('\ncheck:tour — ancoras do guia de primeiros passos quebradas:\n');
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('');
    process.exit(1);
  }

  console.log(`check:tour — ${selectors.length} ancoras do guia conferidas, todas com rota na navegacao.`);
}

main();
