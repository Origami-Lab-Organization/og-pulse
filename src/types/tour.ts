import type { CapabilityRequirement } from '@/lib/access/capabilities';

/**
 * Tour guiado do primeiro acesso (PUL-251).
 *
 * Diferente do guia de primeiros passos (`src/types/ownerGuide.ts`), e as duas coisas
 * convivem de propósito:
 *
 * - **o tour APRESENTA a casa** em dois minutos, na primeira entrada, e conclui por clique.
 *   Ler é o objetivo;
 * - **o guia ACOMPANHA a montagem** ao longo de dias, e só fecha quando o dado existe.
 *
 * Confundir os dois foi o que estragou o `OnboardingModal`: ele tenta ser tour e checklist
 * na mesma tela, e não é bom em nenhum dos dois.
 */

export interface TourStep {
  id: string;
  /** Fala do tsuru. Curta: é balão, não parágrafo. */
  title: string;
  body: string;
  /**
   * Âncoras `data-tour` em ordem de preferência. Vazio significa passo sem alvo, com o card
   * no centro da tela — é como as boas-vindas e o fechamento funcionam.
   */
  selectors: readonly string[];
  /** Texto usado quando nenhuma âncora está visível: o passo se explica em vez de sumir. */
  fallback?: string;
  /**
   * A MESMA capacidade que governa o item de menu correspondente. É o que impede o tour de
   * apresentar tela que a pessoa não pode abrir — o erro que o projete.app só descobriu
   * depois, olhando o Amplitude, quando o convidado caía num tour de dono.
   */
  requiresCapability?: CapabilityRequirement;
  /** Esconde de quem TEM a capacidade. Serve aos pares que se excluem, como o nav faz. */
  hiddenWhenCan?: CapabilityRequirement;
}

export interface TourProgress {
  /** Já viu o tour (concluiu ou pulou). Vem do banco, para valer entre dispositivos. */
  seen: boolean;
}
