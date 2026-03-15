-- Enforce unique service names per tenant
ALTER TABLE services
  ADD CONSTRAINT services_tenant_name_unique UNIQUE (tenant_id, name);
