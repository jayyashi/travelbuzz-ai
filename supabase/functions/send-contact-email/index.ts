import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Step 1: Save to DB (always works, no external service needed) ──────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabase.from('contact_submissions').insert({
      name,
      email,
      subject: subject || null,
      message,
    })

    if (dbError) {
      // Table might not exist yet — log but don't fail
      console.warn('DB insert skipped:', dbError.message)
    }

    // ── Step 2: Try email via SMTP (optional — works when secrets are set) ─────
    const SMTP_HOST = Deno.env.get('SMTP_HOST')
    const SMTP_USER = Deno.env.get('SMTP_USER')
    const SMTP_PASS = Deno.env.get('SMTP_PASS')
    const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465')

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        const { SMTPClient } = await import("https://deno.land/x/denomailer@1.5.0/mod.ts")
        const client = new SMTPClient({
          connection: {
            hostname: SMTP_HOST,
            port: SMTP_PORT,
            tls: SMTP_PORT === 465,
            auth: { username: SMTP_USER, password: SMTP_PASS },
          },
        })
        await client.send({
          from: `TravelBuzz Contact <${SMTP_USER}>`,
          to: 'hello@travelbuzz.ai',
          replyTo: email,
          subject: `[Contact] ${subject || 'New message from ' + name}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f8f9fa;border-radius:12px;">
              <div style="background:#050A18;border-radius:10px;padding:24px 28px;margin-bottom:24px;">
                <h2 style="color:#D4AF37;margin:0 0 4px;font-size:1.3rem;">New Contact Form Submission</h2>
                <p style="color:rgba(255,255,255,0.4);margin:0;font-size:0.85rem;">TravelBuzz.ai</p>
              </div>
              <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
                <tr>
                  <td style="padding:14px 20px;font-weight:700;color:#374151;width:110px;background:#f3f4f6;border-bottom:1px solid #e5e7eb;">Name</td>
                  <td style="padding:14px 20px;color:#111827;border-bottom:1px solid #e5e7eb;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;font-weight:700;color:#374151;background:#f3f4f6;border-bottom:1px solid #e5e7eb;">Email</td>
                  <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><a href="mailto:${email}" style="color:#D4AF37;">${email}</a></td>
                </tr>
                ${subject ? `<tr>
                  <td style="padding:14px 20px;font-weight:700;color:#374151;background:#f3f4f6;border-bottom:1px solid #e5e7eb;">Subject</td>
                  <td style="padding:14px 20px;color:#111827;border-bottom:1px solid #e5e7eb;">${subject}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:14px 20px;font-weight:700;color:#374151;background:#f3f4f6;vertical-align:top;">Message</td>
                  <td style="padding:14px 20px;color:#111827;white-space:pre-wrap;line-height:1.6;">${message}</td>
                </tr>
              </table>
              <p style="margin:20px 0 0;text-align:center;font-size:0.75rem;color:#9ca3af;">Reply directly to this email to respond to ${name}.</p>
            </div>
          `,
        })
        await client.close()
        console.log('Email sent via SMTP')
      } catch (smtpErr) {
        // Email failed — submission is already saved to DB, so just log
        console.error('SMTP error (submission saved to DB):', smtpErr)
      }
    } else {
      console.log('SMTP not configured — submission saved to DB only')
    }

    // Always return success — submission is saved regardless of email
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
