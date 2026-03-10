import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reimbursement_id } = await req.json();
    if (!reimbursement_id) {
      return new Response(JSON.stringify({ error: 'reimbursement_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch reimbursement
    const { data: reimbursement, error: rError } = await supabase
      .from('reimbursement_requests')
      .select('*')
      .eq('id', reimbursement_id)
      .single();

    if (rError || !reimbursement) {
      return new Response(JSON.stringify({ error: 'Reimbursement not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch requester name
    const { data: employee } = await supabase
      .from('employees')
      .select('nome, email')
      .eq('id', reimbursement.requested_by)
      .single();

    // Fetch project/client names
    let projectName = '';
    let clientName = '';
    if (reimbursement.project_id) {
      const { data: proj } = await supabase
        .from('projects')
        .select('name')
        .eq('id', reimbursement.project_id)
        .single();
      projectName = proj?.name || '';
    }
    if (reimbursement.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('company_name')
        .eq('id', reimbursement.client_id)
        .single();
      clientName = client?.company_name || '';
    }

    // Fetch attachments
    const { data: attachments } = await supabase
      .from('reimbursement_attachments')
      .select('*')
      .eq('reimbursement_id', reimbursement_id);

    // Generate signed URLs for attachments
    const attachmentLinks: string[] = [];
    for (const att of attachments || []) {
      const { data: signedData } = await supabase.storage
        .from('reimbursement-receipts')
        .createSignedUrl(att.file_url, 604800); // 7 days
      if (signedData?.signedUrl) {
        attachmentLinks.push(`<li><a href="${signedData.signedUrl}">${att.file_name}</a></li>`);
      }
    }

    const requesterName = employee?.nome || 'Funcionário';
    const amountFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(reimbursement.total_amount);

    const tipoLabel = reimbursement.is_internal ? 'Despesa Interna' : `Projeto: ${projectName} (Cliente: ${clientName})`;

    const htmlBody = `
      <h2>Reembolso Aprovado</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Funcionário</td><td style="padding:8px;border:1px solid #ddd;">${requesterName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Valor</td><td style="padding:8px;border:1px solid #ddd;">${amountFormatted}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Tipo</td><td style="padding:8px;border:1px solid #ddd;">${tipoLabel}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Descrição</td><td style="padding:8px;border:1px solid #ddd;">${reimbursement.description}</td></tr>
      </table>
      ${attachmentLinks.length > 0 ? `<h3>Comprovantes</h3><ul>${attachmentLinks.join('')}</ul>` : ''}
    `;

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: ['reembolso@origamilab.com.br'],
        subject: `Reembolso Aprovado - ${requesterName} - ${amountFormatted}`,
        html: htmlBody,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
