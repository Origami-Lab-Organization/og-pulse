export interface ServiceLineAvgTicketDB {
  id: string;
  tenant_id: string;
  service_line_id: string | null;
  legacy_source_key: string | null;
  label: string;
  avg_ticket_value: number;
  computed_value: number | null;
  computed_at: string | null;
  sample_size: number;
  is_manual_override: boolean;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface ServiceLineAvgTicket {
  id: string;
  tenantId: string;
  serviceLineId: string | null;
  legacySourceKey: string | null;
  label: string;
  avgTicketValue: number;
  computedValue: number | null;
  computedAt: string | null;
  sampleSize: number;
  isManualOverride: boolean;
  updatedBy: string | null;
  updatedAt: string;
  createdAt: string;
}

export const dbToServiceLineAvgTicket = (db: ServiceLineAvgTicketDB): ServiceLineAvgTicket => ({
  id: db.id,
  tenantId: db.tenant_id,
  serviceLineId: db.service_line_id,
  legacySourceKey: db.legacy_source_key,
  label: db.label,
  avgTicketValue: db.avg_ticket_value,
  computedValue: db.computed_value,
  computedAt: db.computed_at,
  sampleSize: db.sample_size,
  isManualOverride: db.is_manual_override,
  updatedBy: db.updated_by,
  updatedAt: db.updated_at,
  createdAt: db.created_at,
});
