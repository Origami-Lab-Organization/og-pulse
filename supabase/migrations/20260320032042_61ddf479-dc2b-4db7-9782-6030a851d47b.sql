
-- Documentar os novos tipos de notificação
-- timesheet_reminder: enviado ao funcionário toda sexta
-- timesheet_manager_alert: enviado ao gerente de projeto sexta 15h

-- Criar tabela de configuração de lembretes por tenant
CREATE TABLE IF NOT EXISTS timesheet_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  employee_reminder_day INTEGER NOT NULL DEFAULT 5,
  employee_reminder_time TIME NOT NULL DEFAULT '08:00:00',
  manager_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  manager_alert_time TIME NOT NULL DEFAULT '15:00:00',
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY['inbox'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE timesheet_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage reminder settings"
  ON timesheet_reminder_settings
  FOR ALL
  USING (
    tenant_id IN (
      SELECT e.tenant_id FROM employees e
      JOIN user_roles ur ON ur.user_id = e.auth_id
      WHERE ur.role = 'admin' AND e.auth_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can read reminder settings"
  ON timesheet_reminder_settings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE auth_id = auth.uid()
    )
  );

INSERT INTO timesheet_reminder_settings (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
