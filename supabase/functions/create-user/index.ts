import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

const DOMAIN = '@asti.local'
const VALID_ROLES = ['admin', 'instructor', 'viewer']

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { role } = await requireAuth(req)
    if (role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { username, password, fullName, userRole } = await req.json()
    if (!username?.trim() || !password || !fullName?.trim()) {
      return new Response(JSON.stringify({ error: 'username, password, and fullName are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = `${username.trim().toLowerCase()}${DOMAIN}`
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // handle_new_user trigger creates the profile as 'viewer'.
    // Update to the requested role if different.
    const targetRole = VALID_ROLES.includes(userRole) ? userRole : 'viewer'
    if (targetRole !== 'viewer') {
      await admin.from('profiles').update({ role: targetRole }).eq('id', data.user.id)
    }

    return new Response(JSON.stringify({ ok: true, userId: data.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (err instanceof Response) return err
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
