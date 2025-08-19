import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import { supabase } from '../../lib/supabase'

const ROLES = ['admin','manager','user','secretary']
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const sanitizeEmail = (s='') =>
  s.toString()
   // إزالة علامات الاتجاه الخفية + أقواس الزاوية + كل الفراغات
   .replace(/[\u200e\u200f<>]/g, '')
   .replace(/\s/g, '')
   .trim()

export default function UsersAdmin() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')

  const [modal, setModal] = useState({ open:false, user:null, role:'manager' })

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email:'', full_name:'', role:'user' })
  const [inviteErr, setInviteErr] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    const { data, error } = await supabase.rpc('admin_list_users')
    setLoading(false)
    if (error) setError(error.message)
    else setRows(data || [])
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r =>
      (r.email||'').toLowerCase().includes(s) ||
      (r.full_name||'').toLowerCase().includes(s)
    )
  }, [rows, q])

  const openAddRole = (user) => setModal({ open:true, user, role:'manager' })
  const closeModal = () => setModal({ open:false, user:null, role:'manager' })

  const addRole = async () => {
    const { user, role } = modal
    if (!user) return
    const { error } = await supabase.rpc('admin_upsert_role', {
      target_user_id: user.user_id,
      target_role: role
    })
    if (error) { alert(error.message); return }
    closeModal()
    await load()
  }

  const removeRole = async (user, role) => {
    if (!confirm(`إزالة دور ${role}؟`)) return
    const { error } = await supabase.rpc('admin_remove_role', {
      target_user_id: user.user_id,
      target_role: role
    })
    if (error) { alert(error.message); return }
    await load()
  }

  const sendInvite = async () => {
    setInviteErr('')
    const email = sanitizeEmail(inviteForm.email)
    if (!EMAIL_RE.test(email)) {
      setInviteErr('صيغة البريد الإلكتروني غير صحيحة. اكتب مثال: employee@example.com بدون أقواس أو مسافات.')
      return
    }
    try {
      setInviteBusy(true)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const resp = await fetch('/api/invite-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...inviteForm, email })
      })
      const json = await resp.json()
      setInviteBusy(false)
      if (!resp.ok) {
        setInviteErr(json.error || 'فشل إرسال الدعوة')
        return
      }
      setInviteOpen(false)
      setInviteForm({ email:'', full_name:'', role:'user' })
      await load()
      alert('تم إرسال دعوة الموظّف بنجاح ✉️')
    } catch (e) {
      setInviteBusy(false)
      setInviteErr(e.message)
    }
  }

  return (
    <Layout>
      <div className="header">
        <h2>إدارة المستخدمين</h2>
        <div style={{display:'flex', gap:8}}>
          <input className="input" placeholder="بحث بالبريد/الاسم" value={q} onChange={e=>setQ(e.target.value)} style={{width:320}} />
          <button className="btn" onClick={()=>{ setInviteOpen(true); setInviteErr('') }}>دعوة موظّف</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div>جارٍ التحميل…</div> :
          error ? <div style={{color:'#dc2626'}}>{error}</div> :
          filtered.length === 0 ? <div>لا يوجد مستخدمون</div> :
          <table className="table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد</th>
                <th>User ID</th>
                <th>الأدوار</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.user_id}>
                  <td>{u.full_name || '—'}</td>
                  <td>{u.email}</td>
                  <td style={{fontFamily:'monospace'}}>{u.user_id}</td>
                  <td>
                    {u.roles && u.roles.length
                      ? u.roles.map(r => (
                          <span key={r} style={{display:'inline-block', padding:'4px 10px', border:'1px solid #e5e7eb', borderRadius:12, marginInlineEnd:6}}>
                            {r} <span className="link" style={{marginInlineStart:8}} onClick={()=>removeRole(u, r)}>إزالة</span>
                          </span>
                        ))
                      : '—'}
                  </td>
                  <td>
                    <span className="link" onClick={()=>openAddRole(u)}>+ إضافة دور</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      {/* إضافة دور لمستخدم موجود */}
      {modal.open && (
        <Modal title="إضافة دور" onClose={closeModal}>
          <div style={{display:'grid', gap:12}}>
            <div><b>المستخدم:</b> {modal.user?.email}</div>
            <div>
              <label>اختيار الدور</label>
              <select className="select" value={modal.role} onChange={e=>setModal(m=>({...m, role:e.target.value}))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button className="btn secondary" onClick={closeModal}>إلغاء</button>
              <button className="btn" onClick={addRole}>حفظ</button>
            </div>
          </div>
        </Modal>
      )}

      {/* دعوة موظّف جديد */}
      {inviteOpen && (
        <Modal title="دعوة موظّف" onClose={()=>setInviteOpen(false)}>
          <div style={{display:'grid', gap:12}}>
            <div className="row">
              <div>
                <label>البريد الإلكتروني</label>
                <input
                  className="input"
                  value={inviteForm.email}
                  onChange={e=>setInviteForm(f=>({...f,email:e.target.value}))}
                  placeholder="employee@example.com"
                  type="email"
                />
                {inviteErr && <div style={{color:'#dc2626', fontSize:14, marginTop:6}}>{inviteErr}</div>}
              </div>
              <div>
                <label>الاسم الكامل</label>
                <input className="input" value={inviteForm.full_name} onChange={e=>setInviteForm(f=>({...f,full_name:e.target.value}))} placeholder="الاسم" />
              </div>
            </div>
            <div>
              <label>الدور</label>
              <select className="select" value={inviteForm.role} onChange={e=>setInviteForm(f=>({...f,role:e.target.value}))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button className="btn secondary" onClick={()=>setInviteOpen(false)}>إلغاء</button>
              <button className="btn" onClick={sendInvite} disabled={inviteBusy}>
                {inviteBusy ? 'جارٍ الإرسال…' : 'إرسال الدعوة'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
