import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')!;

    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    // --- Input validation ---
    const { reimbursement_id } = await req.json();
    if (!reimbursement_id || typeof reimbursement_id !== 'string') {
      return new Response(JSON.stringify({ error: 'reimbursement_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Authorization: check caller is admin/manager in same tenant ---
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callerEmployee } = await adminClient
      .from('employees')
      .select('id, tenant_id')
      .eq('auth_id', userId)
      .single();

    if (!callerEmployee) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is admin or manager
    const { data: hasRole } = await adminClient.rpc('is_admin_or_manager', {
      _user_id: userId,
      _tenant_id: callerEmployee.tenant_id,
    });

    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin or manager role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch reimbursement and verify same tenant
    const { data: reimbursement, error: rError } = await adminClient
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

    // Verify reimbursement belongs to caller's tenant
    const { data: requesterEmployee } = await adminClient
      .from('employees')
      .select('tenant_id')
      .eq('id', reimbursement.requested_by)
      .single();

    if (!requesterEmployee || requesterEmployee.tenant_id !== callerEmployee.tenant_id) {
      return new Response(JSON.stringify({ error: 'Forbidden: cross-tenant access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Business logic (same as before) ---

    // Fetch requester name
    const { data: employee } = await adminClient
      .from('employees')
      .select('nome, email')
      .eq('id', reimbursement.requested_by)
      .single();

    // Fetch project/client names
    let projectName = '';
    let clientName = '';
    if (reimbursement.project_id) {
      const { data: proj } = await adminClient
        .from('projects')
        .select('name')
        .eq('id', reimbursement.project_id)
        .single();
      projectName = proj?.name || '';
    }
    if (reimbursement.client_id) {
      const { data: client } = await adminClient
        .from('clients')
        .select('company_name')
        .eq('id', reimbursement.client_id)
        .single();
      clientName = client?.company_name || '';
    }

    // Fetch attachments
    const { data: attachments } = await adminClient
      .from('reimbursement_attachments')
      .select('*')
      .eq('reimbursement_id', reimbursement_id);

    // Generate signed URLs for attachments
    const attachmentLinks: string[] = [];
    for (const att of attachments || []) {
      const { data: signedData } = await adminClient.storage
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
