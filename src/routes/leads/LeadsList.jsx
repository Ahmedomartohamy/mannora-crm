import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import LeadModal from './LeadModal'
import { supabase } from '../../lib/supabase'

const STAGE_LABEL = {
  new:'جديد', contacted:'تم التواصل', qualified:'مؤهّل', proposal:'عرض مُرسل', won:'مكتسب', lost:'مفقود'
}
const SOURCE_LABEL = {
  referral:'ترشيح', website:'الموقع', ads:'إعلانات', cold_call:'اتصال بارد', event:'فعالية', other:'أخرى'
}

export default function LeadsList() {
  const [me, setMe] = useState(null)
  const [isAdminOrManager, setIsAdminOrManager] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  const [q, setQ] = useState('')
  const [fltStage, setFltStage] = useState('')
  const [fltSource, setFltSource] = useState('')
  const [fltOwner, setFltOwner] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)

  const [users, setUsers] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user || null))
    Promise.all([
      supabase.rpc('is_admin'),
      supabase.rpc('has_role', { r: 'manager' })
    ]).then(([a, m])=>{
      setIsAdminOrManager(Boolean(a.data) || Boolean(m.data))
    })
  }, [])

  const loadUsers = async () => {
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error || !Array.isArray(data)) {
      const u = (await supabase.auth.getUser()).data.user
      const entry = u ? [{ user_id: u.id, email: u.email, full_name: u.user_metadata?.full_name }] : []
      setUsers(entry)
    } else {
      setUsers(data)
    }
  }

  const loadLeads = async () => {
    setLoading(true); setError('')
    const sel = await supabase.from('leads')
      .select('*')
      .order('updated_at', { ascending:false })
      .order('created_at', { ascending:false })
    setLoading(false)
    if (sel.error) setError(sel.error.message)
    else setRows(sel.data || [])
  }

  useEffect(() => {
    loadUsers(); loadLeads()
    const ch = supabase.channel('leads-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'leads' }, () => loadLeads())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter(l => {
      if (term) {
        const txt = `${l.name} ${l.company||''} ${l.email||''} ${l.phone||''} ${l.notes||''}`.toLowerCase()
        if (!txt.includes(term)) return false
      }
      if (fltStage && l.stage !== fltStage) return false
      if (fltSource && (l.source||'') !== fltSource) return false
      if (fltOwner && (l.owner_id||'') !== fltOwner) return false
      if (onlyMine && me) {
        const mine = (l.owner_id === me.id)
        if (!mine) return false
      }
      return true
    })
  }, [rows, q, fltStage, fltSource, fltOwner, onlyMine, me])

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (l) => { setEditing(l); setModalOpen(true) }

  const del = async (l) => {
    if (!confirm('هل تريد حذف هذا العميل المحتمل؟')) return
    const { error } = await supabase.from('leads').delete().eq('id', l.id)
    if (error) alert(error.message); else await loadLeads()
  }

  const convertLead = async (l) => {
    if (l.client_id) { alert('تم تحويل هذا العميل بالفعل.'); return }
    if (!confirm('تحويل هذا العميل المحتمل إلى عميل فعلي؟')) return
    const { data, error } = await supabase.rpc('lead_convert_to_client', { p_lead_id: l.id })
    if (error) { alert(error.message); return }
    await loadLeads()
    alert('تم التحويل إلى عميل بنجاح ✅')
  }

  return (
    <Layout>
      <div className="header">
        <h2>العملاء المحتملون</h2>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <input className="input" placeholder="بحث بالاسم/الشركة/البريد/الهاتف" value={q} onChange={e=>setQ(e.target.value)} style={{width:260}} />
          <select className="select" value={fltStage} onChange={e=>setFltStage(e.target.value)}>
            <option value="">كل المراحل</option>
            <option value="new">جديد</option>
            <option value="contacted">تم التواصل</option>
            <option value="qualified">مؤهّل</option>
            <option value="proposal">عرض مُرسل</option>
            <option value="won">مكتسب</option>
            <option value="lost">مفقود</option>
          </select>
          <select className="select" value={fltSource} onChange={e=>setFltSource(e.target.value)}>
            <option value="">كل المصادر</option>
            <option value="referral">ترشيح</option>
            <option value="website">الموقع</option>
            <option value="ads">إعلانات</option>
            <option value="cold_call">اتصال بارد</option>
            <option value="event">فعالية</option>
            <option value="other">أخرى</option>
          </select>
          {isAdminOrManager && (
            <select className="select" value={fltOwner} onChange={e=>setFltOwner(e.target.value)}>
              <option value="">كل المالكين</option>
              {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
            </select>
          )}
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={onlyMine} onChange={e=>setOnlyMine(e.target.checked)} />
            مملوك لي فقط
          </label>
          <button className="btn" onClick={openNew}>عميل محتمل جديد</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div>جارٍ التحميل…</div> :
         error ? <div style={{color:'#dc2626'}}>{error}</div> :
         filtered.length === 0 ? <div>لا توجد نتائج</div> :
         <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الشركة</th>
              <th>البريد</th>
              <th>الهاتف</th>
              <th>المصدر</th>
              <th>المرحلة</th>
              <th>القيمة المتوقعة</th>
              <th>المالك</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id}>
                <td style={{maxWidth:220}}>{l.name}</td>
                <td>{l.company || '—'}</td>
                <td>{l.email || '—'}</td>
                <td>{l.phone || '—'}</td>
                <td>{SOURCE_LABEL[l.source] || '—'}</td>
                <td>{STAGE_LABEL[l.stage] || l.stage}</td>
                <td>{l.value ?? '—'}</td>
                <td>
                  {users.find(u=>u.user_id===l.owner_id)?.full_name
                    || users.find(u=>u.user_id===l.owner_id)?.email
                    || '—'}
                </td>
                <td>
                  <span className="link" onClick={()=>openEdit(l)}>تعديل</span>
                  <span className="link" style={{marginInlineStart:8}} onClick={()=>del(l)}>حذف</span>
                  <span className="link" style={{marginInlineStart:8, opacity:l.client_id ? 0.5:1, pointerEvents:l.client_id?'none':'auto'}} onClick={()=>convertLead(l)}>
                    تحويل لعميل
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
         </table>
        }
      </div>

      <LeadModal
        open={modalOpen}
        onClose={()=>setModalOpen(false)}
        initial={editing}
        onSaved={()=>loadLeads()}
        canPickOwner={isAdminOrManager}
        users={users}
      />
    </Layout>
  )
}
