// A regra mora em supabase/functions/_shared/receita.ts, que as Edge Functions também usam.
export {
  receitaFromBrasilApi,
  leiDoBemSignal,
  LEI_DO_BEM_LABEL,
  porteLabel,
  isSituacaoAtiva,
  linkedinPeopleSearchUrl,
} from '../../../supabase/functions/_shared/receita';
