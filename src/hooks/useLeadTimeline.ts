import { useMemo } from 'react';
import { useLeadActivities } from '@/hooks/useLeadActivities';
import { useLeadInteractions, LeadInteraction } from '@/hooks/useLeadInteractions';
import { useLeadFollowUps, LeadFollowUp } from '@/hooks/useLeadFollowUps';
import { LeadActivityWithCreator } from '@/services/leadActivityService';

/**
 * Feed unificado da oportunidade (GP-J5 CA-02): mescla os 3 tipos numa linha do tempo única,
 * ordenada do mais recente para o mais antigo.
 *  - activity → automática (lead_activity_log, exceto note_added, que já é representado pelo comentário)
 *  - comment  → comentário manual (lead_interactions, texto completo + anexos)
 *  - followup → ação agendada (lead_follow_ups, com status)
 */
export type TimelineItem =
  | { kind: 'activity'; id: string; timestamp: string; activity: LeadActivityWithCreator }
  | { kind: 'comment'; id: string; timestamp: string; comment: LeadInteraction }
  | { kind: 'followup'; id: string; timestamp: string; followUp: LeadFollowUp };

export function useLeadTimeline(leadId: string | null) {
  const { data: activities = [], isLoading: loadingActivities } = useLeadActivities(leadId);
  const { data: comments = [], isLoading: loadingComments } = useLeadInteractions(leadId);
  const { data: followUps = [], isLoading: loadingFollowUps } = useLeadFollowUps(leadId);

  const items = useMemo<TimelineItem[]>(() => {
    const list: TimelineItem[] = [];

    for (const activity of activities) {
      // note_added é o eco automático de um comentário — evitamos duplicar na timeline.
      if (activity.activity_type === 'note_added') continue;
      list.push({ kind: 'activity', id: activity.id, timestamp: activity.created_at, activity });
    }
    for (const comment of comments) {
      list.push({ kind: 'comment', id: comment.id, timestamp: comment.created_at, comment });
    }
    for (const followUp of followUps) {
      list.push({ kind: 'followup', id: followUp.id, timestamp: followUp.scheduled_at, followUp });
    }

    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [activities, comments, followUps]);

  return { items, isLoading: loadingActivities || loadingComments || loadingFollowUps };
}
