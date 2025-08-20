import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import TaskModal from './TaskModal'
import { supabase } from '../../lib/supabase'

const STATUS_LABEL = {
  todo:'مطلوب', in_progress:'جارٍ التنفيذ', blocked:'متوقفة', done:'مكتملة'
}
const PRIORITY_LABEL = {
  low:'منخفضة', medium:'متوسطة', high:'مرتفعة', urgent:'عاجلة'
}

export default function TasksList() {
  const [me, setMe] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  const [q, setQ] = useState('')
  const [fltStatus, setFltStatus] = useState('')
  const [fltPriority, setFltPriority] = useState('')
  const [fltAssignee, setFltAssignee] = useState('')
  const [fltClient, setFltClient] = useState('')
  const [fltProject, setFltProject] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)

  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user || null))
  }, [])

  const loadUsers = async () => {
    // جرّب admin_list_users؛ لو فشل (مش أدمن)، خليه نفسه فقط
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error || !Array.isArray(data)) {
      const u = (await supabase.auth.getUser()).data.user
      const entry = u ? [{ user_id: u.id, email: u.email, full_name: u.user_metadata?.full_name }] : []
      setUsers(entry)
    } else {
      setUsers(data)
    }
  }
  const loadClients = async () => {
    const { data, error } = await supabase.from('clients').select('id,name').order('name', { ascending:true })
    setClients(error ? [] : (data || []))
  }
  const loadProjects = async () => {
    const { data, error } = await supabase.from('projects').select('id,name').order('name', { ascending:true })
    setProjects(error ? [] : (data || []))
  }

  const loadTasks = async () => {
    setLoading(true); setError('')
    // نجيب كل ما تسمح به RLS ونفلتر محليًا (للبساطة)
    const sel = await supabase.from('tasks')
      .select('*')
      .order('due_date', { ascending:true, nullsFirst:true })
      .order('created_at', { ascending:false })
    setLoading(false)
    if (sel.error) setError(sel.error.message)
    else setRows(sel.data || [])
  }

  useEffect(() => {
    loadUsers(); loadClients(); loadProjects(); loadTasks()
    // realtime
    const channel = supabase.channel('tasks-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'tasks' }, (_payload) => {
        loadTasks()
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter(t => {
      if (term) {
        const text = `${t.title} ${t.description || ''}`.toLowerCase()
        if (!text.includes(term)) return false
      }
      if (fltStatus && t.status !== fltStatus) return false
      if (fltPriority && t.priority !== fltPriority) return false
      if (fltAssignee && (t.assignee_id || '') !== fltAssignee) return false
      if (fltClient && (t.client_id || '') !== fltClient) return false
      if (fltProject && (t.project_id || '') !== fltProject) return false
      if (onlyMine && me) {
        const mine = (t.created_by === me.id) || (t.assignee_id === me.id)
        if (!mine) return false
      }
      return true
    })
  }, [rows, q, fltStatus, fltPriority, fltAssignee, fltClient, fltProject, onlyMine, me])

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (t) => { setEditing(t); setModalOpen(true) }

  const del = async (t) => {
    if (!confirm('هل تريد حذف هذه المهمة؟')) return
    const { error } = await supabase.from('tasks').delete().eq('id', t.id)
    if (error) { alert(error.message) }
    else { await loadTasks() }
  }

  return (
    <Layout>
      <div className="header">
        <h2>المهام</h2>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <input className="input" placeholder="بحث..." value={q} onChange={e=>setQ(e.target.value)} style={{width:240}} />
          <select className="select" value={fltStatus} onChange={e=>setFltStatus(e.target.value)}>
            <option value="">كل الحالات</option>
            <option value="todo">مطلوب</option>
            <option value="in_progress">جارٍ التنفيذ</option>
            <option value="blocked">متوقفة</option>
            <option value="done">مكتملة</option>
          </select>
          <select className="select" value={fltPriority} onChange={e=>setFltPriority(e.target.value)}>
            <option value="">كل الأولويات</option>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">مرتفعة</option>
            <option value="urgent">عاجلة</option>
          </select>
          <select className="select" value={fltAssignee} onChange={e=>setFltAssignee(e.target.value)}>
            <option value="">كل المسؤولين</option>
            {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
          </select>
          <select className="select" value={fltClient} onChange={e=>setFltClient(e.target.value)}>
            <option value="">كل العملاء</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={fltProject} onChange={e=>setFltProject(e.target.value)}>
            <option value="">كل المشاريع</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={onlyMine} onChange={e=>setOnlyMine(e.target.checked)} />
            مهامي فقط
          </label>
          <button className="btn" onClick={openNew}>مهمة جديدة</button>
          <Link className="btn secondary" to="/tasks/board">عرض كانبان</Link>
        </div>
      </div>

      <div className="card">
        {loading ? <div>جارٍ التحميل…</div> :
         error ? <div style={{color:'#dc2626'}}>{error}</div> :
         filtered.length === 0 ? <div>لا توجد مهام مطابقة</div> :
         <table className="table">
          <thead>
            <tr>
              <th>العنوان</th>
              <th>الحالة</th>
              <th>الأولوية</th>
              <th>الاستحقاق</th>
              <th>المسؤول</th>
              <th>العميل</th>
              <th>المشروع</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td style={{maxWidth:280}}>{t.title}</td>
                <td>{STATUS_LABEL[t.status] || t.status}</td>
                <td>{PRIORITY_LABEL[t.priority] || t.priority}</td>
                <td>{t.due_date || '—'}</td>
                <td>
                  {t.assignee_id
                    ? (users.find(u => u.user_id === t.assignee_id)?.full_name || users.find(u => u.user_id === t.assignee_id)?.email || '—')
                    : '—'}
                </td>
                <td>{t.client_id ? (clients.find(c=>c.id===t.client_id)?.name || '—') : '—'}</td>
                <td>{t.project_id ? (projects.find(p=>p.id===t.project_id)?.name || '—') : '—'}</td>
                <td>
                  <span className="link" onClick={()=>openEdit(t)}>تعديل</span>
                  <span className="link" style={{marginInlineStart:8}} onClick={()=>del(t)}>حذف</span>
                </td>
              </tr>
            ))}
          </tbody>
         </table>
        }
      </div>

      <TaskModal
        open={modalOpen}
        onClose={()=>setModalOpen(false)}
        initial={editing}
        users={users}
        clients={clients}
        projects={projects}
        onSaved={()=>loadTasks()}
      />
    </Layout>
  )
}
