-- GP-J1: múltiplos contatos por cliente.
-- Cada cliente pode ter N contatos (nome, e-mail, telefone).
-- RLS espelha a tabela clients: ver no tenant; gerente/admin escreve.

CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX idx_client_contacts_tenant_id ON public.client_contacts(tenant_id);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (mesmo padrão de clients)
CREATE POLICY "Users can view client_contacts in their tenant"
ON public.client_contacts
FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can insert client_contacts"
ON public.client_contacts
FOR INSERT
WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can update client_contacts"
ON public.client_contacts
FOR UPDATE
USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can delete client_contacts"
ON public.client_contacts
FOR DELETE
USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE TRIGGER update_client_contacts_updated_at
BEFORE UPDATE ON public.client_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
