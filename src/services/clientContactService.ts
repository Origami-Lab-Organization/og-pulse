import { supabase } from '@/integrations/supabase/client';
import { ClientContact, ClientContactDB, ClientContactInput } from '@/types/client';

const dbToContact = (db: ClientContactDB): ClientContact => ({
  id: db.id,
  name: db.name,
  email: db.email,
  phone: db.phone,
});

const isEmptyContact = (c: ClientContactInput): boolean =>
  !c.name?.trim() && !c.email?.trim() && !c.phone?.trim();

export const clientContactService = {
  async listByClient(clientId: string, tenantId: string): Promise<ClientContact[]> {
    const { data, error } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching client contacts:', error);
      throw error;
    }

    return (data || []).map(dbToContact);
  },

  // Substitui toda a lista de contatos do cliente pela lista informada.
  async replaceForClient(
    clientId: string,
    tenantId: string,
    contacts: ClientContactInput[],
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from('client_contacts')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId);

    if (deleteError) {
      console.error('Error clearing client contacts:', deleteError);
      throw deleteError;
    }

    const rows = contacts
      .filter((c) => !isEmptyContact(c))
      .map((c) => ({
        client_id: clientId,
        tenant_id: tenantId,
        name: c.name?.trim() || null,
        email: c.email?.trim() || null,
        phone: c.phone?.trim() || null,
      }));

    if (rows.length === 0) return;

    const { error: insertError } = await supabase.from('client_contacts').insert(rows);

    if (insertError) {
      console.error('Error inserting client contacts:', insertError);
      throw insertError;
    }
  },
};
