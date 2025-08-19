import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import { supabase } from '../../lib/supabase'

const ROLES = ['admin','manager','user','secretary']

export default function UsersAdmin() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [modal, setModal] = useState({ open:false, user:null, role:'manager' })

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

  return (
    <Layout>
      <div className="header">
        <h2>إدارة المستخدمين</h2>
        <input className="input" placeholder="بحث بالبريد/الاسم" value={q} onChange={e=>setQ(e.target.value)} style={{width:320}} />
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
    </Layout>
  )
}
