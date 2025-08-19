// api/invite-employee.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ error: 'Server is not configured (env vars missing)' })
  }

  // 1) تحقق إن اللي بيطلب أدمن (باستخدام توكن المستخدم المرسل من الفرونت)
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing user token' })

  const userClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: isAdmin, error: adminErr } = await userClient.rpc('is_admin')
  if (adminErr || !isAdmin) return res.status(403).json({ error: 'Forbidden' })

  // 2) البيانات
  const { email, full_name, role } = req.body || {}
  const ALLOWED = ['admin', 'manager', 'user', 'secretary']
  if (!email || !ALLOWED.includes(role)) {
    return res.status(400).json({ error: 'Invalid input' })
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE)

  // 3) ادعو المستخدم بالبريد (هيروحه ايميل دعوة)
  let userId = null
  const { data: invite, error: invErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name }
  })

  if (invErr) {
    // لو المستخدم موجود فعلًا، نحاول نلاقيه من القائمة
    const { data: list, error: listErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (listErr) return res.status(500).json({ error: listErr.message })
    const existing = list?.users?.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
    if (!existing) return res.status(400).json({ error: invErr.message || 'Unable to invite user' })
    userId = existing.id
  } else {
    userId = invite?.user?.id
  }

  if (!userId) return res.status(500).json({ error: 'No user id returned' })

  // 4) كمل بيانات profiles + اضبط الدور
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
