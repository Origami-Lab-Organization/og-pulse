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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Origami Pulse <noreply@origamilab.com.br>';

    const { candidate_id } = await req.json();
    if (!candidate_id || typeof candidate_id !== 'string') {
      return new Response(JSON.stringify({ error: 'candidate_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: candidate, error: candidateError } = await adminClient
      .from('job_applications')
      .select('nome, email, vaga_titulo, vaga_pretendida, tenant_id')
      .eq('id', candidate_id)
      .single();

    if (candidateError || !candidate) {
      return new Response(JSON.stringify({ error: 'Candidate not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tenant } = await adminClient
      .from('tenants')
      .select('name')
      .eq('id', candidate.tenant_id)
      .single();

    const companyName = tenant?.name || 'Origami Lab';
    const candidateName = candidate.nome.split(' ')[0];
    const vagaInfo = candidate.vaga_titulo ? ` para a vaga de <strong>${candidate.vaga_titulo}</strong>` : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#16a34a;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;">🎉</p>
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                Parabéns, ${candidateName}!
              </h1>
              <p style="margin:8px 0 0;color:#dcfce7;font-size:14px;">
                Você foi selecionado(a)${vagaInfo}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                Olá, <strong>${candidate.nome}</strong>!
              </p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                É com grande satisfação que comunicamos que você foi selecionado(a) para integrar a equipe da <strong>${companyName}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Nosso time de Departamento Pessoal entrará em contato em breve com todas as informações sobre os próximos passos da sua admissão, documentos necessários e data de início.
              </p>

              <!-- Highlight box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#15803d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                      Próximos passos
                    </p>
                    <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
                      <li>Aguarde o contato do nosso DP para alinhamento de documentos</li>
                      <li>Você receberá um convite de acesso ao sistema</li>
                      <li>Em caso de dúvidas, responda este e-mail</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
                Mais uma vez, bem-vindo(a) à ${companyName}! Estamos muito felizes em tê-lo(a) conosco.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Este e-mail foi enviado pela equipe de Recursos Humanos da ${companyName}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [candidate.email],
        subject: `Parabéns! Você foi selecionado(a) — ${companyName}`,
        html,
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
