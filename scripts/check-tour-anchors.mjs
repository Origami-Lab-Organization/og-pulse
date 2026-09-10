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
const TOUR = 'src/lib/tour.ts';
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
 * Mapa url -> capacidade exigida pelo item de menu, lido linha a linha. Item de grupo é
 * declarado em várias linhas e não exige capacidade própria (aparece se alguma filha
 * aparece), então cai fora naturalmente: a linha da `url` dele não tem `requiresCapability`.
 */
function navCapabilities(source) {
  const map = new Map();
  for (const line of source.split('\n')) {
    const url = line.match(/url:\s*'([^']+)'/);
    if (!url) continue;
    const single = line.match(/requiresCapability:\s*'([^']+)'/);
    const list = line.match(/requiresCapability:\s*\[([^\]]+)\]/);
    if (single) map.set(url[1], [single[1]]);
    else if (list) map.set(url[1], [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  }
  return map;
}

/** As capacidades que cada passo do tour declara, por id. */
function tourSteps(source) {
  const steps = [];
  for (const block of source.split(/\n  \{\n/).slice(1)) {
    const id = block.match(/id:\s*'([^']+)'/);
    if (!id) continue;
    const urls = [...block.matchAll(/\[data-tour="nav-(?:group-)?([^"]+)"\]/g)].map((m) => m[1]);
    const single = block.match(/requiresCapability:\s*'([^']+)'/);
    const list = block.match(/requiresCapability:\s*\[([^\]]+)\]/);
    const caps = single
      ? [single[1]]
      : list
        ? [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
        : [];
    steps.push({ id: id[1], urls, caps, hasFallback: /fallback:/.test(block) });
  }
  return steps;
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

/**
 * A checagem que importa mais, e que o projete.app não tem: um passo do tour que apresenta
 * uma tela restrita PRECISA exigir a mesma capacidade que o item de menu dela. Sem isso o
 * tour promete ao Colaborador uma tela que a RLS vai negar — o defeito que lá só apareceu
 * no Amplitude, depois de convidados se perderem num tour de dono.
 */
function tourCapabilityProblems(steps, navCaps) {
  const problems = [];
  for (const step of steps) {
    for (const url of step.urls) {
      const required = navCaps.get(url);
      if (!required) continue;
      const covered = required.some((cap) => step.caps.includes(cap));
      if (!covered) {
        problems.push(
          `${TOUR}: o passo "${step.id}" apresenta "${url}", que no menu exige ` +
            `${required.join(' ou ')}, mas o passo declara ${step.caps.length ? step.caps.join(' ou ') : 'nenhuma capacidade'}. ` +
            `Quem nao tem acesso ouviria falar de uma tela que nao pode abrir.`,
        );
      }
    }
  }
  return problems;
}

function main() {
  const selectors = guideSelectors(read(GUIDE));
  const navSource = read(NAV);
  const urls = navUrls(navSource);
  const templates = assertTemplates(read(SIDEBAR));
  const steps = tourSteps(read(TOUR));
  const problems = [];

  if (steps.length === 0) {
    problems.push(`${TOUR}: nenhum passo encontrado — o tour perdeu a configuracao.`);
  }

  for (const step of steps) {
    for (const url of step.urls) {
      if (!urls.has(url)) {
        problems.push(
          `${TOUR}: o passo "${step.id}" aponta para a rota "${url}", que nao existe em ${NAV}.` +
            (step.hasFallback ? ' Cairia no texto alternativo para sempre.' : ' E o passo nao tem fallback.'),
        );
      }
    }
  }

  problems.push(...tourCapabilityProblems(steps, navCapabilities(navSource)));

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

  console.log(
    `check:tour — ${selectors.length} ancoras do guia e ${steps.length} passos do tour conferidos: ` +
      `rota existe na navegacao e a capacidade do passo cobre a do menu.`,
  );
}

main();
