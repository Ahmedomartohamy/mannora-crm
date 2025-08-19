// api/invite-employee.js  (أو frontend/api/invite-employee.js لو جذر مشروعك هو frontend)
const { createClient } = require('@supabase/supabase-js')

module.exports = async function handler(req, res) {
  // فحص سريع للبيئة بدون كشف الأسرار (GET /api/invite-employee?check=1)
  if (req.method === 'GET' && (req.query.check === '1' || req.query.check === 'true')) {
    return res.status(200).json({
      hasUrl: !!process.env.SUPABASE_URL,
      hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnon: !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    return res.status(500).json({ error: 'Server is not configured (env vars missing)' })
  }

  // تحقُّق إن صاحب الطلب Admin باستخدام توكنه
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing user token' })

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: isAdmin, error: adminErr } = await userClient.rpc('is_admin')
  if (adminErr || !isAdmin) return res.status(403).json({ error: 'Forbidden' })

  // إدخال بيانات الدعوة
  const { email, full_name, role } = req.body || {}
  const ALLOWED = ['admin', 'manager', 'user', 'secretary']
  if (!email || !ALLOWED.includes(role)) {
    return res.status(400).json({ error: 'Invalid input' })
  }

  // عميل له صلاحيات السيرفر
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE)

  // 1) دعوة المستخدم
  let userId = null
  const { data: invite, error: invErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name }
  })

  if (invErr) {
    // لو موجود بالفعل، نحاول نجيبه
    const { data: list, error: listErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (listErr) return res.status(500).json({ error: listErr.message })
    const existing = list?.users?.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
    if (!existing) return res.status(400).json({ error: invErr.message || 'Unable to invite user' })
    userId = existing.id
  } else {
    userId = invite?.user?.id
  }

  if (!userId) return res.status(500).json({ error: 'No user id returned' })

  // 2) استكمال بروفايل + ضبط الدور
  const up1 = await adminClient.from('profiles').upsert(
    { id: userId, full_name },
    { onConflict: 'id' }
  )
  if (up1.error) return res.status(500).json({ error: up1.error.message })

  const up2 = await adminClient.from('user_roles').upsert(
    { user_id: userId, role },
    { onConflict: 'user_id,role' }
  )
  if (up2.error) return res.status(500).json({ error: up2.error.message })

  return res.status(200).json({ ok: true, user_id: userId })
}
