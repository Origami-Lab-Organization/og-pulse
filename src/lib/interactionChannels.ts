/**
 * Canais de contato — vocabulário compartilhado pela Oportunidade (`lead_interactions`)
 * e pela Prospecção (`prospect_activities`).
 *
 * Os dois módulos têm o mesmo CHECK no banco. Manter duas listas em TypeScript faria
 * uma delas envelhecer sem ninguém perceber, porque as duas continuariam compilando.
 */
export const INTERACTION_CHANNELS = [
  { value: 'phone', label: 'Telefone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'in_person', label: 'Presencial' },
  { value: 'video_call', label: 'Videoconferência' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'other', label: 'Outro' },
] as const;

export type InteractionChannel = (typeof INTERACTION_CHANNELS)[number]['value'];

export const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  INTERACTION_CHANNELS.map((c) => [c.value, c.label])
);

export function getChannelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}
