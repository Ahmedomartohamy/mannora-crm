// api/invite-employee.js
const { createClient } = require('@supabase/supabase-js')

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const sanitizeEmail = (s='') => s.toString().replace(/[\u200e\u200f<>]/g,'').replace(/\s/g,'').trim()

module.exports = async function handler(req, res) {
  // فحص سريع
  if (req.method === 'GET' && (req.query.check === '1' || req.query.check === 'true')) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const redirectTo = process.env.SUPABASE_REDIRECT_TO || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/set-password` : null)
    return res.status(200).json({
      hasUrl: !!url,
      hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnon: !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      redirectTo
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST','GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const REDIRECT_TO = process.env.SUPABASE_REDIRECT_TO || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/set-password` : undefined)

  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    return res.status(500).json({ error: 'Server is not configured (env vars missing)' })
  }

  // تحقق أدمن عبر توكن المستخدم
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing user token' })

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (!isAdmin) return res.status(403).json({ error: 'Forbidden' })

  // بيانات الدعوة
  const { email: rawEmail, full_name, role } = req.body || {}
  const email = sanitizeEmail(rawEmail)
  const ALLOWED = ['admin','manager','user','secretary']
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email format' })
  if (!ALLOWED.includes(role)) return res.status(400).json({ error: 'Invalid role' })

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE)

  // send invite مع redirectTo لصفحة set-password
  const inviteOptions = { data: { full_name } }
  if (REDIRECT_TO) inviteOptions.redirectTo = REDIRECT_TO

  let userId = null
  const { data: invite, error: invErr } = await adminClient.auth.admin.inviteUserByEmail(email, inviteOptions)
  if (invErr) {
    const { data: list, error: listErr } = await adminClient.auth.admin.listUsers({ page:1, perPage:200 })
    if (listErr) return res.status(500).json({ error: listErr.message })
    const existing = list?.users?.find(u => (u.email||'').toLowerCase() === email.toLowerCase())
    if (!existing) return res.status(400).json({ error: invErr.message || 'Unable to invite user' })
    userId = existing.id
  } else {
    userId = invite?.user?.id
  }
  if (!userId) return res.status(500).json({ error: 'No user id returned' })

  // profiles + role
  const up1 = await adminClient.from('profiles').upsert({ id: userId, full_name }, { onConflict: 'id' })
  if (up1.error) return res.status(500).json({ error: up1.error.message })
  const up2 = await adminClient.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id,role' })
  if (up2.error) return res.status(500).json({ error: up2.error.message })

  return res.status(200).json({ ok: true, user_id: userId })
}
